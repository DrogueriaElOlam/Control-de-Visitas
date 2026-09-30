import React, { useState, useEffect } from 'react';
import { X, Edit2, Eye, Printer, Trash2, Filter, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AperturaCodigoHistory({ onClose, onEdit }) {
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
    console.log('Cargando historial de apertura de código...');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('apertura_codigo_history')
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
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.fecha_creacion);
        if (fechaInicio && recordDate < new Date(fechaInicio)) return false;
        if (fechaFin && recordDate > new Date(fechaFin + 'T23:59:59')) return false;
        return true;
      });
    }
    
    if (ejecutivoFilter) {
      filtered = filtered.filter(record => 
        record.datos.ejecutivoVentas && 
        record.datos.ejecutivoVentas.toLowerCase().includes(ejecutivoFilter.toLowerCase())
      );
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
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar este registro del historial?')) {
      return;
    }

    console.log('Eliminando registro:', id);

    try {
      const { error } = await supabase
        .from('apertura_codigo_history')
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
    const formData = record.datos;
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apertura de Código Nuevo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 0; margin: 0; }
    .container { 
      width: 8.5in; 
      height: 5.5in; 
      margin: 0 auto; 
      border: 2px solid #333; 
      padding: 0.25in; 
      box-sizing: border-box; 
      position: relative;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 8pt; 
    }
    .header-left { flex: 1; padding-right: 10pt; }
    .header-left h2 { font-size: 9pt; margin-bottom: 2pt; font-weight: bold; }
    .header-left p { font-size: 7pt; color: #666; margin: 1pt 0; line-height: 1.2; }
    .header-right { flex-shrink: 0; }
    .header-right img { width: 1.3in; height: auto; display: block; }
    .title { 
      background: #000; 
      color: #fff; 
      padding: 5pt; 
      text-align: center; 
      margin: 6pt 0; 
      font-size: 11pt; 
      font-weight: bold; 
    }
    .section { margin-bottom: 8pt; }
    .section-title { 
      background: #e5e5e5; 
      padding: 3pt 4pt; 
      font-weight: bold; 
      margin-bottom: 4pt; 
      font-size: 17pt;
      text-align: center;
    }
    .field { margin-bottom: 4pt; }
    .field-label { font-weight: bold; font-size: 8pt; display: inline-block; }
    .field-value { 
      border-bottom: 1px solid #000; 
      padding: 1pt 2pt; 
      min-height: 14pt; 
      font-size: 8pt; 
      display: inline-block;
      width: calc(100% - 2pt);
      white-space: pre-wrap;
    }
    .grid-2 { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 8pt; 
      margin-bottom: 4pt;
    }
    .grid-4 { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 6pt; 
      margin-top: 8pt;
    }
    .field-inline { display: flex; flex-direction: column; }
    .field-inline .field-label { margin-bottom: 1pt; }
    .textarea-value { min-height: 24pt; }
    @page { size: 8.5in 5.5in landscape; margin: 0; }
    @media print {
      body { padding: 0; margin: 0; }
      .container { border: 2px solid #333; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <h2>DISTRIBUIDORA COMERCIAL EL OLAM S.A.</h2>
        <p>7a. Avenida "A" 17-67 Colonia Aurora I Zona 13, Guatemala</p>
        <p>Teléfonos: 2308-4353, 2332-7814, 2339-4613</p>
      </div>
      <div class="header-right">
        <img src="/logo.png" alt="Logo" />
      </div>
    </div>

    <div class="title">APERTURA DE CODIGO NUEVO</div>

    <div class="section">
      <div class="section-title">DATOS DE FACTURACIÓN</div>
      <div class="field">
        <span class="field-label">Nombre o Razón Social:</span>
        <div class="field-value">${formData.nombreRazonSocial || ''}</div>
      </div>
      <div class="field">
        <span class="field-label">Dirección:</span>
        <div class="field-value textarea-value">${(formData.direccionFacturacion || '').replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="field">
        <span class="field-label">Nit / DPI:</span>
        <div class="field-value">${formData.nitDpi || ''}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">DATOS GENERALES</div>
      <div class="field">
        <span class="field-label">Nombre Del Negocio:</span>
        <div class="field-value">${formData.nombreNegocio || ''}</div>
      </div>
      <div class="field">
        <span class="field-label">Dirección de Entrega:</span>
        <div class="field-value textarea-value">${(formData.direccionEntrega || '').replace(/\n/g, '<br/>')}</div>
      </div>
      <div class="grid-2">
        <div class="field-inline">
          <span class="field-label">Teléfonos:</span>
          <div class="field-value">${formData.telefonos || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Correo Electrónico:</span>
          <div class="field-value">${formData.correoElectronico || ''}</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="field-inline">
          <span class="field-label">Encargado de Compras:</span>
          <div class="field-value">${formData.encargadoCompras || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Teléfono:</span>
          <div class="field-value">${formData.telefonoCompras || ''}</div>
        </div>
      </div>
      <div class="grid-2" style="margin-top: 8pt;">
        <div class="field-inline">
          <span class="field-label">Encargado de Pagos:</span>
          <div class="field-value">${formData.encargadoPagos || ''}</div>
        </div>
        <div class="field-inline">
          <span class="field-label">Teléfono:</span>
          <div class="field-value">${formData.telefonoPagos || ''}</div>
        </div>
      </div>
    </div>

    <div class="grid-4">
      <div class="field-inline">
        <span class="field-label">Fecha de Creación:</span>
        <div class="field-value">${formData.fecha || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Ruta Asignada:</span>
        <div class="field-value">${formData.rutaAsignada || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Código Asignado:</span>
        <div class="field-value">${formData.codigoAsignado || ''}</div>
      </div>
      <div class="field-inline">
        <span class="field-label">Ejecutivo de Ventas:</span>
        <div class="field-value">${formData.ejecutivoVentas || ''}</div>
      </div>
    </div>
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
    const filename = `${datos.nombreRazonSocial || 'apertura-codigo'}.html`;
    const file = new File([blob], filename, { type: 'text/html' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Apertura de Código Nuevo',
          text: `Apertura de Código - ${datos.nombreRazonSocial || ''}`
        });
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

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h3 className="text-xl font-bold">Detalles de Apertura</h3>
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
                <div><span className="font-semibold">Razón Social:</span> {datos.nombreRazonSocial}</div>
                <div><span className="font-semibold">Nombre Negocio:</span> {datos.nombreNegocio}</div>
                <div><span className="font-semibold">NIT/DPI:</span> {datos.nitDpi}</div>
                <div><span className="font-semibold">Ejecutivo:</span> {datos.ejecutivoVentas}</div>
                <div><span className="font-semibold">Ruta:</span> {datos.rutaAsignada}</div>
                <div><span className="font-semibold">Código:</span> {datos.codigoAsignado}</div>
                <div><span className="font-semibold">Fecha Formulario:</span> {datos.fecha}</div>
                <div><span className="font-semibold">Guardado el:</span> {formatDate(fecha_creacion)}</div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="font-semibold">Dirección Facturación:</h5>
                <p className="p-2 bg-gray-50 rounded">{datos.direccionFacturacion}</p>
              </div>
              <div>
                <h5 className="font-semibold">Dirección Entrega:</h5>
                <p className="p-2 bg-gray-50 rounded">{datos.direccionEntrega}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <h5 className="font-semibold">Contacto Compras:</h5>
                    <p>{datos.encargadoCompras} ({datos.telefonoCompras})</p>
                 </div>
                 <div>
                    <h5 className="font-semibold">Contacto Pagos:</h5>
                    <p>{datos.encargadoPagos} ({datos.telefonoPagos})</p>
                 </div>
              </div>
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
          <h2 className="text-xl font-bold">Historial de Aperturas de Código</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ejecutivo:
                </label>
                <input
                  type="text"
                  value={ejecutivoFilter}
                  onChange={(e) => setEjecutivoFilter(e.target.value)}
                  placeholder="Buscar por nombre..."
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
                        {record.datos.nombreRazonSocial || 'Sin nombre'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Negocio:</span> {record.datos.nombreNegocio}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ejecutivo:</span> {record.datos.ejecutivoVentas}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ruta:</span> {record.datos.rutaAsignada}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Código:</span> {record.datos.codigoAsignado || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Guardado: {formatDate(record.fecha_creacion)}
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
