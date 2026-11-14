import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Edit2,
  Trash2,
  Eye,
  Filter,
  RotateCw,
  Image as ImageIcon,
  Calendar,
  UserCheck,
  ShieldCheck,
  Layers
} from 'lucide-react';
import { isSuperUser, matchesVendorUser } from '../lib/formsPermissions';
import {
  fetchPlantillaBoletasHistory,
  deletePlantillaBoletasRecord,
  getLocalBoletasHistory,
  OFFICIAL_VENDORS_LIST,
  printBoletasWithExactBaking,
  downloadBoletasHtmlWithExactBaking,
  loadImageElement,
  drawBoletaOnCanvas
} from '../lib/plantillaBoletasHelper';

function BoletaHistoryCanvas({ image }) {
  const canvasRef = useRef(null);

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

  return <canvas ref={canvasRef} width={880} height={1100} className="w-full h-full block bg-white" />;
}

export default function PlantillaBoletasHistory({ onClose, onEdit, currentUser }) {
  const isSuper = isSuperUser(currentUser);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState(() => getLocalBoletasHistory());
  const [vendedorFilter, setVendedorFilter] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [previewRecord, setPreviewRecord] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await fetchPlantillaBoletasHistory();
      setHistoryData(records || []);
    } catch (err) {
      console.error('Error cargando historial de boletas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    let list = [...historyData];

    if (!isSuper && currentUser?.name) {
      list = list.filter((rec) => matchesVendorUser(rec.vendedor, currentUser.name));
    } else if (vendedorFilter) {
      list = list.filter((rec) =>
        (rec.vendedor || '').toLowerCase().includes(vendedorFilter.toLowerCase()) ||
        (rec.ruta || '').toLowerCase().includes(vendedorFilter.toLowerCase()) ||
        (rec.referencia || '').toLowerCase().includes(vendedorFilter.toLowerCase())
      );
    }

    if (fechaInicio || fechaFin) {
      list = list.filter((rec) => {
        const dateStr = rec.fecha || (rec.fecha_creacion ? rec.fecha_creacion.split('T')[0] : '');
        if (!dateStr) return true;
        if (fechaInicio && dateStr < fechaInicio) return false;
        if (fechaFin && dateStr > fechaFin) return false;
        return true;
      });
    }

    return list;
  }, [historyData, isSuper, currentUser?.name, vendedorFilter, fechaInicio, fechaFin]);

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('es-GT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return isoStr;
    }
  };

  const getFileNameForRecord = (record) => {
    const vendClean = (record?.vendedor || 'General').trim().replace(/\s+/g, '_');
    const fechaStr = record?.fecha || new Date().toISOString().split('T')[0];
    return `Plantilla_Boletas_${vendClean}_${fechaStr}`;
  };

  const handlePrintRecord = async (record) => {
    await printBoletasWithExactBaking({
      pages: record.pages,
      images: record.images,
      metadata: {
        vendedor: record.vendedor,
        ruta: record.ruta,
        referencia: record.referencia,
        fecha: record.fecha
      },
      fallbackTitle: getFileNameForRecord(record)
    });
  };

  const handleDownloadHtmlRecord = async (record) => {
    await downloadBoletasHtmlWithExactBaking({
      pages: record.pages,
      images: record.images,
      metadata: {
        vendedor: record.vendedor,
        ruta: record.ruta,
        referencia: record.referencia,
        fecha: record.fecha
      },
      fileName: `${getFileNameForRecord(record)}.html`
    });
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('¿Está seguro de eliminar esta plantilla de boletas del historial?')) {
      return;
    }
    await deletePlantillaBoletasRecord(recordId);
    await loadHistory();
    if (previewRecord && String(previewRecord.id) === String(recordId)) {
      setPreviewRecord(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-900/20 max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera del Historial */}
        <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-emerald-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <Layers className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black tracking-wide">
                Historial de Plantillas de Boletas
              </h2>
              <p className="text-xs text-blue-200 flex items-center gap-1.5 mt-0.5">
                {isSuper ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Vista Administrador • Impresión inmediata de plantillas de todos los vendedores</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mis Plantillas Guardadas ({currentUser?.name})</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition-all cursor-pointer"
              title="Sincronizar con la nube"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-600 text-white transition-all cursor-pointer"
              title="Cerrar Historial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            {isSuper && (
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-blue-700" />
                  Filtrar por Vendedor / Ruta
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={vendedorFilter}
                    onChange={(e) => setVendedorFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="">Todos los vendedores ({historyData.length})</option>
                    {OFFICIAL_VENDORS_LIST.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                Desde Fecha
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                Hasta Fecha
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 bg-white"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              {(vendedorFilter || fechaInicio || fechaFin) && (
                <button
                  type="button"
                  onClick={() => {
                    setVendedorFilter('');
                    setFechaInicio('');
                    setFechaFin('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Limpiar Filtros
                </button>
              )}
              <div className="px-3 py-2 rounded-xl bg-blue-100 text-blue-900 text-xs font-black">
                {filteredData.length} plantilla{filteredData.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {/* Contenido Principal del Historial */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          {loading && filteredData.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Cargando plantillas almacenadas en la nube...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center max-w-lg mx-auto my-6">
              <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-800 mb-1">
                No hay plantillas de boletas registradas con este filtro
              </h3>
              <p className="text-xs text-slate-500">
                Cuando tú o los vendedores guarden una plantilla de boletas en el formulario, aparecerá aquí lista para imprimir o descargar en cualquier momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredData.map((record) => {
                const thumbKeys = Object.keys(record.images || {}).filter((k) => Boolean(record.images[k]?.src));
                const firstFourThumbs = thumbKeys.slice(0, 4).map((k) => record.images[k]);

                return (
                  <div
                    key={record.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col justify-between gap-3"
                  >
                    {/* Encabezado de tarjeta */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-900 text-white text-xs font-black">
                            {record.vendedor || 'General'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                            {record.totalBoletas} boleta{record.totalBoletas === 1 ? '' : 's'} • {record.totalPaginas} pág{record.totalPaginas === 1 ? '' : 's'}.
                          </span>
                        </div>
                        {(record.ruta || record.referencia) && (
                          <p className="text-xs font-bold text-slate-700 mt-1.5">
                            {record.ruta ? `📍 Ruta: ${record.ruta}` : ''}
                            {record.ruta && record.referencia ? ' • ' : ''}
                            {record.referencia ? `📝 ${record.referencia}` : ''}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Fecha plantilla: <strong>{record.fecha}</strong> • Guardado: {formatDateTime(record.fecha_creacion)}
                        </p>
                      </div>
                    </div>

                    {/* Miniaturas de las boletas */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80 h-24">
                      {[0, 1, 2, 3].map((idx) => {
                        const thumb = firstFourThumbs[idx];
                        return (
                          <div
                            key={idx}
                            onClick={() => setPreviewRecord(record)}
                            className="relative bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all"
                            title="Ver vista previa de las boletas"
                          >
                            {thumb?.src ? (
                              <img
                                src={thumb.src}
                                alt={`Miniatura ${idx + 1}`}
                                className="max-w-full max-h-full object-contain"
                                style={{
                                  transform: `rotate(${thumb.rotation || 0}deg)`
                                }}
                              />
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold">Vacío</span>
                            )}
                            {idx === 3 && thumbKeys.length > 4 && (
                              <div className="absolute inset-0 bg-slate-900/70 text-white flex items-center justify-center font-black text-xs">
                                +{thumbKeys.length - 4} más
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Botones de Acción Rápida (Imprimir directo, Vista previa, Cargar, Descargar, Eliminar) */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={() => handlePrintRecord(record)}
                        className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                        title="Imprimir inmediatamente esta plantilla de boletas"
                      >
                        <Printer className="w-4 h-4" />
                        <span>🖨️ Imprimir Plantilla</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewRecord(record)}
                        className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-900 text-xs font-bold transition-all cursor-pointer"
                        title="Ver todas las páginas en pantalla"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Ver</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadHtmlRecord(record)}
                        className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-xs font-bold transition-all cursor-pointer"
                        title="Descargar archivo HTML imprimible"
                      >
                        <Download className="w-4 h-4" />
                        <span>HTML</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (onEdit) onEdit(record);
                          onClose();
                        }}
                        className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer"
                        title="Cargar en el formulario para editar o agregar más boletas"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Cargar / Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 transition-all cursor-pointer"
                        title="Eliminar del historial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Interno de Vista Previa de Todas las Páginas */}
        {previewRecord && (
          <div className="fixed inset-0 bg-slate-950/85 z-[10000] flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm sm:text-base font-black">
                    Vista Previa: {previewRecord.vendedor} ({previewRecord.fecha})
                  </h3>
                  <p className="text-xs text-slate-300">
                    {previewRecord.totalBoletas} boleta(s) en {previewRecord.totalPaginas} página(s)
                    {previewRecord.ruta ? ` • Ruta: ${previewRecord.ruta}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintRecord(previewRecord)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ Imprimir Ahora</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewRecord(null)}
                    className="p-1.5 rounded-xl bg-white/15 hover:bg-red-600 text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 space-y-6">
                {(previewRecord.pages || [1]).map((pageNum) => (
                  <div key={pageNum} className="bg-white rounded-xl border border-slate-300 p-4 shadow-sm">
                    <div className="text-xs font-black text-blue-950 mb-3 border-b pb-1.5 flex justify-between">
                      <span>PÁGINA {pageNum}</span>
                      <span>{previewRecord.vendedor} • {previewRecord.fecha}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {['1', '2', '3', '4'].map((boxNum) => {
                        const boxId = `${pageNum}-${boxNum}`;
                        const img = previewRecord.images?.[boxId];
                        return (
                          <div
                            key={boxId}
                            style={{ aspectRatio: '4 / 5' }}
                            className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center relative"
                          >
                            <span className="absolute top-1.5 left-1.5 z-10 bg-slate-900/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Cuadro {boxNum}
                            </span>
                            {img?.src ? (
                              <BoletaHistoryCanvas image={img} />
                            ) : (
                              <span className="text-xs text-slate-400">Sin boleta</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

