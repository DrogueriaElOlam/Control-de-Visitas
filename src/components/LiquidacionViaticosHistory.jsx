import React, { useState, useEffect } from 'react';
import { X, Edit2, Eye, Printer, Trash2, Calendar, Filter, Share2, ShieldCheck, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isSuperUser, matchesVendorUser } from '../lib/formsPermissions';
import { LOGO_DATA_URI } from '../lib/logo';

export default function LiquidacionViaticosHistory({ onClose, onEdit, currentUser }) {
  const isSuper = isSuperUser(currentUser);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [liquidadoPorFilter, setLiquidadoPorFilter] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [historyData, fechaInicio, fechaFin, liquidadoPorFilter]);

  const loadHistory = async () => {
    console.log('Cargando historial de viáticos...');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('liquidacion_viaticos_history')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('Error al cargar historial:', error);
        throw error;
      }

      console.log('Historial cargado:', data);
      setHistoryData(data || []);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      alert('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...historyData];

    // Restricción por permisos: Si no es Antonio Celada ni Admin, solo ver sus propias liquidaciones
    if (!isSuper && currentUser?.name) {
      filtered = filtered.filter(record => 
        matchesVendorUser(record.datos?.liquidadoPor, currentUser.name)
      );
    } else if (liquidadoPorFilter) {
      filtered = filtered.filter(record => 
        record.datos?.liquidadoPor && 
        record.datos.liquidadoPor.toLowerCase().includes(liquidadoPorFilter.toLowerCase())
      );
    }

    if (fechaInicio || fechaFin) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.fecha_creacion);
        if (fechaInicio && recordDate < new Date(fechaInicio)) return false;
        if (fechaFin && recordDate > new Date(fechaFin + 'T23:59:59')) return false;
        return true;
      });
    }

    setFilteredData(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateSimple = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    return `Q ${new Intl.NumberFormat('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(value) || 0)}`;
  };

  const calculateTotal = (gastos) => {
    if (!gastos) return 0;
    return gastos.reduce((sum, gasto) => {
      const alimentacion = parseFloat(gasto.alimentacion) || 0;
      const hotel = parseFloat(gasto.hotel) || 0;
      const combustible = parseFloat(gasto.combustible) || 0;
      const peajeParqueo = parseFloat(gasto.peajeParqueo) || 0;
      const fotocopias = parseFloat(gasto.fotocopias) || 0;
      const varios = parseFloat(gasto.varios) || 0;
      return sum + alimentacion + hotel + combustible + peajeParqueo + fotocopias + varios;
    }, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este registro del historial?')) {
      return;
    }

    console.log('Eliminando registro:', id);

    try {
      const { error } = await supabase
        .from('liquidacion_viaticos_history')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar:', error);
        throw error;
      }

      alert('Registro eliminado exitosamente');
      loadHistory();
    } catch (error) {
      console.error('Error al eliminar registro:', error);
      alert('Error al eliminar el registro');
    }
  };

  const handleEdit = (record) => {
    console.log('Editando registro:', record);
    if (onEdit) {
      onEdit(record);
    }
    onClose();
  };

  const handleViewDetails = (record) => {
    console.log('Viendo detalles:', record);
    setSelectedRecord(record);
    setShowDetails(true);
  };

  const handleExportHTML = (record) => {
    console.log('Exportando a HTML:', record);

    const datos = record.datos;
    const gastos = datos.gastos || [];
    
    // Calcular totales por categoría
    const calcularTotalPorCategoria = (categoria) => {
      return gastos.reduce((sum, gasto) => {
        return sum + (parseFloat(gasto[categoria]) || 0);
      }, 0);
    };

    const totales = {
      alimentacion: calcularTotalPorCategoria('alimentacion'),
      hotel: calcularTotalPorCategoria('hotel'),
      peajes: calcularTotalPorCategoria('peajeParqueo'),
      combustibles: calcularTotalPorCategoria('combustible'),
      fotocopias: calcularTotalPorCategoria('fotocopias'),
      varios: calcularTotalPorCategoria('varios')
    };
    
    const granTotal = Object.values(totales).reduce((sum, val) => sum + val, 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Liquidación de Gastos Por Viáticos</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: landscape;
            margin: 0.5cm 0.8cm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.2;
            color: #000;
            min-width: 1024px; /* Forzar ancho para asegurar horizontalidad en móviles */
          }
          
          .container {
            width: 100%;
            max-width: 100%;
          }
          
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 4px;
          }
          
          .logo-section {
            width: 110pt;
            flex-shrink: 0;
          }
          
          .logo {
            width: 110pt;
            height: auto;
            object-fit: contain;
          }
          
          .title-section {
            flex: 1;
            text-align: center;
            padding: 0 15px;
          }
          
          .main-title {
            font-size: 16pt;
            font-weight: bold;
            color: #1e3a8a;
            line-height: 1.2;
          }
          
          .top-fields {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 9pt;
          }
          
          .field-group {
            display: flex;
            align-items: center;
          }
          
          .field-label {
            font-weight: bold;
            margin-right: 6px;
          }
          
          .field-value {
            border-bottom: 1px solid #000;
            min-width: 150px;
            padding: 1px 4px;
          }
          
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
            font-size: 8pt;
            table-layout: auto;
          }
          
          .main-table th {
            background-color: #dbeafe;
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: center;
            font-weight: bold;
            font-size: 7.5pt;
            line-height: 1.1;
            white-space: nowrap;
          }
          
          .main-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            text-align: center;
            font-size: 8pt;
            line-height: 1.1;
          }
          
          .main-table td.text-left {
            text-align: left;
            padding-left: 6px;
          }
          
          .main-table td.text-right {
            text-align: right;
            padding-right: 6px;
          }
          
          .totals-row {
            background-color: #f3f4f6;
            font-weight: bold;
            font-size: 8.5pt;
          }
          
          .grand-total {
            text-align: right;
            font-size: 11pt;
            font-weight: bold;
            margin: 10px 0;
            padding: 5px 10px;
            background-color: #1e3a8a;
            color: white;
            border-radius: 4px;
          }
          
          .signatures {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            gap: 40px;
          }
          
          .signature-box {
            flex: 1;
            text-align: center;
          }
          
          .signature-name {
            font-weight: bold;
            font-size: 9pt;
            margin-bottom: 4px;
            padding-top: 8px;
            border-top: 1.5px solid #000;
          }
          
          .signature-title {
            font-size: 8pt;
            color: #333;
            font-style: italic;
          }

          .print-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #1e3a8a;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14pt;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          }

          @media print {
            .print-button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-section">
              <img src="${LOGO_DATA_URI}" class="logo" alt="Logo Droguería El Olam" />
            </div>
            <div class="title-section">
              <div class="main-title">Liquidación de Gastos Por Viáticos</div>
            </div>
          </div>
          
          <div class="top-fields">
            <div class="field-group">
              <span class="field-label">RUTA/GIRA:</span>
              <span class="field-value">${datos.ruta || ''}</span>
            </div>
            <div class="field-group">
              <span class="field-label">LIQUIDADO POR:</span>
              <span class="field-value">${datos.liquidadoPor || ''}</span>
            </div>
            <div class="field-group">
              <span class="field-label">FECHAS:</span>
              <span class="field-value">${formatDateSimple(datos.fechaSalida)} al ${formatDateSimple(datos.fechaRegreso)}</span>
            </div>
          </div>
          
          <table class="main-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>No. FACTURA</th>
                <th>ESTABLECIMIENTO</th>
                <th>ALIMENTACIÓN</th>
                <th>HOTEL</th>
                <th>PEAJES Y<br>PARQUEOS</th>
                <th>COMBUSTIBLES</th>
                <th>FOTOCOPIAS</th>
                <th>VARIOS</th>
              </tr>
            </thead>
            <tbody>
              ${gastos.map(gasto => `
                <tr>
                  <td>${formatDateSimple(gasto.fecha)}</td>
                  <td>${gasto.numeroDocumento || ''}</td>
                  <td class="text-left">${gasto.establecimiento || ''}</td>
                  <td class="text-right">${formatCurrency(gasto.alimentacion)}</td>
                  <td class="text-right">${formatCurrency(gasto.hotel)}</td>
                  <td class="text-right">${formatCurrency(gasto.peajeParqueo)}</td>
                  <td class="text-right">${formatCurrency(gasto.combustible)}</td>
                  <td class="text-right">${formatCurrency(gasto.fotocopias)}</td>
                  <td class="text-right">${formatCurrency(gasto.varios)}</td>
                </tr>
              `).join('')}
              <tr class="totals-row">
                <td colspan="3" style="text-align: right; padding-right: 10px;">TOTALES POR CATEGORÍA:</td>
                <td class="text-right">${formatCurrency(totales.alimentacion)}</td>
                <td class="text-right">${formatCurrency(totales.hotel)}</td>
                <td class="text-right">${formatCurrency(totales.peajes)}</td>
                <td class="text-right">${formatCurrency(totales.combustibles)}</td>
                <td class="text-right">${formatCurrency(totales.fotocopias)}</td>
                <td class="text-right">${formatCurrency(totales.varios)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="grand-total">
            GRAN TOTAL: ${formatCurrency(granTotal)}
          </div>
          
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-name">${datos.liquidadoPor || ''}</div>
              <div class="signature-title">Ejecutivo de Ventas</div>
            </div>
            <div class="signature-box">
              <div class="signature-name">REVISADO POR</div>
              <div class="signature-title">Depto. Contabilidad</div>
            </div>
          </div>

          <button class="print-button" onclick="window.print()">🖨️ Imprimir</button>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Wait for content to load
      setTimeout(() => {
        // printWindow.print(); // Optional: Auto-print
      }, 500);
    } else {
      alert('Por favor, permite las ventanas emergentes para exportar el formulario.');
    }
  };

  const renderDetailsModal = () => {
    if (!selectedRecord) return null;

    const { datos, fecha_creacion } = selectedRecord;
    const gastos = datos.gastos || [];
    const granTotal = calculateTotal(gastos);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold">Detalles de Liquidación de Viáticos</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold mb-3">Información General</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold">Ruta/Gira:</span> {datos.ruta}
                </div>
                <div>
                  <span className="font-semibold">Liquidado Por:</span> {datos.liquidadoPor}
                </div>
                <div>
                  <span className="font-semibold">Fecha Salida:</span> {formatDateSimple(datos.fechaSalida)}
                </div>
                <div>
                  <span className="font-semibold">Fecha Regreso:</span> {formatDateSimple(datos.fechaRegreso)}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Fecha de creación:</span> {formatDate(fecha_creacion)}
                </div>
              </div>
            </div>

            <h4 className="text-lg font-semibold mb-3">Detalle de Gastos</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-blue-700 text-white">
                  <tr>
                    <th className="border px-2 py-2">Fecha</th>
                    <th className="border px-2 py-2">No. Doc</th>
                    <th className="border px-2 py-2">Establecimiento</th>
                    <th className="border px-2 py-2">Alimentación</th>
                    <th className="border px-2 py-2">Hotel</th>
                    <th className="border px-2 py-2">Combustible</th>
                    <th className="border px-2 py-2">Peaje/Parqueo</th>
                    <th className="border px-2 py-2">Fotocopias</th>
                    <th className="border px-2 py-2">Varios</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((gasto, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border px-2 py-1">{formatDateSimple(gasto.fecha)}</td>
                      <td className="border px-2 py-1">{gasto.numeroDocumento}</td>
                      <td className="border px-2 py-1">{gasto.establecimiento}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(gasto.alimentacion)}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(gasto.hotel)}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(gasto.combustible)}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(gasto.peajeParqueo)}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(gasto.fotocopias)}</td>
                      <td className="border px-2 py-1 text-right">{formatCurrency(gasto.varios)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-black text-white font-bold">
                  <tr>
                    <td colSpan="3" className="border px-4 py-2 text-right">TOTALES:</td>
                    <td className="border px-2 py-2 text-right">
                       {formatCurrency(gastos.reduce((sum, g) => sum + (parseFloat(g.alimentacion) || 0), 0))}
                    </td>
                    <td className="border px-2 py-2 text-right">
                       {formatCurrency(gastos.reduce((sum, g) => sum + (parseFloat(g.hotel) || 0), 0))}
                    </td>
                    <td className="border px-2 py-2 text-right">
                       {formatCurrency(gastos.reduce((sum, g) => sum + (parseFloat(g.combustible) || 0), 0))}
                    </td>
                    <td className="border px-2 py-2 text-right">
                       {formatCurrency(gastos.reduce((sum, g) => sum + (parseFloat(g.peajeParqueo) || 0), 0))}
                    </td>
                    <td className="border px-2 py-2 text-right">
                       {formatCurrency(gastos.reduce((sum, g) => sum + (parseFloat(g.fotocopias) || 0), 0))}
                    </td>
                    <td className="border px-2 py-2 text-right">
                       {formatCurrency(gastos.reduce((sum, g) => sum + (parseFloat(g.varios) || 0), 0))}
                    </td>
                  </tr>
                  <tr>
                     <td colSpan="9" className="border px-4 py-2 text-right text-lg bg-blue-900">
                        GRAN TOTAL: {formatCurrency(granTotal)}
                     </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => handleExportHTML(selectedRecord)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Printer className="w-5 h-5" />
                Ver e Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Historial de Viáticos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio:
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin:
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Liquidado Por:
                </label>
                {isSuper ? (
                  <input
                    type="text"
                    value={liquidadoPorFilter}
                    onChange={(e) => setLiquidadoPorFilter(e.target.value)}
                    placeholder="Filtrar por cualquier vendedor..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                ) : (
                  <div className="w-full px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                    <UserCheck size={15} className="text-emerald-600 shrink-0" />
                    <span>{currentUser?.name || 'Vendedor'} (Tus liquidaciones)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Cargando historial...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No hay registros en el historial</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-3">
                Total de registros: {filteredData.length}
              </p>
              {filteredData.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-4 bg-blue-50 border-blue-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">
                        Liquidación de Viáticos
                      </h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Liquidado Por:</span> {record.datos.liquidadoPor}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ruta:</span> {record.datos.ruta}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Fechas:</span> {formatDateSimple(record.datos.fechaSalida)} - {formatDateSimple(record.datos.fechaRegreso)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Creado: {formatDate(record.fecha_creacion)}
                      </p>
                      <p className="text-xs text-gray-500 font-bold mt-1">
                         Total: {formatCurrency(calculateTotal(record.datos.gastos))}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => handleEdit(record)}
                        className="p-2 bg-yellow-400 text-black rounded hover:bg-yellow-500 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewDetails(record)}
                        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportHTML(record)}
                        className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        title="Ver e Imprimir"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExportHTML(record)}
                        className="p-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        title="Compartir"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showDetails && renderDetailsModal()}
      </div>
    </div>
  );
}
