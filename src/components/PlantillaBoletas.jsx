import { useState, useEffect, useMemo } from 'react';
import {
  Upload,
  Trash2,
  Save,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  History,
  Layers,
  Sparkles,
  CheckCircle2,
  Plus,
  Sliders
} from 'lucide-react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import FormHeader from './FormHeader';
import jsPDF from 'jspdf';
import { isSuperUser, getPermittedRoutesForUser } from '../lib/formsPermissions';
import { openAndPrintHtml, downloadHtmlFile } from '../lib/printHtmlHelper';
import PlantillaBoletasHistory from './PlantillaBoletasHistory';
import {
  processMultipleBoletasFast,
  distributeBoletasIntoGrid,
  generatePlantillaBoletasHtml,
  savePlantillaBoletasRecord,
  OFFICIAL_VENDORS_LIST
} from '../lib/plantillaBoletasHelper';

export default function PlantillaBoletas({ currentUser }) {
  const isSuper = isSuperUser(currentUser);

  const [metadata, setMetadata] = useState({
    vendedor: !isSuper && currentUser?.name ? currentUser.name : '',
    ruta: !isSuper && currentUser?.route ? currentUser.route : '',
    referencia: '',
    fecha: new Date().toISOString().split('T')[0]
  });

  const [pages, setPages] = useState([1]);
  const [images, setImages] = useState({});
  const [targetBoletasCount, setTargetBoletasCount] = useState(4);
  const [editingBox, setEditingBox] = useState(null);
  const [editSettings, setEditSettings] = useState({
    scale: 1,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    offsetX: 0,
    offsetY: 0
  });

  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);

  const persistenceKey = currentUser?.name
    ? `plantillaBoletas_${currentUser.name.replace(/\s+/g, '_')}`
    : 'plantillaBoletas';
  const [persistedImagesData, setPersistedImagesData, saveForm] = useFormPersistence(persistenceKey, {});

  // Rutas permitidas según el vendedor seleccionado
  const availableRutas = useMemo(() => {
    return getPermittedRoutesForUser(currentUser, metadata.vendedor);
  }, [currentUser, metadata.vendedor]);

  // Sincronizar vendedor si no es superusuario
  useEffect(() => {
    if (!isSuper && currentUser?.name) {
      const defaultRuta =
        currentUser.route && availableRutas.includes(currentUser.route)
          ? currentUser.route
          : availableRutas[0] || '';
      setMetadata((prev) => ({
        ...prev,
        vendedor: currentUser.name,
        ruta: prev.ruta && availableRutas.includes(prev.ruta) ? prev.ruta : defaultRuta
      }));
    }
  }, [isSuper, currentUser?.name, currentUser?.route, availableRutas]);

  // Restaurar imágenes persistidas localmente al abrir
  useEffect(() => {
    if (persistedImagesData && Object.keys(persistedImagesData).length > 0) {
      setImages(persistedImagesData);
      // Calcular cuántas páginas se requieren según las llaves guardadas (ej. "3-2" -> pág 3)
      let maxP = 1;
      Object.keys(persistedImagesData).forEach((k) => {
        const p = parseInt(String(k).split('-')[0], 10);
        if (!isNaN(p) && p > maxP) maxP = p;
      });
      setPages(Array.from({ length: maxP }, (_, i) => i + 1));
      setTargetBoletasCount(maxP * 4);
    }
  }, []);

  useEffect(() => {
    setPersistedImagesData(images);
  }, [images, setPersistedImagesData]);

  // Sincronizar valores del editor cuando cambia la casilla seleccionada
  useEffect(() => {
    if (editingBox && images[editingBox]) {
      const img = images[editingBox];
      setEditSettings({
        scale: img.scale ?? 1,
        rotation: img.rotation ?? 0,
        brightness: img.brightness ?? 100,
        contrast: img.contrast ?? 100,
        offsetX: img.offsetX ?? 0,
        offsetY: img.offsetY ?? 0
      });
    }
  }, [editingBox]);

  const totalLoadedBoletas = useMemo(() => {
    return Object.keys(images).filter((k) => Boolean(images[k]?.src)).length;
  }, [images]);

  // Cambiar cantidad deseada de boletas (crea/ajusta páginas de 4 en 4)
  const handleSelectBoletasQuantity = (count) => {
    const num = Math.max(4, Math.min(80, Number(count) || 4));
    const neededPages = Math.ceil(num / 4);
    setTargetBoletasCount(neededPages * 4);

    // Conservar páginas que ya tengan imágenes aunque baje el selector
    let highestPageWithImg = 1;
    Object.keys(images).forEach((k) => {
      if (images[k]?.src) {
        const p = parseInt(k.split('-')[0], 10) || 1;
        if (p > highestPageWithImg) highestPageWithImg = p;
      }
    });

    const finalPageCount = Math.max(neededPages, highestPageWithImg);
    setPages(Array.from({ length: finalPageCount }, (_, i) => i + 1));
  };

  // Procesar subida masiva o individual (soporta 1 o decenas de imágenes a la vez)
  const handleBatchFilesUpload = async (fileList, startBoxId = null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploadingBatch(true);
    setUploadStatusMsg(`Procesando ${fileList.length} boleta(s) a alta velocidad...`);

    try {
      const processedBoletas = await processMultipleBoletasFast(fileList);
      if (processedBoletas.length === 0) {
        setUploadStatusMsg('');
        setIsUploadingBatch(false);
        return;
      }

      const { pages: newPages, images: newImages } = distributeBoletasIntoGrid(
        pages,
        images,
        processedBoletas,
        startBoxId
      );

      setPages(newPages);
      setImages(newImages);
      setTargetBoletasCount(newPages.length * 4);

      if (processedBoletas.length === 1 && startBoxId) {
        setEditingBox(startBoxId);
      }

      setUploadStatusMsg(
        `⚡ ¡${processedBoletas.length} boleta(s) cargadas y acomodadas automáticamente en ${newPages.length} página(s)!`
      );
      setTimeout(() => setUploadStatusMsg(''), 4500);
    } catch (err) {
      console.error('Error en carga rápida de boletas:', err);
      alert('Ocurrió un inconveniente al procesar algunas imágenes.');
    } finally {
      setIsUploadingBatch(false);
    }
  };

  // Soporte para pegar una o varias imágenes con Ctrl+V
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles = [];
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) imageFiles.push(blob);
      }
    }

    if (imageFiles.length > 0) {
      await handleBatchFilesUpload(imageFiles, imageFiles.length === 1 ? editingBox : null);
    }
  };

  // Soporte Drag & Drop de múltiples boletas
  const handleDrop = async (e, targetBoxId = null) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleBatchFilesUpload(files, targetBoxId);
    }
  };

  // Rotación rápida de 90° en 1 clic directamente desde la tarjeta
  const quickRotateBox = (boxId, deltaDeg, e) => {
    e.stopPropagation();
    setImages((prev) => {
      const current = prev[boxId];
      if (!current) return prev;
      const nextRot = ((current.rotation || 0) + deltaDeg + 360) % 360;
      return {
        ...prev,
        [boxId]: {
          ...current,
          rotation: nextRot
        }
      };
    });
  };

  // Zoom rápido en 1 clic directamente desde la tarjeta
  const quickScaleBox = (boxId, deltaScale, e) => {
    e.stopPropagation();
    setImages((prev) => {
      const current = prev[boxId];
      if (!current) return prev;
      const nextScale = Math.max(0.5, Math.min(2.2, Number(((current.scale || 1) + deltaScale).toFixed(2))));
      return {
        ...prev,
        [boxId]: {
          ...current,
          scale: nextScale
        }
      };
    });
  };

  // Auto-acomodar boletas eliminando huecos vacíos entre páginas
  const handleCompactBoletas = () => {
    const orderedKeys = Object.keys(images)
      .filter((k) => Boolean(images[k]?.src))
      .sort((a, b) => {
        const [pa, ba] = a.split('-').map(Number);
        const [pb, bb] = b.split('-').map(Number);
        return pa !== pb ? pa - pb : ba - bb;
      });

    if (orderedKeys.length === 0) return;

    const orderedObjs = orderedKeys.map((k) => images[k]);
    const { pages: compactedPages, images: compactedImages } = distributeBoletasIntoGrid(
      [1],
      {},
      orderedObjs,
      null
    );

    setPages(compactedPages);
    setImages(compactedImages);
    setTargetBoletasCount(compactedPages.length * 4);
    setEditingBox(null);
  };

  const updateEditSettings = (key, value) => {
    setEditSettings((prev) => {
      const updated = { ...prev, [key]: value };
      if (editingBox && images[editingBox]) {
        setImages((imgs) => ({
          ...imgs,
          [editingBox]: {
            ...imgs[editingBox],
            [key]: value
          }
        }));
      }
      return updated;
    });
  };

  const deleteImage = (boxId) => {
    setImages((prev) => {
      const newImages = { ...prev };
      delete newImages[boxId];
      return newImages;
    });
    if (editingBox === boxId) {
      setEditingBox(null);
    }
  };

  // Guardar en Historial (Supabase + LocalStorage)
  const handleSaveToHistory = async () => {
    if (totalLoadedBoletas === 0) {
      alert('Por favor carga al menos una imagen de boleta antes de guardar la plantilla.');
      return;
    }

    setIsSaving(true);
    try {
      saveForm();
      const saved = await savePlantillaBoletasRecord({
        id: editingRecordId,
        vendedor: metadata.vendedor || currentUser?.name || 'General',
        ruta: metadata.ruta || '',
        referencia: metadata.referencia || '',
        fecha: metadata.fecha || new Date().toISOString().split('T')[0],
        pages,
        images
      });

      if (saved?.id) {
        setEditingRecordId(saved.id);
      }
      setShowSaveBanner(true);
      setTimeout(() => setShowSaveBanner(false), 4000);
    } catch (err) {
      console.error('Error guardando plantilla de boletas:', err);
      alert('Error al guardar la plantilla en el historial.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cargar una plantilla desde el Historial para editarla o reimprimirla
  const handleLoadFromHistory = (record) => {
    if (!record) return;
    setMetadata({
      vendedor: record.vendedor || '',
      ruta: record.ruta || '',
      referencia: record.referencia || '',
      fecha: record.fecha || new Date().toISOString().split('T')[0]
    });
    const recPages = Array.isArray(record.pages) && record.pages.length > 0 ? record.pages : [1];
    setPages(recPages);
    setImages(record.images || {});
    setTargetBoletasCount(recPages.length * 4);
    setEditingRecordId(record.id);
    setEditingBox(null);
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todas las boletas de la plantilla actual?')) {
      setImages({});
      setPages([1]);
      setTargetBoletasCount(4);
      setEditingRecordId(null);
      setEditingBox(null);
      setPersistedImagesData({});
      localStorage.removeItem(persistenceKey);
    }
  };

  const addNewPage = () => {
    const newPageNumber = pages.length + 1;
    const nextPages = [...pages, newPageNumber];
    setPages(nextPages);
    setTargetBoletasCount(nextPages.length * 4);
  };

  const getPreparedFileName = () => {
    const vendClean = (metadata.vendedor || currentUser?.name || 'General').trim().replace(/\s+/g, '_');
    const fechaStr = metadata.fecha || new Date().toISOString().split('T')[0];
    return `Plantilla_Boletas_${vendClean}_${fechaStr}`;
  };

  // Imprimir directamente igual que los otros formularios
  const handlePrint = () => {
    const htmlContent = generatePlantillaBoletasHtml({
      pages,
      images,
      metadata: {
        vendedor: metadata.vendedor || currentUser?.name || 'General',
        ruta: metadata.ruta,
        referencia: metadata.referencia,
        fecha: metadata.fecha
      }
    });
    openAndPrintHtml(htmlContent, getPreparedFileName(), 'portrait');
  };

  // Descargar HTML oficial imprimible
  const handleExportHtml = () => {
    const htmlContent = generatePlantillaBoletasHtml({
      pages,
      images,
      metadata: {
        vendedor: metadata.vendedor || currentUser?.name || 'General',
        ruta: metadata.ruta,
        referencia: metadata.referencia,
        fecha: metadata.fecha
      }
    });
    downloadHtmlFile(htmlContent, `${getPreparedFileName()}.html`, 'portrait');
  };

  // Exportar a PDF con nombre de vendedor y fecha
  const exportToPDF = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const topHeaderOffset = 18;
    const boxWidth = (pageWidth - margin * 2) / 2;
    const boxHeight = (pageHeight - topHeaderOffset - margin) / 2;

    const positions = [
      { x: margin, y: topHeaderOffset },
      { x: margin + boxWidth, y: topHeaderOffset },
      { x: margin, y: topHeaderOffset + boxHeight },
      { x: margin + boxWidth, y: topHeaderOffset + boxHeight }
    ];

    const allPagePromises = pages.map((pageNum, pageIndex) => {
      const imagePromises = positions.map((pos, index) => {
        return new Promise((resolve) => {
          const boxId = `${pageNum}-${index + 1}`;
          if (images[boxId]?.src) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const dpi = 220;
              const pixelWidth = (boxWidth / 25.4) * dpi;
              const pixelHeight = (boxHeight / 25.4) * dpi;

              canvas.width = pixelWidth;
              canvas.height = pixelHeight;

              const imgAspectRatio = img.width / img.height;
              const boxAspectRatio = pixelWidth / pixelHeight;

              let drawWidth, drawHeight, dx, dy;
              if (imgAspectRatio > boxAspectRatio) {
                drawWidth = pixelWidth;
                drawHeight = pixelWidth / imgAspectRatio;
                dx = 0;
                dy = (pixelHeight - drawHeight) / 2;
              } else {
                drawHeight = pixelHeight;
                drawWidth = pixelHeight * imgAspectRatio;
                dx = (pixelWidth - drawWidth) / 2;
                dy = 0;
              }

              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.save();
              ctx.filter = `brightness(${images[boxId].brightness || 100}%) contrast(${images[boxId].contrast || 100}%)`;
              ctx.translate(dx + drawWidth / 2, dy + drawHeight / 2);
              ctx.rotate(((images[boxId].rotation || 0) * Math.PI) / 180);
              ctx.scale(images[boxId].scale || 1, images[boxId].scale || 1);

              const scaledOffsetX = ((images[boxId].offsetX || 0) / 100) * drawWidth;
              const scaledOffsetY = ((images[boxId].offsetY || 0) / 100) * drawHeight;
              ctx.translate(scaledOffsetX, scaledOffsetY);

              ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
              ctx.restore();

              const imgData = canvas.toDataURL('image/jpeg', 0.88);
              resolve({ imgData, pos, boxWidth, boxHeight, index });
            };
            img.onerror = () => resolve(null);
            img.src = images[boxId].src;
          } else {
            resolve(null);
          }
        });
      });

      return Promise.all(imagePromises).then((results) => ({ pageIndex, pageNum, results }));
    });

    Promise.all(allPagePromises).then((allPages) => {
      allPages.forEach(({ pageIndex, pageNum, results }) => {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(
          `DROGUERIA EL OLAM - PLANTILLA DE BOLETAS (${metadata.vendedor || 'General'})`,
          margin,
          10
        );
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Fecha: ${metadata.fecha || ''} ${metadata.ruta ? `| Ruta: ${metadata.ruta}` : ''} | Pagina ${pageNum} de ${pages.length}`,
          margin,
          14.5
        );

        results.forEach((result, index) => {
          pdf.rect(positions[index].x, positions[index].y, boxWidth, boxHeight);
          if (result) {
            const { imgData, pos } = result;
            pdf.addImage(imgData, 'JPEG', pos.x + 1, pos.y + 1, boxWidth - 2, boxHeight - 2);
          }
        });
      });

      pdf.save(`${getPreparedFileName()}.pdf`);
    });
  };

  const renderImagePreview = (boxId) => {
    const image = images[boxId];
    if (!image?.src) return null;

    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-100 flex items-center justify-center p-1.5">
        <img
          src={image.src}
          alt={`Boleta ${boxId}`}
          style={{
            transform: `scale(${image.scale || 1}) rotate(${image.rotation || 0}deg) translateX(${image.offsetX || 0}px) translateY(${image.offsetY || 0}px)`,
            filter: `brightness(${image.brightness || 100}%) contrast(${image.contrast || 100}%)`,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
    );
  };

  return (
    <div className="p-2 sm:p-4 md:p-6" onPaste={handlePaste}>
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-blue-900/20 p-4 sm:p-6 md:p-8">
        <FormHeader logoSize="small" />

        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white text-center py-2.5 rounded-xl mb-4 sm:mb-6 shadow-md">
          <h2 className="text-base sm:text-lg font-black tracking-wide">
            PLANTILLA DE BOLETAS Y DEPÓSITOS BANCARIOS
          </h2>
        </div>

        {/* Barra Oficial de Botones de Acción (Igual que los demás formularios) */}
        <div className="flex gap-2 mb-5 flex-wrap items-center">
          <button
            type="button"
            onClick={handleSaveToHistory}
            disabled={isSaving}
            className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-500 font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : editingRecordId ? 'Actualizar en Historial' : 'Guardar'}
          </button>

          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-950 font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer"
          >
            <History className="w-4 h-4" />
            Historial
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer"
            title="Abrir vista de impresión directa para imprimir todas las páginas de boletas"
          >
            <Printer className="w-4 h-4" />
            🖨️ Imprimir / Vista Previa
          </button>

          <button
            type="button"
            onClick={handleExportHtml}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer"
            title="Descargar archivo HTML oficial imprimible"
          >
            <Download className="w-4 h-4" />
            Descargar HTML
          </button>

          <button
            type="button"
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-teal-700 text-white px-4 py-2 rounded-lg hover:bg-teal-800 font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            {editingRecordId ? 'Nueva Plantilla' : 'Limpiar'}
          </button>
        </div>

        {/* Notificaciones de Guardado y Procesamiento Rápido */}
        {showSaveBanner && (
          <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-800 px-4 py-3 rounded-xl mb-4 font-bold text-sm flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              ✓ Plantilla guardada exitosamente en el Historial en la nube ({totalLoadedBoletas} boletas de{' '}
              {metadata.vendedor || 'General'}). Lista para imprimir cuando se necesite.
            </span>
          </div>
        )}

        {uploadStatusMsg && (
          <div className="bg-blue-50 border-2 border-blue-400 text-blue-900 px-4 py-3 rounded-xl mb-4 font-bold text-sm flex items-center gap-2 shadow-xs animate-pulse">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            <span>{uploadStatusMsg}</span>
          </div>
        )}

        {/* Datos de Identificación de la Plantilla (Vendedor, Ruta, Fecha, Referencia) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1">
              Ejecutivo de Ventas *
            </label>
            <select
              value={metadata.vendedor}
              onChange={(e) => setMetadata((prev) => ({ ...prev, vendedor: e.target.value }))}
              disabled={!isSuper && Boolean(currentUser?.name)}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-lg text-xs sm:text-sm font-semibold text-blue-950 bg-white disabled:bg-slate-100"
            >
              <option value="">Seleccione vendedor...</option>
              {OFFICIAL_VENDORS_LIST.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1">
              Ruta / Gira (Opcional)
            </label>
            <select
              value={metadata.ruta}
              onChange={(e) => setMetadata((prev) => ({ ...prev, ruta: e.target.value }))}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-lg text-xs sm:text-sm font-semibold text-blue-950 bg-white"
            >
              <option value="">Todas / General</option>
              {availableRutas.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1">
              Fecha de Boletas
            </label>
            <input
              type="date"
              value={metadata.fecha}
              onChange={(e) => setMetadata((prev) => ({ ...prev, fecha: e.target.value }))}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-lg text-xs sm:text-sm font-semibold text-blue-950 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1">
              Nota / Banco / Semana (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Banrural Semana 2..."
              value={metadata.referencia}
              onChange={(e) => setMetadata((prev) => ({ ...prev, referencia: e.target.value }))}
              className="w-full px-3 py-2 border border-blue-900/30 rounded-lg text-xs sm:text-sm font-semibold text-blue-950 bg-white"
            />
          </div>
        </div>

        {/* PANEL INNOVADOR DE CARGA MASIVA Y SELECCIÓN DE CANTIDAD DE BOLETAS */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => handleDrop(e, null)}
          className={`mb-6 rounded-2xl border-2 border-dashed p-4 sm:p-5 transition-all ${
            isDraggingOver
              ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
              : 'border-emerald-600/40 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-blue-50/50'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Izquierda: Selector de cantidad de boletas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wide">
                  Nuevo • Carga Masiva Inteligente
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Cargadas: <strong className="text-emerald-700">{totalLoadedBoletas}</strong> boleta(s) en{' '}
                  <strong className="text-blue-900">{pages.length}</strong> página(s)
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-black text-slate-900">
                1. Selecciona la cantidad de boletas o sube todas de un solo toque:
              </h3>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { count: 4, label: '4 Boletas (1 Pág)' },
                  { count: 8, label: '8 Boletas (2 Págs)' },
                  { count: 12, label: '12 Boletas (3 Págs)' },
                  { count: 16, label: '16 Boletas (4 Págs)' },
                  { count: 20, label: '20 Boletas (5 Págs)' }
                ].map((preset) => {
                  const isSelected = targetBoletasCount === preset.count;
                  return (
                    <button
                      key={preset.count}
                      type="button"
                      onClick={() => handleSelectBoletasQuantity(preset.count)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-900 text-white border-blue-900 shadow-sm scale-[1.02]'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}

                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1">
                  <span className="text-[11px] font-bold text-slate-600">Otra cant.:</span>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={targetBoletasCount}
                    onChange={(e) => handleSelectBoletasQuantity(e.target.value)}
                    className="w-12 text-center text-xs font-black text-blue-950 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Derecha: Botón de Selección Múltiple Instantánea */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <input
                type="file"
                accept="image/*"
                multiple
                id="batch-boletas-input"
                className="hidden"
                onChange={(e) => {
                  handleBatchFilesUpload(e.target.files, null);
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="batch-boletas-input"
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-95 transition-all"
              >
                <Upload className="w-5 h-5" />
                <div className="text-left">
                  <div>⚡ Seleccionar Varias Boletas de Golpe</div>
                  <div className="text-[10px] font-medium text-emerald-100">
                    Elige 4, 8, 12 o más fotos y se acomodan solas
                  </div>
                </div>
              </label>

              {totalLoadedBoletas > 0 && (
                <button
                  type="button"
                  onClick={handleCompactBoletas}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 text-xs font-extrabold cursor-pointer transition-all shadow-xs"
                  title="Juntar todas las boletas en orden eliminando espacios vacíos"
                >
                  <Layers className="w-4 h-4 text-blue-700" />
                  <span>Auto-Ordenar</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-2.5">
            💡 <strong>Tip rápido:</strong> Puedes seleccionar todas las boletas juntas desde tu carpeta o galería (con{' '}
            <kbd className="px-1.5 py-0.5 bg-white border rounded text-[10px]">Ctrl + Clic</kbd> o arrastrándolas aquí) y el sistema creará las páginas necesarias automáticamente.
          </p>
        </div>

        {/* Editor de Ajuste Fino (Cuando se selecciona una boleta para editar brillo/contraste/desplazamiento) */}
        {editingBox && images[editingBox] && (
          <div className="mb-6 p-4 bg-blue-50/90 rounded-2xl border-2 border-blue-600 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-blue-950 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-700" />
                Ajuste Fino en Vivo — Boleta Casilla {editingBox}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBox(null)}
                className="px-3 py-1 rounded-lg bg-blue-900 text-white text-xs font-bold hover:bg-blue-950 cursor-pointer"
              >
                ✓ Listo / Cerrar Editor
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Escala (Zoom): {editSettings.scale.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.05"
                  value={editSettings.scale}
                  onChange={(e) => updateEditSettings('scale', parseFloat(e.target.value))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rotación: {editSettings.rotation}°
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={editSettings.rotation}
                  onChange={(e) => updateEditSettings('rotation', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brillo: {editSettings.brightness}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={editSettings.brightness}
                  onChange={(e) => updateEditSettings('brightness', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraste: {editSettings.contrast}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="5"
                  value={editSettings.contrast}
                  onChange={(e) => updateEditSettings('contrast', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mover Horizontal (X): {editSettings.offsetX}px
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={editSettings.offsetX}
                  onChange={(e) => updateEditSettings('offsetX', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mover Vertical (Y): {editSettings.offsetY}px
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={editSettings.offsetY}
                  onChange={(e) => updateEditSettings('offsetY', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* PÁGINAS CON CUADRÍCULA 2x2 (4 BOLETAS POR PÁGINA) */}
        {pages.map((pageNum, pageIdx) => (
          <div key={pageNum} className="mb-8">
            <div className="flex items-center justify-between bg-blue-50/90 border-l-4 border-blue-900 px-3.5 py-2 rounded-r-xl mb-3">
              <h3 className="font-black text-blue-950 text-sm sm:text-base tracking-wide">
                PÁGINA {pageNum} DE {pages.length}{' '}
                <span className="text-xs font-semibold text-slate-600 ml-2">
                  (Boletas #{pageIdx * 4 + 1} a #{pageIdx * 4 + 4})
                </span>
              </h3>
              {pages.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const nextImages = { ...images };
                    ['1', '2', '3', '4'].forEach((b) => delete nextImages[`${pageNum}-${b}`]);
                    setImages(nextImages);
                    setPages((prev) => prev.filter((p) => p !== pageNum));
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                >
                  Quitar página
                </button>
              )}
            </div>

            <div
              className="bg-white border-2 border-blue-900/20 rounded-xl p-3 sm:p-4 shadow-sm"
              style={{ aspectRatio: '8.5/11' }}
            >
              <div className="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4 h-full">
                {['1', '2', '3', '4'].map((boxNum) => {
                  const boxId = `${pageNum}-${boxNum}`;
                  const globalNumber = pageIdx * 4 + Number(boxNum);
                  const hasImage = Boolean(images[boxId]?.src);

                  return (
                    <div
                      key={boxId}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, boxId)}
                      onClick={() => setEditingBox(boxId)}
                      className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col ${
                        editingBox === boxId
                          ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/30'
                          : hasImage
                          ? 'border-slate-300 hover:border-blue-500 bg-white'
                          : 'border-blue-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30'
                      }`}
                    >
                      {/* Etiqueta superior izquierda con número de boleta */}
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[11px] font-black shadow-xs">
                        Boleta #{globalNumber}
                      </span>

                      {hasImage ? (
                        <>
                          {renderImagePreview(boxId)}

                          {/* Barra flotante de acciones rápidas en 1 clic sobre cada boleta */}
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-slate-900/80 backdrop-blur-xs p-1 rounded-lg shadow">
                            <button
                              type="button"
                              onClick={(e) => quickRotateBox(boxId, -90, e)}
                              className="p-1 text-white hover:text-amber-300 rounded transition-colors cursor-pointer"
                              title="Girar 90° a la izquierda"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => quickRotateBox(boxId, 90, e)}
                              className="p-1 text-white hover:text-amber-300 rounded transition-colors cursor-pointer"
                              title="Girar 90° a la derecha"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => quickScaleBox(boxId, 0.15, e)}
                              className="p-1 text-white hover:text-emerald-300 rounded transition-colors cursor-pointer"
                              title="Acercar (Zoom +)"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => quickScaleBox(boxId, -0.15, e)}
                              className="p-1 text-white hover:text-emerald-300 rounded transition-colors cursor-pointer"
                              title="Alejar (Zoom -)"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteImage(boxId);
                              }}
                              className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                              title="Eliminar boleta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                          <Upload className="w-7 h-7 text-blue-400 mb-1.5" />
                          <p className="text-xs font-extrabold text-blue-950">
                            Casilla {boxNum} (Boleta #{globalNumber})
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Arrastra aquí, pega (Ctrl+V) o selecciona una o varias imágenes
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              handleBatchFilesUpload(e.target.files, boxId);
                              e.target.value = '';
                            }}
                            className="hidden"
                            id={`file-input-${boxId}`}
                          />
                          <label
                            htmlFor={`file-input-${boxId}`}
                            className="mt-2.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Subir Boleta(s)
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Botón inferior rápido para agregar más páginas */}
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={addNewPage}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-extrabold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Otra Página (+4 Boletas)</span>
          </button>
        </div>
      </div>

      {/* Modal de Historial de Plantillas de Boletas */}
      {showHistory && (
        <PlantillaBoletasHistory
          onClose={() => setShowHistory(false)}
          onEdit={handleLoadFromHistory}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
