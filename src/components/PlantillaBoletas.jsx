import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Save, RotateCw, Crop, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useFormPersistence } from '../hooks/useFormPersistence';
import FormHeader from './FormHeader';
import FormButtons from './FormButtons';
import jsPDF from 'jspdf';

export default function PlantillaBoletas({ currentUser }) {
  const [pages, setPages] = useState([1]); // Array de páginas
  const [images, setImages] = useState({});
  const [editingBox, setEditingBox] = useState(null);
  const [editSettings, setEditSettings] = useState({
    scale: 1,
    rotation: 0,
    brightness: 100,
    contrast: 100,
    offsetX: 0,
    offsetY: 0,
  });
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const persistenceKey = currentUser?.name 
    ? `plantillaBoletas_${currentUser.name.replace(/\s+/g, '_')}` 
    : 'plantillaBoletas';
  const [persistedImagesData, setPersistedImagesData, saveForm, lastSaved] = useFormPersistence(persistenceKey, {});

  useEffect(() => {
    if (persistedImagesData && Object.keys(persistedImagesData).length > 0) {
      setImages(persistedImagesData);
    }
  }, [persistedImagesData]);

  useEffect(() => {
    setPersistedImagesData(images);
  }, [images, setPersistedImagesData]);

  const handleImageUpload = (boxId, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => ({
          ...prev,
          [boxId]: {
            src: event.target.result,
            scale: 1,
            rotation: 0,
            brightness: 100,
            contrast: 100,
            offsetX: 0,
            offsetY: 0,
          }
        }));
        setEditingBox(boxId);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const boxId = editingBox || '1';
            setImages(prev => ({
              ...prev,
              [boxId]: {
                src: event.target.result,
                scale: 1,
                rotation: 0,
                brightness: 100,
                contrast: 100,
                offsetX: 0,
                offsetY: 0,
              }
            }));
            setEditingBox(boxId);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const updateEditSettings = (key, value) => {
    setEditSettings(prev => ({ ...prev, [key]: value }));
  };

  const saveImageEdits = () => {
    if (editingBox && images[editingBox]) {
      setImages(prev => ({
        ...prev,
        [editingBox]: {
          ...prev[editingBox],
          ...editSettings
        }
      }));
      setEditingBox(null);
      setEditSettings({
        scale: 1,
        rotation: 0,
        brightness: 100,
        contrast: 100,
        offsetX: 0,
        offsetY: 0,
      });
    }
  };

  const deleteImage = (boxId) => {
    setImages(prev => {
      const newImages = { ...prev };
      delete newImages[boxId];
      return newImages;
    });
    if (editingBox === boxId) {
      setEditingBox(null);
    }
  };

  const handleSaveForm = () => {
    saveForm();
    alert('✓ Formulario guardado correctamente');
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que deseas limpiar todas las imágenes?')) {
      setImages({});
      setPages([1]);
      setPersistedImagesData({});
      localStorage.removeItem('plantillaBoletas');
    }
  };

  const addNewPage = () => {
    const newPageNumber = pages.length + 1;
    setPages(prev => [...prev, newPageNumber]);
  };

  const exportToPDF = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const boxWidth = (pageWidth - margin * 2) / 2;
    const boxHeight = (pageHeight - margin * 2) / 2;

    const positions = [
      { x: margin, y: margin },
      { x: margin + boxWidth, y: margin },
      { x: margin, y: margin + boxHeight },
      { x: margin + boxWidth, y: margin + boxHeight }
    ];

    // Procesar todas las páginas
    const allPagePromises = pages.map((pageNum, pageIndex) => {
      const imagePromises = positions.map((pos, index) => {
        return new Promise(resolve => {
          const boxId = `${pageNum}-${index + 1}`;

          if (images[boxId]) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              const dpi = 300;
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

              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.save();
              ctx.filter = `brightness(${images[boxId].brightness}%) contrast(${images[boxId].contrast}%)`;
              ctx.translate(dx + drawWidth / 2, dy + drawHeight / 2);
              ctx.rotate((images[boxId].rotation * Math.PI) / 180);
              ctx.scale(images[boxId].scale, images[boxId].scale);
              
              const scaledOffsetX = (images[boxId].offsetX / 100) * drawWidth;
              const scaledOffsetY = (images[boxId].offsetY / 100) * drawHeight;
              ctx.translate(scaledOffsetX, scaledOffsetY);

              ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
              ctx.restore();

              const imgData = canvas.toDataURL('image/jpeg', 0.9);
              resolve({ imgData, pos, boxWidth, boxHeight, index });
            };
            img.onerror = () => {
              console.error(`Error loading image for box ${boxId}`);
              resolve(null);
            };
            img.src = images[boxId].src;
          } else {
            resolve(null);
          }
        });
      });

      return Promise.all(imagePromises).then(results => ({ pageIndex, results }));
    });

    Promise.all(allPagePromises).then(allPages => {
      allPages.forEach(({ pageIndex, results }) => {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        results.forEach((result, index) => {
          pdf.rect(positions[index].x, positions[index].y, boxWidth, boxHeight);
          
          if (result) {
            const { imgData, pos, boxWidth, boxHeight } = result;
            pdf.addImage(imgData, 'JPEG', pos.x + 1, pos.y + 1, boxWidth - 2, boxHeight - 2);
          }
        });
      });

      pdf.save('plantilla-boletas.pdf');
    });
  };

  const renderImagePreview = (boxId) => {
    const image = images[boxId];
    if (!image) return null;

    return (
      <div className="relative w-full h-full overflow-hidden bg-gray-100 flex items-center justify-center">
        <img
          src={image.src}
          alt={`Cuadro ${boxId}`}
          style={{
            transform: `scale(${image.scale}) rotate(${image.rotation}deg) translateX(${image.offsetX}px) translateY(${image.offsetY}px)`,
            filter: `brightness(${image.brightness}%) contrast(${image.contrast}%)`,
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
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-blue-900/20 p-4 sm:p-6 md:p-8">
        <FormHeader logoSize="small" />

        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-white text-center py-2.5 rounded-xl mb-4 sm:mb-6 shadow-md">
          <h2 className="text-base sm:text-lg font-black tracking-wide">PLANTILLA DE BOLETAS BANCARIAS</h2>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={handleSaveForm}
            className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-500 font-semibold text-sm sm:text-base shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-950 font-semibold text-sm sm:text-base shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            onClick={addNewPage}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold text-sm sm:text-base shadow-sm"
          >
            <ZoomIn className="w-4 h-4" />
            Agregar Nueva Página
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold text-sm sm:text-base shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar
          </button>
        </div>

        {/* Páginas con cuadrícula 2x2 */}
        {pages.map((pageNum) => (
          <div key={pageNum} className="mb-8">
            <h3 className="bg-blue-50/80 border-l-4 border-blue-900 px-3 py-2 font-black text-blue-950 text-sm sm:text-base tracking-wide rounded-r mb-3">
              PÁGINA {pageNum}
            </h3>
            <div className="bg-white border-2 border-blue-900/20 rounded-xl p-4 shadow-sm" style={{ aspectRatio: '8.5/11' }}>
              <div className="grid grid-cols-2 gap-4 h-full">
                {['1', '2', '3', '4'].map((boxNum) => {
                  const boxId = `${pageNum}-${boxNum}`;
                  return (
                    <div
                      key={boxId}
                      className={`relative border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-xl overflow-hidden cursor-pointer transition-all ${
                        editingBox === boxId ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/30' : 'hover:border-blue-500 hover:bg-blue-50/10'
                      }`}
                      onClick={() => setEditingBox(boxId)}
                    >
                      {images[boxId] ? (
                        <>
                          {renderImagePreview(boxId)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteImage(boxId);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg hover:bg-red-600 shadow"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50/40 transition-colors">
                          <Upload className="w-8 h-8 text-blue-400 mb-2" />
                          <p className="text-xs font-bold text-blue-950 text-center px-2">Cuadro {boxNum}</p>
                          <p className="text-[11px] text-slate-500 text-center px-2 mt-1">Pega (Ctrl+V) o haz clic para subir boleta</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(boxId, e)}
                            className="hidden"
                            id={`file-input-${boxId}`}
                          />
                          <label
                            htmlFor={`file-input-${boxId}`}
                            className="mt-2 cursor-pointer bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Subir Imagen
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

        {/* Editor de Imágenes */}
        {editingBox && images[editingBox] && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg border-2 border-blue-500">
            <h3 className="font-bold mb-4 text-gray-800">Editor - Cuadro {editingBox}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Escala: {editSettings.scale.toFixed(2)}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={editSettings.scale}
                  onChange={(e) => updateEditSettings('scale', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Rotación: {editSettings.rotation}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="15"
                  value={editSettings.rotation}
                  onChange={(e) => updateEditSettings('rotation', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Brillo: {editSettings.brightness}%</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="10"
                  value={editSettings.brightness}
                  onChange={(e) => updateEditSettings('brightness', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Contraste: {editSettings.contrast}%</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="10"
                  value={editSettings.contrast}
                  onChange={(e) => updateEditSettings('contrast', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Desplazamiento X: {editSettings.offsetX}px</label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={editSettings.offsetX}
                  onChange={(e) => updateEditSettings('offsetX', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Desplazamiento Y: {editSettings.offsetY}px</label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="5"
                  value={editSettings.offsetY}
                  onChange={(e) => updateEditSettings('offsetY', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={saveImageEdits}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-semibold"
              >
                <Save className="w-4 h-4" />
                Guardar Cambios
              </button>
              <button
                onClick={() => setEditingBox(null)}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}