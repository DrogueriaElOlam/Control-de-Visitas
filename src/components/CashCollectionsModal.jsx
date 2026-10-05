import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Building2, 
  FileText, 
  Check, 
  CreditCard,
  Layers,
  ChevronRight,
  Printer
} from 'lucide-react';
import { 
  BANK_OPTIONS, 
  getAllCashReports, 
  getCashReportsForVendor, 
  saveCashReport, 
  createNewCashReport, 
  deleteCashReport,
  syncCashFromVisits 
} from '../lib/cashCollections';
import { getLocalDateString } from '../lib/dateUtils';

export default function CashCollectionsModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  vendors = [], 
  visits = [], 
  onReportsUpdated 
}) {
  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';
  const todayStr = getLocalDateString();

  // Selected vendor
  const [selectedVendorName, setSelectedVendorName] = useState(() => {
    if (!isAdmin && currentUser?.name) return currentUser.name;
    const vendorWithVisits = visits.find(v => v.vendorName)?.vendorName;
    return vendorWithVisits || vendors[0]?.name || currentUser?.name || 'Karina Pineda';
  });

  // Date for new report modal / picker
  const [showNewDatePicker, setShowNewDatePicker] = useState(false);
  const [newReportDate, setNewReportDate] = useState(todayStr);

  // Active report ID
  const [activeReportId, setActiveReportId] = useState(null);

  // Success message state
  const [successMsg, setSuccessMsg] = useState('');
  const [syncTick, setSyncTick] = useState(0);

  // Listener para actualización en tiempo real cuando se guarda una visita con cobro en efectivo
  useEffect(() => {
    const handleCashReportsChanged = () => {
      setSyncTick(prev => prev + 1);
    };
    window.addEventListener('olam_cash_reports_changed', handleCashReportsChanged);
    return () => window.removeEventListener('olam_cash_reports_changed', handleCashReportsChanged);
  }, []);

  // Sincronización automática de cobros en efectivo desde las visitas
  useEffect(() => {
    if (isOpen && visits && visits.length > 0) {
      syncCashFromVisits(visits, selectedVendorName);
      setSyncTick(prev => prev + 1);
    }
  }, [isOpen, visits, selectedVendorName]);

  // Load all reports for this vendor
  const vendorReports = useMemo(() => {
    const list = getCashReportsForVendor(selectedVendorName);
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [selectedVendorName, successMsg, syncTick]);

  // Set active report if none is selected
  useEffect(() => {
    if (vendorReports.length > 0) {
      if (!activeReportId || !vendorReports.some(r => r.id === activeReportId)) {
        setActiveReportId(vendorReports[0].id);
      }
    } else {
      // Auto-create today's report if empty
      const created = createNewCashReport(selectedVendorName, todayStr);
      setActiveReportId(created.id);
    }
  }, [vendorReports, selectedVendorName, todayStr]);

  // Current active report
  const activeReport = useMemo(() => {
    return vendorReports.find(r => r.id === activeReportId) || null;
  }, [vendorReports, activeReportId]);

  // Local editable draft state for active report
  const [draftReport, setDraftReport] = useState(null);

  useEffect(() => {
    if (activeReport) {
      setDraftReport(JSON.parse(JSON.stringify(activeReport)));
    } else {
      setDraftReport(null);
    }
  }, [activeReportId, activeReport]);

  // Handle row changes
  const handleRowChange = (index, field, value) => {
    if (!draftReport) return;
    const newRows = [...draftReport.rows];
    
    if (field === 'boleta') {
      // Numbers only as requested
      newRows[index].boleta = value.replace(/\D/g, '');
    } else if (field === 'monto') {
      newRows[index].monto = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
    } else {
      newRows[index][field] = value;
    }

    // Live total
    const newTotal = newRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
    setDraftReport({
      ...draftReport,
      rows: newRows,
      total: newTotal
    });
  };

  // Add new row
  const handleAddRow = () => {
    if (!draftReport) return;
    const newRows = [
      ...draftReport.rows,
      {
        id: `row_${Date.now()}_${draftReport.rows.length + 1}`,
        no: draftReport.rows.length + 1,
        boleta: '',
        banco: 'Banco Industrial (Bi)',
        monto: '',
        clientName: ''
      }
    ];
    setDraftReport({
      ...draftReport,
      rows: newRows
    });
  };

  // Delete row
  const handleDeleteRow = (index) => {
    if (!draftReport || draftReport.rows.length <= 1) {
      alert('El reporte debe contener al menos un registro.');
      return;
    }
    const newRows = draftReport.rows.filter((_, idx) => idx !== index).map((r, idx) => ({
      ...r,
      no: idx + 1
    }));
    const newTotal = newRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
    setDraftReport({
      ...draftReport,
      rows: newRows,
      total: newTotal
    });
  };

  // Save report
  const handleSave = () => {
    if (!draftReport) return;
    const saved = saveCashReport(draftReport);
    setSuccessMsg('¡Reporte de Cobros en Efectivo guardado con éxito!');
    setTimeout(() => setSuccessMsg(''), 3500);
    if (onReportsUpdated) onReportsUpdated(saved);
  };

  // Create new report for specified date
  const handleCreateNewReport = () => {
    if (!newReportDate) return;
    const created = createNewCashReport(selectedVendorName, newReportDate);
    setActiveReportId(created.id);
    setShowNewDatePicker(false);
    setSuccessMsg(`¡Nuevo reporte creado para la fecha ${newReportDate}!`);
    setTimeout(() => setSuccessMsg(''), 3500);
    if (onReportsUpdated) onReportsUpdated(created);
  };

  // Print current table directly
  const handlePrint = () => {
    window.print();
  };

  // Delete current active report
  const handleDeleteReport = () => {
    if (!draftReport || !draftReport.id) return;
    if (window.confirm(`¿Estás seguro de que deseas eliminar este cuadro de cobros en efectivo (${draftReport.date})?`)) {
      const remaining = deleteCashReport(draftReport.id);
      setSuccessMsg('Cuadro de cobros eliminado correctamente');
      if (remaining.length > 0) {
        setActiveReportId(remaining[0].id);
      } else {
        const created = createNewCashReport(selectedVendorName, todayStr);
        setActiveReportId(created.id);
      }
      setTimeout(() => setSuccessMsg(''), 3000);
      if (onReportsUpdated) onReportsUpdated(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-5 sm:p-6 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm border border-white/20">
              <DollarSign size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-amber-100">
                  Droguería El Olam
                </span>
                <span className="text-xs text-amber-100 font-semibold hidden sm:inline">
                  Control de Depósitos Bancarios
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Reporte Cobros en Efectivo
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Imprimir este cuadro"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Success notification */}
        {successMsg && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 flex items-center justify-between animate-in slide-in-from-top">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} /> {successMsg}
            </span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-200 hover:text-white">✕</button>
          </div>
        )}

        {/* Controls Bar: Vendor & Date selection & Create New Report */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Vendor Selector (for admin) */}
            {isAdmin ? (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Vendedor:
                </label>
                <select
                  value={selectedVendorName}
                  onChange={(e) => setSelectedVendorName(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-0.5">
                  Vendedor
                </span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-white bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 inline-block">
                  {selectedVendorName}
                </span>
              </div>
            )}

            {/* Select existing report date / tab */}
            {vendorReports.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Fecha del Reporte:
                </label>
                <select
                  value={activeReportId || ''}
                  onChange={(e) => setActiveReportId(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {vendorReports.map(r => (
                    <option key={r.id} value={r.id}>
                      📅 {r.date} — Total: Q{(r.total || 0).toFixed(2)} ({r.rows?.length || 0} boletas)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Button: "Crea nuevo reporte Cobros en Efectivo" */}
          <div>
            {!showNewDatePicker ? (
              <button
                type="button"
                onClick={() => setShowNewDatePicker(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>Crea nuevo reporte Cobros en Efectivo</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-amber-300 dark:border-amber-700 shadow-sm animate-in fade-in">
                <Calendar size={15} className="text-amber-600 ml-1" />
                <input
                  type="date"
                  value={newReportDate}
                  onChange={(e) => setNewReportDate(e.target.value)}
                  className="px-2 py-1 text-xs font-bold bg-transparent border-0 text-slate-800 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateNewReport}
                  className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all"
                >
                  Crear
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewDatePicker(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Modal Scrollable Content: Official Cash Collection Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {draftReport ? (
            <div className="space-y-5">
              
              {/* Table Card (Reflecting the PDF layout with rich aesthetics) */}
              <div className="bg-white dark:bg-slate-850 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-lg overflow-hidden">
                
                {/* Table Header Bar */}
                <div className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800 px-5 py-3 border-b-2 border-slate-300 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Reporte Cobros en Efectivo
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>Fecha: <strong className="text-slate-900 dark:text-white">{draftReport.date}</strong></span>
                    <span>•</span>
                    <span>Vendedor: <strong className="text-slate-900 dark:text-white">{draftReport.vendorName}</strong></span>
                  </div>
                </div>

                {/* The Responsive Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold border-b border-slate-300 dark:border-slate-700">
                        <th className="py-2.5 px-3 w-14 text-center border-r border-slate-300 dark:border-slate-700">No.</th>
                        <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-300 dark:border-slate-700">Boleta (Solo Números)</th>
                        <th className="py-2.5 px-3 min-w-[200px] border-r border-slate-300 dark:border-slate-700">Banco</th>
                        <th className="py-2.5 px-3 min-w-[130px] text-right border-r border-slate-300 dark:border-slate-700">Monto</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {draftReport.rows.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors">
                          
                          {/* 1. Correlativo No. */}
                          <td className="py-2 px-3 font-mono font-bold text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
                            {idx + 1}
                          </td>

                          {/* 2. Boleta (Input manual solo números) */}
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="Ej: 8492019"
                              value={row.boleta || ''}
                              onChange={(e) => handleRowChange(idx, 'boleta', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            {row.clientName && (
                              <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                                Ref: {row.clientName}
                              </span>
                            )}
                          </td>

                          {/* 3. Banco (Dropdown con los 4 bancos especificados) */}
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700">
                            <select
                              value={row.banco || BANK_OPTIONS[1]}
                              onChange={(e) => handleRowChange(idx, 'banco', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            >
                              {BANK_OPTIONS.map(b => (
                                <option key={b} value={b}>{b}</option>
                              ))}
                            </select>
                          </td>

                          {/* 4. Monto */}
                          <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 text-right">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                Q
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={row.monto !== undefined && row.monto !== null ? row.monto : ''}
                                onChange={(e) => handleRowChange(idx, 'monto', e.target.value)}
                                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-black text-xs text-right text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          </td>

                          {/* 5. Acción Eliminar Línea */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(idx)}
                              className="text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors"
                              title="Eliminar este registro"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>

                        </tr>
                      ))}
                    </tbody>

                    {/* Footer Row: TOTAL */}
                    <tfoot>
                      <tr className="bg-amber-50/70 dark:bg-amber-950/40 border-t-2 border-slate-300 dark:border-slate-700 font-black">
                        <td colSpan={3} className="py-3 px-4 text-right uppercase text-xs tracking-wider text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700">
                          Total
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm text-emerald-700 dark:text-emerald-300 border-r border-slate-300 dark:border-slate-700">
                          Q{(draftReport.total || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Button: "Agregar registro" */}
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Agregar registro</span>
                  </button>

                  <span className="text-[11px] text-slate-400 font-medium">
                    {draftReport.rows.length} {draftReport.rows.length === 1 ? 'registro' : 'registros'} ingresados
                  </span>
                </div>

              </div>

              {/* Observaciones Area (Matching PDF bottom section) */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Observaciones
                </label>
                <textarea
                  rows={3}
                  value={draftReport.observaciones || ''}
                  onChange={(e) => setDraftReport({ ...draftReport, observaciones: e.target.value })}
                  placeholder="Escriba aquí cualquier observación sobre las boletas, depósitos en tránsito, cheques recibidos como efectivo o depósitos del día siguiente..."
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

            </div>
          ) : (
            <div className="p-10 text-center text-slate-400">
              No hay reportes de cobro en efectivo disponibles.
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 gap-2 flex-wrap">
          {draftReport && (
            <button
              type="button"
              onClick={handleDeleteReport}
              className="px-3.5 py-2 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-red-200 dark:border-red-800"
              title="Eliminar este cuadro si fue creado por error"
            >
              <Trash2 size={15} />
              <span>Eliminar este cuadro</span>
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-white text-xs font-black transition-all shadow-md shadow-amber-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Save size={16} />
              <span>Guardar Reporte</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
