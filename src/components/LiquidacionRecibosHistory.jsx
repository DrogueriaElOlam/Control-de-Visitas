import React, { useState, useEffect } from 'react';
import { X, Edit2, Eye, Printer, Trash2, Calendar, Filter, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LiquidacionRecibosHistory({ onClose, onEdit }) {
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

    const datos = record.datos;
    const blueColor = '#1E3A8A';
    const darkBlueColor = '#1E40AF';
    const logoUrl = '/logo.png';
    const LOGO_SIZE = '130pt';

    const receipts = datos.receipts || [];
    const totals = calculateTotals(receipts);

    const tableRows = receipts.map(receipt => `
      <tr>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.recibo || '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.codigo || '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.cliente || '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.boletas ? formatCurrency(parseFloat(receipt.boletas)) : '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.efectivo ? formatCurrency(parseFloat(receipt.efectivo)) : '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.cheque ? formatCurrency(parseFloat(receipt.cheque)) : '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.observaciones || '&nbsp;'}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liquidación de Recibos</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0.75in;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.2;
      margin: 0;
      padding: 20pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-container {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15pt;
      gap: 15pt;
    }

    .logo-section {
      flex-shrink: 0;
    }

    .logo {
      width: ${LOGO_SIZE};
      height: auto;
    }

    .title-section {
      flex: 1;
      text-align: center;
    }

    h1 {
      color: ${blueColor};
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 5pt 0;
      text-transform: uppercase;
    }

    h2 {
      color: ${blueColor};
      font-size: 13pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
    }

    .info-box {
      border: 2pt solid ${blueColor};
      padding: 10pt;
      margin-bottom: 15pt;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8pt;
    }

    .info-field {
      font-size: 10pt;
    }

    .info-field strong {
      font-weight: bold;
    }

    .info-field span {
      border-bottom: 1pt solid #000;
      display: inline-block;
      min-width: 150pt;
      padding: 0 5pt;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15pt;
    }

    .data-table th {
      background-color: ${darkBlueColor};
      color: white;
      font-weight: bold;
      text-align: center;
      border: 1pt solid #000;
      padding: 8pt 5pt;
      font-size: 10pt;
    }

    .data-table td {
      border: 1pt solid #000;
      padding: 6pt 5pt;
      vertical-align: middle;
      font-size: 9pt;
    }

    .totals-row {
      background-color: black;
      color: white;
      font-weight: bold;
      font-size: 10pt;
    }

    .totals-row td {
      padding: 8pt 5pt;
      border: 1pt solid #000;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40pt;
    }

    .signature-block {
      text-align: center;
      width: 45%;
    }

    .signature-label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 20pt;
    }

    .signature-name {
      font-size: 9pt;
    }

    .print-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: ${blueColor};
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14pt;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .print-button:hover {
      background-color: ${darkBlueColor};
    }

    @media print {
      .print-button {
        display: none;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="logo-section">
      <img src="${logoUrl}" alt="Logo" class="logo">
    </div>
    <div class="title-section">
      <h1>DROGUERIA EL OLAM</h1>
      <h2>LIQUIDACION SEMANAL DE RECIBOS DE CAJA</h2>
    </div>
  </div>

  <div class="info-box">
    <div class="info-field">
      <strong>Ejecutivo:</strong> <span>${datos.ejecutivo || ''}</span>
    </div>
    <div class="info-field">
      <strong>Ruta Cubierta:</strong> <span>${datos.rutaCubierta || ''}</span>
    </div>
    <div class="info-field" style="grid-column: 1 / -1;">
      <strong>Semana del:</strong> <span>${formatDateSimple(datos.semanaDesde)}</span>
      <strong style="margin-left: 20pt;">al</strong> <span>${formatDateSimple(datos.semanaHasta)}</span>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 8%;">Recibo</th>
        <th style="width: 8%;">Código</th>
        <th style="width: 25%;">Cliente</th>
        <th style="width: 12%;">Boletas</th>
        <th style="width: 12%;">Efectivo</th>
        <th style="width: 12%;">Cheque</th>
        <th style="width: 23%;">Observaciones</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="3" style="text-align: center;"><strong>TOTALES:</strong></td>
        <td style="text-align: right;">${formatCurrency(totals.boletas)}</td>
        <td style="text-align: right;">${formatCurrency(totals.efectivo)}</td>
        <td style="text-align: right;">${formatCurrency(totals.cheque)}</td>
        <td style="text-align: right;"><strong>${formatCurrency(totals.total)}</strong></td>
      </tr>
    </tfoot>
  </table>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-label">Liquidado Por: ________________</div>
      <div class="signature-name">${datos.liquidadoPor || ''}</div>
      <div class="signature-name">${datos.cargoLiquidado || ''}</div>
    </div>
    <div class="signature-block">
      <div class="signature-label">Revisado Por: ________________</div>
      <div class="signature-name">${datos.revisadoPor || ''}</div>
    </div>
  </div>

  <button class="print-button" onclick="window.print()">
    🖨️ Imprimir
  </button>
</body>
</html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
      console.log('HTML exportado exitosamente');
    } else {
      alert('Por favor, permite las ventanas emergentes para exportar.');
    }
  };

  const handleShare = async (record) => {
    console.log('Compartiendo registro:', record);

    const datos = record.datos;
    const receipts = datos.receipts || [];
    const totals = calculateTotals(receipts);

    const html = generateHTML(record);
    const blob = new Blob([html], { type: 'text/html' });
    const file = new File([blob], `liquidacion-${datos.ejecutivo || 'recibos'}-${formatDate(record.fecha_creacion).replace(/[/:]/g, '-')}.html`, { type: 'text/html' });

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
        downloadHTML(html, file.name);
      }
    } else {
      downloadHTML(html, file.name);
    }
  };

  const generateHTML = (record) => {
    const datos = record.datos;
    const blueColor = '#1E3A8A';
    const darkBlueColor = '#1E40AF';
    const logoUrl = '/logo.png';
    const LOGO_SIZE = '130pt';

    const receipts = datos.receipts || [];
    const totals = calculateTotals(receipts);

    const tableRows = receipts.map(receipt => `
      <tr>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.recibo || '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.codigo || '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.cliente || '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.boletas ? formatCurrency(parseFloat(receipt.boletas)) : '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.efectivo ? formatCurrency(parseFloat(receipt.efectivo)) : '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: right; font-size: 9pt;">${receipt.cheque ? formatCurrency(parseFloat(receipt.cheque)) : '&nbsp;'}</td>
        <td style="border: 1pt solid #000; padding: 6pt 5pt; text-align: left; font-size: 9pt;">${receipt.observaciones || '&nbsp;'}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liquidación de Recibos</title>
  <style>
    @page {
      size: letter portrait;
      margin: 0.75in;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.2;
      margin: 0;
      padding: 20pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-container {
      display: flex;
      align-items: flex-start;
      margin-bottom: 15pt;
      gap: 15pt;
    }

    .logo-section {
      flex-shrink: 0;
    }

    .logo {
      width: ${LOGO_SIZE};
      height: auto;
    }

    .title-section {
      flex: 1;
      text-align: center;
    }

    h1 {
      color: ${blueColor};
      font-size: 16pt;
      font-weight: bold;
      margin: 0 0 5pt 0;
      text-transform: uppercase;
    }

    h2 {
      color: ${blueColor};
      font-size: 13pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
    }

    .info-box {
      border: 2pt solid ${blueColor};
      padding: 10pt;
      margin-bottom: 15pt;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8pt;
    }

    .info-field {
      font-size: 10pt;
    }

    .info-field strong {
      font-weight: bold;
    }

    .info-field span {
      border-bottom: 1pt solid #000;
      display: inline-block;
      min-width: 150pt;
      padding: 0 5pt;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15pt;
    }

    .data-table th {
      background-color: ${darkBlueColor};
      color: white;
      font-weight: bold;
      text-align: center;
      border: 1pt solid #000;
      padding: 8pt 5pt;
      font-size: 10pt;
    }

    .data-table td {
      border: 1pt solid #000;
      padding: 6pt 5pt;
      vertical-align: middle;
      font-size: 9pt;
    }

    .totals-row {
      background-color: black;
      color: white;
      font-weight: bold;
      font-size: 10pt;
    }

    .totals-row td {
      padding: 8pt 5pt;
      border: 1pt solid #000;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40pt;
    }

    .signature-block {
      text-align: center;
      width: 45%;
    }

    .signature-label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 20pt;
    }

    .signature-name {
      font-size: 9pt;
    }

    .print-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: ${blueColor};
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14pt;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .print-button:hover {
      background-color: ${darkBlueColor};
    }

    @media print {
      .print-button {
        display: none;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="logo-section">
      <img src="${logoUrl}" alt="Logo" class="logo">
    </div>
    <div class="title-section">
      <h1>DROGUERIA EL OLAM</h1>
      <h2>LIQUIDACION SEMANAL DE RECIBOS DE CAJA</h2>
    </div>
  </div>

  <div class="info-box">
    <div class="info-field">
      <strong>Ejecutivo:</strong> <span>${datos.ejecutivo || ''}</span>
    </div>
    <div class="info-field">
      <strong>Ruta Cubierta:</strong> <span>${datos.rutaCubierta || ''}</span>
    </div>
    <div class="info-field" style="grid-column: 1 / -1;">
      <strong>Semana del:</strong> <span>${formatDateSimple(datos.semanaDesde)}</span>
      <strong style="margin-left: 20pt;">al</strong> <span>${formatDateSimple(datos.semanaHasta)}</span>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 8%;">Recibo</th>
        <th style="width: 8%;">Código</th>
        <th style="width: 25%;">Cliente</th>
        <th style="width: 12%;">Boletas</th>
        <th style="width: 12%;">Efectivo</th>
        <th style="width: 12%;">Cheque</th>
        <th style="width: 23%;">Observaciones</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr class="totals-row">
        <td colspan="3" style="text-align: center;"><strong>TOTALES:</strong></td>
        <td style="text-align: right;">${formatCurrency(totals.boletas)}</td>
        <td style="text-align: right;">${formatCurrency(totals.efectivo)}</td>
        <td style="text-align: right;">${formatCurrency(totals.cheque)}</td>
        <td style="text-align: right;"><strong>${formatCurrency(totals.total)}</strong></td>
      </tr>
    </tfoot>
  </table>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-label">Liquidado Por: ________________</div>
      <div class="signature-name">${datos.liquidadoPor || ''}</div>
      <div class="signature-name">${datos.cargoLiquidado || ''}</div>
    </div>
    <div class="signature-block">
      <div class="signature-label">Revisado Por: ________________</div>
      <div class="signature-name">${datos.revisadoPor || ''}</div>
    </div>
  </div>

  <button class="print-button" onclick="window.print()">
    🖨️ Imprimir
  </button>
</body>
</html>
    `;
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
    alert('Archivo descargado. Si estás en un dispositivo móvil, puedes compartir el archivo desde tu carpeta de descargas.');
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
                    <th className="border px-4 py-2">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{receipt.recibo}</td>
                      <td className="border px-4 py-2">{receipt.codigo}</td>
                      <td className="border px-4 py-2">{receipt.cliente}</td>
                      <td className="border px-4 py-2 text-right">{formatCurrency(parseFloat(receipt.boletas) || 0)}</td>
                      <td className="border px-4 py-2 text-right">{formatCurrency(parseFloat(receipt.efectivo) || 0)}</td>
                      <td className="border px-4 py-2 text-right">{formatCurrency(parseFloat(receipt.cheque) || 0)}</td>
                      <td className="border px-4 py-2">{receipt.observaciones}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-black text-white font-bold">
                  <tr>
                    <td colSpan="3" className="border px-4 py-2 text-center">TOTALES:</td>
                    <td className="border px-4 py-2 text-right">{formatCurrency(totals.boletas)}</td>
                    <td className="border px-4 py-2 text-right">{formatCurrency(totals.efectivo)}</td>
                    <td className="border px-4 py-2 text-right">{formatCurrency(totals.cheque)}</td>
                    <td className="border px-4 py-2 text-right">{formatCurrency(totals.total)}</td>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio:
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
