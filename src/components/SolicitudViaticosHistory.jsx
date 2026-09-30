import React, { useState, useEffect } from 'react';
import { X, Edit2, Eye, Printer, Trash2, Filter, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SolicitudViaticosHistory({ onClose, onEdit }) {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [historyData, fechaInicio, fechaFin]);

  const loadHistory = async () => {
    console.log('Cargando historial de viáticos...');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('solicitud_viaticos_history')
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

    if (fechaInicio || fechaFin) {
      filtered = historyData.filter(record => {
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
    // Handle YYYY-MM-DD format manually to avoid timezone issues
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return 'Q 0.00';
    return `Q ${parseFloat(value).toFixed(2)}`;
  };

  const calcularTotal = (datos) => {
    const valores = [
      parseFloat(datos.combustible) || 0,
      parseFloat(datos.alimentacion) || 0,
      parseFloat(datos.hospedaje) || 0,
      parseFloat(datos.fotocopias) || 0,
      parseFloat(datos.otros) || 0
    ];
    return valores.reduce((sum, val) => sum + val, 0).toFixed(2);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este registro del historial?')) {
      return;
    }

    console.log('Eliminando registro:', id);

    try {
      const { error } = await supabase
        .from('solicitud_viaticos_history')
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

  const generateHTML = (record) => {
    const datos = record.datos;
    const total = calcularTotal(datos);
    // Use creation date as request date if available, or current date
    const today = record.fecha_creacion ? new Date(record.fecha_creacion) : new Date();
    const fechaSolicitud = today.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de Viáticos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 0; }
    .container { width: 6in; height: 8in; margin: 0 auto; border: 4px solid #000; padding: 0.3in; box-sizing: border-box; position: relative; }
    .fecha-solicitud { position: absolute; top: 0.3in; right: 0.3in; font-size: 11px; font-weight: bold; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; margin-top: 20px; }
    .header-left { width: 70%; vertical-align: top; padding-right: 10px; }
    .header-right { width: 30%; text-align: right; vertical-align: top; }
    .header-left h2 { font-size: 9px; margin-bottom: 2px; font-weight: bold; }
    .header-left p { font-size: 7px; color: #666; margin: 1px 0; line-height: 1.3; }
    .header-right img { width: 100px; height: auto; display: block; }
    .title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 8px; }
    .header-section { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    .header-field { display: flex; align-items: center; gap: 5px; }
    .header-field-label { font-weight: bold; font-size: 11px; white-space: nowrap; }
    .header-field-line { flex: 1; border-bottom: 2px solid #000; min-height: 18px; padding: 0 5px; font-size: 9px; }
    .dates-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    .date-field { display: flex; align-items: center; gap: 5px; }
    .date-label { font-weight: bold; font-size: 11px; white-space: nowrap; }
    .date-line { flex: 1; border-bottom: 2px solid #000; min-height: 18px; padding: 0 5px; font-size: 9px; }
    .lugares-section { margin-bottom: 8px; }
    .lugares-label { font-weight: bold; font-size: 11px; margin-bottom: 3px; }
    .lugares-box { border: 2px solid #000; min-height: 40px; padding: 3px; font-size: 9px; text-transform: uppercase; }
    .valores-title { font-size: 22px; font-weight: bold; text-align: center; margin: 10px 0; }
    .values-container { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px; }
    .values-left { }
    .values-right { display: flex; flex-direction: column; justify-content: flex-end; }
    .values-table { width: 100%; font-size: 9px; border-collapse: collapse; }
    .values-table td { padding: 3px 0; }
    .total-box { border: 2px solid #000; padding: 8px; text-align: right; font-size: 12px; font-weight: bold; }
    .authorization-space { margin-top: 15px; border-top: 2px solid #000; padding-top: 5px; min-height: 50px; }
    .signatures-table { width: 100%; margin-top: 15px; border-collapse: collapse; font-size: 7px; }
    .signatures-table td { text-align: center; border-top: 2px solid #000; padding-top: 5px; width: 25%; height: 40px; }
    @page { size: 6in 8in; margin: 0; }
    @media print {
      body { padding: 0; }
      .container { border: 4px solid #000; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="fecha-solicitud"><strong>Fecha de Solicitud:</strong> ${fechaSolicitud}</div>
    
    <table class="header-table">
      <tr>
        <td class="header-left">
          <h2>DISTRIBUIDORA COMERCIAL EL OLAM S.A.</h2>
          <p>7a. Avenida "A" 17-67 Zona 13, Guatemala<br>Teléfonos: 2308-4353, 2332-7814, 2339-4613</p>
        </td>
        <td class="header-right">
          <img src="/logo.png" style="width: 100px; height: auto; display: block;">
        </td>
      </tr>
    </table>

    <div class="title">SOLICITUD DE VIATICOS</div>

    <div class="header-section">
      <div class="header-field">
        <span class="header-field-label">EJECUTIVO DE VENTAS:</span>
        <div class="header-field-line">${datos.vendedor || ''}</div>
      </div>
      <div class="header-field">
        <span class="header-field-label">RUTA A:</span>
        <div class="header-field-line">${datos.rutaA || ''}</div>
      </div>
    </div>

    <div class="dates-row">
      <div class="date-field">
        <span class="date-label">FECHA INICIAL:</span>
        <div class="date-line">${datos.fechaInicial || ''}</div>
      </div>
      <div class="date-field">
        <span class="date-label">FECHA FINAL:</span>
        <div class="date-line">${datos.fechaFinal || ''}</div>
      </div>
    </div>

    <div class="lugares-section">
      <div class="lugares-label">LUGARES A VISITAR:</div>
      <div class="lugares-box">${(datos.lugaresVisitar || '').toUpperCase()}</div>
    </div>

    <div class="valores-title">VALORES APROXIMADOS</div>

    <div class="values-container">
      <div class="values-left">
        <table class="values-table">
          <tr>
            <td style="width: 100%;"><strong>COMBUSTIBLE:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${datos.combustible || '0.00'}</td>
          </tr>
          <tr>
            <td style="width: 100%; padding-top: 5px;"><strong>ALIMENTACION:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${datos.alimentacion || '0.00'}</td>
          </tr>
          <tr>
            <td style="width: 100%; padding-top: 5px;"><strong>HOSPEDAJE:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${datos.hospedaje || '0.00'}</td>
          </tr>
          <tr>
            <td style="width: 100%; padding-top: 5px;"><strong>FOTOCOPIAS:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${datos.fotocopias || '0.00'}</td>
          </tr>
          <tr>
            <td style="width: 100%; padding-top: 5px;"><strong>OTROS:</strong></td>
          </tr>
          <tr>
            <td style="width: 100%; border-bottom: 2px solid #000; padding-bottom: 3px;">Q. ${datos.otros || '0.00'}</td>
          </tr>
        </table>
      </div>
      <div class="values-right">
        <div class="total-box">TOTAL:<br>Q. ${total}</div>
      </div>
    </div>

    <div class="authorization-space"></div>

    <table class="signatures-table">
      <tr>
        <td><strong>SOLICITADO POR:</strong></td>
        <td><strong>REVISADO GERENCIA DE VENTAS:</strong></td>
        <td><strong>REVISADO CONTABILIDAD:</strong></td>
        <td><strong>AUTORIZADO GERENCIA GENERAL:</strong></td>
      </tr>
    </table>
  </div>
</body>
</html>`;
  };

  const handleExportHTML = (record) => {
    console.log('Exportando a HTML:', record);
    const html = generateHTML(record);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
      newWindow.onload = function() {
        setTimeout(function() {
            newWindow.print();
        }, 500);
      };
      console.log('HTML exportado exitosamente');
    } else {
      alert('Por favor, permite las ventanas emergentes para exportar.');
    }
  };

  const handleShare = async (record) => {
    console.log('Compartiendo registro:', record);
    const html = generateHTML(record);
    const datos = record.datos;
    const blob = new Blob([html], { type: 'text/html' });
    const filename = `solicitud-viaticos-${datos.vendedor || 'sin-nombre'}-${formatDate(record.fecha_creacion).replace(/[/:]/g, '-')}.html`;
    const file = new File([blob], filename, { type: 'text/html' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Solicitud de Viáticos',
          text: `Solicitud de Viáticos - ${datos.vendedor}`
        });
        console.log('Compartido exitosamente');
      } catch (error) {
        console.error('Error al compartir:', error);
        downloadHTML(html, filename);
      }
    } else {
      downloadHTML(html, filename);
    }
  };

  const downloadHTML = (html, filename) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderDetailsModal = () => {
    if (!selectedRecord) return null;

    const { datos, fecha_creacion } = selectedRecord;
    const total = calcularTotal(datos);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold">Detalles de Solicitud</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 bg-yellow-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold mb-3">Información General</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="font-semibold">Ejecutivo de Ventas:</span> {datos.vendedor}</div>
                <div><span className="font-semibold">Ruta A:</span> {datos.rutaA}</div>
                <div><span className="font-semibold">Fecha Inicial:</span> {formatDateSimple(datos.fechaInicial)}</div>
                <div><span className="font-semibold">Fecha Final:</span> {formatDateSimple(datos.fechaFinal)}</div>
                <div className="md:col-span-2"><span className="font-semibold">Lugares a Visitar:</span> {datos.lugaresVisitar}</div>
                <div className="md:col-span-2"><span className="font-semibold">Fecha de creación:</span> {formatDate(fecha_creacion)}</div>
              </div>
            </div>

            <h4 className="text-lg font-semibold mb-3">Valores Aproximados</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300 text-sm">
                <thead className="bg-yellow-100 text-black">
                  <tr>
                    <th className="border px-4 py-2 text-left">Concepto</th>
                    <th className="border px-4 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                    <tr><td className="border px-4 py-2">Combustible</td><td className="border px-4 py-2 text-right">{formatCurrency(datos.combustible)}</td></tr>
                    <tr><td className="border px-4 py-2">Alimentación</td><td className="border px-4 py-2 text-right">{formatCurrency(datos.alimentacion)}</td></tr>
                    <tr><td className="border px-4 py-2">Hospedaje</td><td className="border px-4 py-2 text-right">{formatCurrency(datos.hospedaje)}</td></tr>
                    <tr><td className="border px-4 py-2">Fotocopias</td><td className="border px-4 py-2 text-right">{formatCurrency(datos.fotocopias)}</td></tr>
                    <tr><td className="border px-4 py-2">Otros</td><td className="border px-4 py-2 text-right">{formatCurrency(datos.otros)}</td></tr>
                </tbody>
                <tfoot className="bg-black text-white font-bold">
                  <tr>
                    <td className="border px-4 py-2 text-right">TOTAL:</td>
                    <td className="border px-4 py-2 text-right">Q. {total}</td>
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
                Imprimir
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
        <div className="sticky top-0 bg-yellow-400 text-black p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Historial de Solicitudes de Viáticos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-yellow-500 rounded-full transition-colors"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio:
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
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
                  className="border rounded-lg p-4 bg-yellow-50 border-yellow-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">
                        Solicitud: {record.datos.vendedor}
                      </h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ruta:</span> {record.datos.rutaA}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Fechas:</span> {formatDateSimple(record.datos.fechaInicial)} al {formatDateSimple(record.datos.fechaFinal)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Creado: {formatDate(record.fecha_creacion)}
                      </p>
                      <p className="text-xs font-bold mt-1">
                        Total: Q. {calcularTotal(record.datos)}
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
                        title="Imprimir"
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
