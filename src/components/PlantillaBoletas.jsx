import { useState, useEffect, useMemo, useRef } from 'react';
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
  Sliders,
  Maximize2
} from 'lucide-react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import FormHeader from './FormHeader';
import jsPDF from 'jspdf';
import { isSuperUser, getPermittedRoutesForUser } from '../lib/formsPermissions';
import PlantillaBoletasHistory from './PlantillaBoletasHistory';
import {
  processMultipleBoletasFast,
  distributeBoletasIntoGrid,
  savePlantillaBoletasRecord,
  OFFICIAL_VENDORS_LIST,
  loadImageElement,
  drawBoletaOnCanvas,
  bakeAllBoletasMap,
  printBoletasWithExactBaking,
  downloadBoletasHtmlWithExactBaking
} from '../lib/plantillaBoletasHelper';

/**
 * Lienzo (Canvas) en vivo que dibuja la boleta en pantalla usando exactamente la misma
 * función matemática (`drawBoletaOnCanvas`, proporción 4:5 = 880x1100) que se envía a la impresora y al PDF.
 * Soporta arrastrar con el mouse para acomodar la boleta y rueda del mouse para ampliar/reducir.
 */
function BoletaLiveCanvas({ image, onUpdateTransform }) {
  const canvasRef = useRef(null);
  const dragStateRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || !image?.src) return;

    loadImageElement(image.src).then((imgEl) => {
      if (cancelled || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      drawBoletaOnCanvas(ctx, imgEl, image, 880, 1100);
    });

    return () => {
      cancelled = true;
    };
  }, [
    image?.src,
    image?.scale,
    image?.rotation,
    image?.brightness,
    image?.contrast,
    image?.offsetX,
    image?.offsetY
  ]);

  const handleMouseDown = (e) => {
    if (e.button !== 0 || !onUpdateTransform) return;
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: Number(image?.offsetX) || 0,
      origY: Number(image?.offsetY) || 0
    };
  };

  const handleMouseMove = (e) => {
    if (!dragStateRef.current.dragging || !onUpdateTransform) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const dxPct = ((e.clientX - dragStateRef.current.startX) / (rect.width * 0.45)) * 100;
    const dyPct = ((e.clientY - dragStateRef.current.startY) / (rect.height * 0.45)) * 100;

    const nextX = Math.max(-120, Math.min(120, Math.round(dragStateRef.current.origX + dxPct)));
    const nextY = Math.max(-120, Math.min(120, Math.round(dragStateRef.current.origY + dyPct)));
    onUpdateTransform({ offsetX: nextX, offsetY: nextY });
  };

  const handleMouseUp = () => {
    dragStateRef.current.dragging = false;
  };

  return (
    <canvas
      ref={canvasRef}
      width={880}
      height={1100}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="w-full h-full block select-none cursor-grab active:cursor-grabbing bg-white"
      title="Arrastra para mover la boleta o usa los botones superiores para rotar y ampliar"
    />
  );
}

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

  // Sincronizar valores del editor cuando cambia la casilla seleccionada o se modifica con botones rápidos
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
  }, [editingBox, images]);

  const totalLoadedBoletas = useMemo(() => {
    return Object.keys(images).filter((k) => Boolean(images[k]?.src)).length;
  }, [images]);

  // Cambiar cantidad deseada de boletas (crea/ajusta páginas de 4 en 4)
  const handleSelectBoletasQuantity = (count) => {
    const num = Math.max(4, Math.min(80, Number(count) || 4));
    const neededPages = Math.ceil(num / 4);
    setTargetBoletasCount(neededPages * 4);

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
        `⚡ ¡${processedBoletas.length} boleta(s) cargadas y acomodadas automáticamente en ${newPages.length} página(s) (4 por hoja)!`
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
      const nextScale = Math.max(0.4, Math.min(2.6, Number(((current.scale || 1) + deltaScale).toFixed(2))));
      return {
        ...prev,
        [boxId]: {
          ...current,
          scale: nextScale
        }
      };
    });
  };

  // Restablecer encuadre de una casilla a 100% centrada
  const quickResetBox = (boxId, e) => {
    e.stopPropagation();
    setImages((prev) => {
      const current = prev[boxId];
      if (!current) return prev;
      return {
        ...prev,
        [boxId]: {
          ...current,
          scale: 1,
          offsetX: 0,
          offsetY: 0
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

  const updateBoxPartialTransform = (boxId, patch) => {
    setImages((prev) => {
      const current = prev[boxId];
      if (!current) return prev;
      return {
        ...prev,
        [boxId]: {
          ...current,
          ...patch
        }
      };
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

  // Imprimir directamente horneando primero las modificaciones (rotación, zoom, encuadre) para que salga 100% idéntico
  const handlePrint = async () => {
    await printBoletasWithExactBaking({
      pages,
      images,
      metadata: {
        vendedor: metadata.vendedor || currentUser?.name || 'General',
        ruta: metadata.ruta,
        referencia: metadata.referencia,
        fecha: metadata.fecha
      },
      fallbackTitle: getPreparedFileName()
    });
  };

  // Descargar HTML oficial imprimible con todas las modificaciones horneadas
  const handleExportHtml = async () => {
    await downloadBoletasHtmlWithExactBaking({
      pages,
      images,
      metadata: {
        vendedor: metadata.vendedor || currentUser?.name || 'General',
        ruta: metadata.ruta,
        referencia: metadata.referencia,
        fecha: metadata.fecha
      },
      fileName: `${getPreparedFileName()}.html`
    });
  };

  // Exportar a PDF usando exactamente las imágenes horneadas de cada casilla (4 por hoja tamaño Carta)
  const exportToPDF = async () => {
    const bakedMap = await bakeAllBoletasMap(images);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const topHeaderOffset = 16;
    const gap = 3;
    const boxWidth = (pageWidth - margin * 2 - gap) / 2;
    const boxHeight = (pageHeight - topHeaderOffset - margin - gap) / 2;

    const positions = [
      { x: margin, y: topHeaderOffset },
      { x: margin + boxWidth + gap, y: topHeaderOffset },
      { x: margin, y: topHeaderOffset + boxHeight + gap },
      { x: margin + boxWidth + gap, y: topHeaderOffset + boxHeight + gap }
    ];

    const activePages = pages.filter((pNum) =>
      ['1', '2', '3', '4'].some((bNum) => Boolean(bakedMap[`${pNum}-${bNum}`]?.bakedSrc))
    );
    const pagesToRender = activePages.length > 0 ? activePages : [1];

    pagesToRender.forEach((pageNum, pageIndex) => {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(
        `DROGUERIA EL OLAM - PLANTILLA DE BOLETAS (${metadata.vendedor || 'General'})`,
        margin,
        9
      );
      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Fecha: ${metadata.fecha || ''} ${metadata.ruta ? `| Ruta: ${metadata.ruta}` : ''} | Hoja ${pageIndex + 1} de ${pagesToRender.length}`,
        margin,
        13.5
      );

      positions.forEach((pos, idx) => {
        const boxId = `${pageNum}-${idx + 1}`;
        const item = bakedMap[boxId];
        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(0.35);
        pdf.rect(pos.x, pos.y, boxWidth, boxHeight);

        if (item?.bakedSrc) {
          pdf.addImage(item.bakedSrc, 'JPEG', pos.x + 0.8, pos.y + 0.8, boxWidth - 1.6, boxHeight - 1.6);
        }
      });
    });

    pdf.save(`${getPreparedFileName()}.pdf`);
  };

  return (
    <div className="p-2 sm:p-4 md:p-6" onPaste={handlePaste}>
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-blue-900/20 p-4 sm:p-6 md:p-8">
        <FormHeader logoSize="small" />

        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white text-center py-2.5 rounded-xl mb-4 sm:mb-6 shadow-md">
          <h2 className="text-base sm:text-lg font-black tracking-wide">
            PLANTILLA DE BOLETAS Y DEPÓSITOS BANCARIOS (4 BOLETAS POR HOJA)
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
            title="Imprimir exactamente como se ve en pantalla (4 boletas por hoja sin recortes)"
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wide">
                  4 Boletas por Hoja • Impresión Exacta WYSIWYG
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Cargadas: <strong className="text-emerald-700">{totalLoadedBoletas}</strong> boleta(s) en{' '}
                  <strong className="text-blue-900">{pages.length}</strong> hoja(s)
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-black text-slate-900">
                1. Selecciona la cantidad de boletas o sube todas de un solo toque:
              </h3>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { count: 4, label: '4 Boletas (1 Hoja)' },
                  { count: 8, label: '8 Boletas (2 Hojas)' },
                  { count: 12, label: '12 Boletas (3 Hojas)' },
                  { count: 16, label: '16 Boletas (4 Hojas)' },
                  { count: 20, label: '20 Boletas (5 Hojas)' }
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
                    Elige 4, 8, 12 o más fotos y se acomodan 4 por hoja
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
            💡 <strong>Impresión Fiel 1:1:</strong> Puedes rotar, ampliar o arrastrar cualquier boleta dentro de su recuadro; al presionar{' '}
            <strong>🖨️ Imprimir / Vista Previa</strong> se imprimirá <strong>exactamente tal y como se ve en pantalla</strong> (4 boletas por hoja sin recortes).
          </p>
        </div>

        {/* Editor de Ajuste Fino (Cuando se selecciona una boleta para editar brillo/contraste/desplazamiento) */}
        {editingBox && images[editingBox] && (
          <div className="mb-6 p-4 bg-blue-50/90 rounded-2xl border-2 border-blue-600 shadow-sm animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="font-black text-blue-950 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-700" />
                Ajuste en Vivo — Casilla {editingBox} (Se imprimirá tal cual lo ves en el recuadro)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => quickResetBox(editingBox, e)}
                  className="px-3 py-1 rounded-lg bg-white border border-blue-300 text-blue-900 text-xs font-bold hover:bg-blue-100 cursor-pointer"
                >
                  Centrar / Escala 1.0x
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBox(null)}
                  className="px-3 py-1 rounded-lg bg-blue-900 text-white text-xs font-bold hover:bg-blue-950 cursor-pointer"
                >
                  ✓ Listo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ampliar / Escala (Zoom): {editSettings.scale.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
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
                  Mover Horizontal (X): {editSettings.offsetX}%
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="2"
                  value={editSettings.offsetX}
                  onChange={(e) => updateEditSettings('offsetX', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mover Vertical (Y): {editSettings.offsetY}%
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="2"
                  value={editSettings.offsetY}
                  onChange={(e) => updateEditSettings('offsetY', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* HOJAS CON CUADRÍCULA 2x2 (4 BOLETAS EXACTAS POR HOJA CON PROPORCIÓN 4:5) */}
        {pages.map((pageNum, pageIdx) => (
          <div key={pageNum} className="mb-8">
            <div className="flex items-center justify-between bg-blue-50/90 border-l-4 border-blue-900 px-3.5 py-2 rounded-r-xl mb-3">
              <h3 className="font-black text-blue-950 text-sm sm:text-base tracking-wide">
                HOJA {pageNum} DE {pages.length}{' '}
                <span className="text-xs font-semibold text-slate-600 ml-2">
                  (4 Boletas: #{pageIdx * 4 + 1} a #{pageIdx * 4 + 4})
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
                  Quitar hoja
                </button>
              )}
            </div>

            <div className="bg-white border-2 border-blue-900/20 rounded-xl p-3 sm:p-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {['1', '2', '3', '4'].map((boxNum) => {
                  const boxId = `${pageNum}-${boxNum}`;
                  const globalNumber = pageIdx * 4 + Number(boxNum);
                  const hasImage = Boolean(images[boxId]?.src);

                  return (
                    <div
                      key={boxId}
                      style={{ aspectRatio: '4 / 5' }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, boxId)}
                      onClick={() => setEditingBox(boxId)}
                      className={`relative border-2 rounded-xl overflow-hidden transition-all flex flex-col ${
                        editingBox === boxId
                          ? 'ring-2 ring-blue-600 border-blue-600 bg-white'
                          : hasImage
                          ? 'border-slate-800 hover:border-blue-600 bg-white'
                          : 'border-dashed border-blue-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 cursor-pointer'
                      }`}
                    >
                      {/* Etiqueta superior izquierda con número de boleta */}
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[11px] font-black shadow-xs pointer-events-none">
                        Boleta #{globalNumber}
                      </span>

                      {hasImage ? (
                        <>
                          <BoletaLiveCanvas
                            image={images[boxId]}
                            onUpdateTransform={(patch) => updateBoxPartialTransform(boxId, patch)}
                          />

                          {/* Barra flotante de acciones rápidas en 1 clic sobre cada boleta */}
                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-slate-900/85 backdrop-blur-xs p-1 rounded-lg shadow">
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
                              title="Ampliar (Zoom +)"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => quickScaleBox(boxId, -0.15, e)}
                              className="p-1 text-white hover:text-emerald-300 rounded transition-colors cursor-pointer"
                              title="Reducir (Zoom -)"
                            >
                              <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => quickResetBox(boxId, e)}
                              className="p-1 text-white hover:text-cyan-300 rounded transition-colors cursor-pointer"
                              title="Centrar y ajustar al cuadro"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
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

        {/* Botón inferior rápido para agregar más hojas */}
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={addNewPage}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-extrabold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Otra Hoja (+4 Boletas)</span>
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
