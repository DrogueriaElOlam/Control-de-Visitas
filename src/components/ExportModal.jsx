import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  CheckCircle2, 
  Calendar, 
  User, 
  Building2,
  Filter,
  UserPlus
} from 'lucide-react';
import { exportNewClientsToExcel } from '../lib/newClientsExport';
import { getLocalDateString } from '../lib/dateUtils';
import { LOGO_DATA_URI } from '../lib/logo';

export default function ExportModal({ visits = [], vendors = [] }) {
  const [vendorFilter, setVendorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, this_month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const todayStr = getLocalDateString();

  // Filtered dataset for export
  const getExportData = () => {
    return visits.filter(v => {
      if (vendorFilter !== 'all' && v.vendorName !== vendorFilter) return false;

      if (dateFilter === 'today' && v.visitDate !== todayStr) return false;
      if (dateFilter === 'this_month') {
        const vDate = new Date(v.visitDate);
        const now = new Date();
        if (vDate.getMonth() !== now.getMonth() || vDate.getFullYear() !== now.getFullYear()) return false;
      }
      if (dateFilter === 'custom' && startDate && endDate) {
        if (v.visitDate < startDate || v.visitDate > endDate) return false;
      }
      return true;
    });
  };

  // EXPORT TO EXCEL
  const handleExportExcel = () => {
    const dataset = getExportData();
    if (dataset.length === 0) {
      alert('No hay visitas con los filtros seleccionados para exportar');
      return;
    }

    setDownloading(true);

    try {
      const rows = dataset.map((v, i) => ({
        'No.': i + 1,
        'Fecha': v.visitDate || '',
        'Vendedor': v.vendorName || '',
        'Ruta / Sector': v.sector || v.route || '',
        'Código Cliente': v.clientCode || '0000',
        'Nombre del Cliente': v.clientName || '',
        'Tipo Cliente': v.clientType === 'nuevo' ? 'Nuevo' : 'Propio',
        'Teléfono': v.phone || '',
        'Jornada': v.dayPeriod || '',
        'Modalidad': v.visitType || '',
        '¿Venta?': v.hasSale || v.saleAmount > 0 ? 'SÍ' : 'NO',
        'Monto Venta (Q)': Number(v.saleAmount) || 0,
        'Tipo Venta': v.saleType || '',
        '¿Cobro?': v.hasCollection || v.collectionAmount > 0 ? 'SÍ' : 'NO',
        'Cobro Efectivo (Q)': Number(v.collectionCash) || 0,
        'Cobro Transferencia (Q)': Number(v.collectionTransfer) || 0,
        'Cobro Cheque (Q)': Number(v.collectionCheck) || 0,
        'Cobro Boleta (Q)': Number(v.collectionBoleta) || 0,
        'Cobro Total (Q)': Number(v.collectionAmount) || 0,
        'GPS Latitud': v.location?.lat || '',
        'GPS Longitud': v.location?.lng || '',
        'Precisión GPS': v.location?.accuracy ? `±${v.location.accuracy}m` : '',
        'Observaciones': v.observations || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      
      // Auto column widths
      const colWidths = Object.keys(rows[0] || {}).map(key => ({
        wch: Math.max(key.length + 3, 14)
      }));
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitas_El_Olam');

      const fileName = `Reporte_Visitas_El_Olam_${todayStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setSuccessMsg(`Archivo Excel "${fileName}" generado exitosamente.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
      alert('Error al generar archivo Excel');
    } finally {
      setDownloading(false);
    }
  };

  // EXPORT TO PDF
  const handleExportPDF = () => {
    const dataset = getExportData();
    if (dataset.length === 0) {
      alert('No hay visitas con los filtros seleccionados para exportar');
      return;
    }

    setDownloading(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(30, 58, 138); // Deep Blue
      doc.rect(0, 0, 297, 24, 'F');

      if (LOGO_DATA_URI) {
        try {
          doc.addImage(LOGO_DATA_URI, 'PNG', 12, 2, 20, 20);
        } catch (err) {
          console.warn('Error agregando logo al PDF:', err);
        }
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DROGUERÍA EL OLAM', 36, 12);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Control Diario de Visitas & Rendimiento en Ruta', 36, 18);

      doc.setFontSize(9);
      doc.text(`Fecha de Emisión: ${todayStr}`, 235, 12);
      doc.text(`Total Registros: ${dataset.length}`, 235, 18);

      // Summary KPI strip
      const totalSales = dataset.reduce((s, v) => s + (Number(v.saleAmount) || 0), 0);
      const totalColls = dataset.reduce((s, v) => s + (Number(v.collectionAmount) || 0), 0);
      const effectiveVisits = dataset.filter(v => v.hasSale || v.hasCollection).length;

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Filtro: ${vendorFilter === 'all' ? 'Todos los Vendedores' : vendorFilter}   |   Ventas Totales: Q${totalSales.toFixed(2)}   |   Cobros Totales: Q${totalColls.toFixed(2)}   |   Efectivas: ${effectiveVisits} de ${dataset.length}`,
        14,
        31
      );

      // Table Data
      const tableData = dataset.map((v, i) => [
        i + 1,
        v.visitDate || '',
        v.vendorName || '',
        v.sector || v.route || '',
        v.clientCode || '',
        v.clientName || '',
        v.visitType || 'presencial',
        v.saleAmount > 0 ? `Q${Number(v.saleAmount).toFixed(2)}` : '—',
        v.collectionAmount > 0 ? `Q${Number(v.collectionAmount).toFixed(2)}` : '—',
        v.location?.lat ? `GPS OK` : 'Sin GPS'
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['#', 'Fecha', 'Vendedor', 'Ruta', 'Cód.', 'Cliente', 'Tipo', 'Venta', 'Cobro', 'Ubicación']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 20 },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 15 },
          5: { cellWidth: 65 },
          6: { cellWidth: 22 },
          7: { cellWidth: 25, halign: 'right' },
          8: { cellWidth: 25, halign: 'right' },
          9: { cellWidth: 22, halign: 'center' }
        }
      });

      // Footer Signatures
      const finalY = (doc).lastAutoTable?.finalY || 160;
      if (finalY < 175) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.line(30, finalY + 22, 100, finalY + 22);
        doc.text('Firma y Sello de Administración', 42, finalY + 26);

        doc.line(197, finalY + 22, 267, finalY + 22);
        doc.text('Revisión de Auditoría', 215, finalY + 26);
      }

      const fileName = `Reporte_Visitas_El_Olam_${todayStr}.pdf`;
      doc.save(fileName);

      setSuccessMsg(`Documento PDF "${fileName}" descargado con éxito.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
      alert('Error al generar PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <FileSpreadsheet className="text-blue-600" />
          Exportación de Reportes Oficiales
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Descarga en formato Excel (.xlsx) para auditoría o PDF formal con membrete y firmas de Droguería El Olam.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Options */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Filter size={14} /> Seleccionar Filtros para el Reporte
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Vendedor a Exportar
            </label>
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white"
            >
              <option value="all">🌟 Todos los Vendedores (Reporte Completo)</option>
              {vendors.map(v => (
                <option key={v.id} value={v.name}>{v.name} ({v.route})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Período de Fechas
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white"
            >
              <option value="all">Todo el Histórico Acumulado</option>
              <option value="today">Solo Hoy ({todayStr})</option>
              <option value="this_month">Este Mes Actual</option>
              <option value="custom">Rango Personalizado...</option>
            </select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Desde Fecha</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Hasta Fecha</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm dark:text-white"
              />
            </div>
          </div>
        )}

        <div className="pt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          Registros listos para exportar: <strong className="text-blue-600">{getExportData().length} visitas</strong>
        </div>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Excel Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mb-4">
              <FileSpreadsheet size={28} />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Formato Excel General (.xlsx)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ideal para análisis de datos, tablas dinámicas, cálculo de comisiones y archivo contable detallado de visitas.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="mt-6 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={18} />
            <span>Descargar Archivo Excel</span>
          </button>
        </div>

        {/* Clientes Nuevos Especial Card */}
        <div className="bg-gradient-to-b from-teal-50/50 to-emerald-50/50 dark:from-slate-800 dark:to-slate-800 p-6 rounded-3xl border-2 border-teal-500/40 dark:border-teal-600/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-teal-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
            Especial
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-300 flex items-center justify-center mb-4">
              <UserPlus size={28} />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Reporte Clientes Nuevos (.xlsx)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Filtra exclusivamente los registros ingresados como <strong>Cliente Nuevo</strong> en una tabla con diseño, ruta, modalidad y teléfonos.
            </p>
          </div>

          <button
            onClick={() => exportNewClientsToExcel(getExportData(), {
              vendorName: vendorFilter !== 'all' ? vendorFilter : 'General',
              generatedBy: 'Administración El Olam',
              dateRange: dateFilter === 'custom' && startDate && endDate ? `${startDate} al ${endDate}` : null
            })}
            disabled={downloading}
            className="mt-6 w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet size={18} />
            <span>Descargar Clientes Nuevos</span>
          </button>
        </div>

        {/* PDF Card */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 flex items-center justify-center mb-4">
              <FileText size={28} />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Formato PDF Oficial (.pdf)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Listo para impresión o envío formal con membrete de Droguería El Olam, resumen de ventas y líneas de firma.
            </p>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={downloading}
            className="mt-6 w-full py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={18} />
            <span>Descargar Reporte PDF</span>
          </button>
        </div>

      </div>

    </div>
  );
}
