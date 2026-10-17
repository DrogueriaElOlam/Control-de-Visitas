import React, { useState, useEffect } from 'react';
import { X, Edit2, Eye, Printer, Trash2, Calendar, Filter, Share2, ShieldCheck, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isSuperUser, matchesVendorUser } from '../lib/formsPermissions';
import { openAndPrintHtml, downloadHtmlFile } from '../lib/printHtmlHelper';
import { generateLiquidacionRecibosHtml } from '../lib/liquidacionRecibosHtml';

export default function LiquidacionRecibosHistory({ onClose, onEdit, currentUser }) {
  const isSuper = isSuperUser(currentUser);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [ejecutivoFilter, setEjecutivoFilter] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [historyData, fechaInicio, fechaFin, ejecutivoFilter]);

  const loadHistory = async () => {
    console.log('Cargando historial de liquidaciones...');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('liquidacion_recibos_history')
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

    // Restricción por permisos: Si no es Antonio Celada ni Admin, solo ver sus propias liquidaciones de recibos
    if (!isSuper && currentUser?.name) {
      filtered = filtered.filter(record =>
        matchesVendorUser(record.datos?.ejecutivo || record.datos?.liquidadoPor, currentUser.name)
      );
    } else if (ejecutivoFilter) {
      filtered = filtered.filter(record => {
        const ej = record.datos?.ejecutivo || record.datos?.liquidadoPor || '';
        return ej.toLowerCase().includes(ejecutivoFilter.toLowerCase());
      });
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

  const formatCurrency = (value) => {
    if (!value || value === 0) return '';
    return `Q ${new Intl.NumberFormat('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)}`;
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este registro del historial?')) {
      return;
    }

    console.log('Eliminando registro:', id);

    try {
      const { error } = await supabase
        .from('liquidacion_recibos_history')
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
    const datos = record.datos || {};
    const receipts = datos.receipts || [];
    const html = generateLiquidacionRecibosHtml(datos, receipts);

    const cleanName = (datos.ejecutivo || 'recibos')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `Liquidacion_${cleanName}_${formatDate(record.fecha_creacion).replace(/[/:]/g, '-')}`;
    openAndPrintHtml(html, filename);
  };

  const handleShare = async (record) => {
    console.log('Compartiendo registro:', record);

    const datos = record.datos || {};
    const html = generateHTML(record);
    const blob = new Blob([html], { type: 'text/html' });
    const cleanName = (datos.ejecutivo || 'recibos')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `Liquidacion_${cleanName}_${formatDate(record.fecha_creacion).replace(/[/:]/g, '-')}.html`;
    const file = new File([blob], fileName, { type: 'text/html' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Liquidación de Recibos',
          text: `Liquidación de ${datos.ejecutivo || 'Recibos'}`
        });
        console.log('Compartido exitosamente');
      } catch (error) {
        console.error('Error al compartir:', error);
        downloadHTML(html, fileName);
      }
    } else {
      downloadHTML(html, fileName);
    }
  };

  const generateHTML = (record) => {
    const datos = record.datos || {};
    const receipts = datos.receipts || [];
    return generateLiquidacionRecibosHtml(datos, receipts);
  };

  const downloadHTML = (html, filename) => {
    downloadHtmlFile(html, filename);
  };

  const formatDateSimple = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateTotals = (receipts) => {
    return receipts.reduce((acc, receipt) => {
      const boletas = parseFloat(receipt.boletas) || 0;
      const efectivo = parseFloat(receipt.efectivo) || 0;
      const cheque = parseFloat(receipt.cheque) || 0;

      return {
        boletas: acc.boletas + boletas,
        efectivo: acc.efectivo + efectivo,
        cheque: acc.cheque + cheque,
        total: acc.total + boletas + efectivo + cheque
      };
    }, { boletas: 0, efectivo: 0, cheque: 0, total: 0 });
  };

  const renderDetailsModal = () => {
    if (!selectedRecord) return null;

    const { datos, fecha_creacion } = selectedRecord;
    const receipts = datos.receipts || [];
    const totals = calculateTotals(receipts);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold">Detalles de Liquidación</h3>
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
                  <span className="font-semibold">Ejecutivo:</span> {datos.ejecutivo}
                </div>
                <div>
                  <span className="font-semibold">Ruta Cubierta:</span> {datos.rutaCubierta}
                </div>
                <div>
                  <span className="font-semibold">Semana del:</span> {formatDateSimple(datos.semanaDesde)}
                </div>
                <div>
                  <span className="font-semibold">Semana al:</span> {formatDateSimple(datos.semanaHasta)}
                </div>
                <div>
                  <span className="font-semibold">Liquidado Por:</span> {datos.liquidadoPor}
                </div>
                <div>
                  <span className="font-semibold">Revisado Por:</span> {datos.revisadoPor}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Fecha de creación:</span> {formatDate(fecha_creacion)}
                </div>
              </div>
            </div>

            <h4 className="text-lg font-semibold mb-3">Recibos de Caja</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-blue-700 text-white">
                  <tr>
                    <th className="border px-4 py-2">Recibo</th>
                    <th className="border px-4 py-2">Código</th>
                    <th className="border px-4 py-2">Cliente</th>
                    <th className="border px-4 py-2">Boletas</th>
                    <th className="border px-4 py-2">Efectivo</th>
                    <th className="border px-4 py-2">Cheque</th>
                    <th className="border px-4 py-2 bg-blue-800 text-amber-300">Total (Q)</th>
                    <th className="border px-4 py-2">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt, index) => {
                    const rowTotal = (parseFloat(receipt.boletas) || 0) + (parseFloat(receipt.efectivo) || 0) + (parseFloat(receipt.cheque) || 0);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border px-4 py-2 font-bold">{receipt.recibo}</td>
                        <td className="border px-4 py-2 font-mono">{receipt.codigo}</td>
                        <td className="border px-4 py-2 font-semibold">{receipt.cliente}</td>
                        <td className="border px-4 py-2 text-right">{formatCurrency(parseFloat(receipt.boletas) || 0)}</td>
                        <td className="border px-4 py-2 text-right">{formatCurrency(parseFloat(receipt.efectivo) || 0)}</td>
                        <td className="border px-4 py-2 text-right">{formatCurrency(parseFloat(receipt.cheque) || 0)}</td>
                        <td className="border px-4 py-2 text-right font-bold text-emerald-700 bg-emerald-50/50">{formatCurrency(rowTotal)}</td>
                        <td className="border px-4 py-2 text-gray-700">{receipt.observaciones}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-black text-white font-bold">
                  <tr>
                    <td colSpan="3" className="border px-4 py-2 text-center">TOTALES:</td>
                    <td className="border px-4 py-2 text-right">{formatCurrency(totals.boletas)}</td>
                    <td className="border px-4 py-2 text-right">{formatCurrency(totals.efectivo)}</td>
                    <td className="border px-4 py-2 text-right">{formatCurrency(totals.cheque)}</td>
                    <td className="border px-4 py-2 text-right text-amber-300">{formatCurrency(totals.total)}</td>
                    <td className="border px-4 py-2 text-center text-xs text-gray-400">✔</td>
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
              <button
                onClick={() => handleShare(selectedRecord)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Compartir
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
          <h2 className="text-xl font-bold">Historial de Liquidaciones</h2>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ejecutivo de Ventas:
                </label>
                {isSuper ? (
                  <input
                    type="text"
                    value={ejecutivoFilter}
                    onChange={(e) => setEjecutivoFilter(e.target.value)}
                    placeholder="Filtrar por cualquier ejecutivo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                  />
                ) : (
                  <div className="w-full px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                    <UserCheck size={15} className="text-emerald-600 shrink-0" />
                    <span>{currentUser?.name || 'Vendedor'} (Tus recibos)</span>
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
                        Liquidación de Recibos
                      </h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ejecutivo:</span> {record.datos.ejecutivo}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ruta:</span> {record.datos.rutaCubierta}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Semana:</span> {formatDateSimple(record.datos.semanaDesde)} - {formatDateSimple(record.datos.semanaHasta)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Creado: {formatDate(record.fecha_creacion)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Recibos: {record.datos.receipts?.length || 0}
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
                        onClick={() => handleShare(record)}
                        className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
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
