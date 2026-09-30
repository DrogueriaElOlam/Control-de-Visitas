import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Eye, Trash2, Calendar, Filter, Pencil } from 'lucide-react';
import { getAllHistory, deleteHistoryRecord } from '../lib/supervisionHistory';
import {
  exportRecibosToPDF,
  exportRecibosToExcel,
  exportEvaluacionesToPDF,
  exportEvaluacionesToExcel,
  exportVisitasToPDF,
  exportVisitasToExcel
} from '../lib/supervisionExport';

export default function SupervisionHistory({ onClose, onEdit }) {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState({
    recibos: [],
    evaluaciones: [],
    visitas: []
  });
  const [filteredData, setFilteredData] = useState({
    recibos: [],
    evaluaciones: [],
    visitas: []
  });
  const [selectedType, setSelectedType] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [historyData, selectedType, fechaInicio, fechaFin, vendorFilter]);

  const loadHistory = async () => {
    console.log('Cargando historial...');
    setLoading(true);

    try {
      const filters = {};
      if (fechaInicio) filters.fechaInicio = fechaInicio;
      if (fechaFin) filters.fechaFin = fechaFin;

      const data = await getAllHistory(filters);
      setHistoryData(data);
      console.log('Historial cargado:', data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      alert('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = { ...historyData };

    // Filter by date and vendor
    ['recibos', 'evaluaciones', 'visitas'].forEach(type => {
      filtered[type] = historyData[type].filter(record => {
        // Date filter
        if (fechaInicio || fechaFin) {
          const recordDate = new Date(record.fecha_creacion);
          if (fechaInicio && recordDate < new Date(fechaInicio)) return false;
          if (fechaFin && recordDate > new Date(fechaFin + 'T23:59:59')) return false;
        }

        // Vendor filter
        if (vendorFilter) {
          const filterLower = vendorFilter.toLowerCase();
          const datos = record.datos;
          let matches = false;

          if (type === 'recibos') {
            if (datos.viaticos) {
              matches = datos.viaticos.some(v => v.vendedor && v.vendedor.toLowerCase().includes(filterLower));
            }
            if (!matches && datos.recibos) {
              matches = datos.recibos.some(r => r.vendedor && r.vendedor.toLowerCase().includes(filterLower));
            }
          } else if (type === 'evaluaciones') {
            if (datos.evaluaciones) {
              matches = datos.evaluaciones.some(e => e.vendedor && e.vendedor.toLowerCase().includes(filterLower));
            }
          } else if (type === 'visitas') {
            if (datos.visitas) {
              matches = datos.visitas.some(v => v.proveedor && v.proveedor.toLowerCase().includes(filterLower));
            }
          }
          
          if (!matches) return false;
        }

        return true;
      });
    });

    setFilteredData(filtered);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (type, id) => {
    if (!confirm('¿Está seguro de eliminar este registro del historial?')) {
      return;
    }

    console.log('Eliminando registro:', { type, id });

    try {
      await deleteHistoryRecord(type, id);
      alert('Registro eliminado exitosamente');
      loadHistory();
    } catch (error) {
      console.error('Error al eliminar registro:', error);
      alert('Error al eliminar el registro');
    }
  };

  const handleExportPDF = (record, type) => {
    console.log('Exportando a PDF:', { type, record });

    try {
      switch (type) {
        case 'recibos':
          exportRecibosToPDF(record);
          break;
        case 'evaluaciones':
          exportEvaluacionesToPDF(record);
          break;
        case 'visitas':
          exportVisitasToPDF(record);
          break;
      }
      alert('PDF generado exitosamente');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const handleExportExcel = (record, type) => {
    console.log('Exportando a Excel:', { type, record });

    try {
      switch (type) {
        case 'recibos':
          exportRecibosToExcel(record);
          break;
        case 'evaluaciones':
          exportEvaluacionesToExcel(record);
          break;
        case 'visitas':
          exportVisitasToExcel(record);
          break;
      }
      alert('Excel generado exitosamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      alert('Error al generar el Excel');
    }
  };

  const handleViewDetails = (record, type) => {
    console.log('Viendo detalles:', { type, record });
    setSelectedRecord({ ...record, type });
    setShowDetails(true);
  };

  const getRecordSummary = (record, type) => {
    const datos = record.datos;
    switch (type) {
      case 'recibos':
        return `${datos.viaticos?.length || 0} viáticos, ${datos.recibos?.length || 0} recibos`;
      case 'evaluaciones':
        return `${datos.evaluaciones?.length || 0} evaluaciones`;
      case 'visitas':
        return `${datos.visitas?.length || 0} visitas`;
      default:
        return '';
    }
  };

  const getTotalRecords = () => {
    if (selectedType === 'todos') {
      return filteredData.recibos.length + filteredData.evaluaciones.length + filteredData.visitas.length;
    }
    return filteredData[selectedType]?.length || 0;
  };

  const renderRecordCard = (record, type) => {
    const typeLabels = {
      recibos: 'Control de Recibos de Caja',
      evaluaciones: 'Evaluación de Vendedor',
      visitas: 'Visitas Proveedores'
    };

    const typeColors = {
      recibos: 'bg-blue-50 border-blue-200',
      evaluaciones: 'bg-green-50 border-green-200',
      visitas: 'bg-purple-50 border-purple-200'
    };

    return (
      <div
        key={record.id}
        className={`border rounded-lg p-4 mb-3 ${typeColors[type]}`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold text-gray-800">{typeLabels[type]}</h4>
            <p className="text-sm text-gray-600">{formatDate(record.fecha_creacion)}</p>
            <p className="text-xs text-gray-500 mt-1">{getRecordSummary(record, type)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleViewDetails(record, type)}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Ver detalles"
            >
              <Eye className="w-4 h-4" />
            </button>
            {type === 'evaluaciones' && onEdit && (
              <button
                onClick={() => {
                  onEdit(record);
                  onClose();
                }}
                className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleExportPDF(record, type)}
              className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              title="Exportar a PDF"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleExportExcel(record, type)}
              className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              title="Exportar a Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(type, record.id)}
              className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedRecord) return null;

    const { datos, type, fecha_creacion } = selectedRecord;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold">Detalles del Registro</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Fecha de creación: {formatDate(fecha_creacion)}
            </p>

            {type === 'recibos' && (
              <>
                {datos.viaticos && datos.viaticos.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold mb-3">Viáticos</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border px-4 py-2">Fecha</th>
                            <th className="border px-4 py-2">Vendedor</th>
                            <th className="border px-4 py-2">Gira</th>
                            <th className="border px-4 py-2">Cantidad Viáticos</th>
                            <th className="border px-4 py-2">Total Recibos</th>
                            <th className="border px-4 py-2">Sobrante</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datos.viaticos.map((v, index) => (
                            <tr key={index}>
                              <td className="border px-4 py-2">{v.fecha}</td>
                              <td className="border px-4 py-2">{v.vendedor}</td>
                              <td className="border px-4 py-2">{v.gira}</td>
                              <td className="border px-4 py-2">Q{v.cantidadViaticos}</td>
                              <td className="border px-4 py-2">Q{v.totalRecibos}</td>
                              <td className="border px-4 py-2">Q{v.sobrante}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {datos.recibos && datos.recibos.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Recibos de Caja</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border px-4 py-2">Fecha</th>
                            <th className="border px-4 py-2">Recibo</th>
                            <th className="border px-4 py-2">Monto</th>
                            <th className="border px-4 py-2">Concepto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datos.recibos.map((r, index) => (
                            <tr key={index}>
                              <td className="border px-4 py-2">{r.fecha}</td>
                              <td className="border px-4 py-2">{r.recibo}</td>
                              <td className="border px-4 py-2">Q{r.monto}</td>
                              <td className="border px-4 py-2">{r.concepto}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {datos.observaciones && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-lg font-semibold mb-2 text-gray-800">Observaciones</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{datos.observaciones}</p>
                  </div>
                )}
              </>
            )}

            {type === 'evaluaciones' && datos.evaluaciones && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Evaluaciones</h4>
                <div className="space-y-4">
                  {datos.evaluaciones.map((e, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                        <p><strong>Fecha:</strong> {e.fecha}</p>
                        <p><strong>Vendedor:</strong> {e.vendedor}</p>
                        <p><strong>Ruta:</strong> {e.ruta}</p>
                      </div>
                      
                      {e.aspectos && Array.isArray(e.aspectos) && (
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full border-collapse bg-white text-sm">
                            <thead>
                              <tr className="bg-gray-100">
                                <th className="border p-2 text-left">Aspecto</th>
                                <th className="border p-2 text-center">Check</th>
                                <th className="border p-2 text-center">Max %</th>
                                <th className="border p-2 text-center">Obtenido %</th>
                                <th className="border p-2 text-left">Observaciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {e.aspectos.map((asp, idx) => (
                                <tr key={idx}>
                                  <td className="border p-2">
                                    <div className="font-semibold">{asp.aspecto}</div>
                                    <div className="text-xs text-gray-500">{asp.indicador}</div>
                                  </td>
                                  <td className="border p-2 text-center">{asp.checklist ? 'Sí' : 'No'}</td>
                                  <td className="border p-2 text-center">{asp.porcentaje}%</td>
                                  <td className="border p-2 text-center">{asp.porcentajeRecibido}%</td>
                                  <td className="border p-2 text-xs">{asp.observaciones}</td>
                                </tr>
                              ))}
                              <tr className="bg-blue-50 font-bold">
                                <td colSpan="3" className="border p-2 text-right">TOTAL:</td>
                                <td className="border p-2 text-center text-blue-700">
                                  {e.aspectos.reduce((sum, asp) => sum + (parseFloat(asp.porcentajeRecibido) || 0), 0).toFixed(0)}%
                                </td>
                                <td className="border p-2"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                      
                      {e.observaciones && (
                        <p className="mt-2 text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
                          <strong>Observaciones Generales:</strong> {e.observaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {datos.observaciones && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-lg font-semibold mb-2 text-gray-800">Observaciones Generales</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{datos.observaciones}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'visitas' && datos.visitas && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Visitas</h4>
                <div className="space-y-4">
                  {datos.visitas.map((v, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <p><strong>Fecha de Visita:</strong> {v.fechaVisita}</p>
                      <p><strong>Proveedor:</strong> {v.proveedor}</p>
                      <p><strong>Representante:</strong> {v.representante}</p>
                      <p><strong>Teléfono:</strong> {v.telefono}</p>
                      {v.temasTratados && (
                        <p className="mt-2"><strong>Temas Tratados:</strong> {v.temasTratados}</p>
                      )}
                    </div>
                  ))}
                </div>

                {datos.observaciones && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-lg font-semibold mb-2 text-gray-800">Observaciones Generales</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{datos.observaciones}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
            <h2 className="text-2xl font-bold">Historial de Supervisión</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Tipo de Plantilla
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todos">Todas las Plantillas</option>
                  <option value="recibos">Control de Recibos de Caja</option>
                  <option value="evaluaciones">Evaluación de Vendedor</option>
                  <option value="visitas">Visitas Proveedores</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Vendedor / Proveedor
                </label>
                <input
                  type="text"
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Total de registros: <strong>{getTotalRecords()}</strong>
              </p>
              <button
                onClick={loadHistory}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Actualizar
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Cargando historial...</p>
              </div>
            ) : (
              <>
                {(selectedType === 'todos' || selectedType === 'recibos') && filteredData.recibos.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Control de Recibos de Caja</h3>
                    {filteredData.recibos.map(record => renderRecordCard(record, 'recibos'))}
                  </div>
                )}

                {(selectedType === 'todos' || selectedType === 'evaluaciones') && filteredData.evaluaciones.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Evaluación de Vendedor</h3>
                    {filteredData.evaluaciones.map(record => renderRecordCard(record, 'evaluaciones'))}
                  </div>
                )}

                {(selectedType === 'todos' || selectedType === 'visitas') && filteredData.visitas.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Visitas Proveedores</h3>
                    {filteredData.visitas.map(record => renderRecordCard(record, 'visitas'))}
                  </div>
                )}

                {getTotalRecords() === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No hay registros en el historial</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showDetails && renderDetailsModal()}
    </>
  );
}
