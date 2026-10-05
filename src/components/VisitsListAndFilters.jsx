import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Trash2, 
  Phone, 
  Clock, 
  User, 
  Layers, 
  FileText,
  Navigation,
  Pencil,
  RotateCcw,
  Check,
  X,
  PlusCircle,
  Archive,
  History,
  Sparkles,
  ArrowLeft,
  Building2,
  Database,
  Banknote,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Target,
  PieChart
} from 'lucide-react';
import { deleteVisitRecord, updateVisitSalesAndCollections, deduplicateVisitsList, getVisitLateStatus } from '../lib/db';
import { addCashRecordFromVisit } from '../lib/cashCollections';
import { exportNewClientsToExcel } from '../lib/newClientsExport';
import { generateGoalComplianceHTMLReport } from '../lib/goalComplianceReport';
import { generateMonthlyRouteHTMLReport } from '../lib/monthlyRouteReport';
import { getLocalDateString, getLocalYesterdayString, getLocalStartOfMonthString } from '../lib/dateUtils';

export default function VisitsListAndFilters({ 
  visits = [], 
  currentUser, 
  onVisitsChange, 
  onOpenMapLocation,
  onOpenReportModal,
  onNavigate,
  pageTitle = null,
  isFirstHandView = false
}) {
  const isAdmin = currentUser?.role === 'admin';
  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalYesterdayString();

  // View mode: 'today' para pestaña Visitas (primera mano) | 'history' para Información General (Historial y base de datos)
  const [viewMode, setViewMode] = useState(isFirstHandView ? 'today' : 'history');

  useEffect(() => {
    setViewMode(isFirstHandView ? 'today' : 'history');
  }, [isFirstHandView]);

  // Search and filters for history mode
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, yesterday, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, new_client, sale, collection, effective, goal_compliance
  const [onlyLateFilter, setOnlyLateFilter] = useState(false); // Admin filter for out-of-date recordings

  // Meta diaria para el reporte de cumplimiento de metas
  const [dailyGoalInput, setDailyGoalInput] = useState(() => {
    const vName = currentUser?.name || 'default';
    const saved = localStorage.getItem(`olam_commitment_${vName}_daily`);
    return saved && Number(saved) > 0 ? Number(saved) : 20000;
  });

  // Modal para Cumplimiento de Metas por Fecha
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalStartDate, setGoalStartDate] = useState(() => getLocalStartOfMonthString());
  const [goalEndDate, setGoalEndDate] = useState(todayStr);

  const handleOpenGoalModal = () => {
    if (dateFilter === 'custom' && startDate && endDate) {
      setGoalStartDate(startDate);
      setGoalEndDate(endDate);
    }
    setShowGoalModal(true);
  };

  // Modal para Resumen Mensual por Ruta
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeStartDate, setRouteStartDate] = useState(() => getLocalStartOfMonthString());
  const [routeEndDate, setRouteEndDate] = useState(todayStr);

  const handleOpenRouteModal = () => {
    if (dateFilter === 'custom' && startDate && endDate) {
      setRouteStartDate(startDate);
      setRouteEndDate(endDate);
    }
    setShowRouteModal(true);
  };

  // Edit modal state (Only modifies Sale, Collection, and Observations)
  const [editingVisit, setEditingVisit] = useState(null);
  const [editHasSale, setEditHasSale] = useState(false);
  const [editSaleAmount, setEditSaleAmount] = useState('');
  const [editSaleType, setEditSaleType] = useState('presencial');
  const [editHasCollection, setEditHasCollection] = useState(false);
  const [editCash, setEditCash] = useState('');
  const [editTransfer, setEditTransfer] = useState('');
  const [editCheck, setEditCheck] = useState('');
  const [editBoleta, setEditBoleta] = useState('');
  const [editObservations, setEditObservations] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusNotification, setStatusNotification] = useState('');

  // Always deduplicate visits strictly to prevent duplicate records
  const cleanVisits = useMemo(() => {
    return deduplicateVisitsList(visits);
  }, [visits]);

  // List of unique vendors in visits
  const uniqueVendors = useMemo(() => {
    return Array.from(new Set(cleanVisits.map(v => v.vendorName).filter(Boolean))).sort();
  }, [cleanVisits]);

  // Total count of visits recorded out of visit date (for Admin)
  const lateVisitsCount = useMemo(() => {
    return cleanVisits.filter(v => getVisitLateStatus(v).isLate).length;
  }, [cleanVisits]);

  // Today's total visits count for current user
  const todayVisitsCount = useMemo(() => {
    return cleanVisits.filter(v => {
      const vendorMatch = isAdmin ? true : (v.vendorName === currentUser?.name);
      return vendorMatch && v.visitDate === todayStr;
    }).length;
  }, [cleanVisits, isAdmin, currentUser, todayStr]);

  // Conteo de clientes nuevos en el alcance/filtros activos (para badges y botones)
  const newClientsInScopeCount = useMemo(() => {
    let list = cleanVisits;
    if (isAdmin && vendorFilter !== 'all') {
      list = list.filter(v => v.vendorName === vendorFilter);
    } else if (!isAdmin && currentUser?.name) {
      list = list.filter(v => v.vendorName === currentUser.name);
    }
    if (viewMode === 'today') {
      list = list.filter(v => v.visitDate === todayStr);
    } else {
      if (dateFilter === 'yesterday') {
        list = list.filter(v => v.visitDate === yesterdayStr);
      } else if (dateFilter === 'custom' && startDate && endDate) {
        list = list.filter(v => v.visitDate >= startDate && v.visitDate <= endDate);
      }
    }
    return list.filter(v => {
      const type = (v.clientType || '').toString().toLowerCase().trim();
      return type === 'nuevo' || type === 'cliente nuevo';
    }).length;
  }, [cleanVisits, isAdmin, vendorFilter, currentUser, viewMode, dateFilter, startDate, endDate, todayStr, yesterdayStr]);

  // Manejador para exportar reporte exclusivo de Clientes Nuevos a Excel (.xlsx) respetando el rango de fechas
  const handleExportNewClients = async () => {
    let targetVisits = cleanVisits;

    // Filtro por Vendedor
    if (isAdmin && vendorFilter !== 'all') {
      targetVisits = targetVisits.filter(v => v.vendorName === vendorFilter);
    } else if (!isAdmin && currentUser?.name) {
      targetVisits = targetVisits.filter(v => v.vendorName === currentUser.name);
    }

    // Filtro por Fechas
    let dateRangeText = null;
    let fileSuffix = null;

    if (viewMode === 'today') {
      targetVisits = targetVisits.filter(v => v.visitDate === todayStr);
      dateRangeText = `Hoy (${todayStr})`;
      fileSuffix = `Hoy_${todayStr}`;
    } else {
      if (dateFilter === 'yesterday') {
        targetVisits = targetVisits.filter(v => v.visitDate === yesterdayStr);
        dateRangeText = `Ayer (${yesterdayStr})`;
        fileSuffix = `Ayer_${yesterdayStr}`;
      } else if (dateFilter === 'custom' && startDate && endDate) {
        targetVisits = targetVisits.filter(v => v.visitDate >= startDate && v.visitDate <= endDate);
        dateRangeText = `${startDate}_al_${endDate}`;
        fileSuffix = `${startDate}_al_${endDate}`;
      }
    }

    // Filtrar estrictamente si y solo si se registró como Cliente Nuevo
    const newClientsInScope = targetVisits.filter(v => {
      const type = (v.clientType || '').toString().toLowerCase().trim();
      return type === 'nuevo' || type === 'cliente nuevo';
    });

    if (newClientsInScope.length === 0) {
      const msg = dateRangeText 
        ? `No se encontraron visitas de "Cliente Nuevo" registradas en el período seleccionado (${dateRangeText.replace(/_/g, ' ')}).`
        : 'No se encontraron visitas registradas como "Cliente Nuevo".';
      alert(msg);
      return;
    }

    const vendorForReport = (!isAdmin && currentUser?.name)
      ? currentUser.name
      : (vendorFilter !== 'all' ? vendorFilter : (newClientsInScope[0]?.vendorName || currentUser?.name || 'General'));

    await exportNewClientsToExcel(newClientsInScope, {
      dateRange: dateRangeText ? dateRangeText.replace(/_/g, ' ') : null,
      currentUser,
      generatedBy: currentUser?.name || 'Administración',
      vendorName: vendorForReport
    });
  };

  // Manejador para exportar reporte HTML interactivo de Cumplimiento de Metas por Fecha
  const handleExportGoalComplianceHTML = () => {
    const sDate = goalStartDate || startDate;
    const eDate = goalEndDate || endDate;
    if (!sDate || !eDate) {
      alert('Por favor seleccione el rango de fechas (Desde y Hasta) para generar el reporte de Cumplimiento de Metas.');
      return;
    }

    const vName = (!isAdmin && currentUser?.name)
      ? currentUser.name
      : (vendorFilter !== 'all' ? vendorFilter : (currentUser?.name || uniqueVendors[0] || 'Vendedor El Olam'));

    generateGoalComplianceHTMLReport({
      vendorName: vName,
      startDate: sDate,
      endDate: eDate,
      visits: cleanVisits,
      dailyGoal: Number(dailyGoalInput) || 20000
    });

    setStatusNotification(`¡Reporte de Cumplimiento de Metas (${vName}) descargado exitosamente en su equipo!`);
    setTimeout(() => setStatusNotification(''), 4500);
    setShowGoalModal(false);
  };

  // Manejador para exportar reporte HTML de Resumen Mensual por Ruta
  const handleExportRouteReportHTML = () => {
    const sDate = routeStartDate || startDate;
    const eDate = routeEndDate || endDate;
    if (!sDate || !eDate) {
      alert('Por favor seleccione el rango de fechas (Desde y Hasta) para generar el Resumen Mensual por Ruta.');
      return;
    }

    const vName = (!isAdmin && currentUser?.name)
      ? currentUser.name
      : (vendorFilter !== 'all' ? vendorFilter : (currentUser?.name || uniqueVendors[0] || 'Vendedor El Olam'));

    generateMonthlyRouteHTMLReport({
      vendorName: vName,
      startDate: sDate,
      endDate: eDate,
      visits: cleanVisits
    });

    setStatusNotification(`¡Resumen Mensual por Ruta (${vName}) descargado exitosamente en su equipo!`);
    setTimeout(() => setStatusNotification(''), 4500);
    setShowRouteModal(false);
  };

  // Filtered visits
  const filtered = useMemo(() => {
    return cleanVisits.filter(v => {
      // Vendor filter
      if (isAdmin && vendorFilter !== 'all' && v.vendorName !== vendorFilter) {
        return false;
      }
      if (!isAdmin && v.vendorName !== currentUser?.name) {
        return false;
      }

      // Late submission filter (Admin)
      if (isAdmin && onlyLateFilter) {
        const late = getVisitLateStatus(v);
        if (!late.isLate) return false;
      }

      // View mode filter:
      if (viewMode === 'today') {
        // Today view strictly shows today's records
        if (v.visitDate !== todayStr) return false;
      } else {
        // History view applies selected date filters
        if (dateFilter === 'yesterday' && v.visitDate !== yesterdayStr) return false;
        if (dateFilter === 'custom' && startDate && endDate) {
          if (v.visitDate < startDate || v.visitDate > endDate) return false;
        }
      }

      // Type filter (Resultado de la Visita)
      if (typeFilter === 'new_client') {
        const cType = (v.clientType || '').toString().toLowerCase().trim();
        if (cType !== 'nuevo' && cType !== 'cliente nuevo') return false;
      }
      if (typeFilter === 'sale' && !(v.hasSale || Number(v.saleAmount) > 0)) return false;
      if (typeFilter === 'collection' && !(v.hasCollection || Number(v.collectionAmount) > 0)) return false;
      if (typeFilter === 'effective' && !((v.hasSale || Number(v.saleAmount) > 0) || (v.hasCollection || Number(v.collectionAmount) > 0))) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const clientMatch = v.clientName && v.clientName.toLowerCase().includes(q);
        const codeMatch = v.clientCode && v.clientCode.toLowerCase().includes(q);
        const routeMatch = (v.sector || v.route) && (v.sector || v.route).toLowerCase().includes(q);
        const obsMatch = v.observations && v.observations.toLowerCase().includes(q);
        if (!clientMatch && !codeMatch && !routeMatch && !obsMatch) return false;
      }

      return true;
    });
  }, [cleanVisits, isAdmin, vendorFilter, currentUser, viewMode, dateFilter, startDate, endDate, typeFilter, searchTerm, todayStr, yesterdayStr, onlyLateFilter]);

  // Quick stats
  const totalCount = filtered.length;
  const totalSales = filtered.reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
  const totalCollections = filtered.reduce((sum, v) => sum + (Number(v.collectionAmount) || 0), 0);
  const effectiveCount = filtered.filter(v => (v.hasSale || Number(v.saleAmount) > 0) || (v.hasCollection || Number(v.collectionAmount) > 0)).length;
  const effectivenessRate = totalCount > 0 ? Math.round((effectiveCount / totalCount) * 100) : 0;

  // Start editing a visit
  const handleStartEdit = (visit) => {
    setEditingVisit(visit);
    setEditHasSale(!!visit.hasSale || Number(visit.saleAmount) > 0);
    setEditSaleAmount(visit.saleAmount ? String(visit.saleAmount) : '');
    setEditSaleType(visit.saleType || (visit.visitType === 'telemarketing' ? 'telemarketing' : 'presencial'));

    const hasColl = !!visit.hasCollection || Number(visit.collectionAmount) > 0;
    setEditHasCollection(hasColl);
    setEditCash(visit.collectionCash || visit.collectionAmounts?.efectivo ? String(visit.collectionCash || visit.collectionAmounts?.efectivo) : '');
    setEditTransfer(visit.collectionTransfer || visit.collectionAmounts?.transferencia ? String(visit.collectionTransfer || visit.collectionAmounts?.transferencia) : '');
    setEditCheck(visit.collectionCheck || visit.collectionAmounts?.cheque ? String(visit.collectionCheck || visit.collectionAmounts?.cheque) : '');
    setEditBoleta(visit.collectionBoleta || visit.collectionAmounts?.boleta ? String(visit.collectionBoleta || visit.collectionAmounts?.boleta) : '');
    setEditObservations(visit.observations || '');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingVisit(null);
    setEditHasSale(false);
    setEditSaleAmount('');
    setEditHasCollection(false);
    setEditCash('');
    setEditTransfer('');
    setEditCheck('');
    setEditBoleta('');
    setEditObservations('');
  };

  // Save modified visit
  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingVisit) return;

    setSavingEdit(true);
    try {
      const cashNum = editHasCollection ? (Number(editCash) || 0) : 0;
      const transNum = editHasCollection ? (Number(editTransfer) || 0) : 0;
      const checkNum = editHasCollection ? (Number(editCheck) || 0) : 0;
      const boletaNum = editHasCollection ? (Number(editBoleta) || 0) : 0;
      const totalColl = cashNum + transNum + checkNum + boletaNum;

      await updateVisitSalesAndCollections(editingVisit.id, {
        hasSale: editHasSale,
        saleAmount: editHasSale ? (Number(editSaleAmount) || 0) : 0,
        saleType: editHasSale ? editSaleType : null,
        hasCollection: editHasCollection,
        collectionCash: cashNum,
        collectionTransfer: transNum,
        collectionCheck: checkNum,
        collectionBoleta: boletaNum,
        collectionAmount: totalColl,
        observations: editObservations.trim()
      });

      // Sync cash collections if cash was recorded
      if (cashNum > 0) {
        addCashRecordFromVisit({
          vendorName: editingVisit.vendorName || currentUser?.name,
          visitDate: editingVisit.visitDate,
          monto: cashNum,
          clientName: editingVisit.clientName,
          boleta: editBoleta || '',
          observations: editObservations.trim(),
          visitId: editingVisit.id
        });
      }

      setStatusNotification(`¡Registro de "${editingVisit.clientName}" modificado exitosamente!`);
      setTimeout(() => setStatusNotification(''), 4500);
      handleCancelEdit();
      if (onVisitsChange) onVisitsChange();
    } catch (err) {
      console.error('Error updating visit:', err);
      alert('Error al modificar los datos de la visita.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle delete (Admin only)
  const handleDelete = async (visit) => {
    if (!isAdmin) return;
    const confirm = window.confirm(`¿Seguro que deseas eliminar la visita a "${visit.clientName}"?`);
    if (!confirm) return;

    try {
      await deleteVisitRecord(visit.id);
      if (onVisitsChange) onVisitsChange();
    } catch (e) {
      alert('Error al eliminar visita');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Informacion General & Mode Switcher (Hoy vs Historial) */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Title & Section Tag */}
        <div>
          <div className="flex items-center gap-2">
            {isFirstHandView && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-mono">
                Visitas del Día
              </span>
            )}
            <span className="text-xs text-slate-400 font-semibold">
              {isAdmin ? 'Panel de Supervisión' : `Vendedor: ${currentUser?.name}`}
            </span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            {pageTitle || (isAdmin ? 'Historial y Supervisión de Visitas' : 'Información General de Visitas')}
          </h2>
        </div>

        {/* Si es vista de primera mano (pestaña Visitas): Indicador de registros de hoy */}
        {isFirstHandView && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              Registros de Hoy ({todayVisitsCount})
            </span>
          </div>
        )}

      </div>

      {/* Success Notification */}
      {statusNotification && (
        <div className="bg-emerald-600 text-white p-3.5 sm:p-4 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <Check size={18} />
            <span>{statusNotification}</span>
          </div>
          <button onClick={() => setStatusNotification('')} className="text-white/80 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* FILTER CONTROLS: Displayed in History Mode or for Admin */}
      {viewMode === 'history' && (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 animate-in fade-in">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search bar */}
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, farmacia, código o sector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
              />
            </div>

            {/* Quick date filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === 'all' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setDateFilter('yesterday')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === 'yesterday' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Ayer
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === 'custom' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Rango...
              </button>

              {/* Botón de filtro de Auditoría: Fuera de Fecha (Solo Administrador) */}
              {isAdmin && lateVisitsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setOnlyLateFilter(!onlyLateFilter)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
                    onlyLateFilter
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-200 dark:hover:bg-amber-900/40'
                  }`}
                  title="Auditoría: Filtrar únicamente reportes grabados fuera de la fecha de visita"
                >
                  <AlertTriangle size={13} className={onlyLateFilter ? 'text-white' : 'text-amber-600 dark:text-amber-400'} />
                  <span>⚠️ Fuera de Fecha ({lateVisitsCount})</span>
                </button>
              )}

              {/* Export Report Button & Clientes Nuevos Excel & Cumplimiento de Metas & Resumen por Ruta */}
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {/* Botón Cumplimiento de Metas */}
                {(!isAdmin || currentUser?.role === 'vendor') && (
                  <button
                    type="button"
                    onClick={handleOpenGoalModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow transition-all cursor-pointer"
                    title="Generar y Descargar Reporte HTML de Cumplimiento de Metas por Fecha"
                  >
                    <Target size={13} />
                    <span>Cumplimiento de Metas</span>
                  </button>
                )}

                {/* Botón RESUMEN MENSUAL POR RUTA a la par de Cumplimiento de Metas */}
                {(!isAdmin || currentUser?.role === 'vendor') && (
                  <button
                    type="button"
                    onClick={handleOpenRouteModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white shadow transition-all cursor-pointer"
                    title="Generar y Descargar Reporte HTML de Resumen Mensual por Ruta/Gira"
                  >
                    <PieChart size={13} />
                    <span>Resumen Mensual por Ruta</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportNewClients}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow transition-all cursor-pointer"
                  title="Generar y Descargar Reporte en Excel (.xlsx) de Clientes Nuevos según el rango de fechas y filtros seleccionados"
                >
                  <FileSpreadsheet size={13} />
                  <span>Clientes Nuevos ({newClientsInScopeCount})</span>
                </button>

                {onOpenReportModal && (
                  <button
                    onClick={onOpenReportModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow transition-all cursor-pointer"
                    title="Generar y Exportar Reporte Oficial con Gráficas y Métricas"
                  >
                    <FileText size={13} />
                    <span>Exportar Reporte</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sub Row: Filter by Vendor (Admin) and Outcome Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            {isAdmin && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Filtrar por Vendedor
                </label>
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold dark:text-white"
                >
                  <option value="all">Todos los Vendedores</option>
                  {uniqueVendors.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                Resultado de la Visita
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold dark:text-white"
              >
                <option value="all">Todas las Visitas</option>
                <option value="new_client">✨ Clientes Nuevos</option>
                <option value="sale">Con Venta Registrada</option>
                <option value="collection">Con Cobro Recaudado</option>
                <option value="effective">Visita Efectiva (Venta o Cobro)</option>
              </select>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Desde</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white font-medium"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Metrics Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {viewMode === 'today' ? 'Visitas de Hoy' : 'Visitas Filtradas'}
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Tasa de Efectividad</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{effectivenessRate}%</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Ventas Totales</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            Q{totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Cobros Recaudados</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            Q{totalCollections.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Empty State for Today's Clean Interface */}
      {viewMode === 'today' && filtered.length === 0 && (
        <div className="bg-white dark:bg-slate-800 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-700 text-center space-y-4 shadow-sm animate-in fade-in">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Sparkles size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
              ¡Día Nuevo y Registro Limpio!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Aún no tienes visitas registradas el día de hoy. Todas tus visitas deben ser ingresadas desde la pestaña <strong>Registrar</strong>.
            </p>
          </div>
        </div>
      )}

      {/* List of Visits (Cards on Mobile, Table on Desktop) */}
      {!(viewMode === 'today' && filtered.length === 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          
          {/* Header of the table card */}
          <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Database size={16} className="text-blue-600 dark:text-blue-400" />
              <span>
                {viewMode === 'today' ? 'Visitas Registradas Hoy (Día en Curso)' : 'Registros del Historial'} ({filtered.length})
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 italic hidden sm:inline">
              * Presiona "Modificar" en cualquier registro para corregir Venta, Cobro u Observaciones.
            </span>
          </div>

          {/* MOBILE CARD VIEW (< md) */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium px-4">
                No hay visitas que coincidan con la búsqueda.
              </div>
            ) : (
              filtered.map(visit => {
                const hasGps = visit.location && visit.location.lat && visit.location.lng;
                const hasSaleVal = visit.hasSale || Number(visit.saleAmount) > 0;
                const hasCollVal = visit.hasCollection || Number(visit.collectionAmount) > 0;
                const lateInfo = getVisitLateStatus(visit);

                return (
                  <div 
                    key={visit.id} 
                    className={`p-4 space-y-3 transition-colors ${
                      isAdmin && lateInfo.isLate 
                        ? 'bg-amber-50/60 dark:bg-amber-950/25 border-l-4 border-l-amber-500 hover:bg-amber-100/50' 
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    
                    {/* Auditoría: Banner destacado si fue grabado fuera de fecha */}
                    {isAdmin && lateInfo.isLate && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-100/90 dark:bg-amber-900/70 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 text-xs shadow-sm">
                        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <div className="leading-tight">
                          <span className="font-black uppercase tracking-wider block text-amber-900 dark:text-amber-200">
                            ⚠️ Grabado Fuera de Fecha
                          </span>
                          <span className="text-[11px] font-medium opacity-90">
                            Visita: <strong>{visit.visitDate}</strong> • Grabado en sistema: <strong>{lateInfo.recordedDate}</strong> ({lateInfo.daysDiff} día{lateInfo.daysDiff > 1 ? 's' : ''} después)
                          </span>
                        </div>
                      </div>
                    )}

                    {!isAdmin && lateInfo.isLate && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                        <AlertTriangle size={11} className="text-amber-600" />
                        <span>Registro extemporáneo (+{lateInfo.daysDiff}d)</span>
                      </div>
                    )}

                    {/* Card Header: Client & Code */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-base flex flex-wrap items-center gap-1.5">
                          <span>{visit.clientName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            visit.clientType === 'nuevo' 
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' 
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          }`}>
                            {visit.clientType === 'nuevo' ? 'Nuevo' : 'Propio'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          Cód: <span className="font-bold text-slate-600 dark:text-slate-300">{visit.clientCode || '0000'}</span> {visit.phone ? `• Tel: ${visit.phone}` : ''}
                        </div>
                      </div>

                      {/* Period Badge */}
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg shrink-0">
                        {visit.dayPeriod === 'mañana' ? '☀️ Mañana' : '🌙 Tarde'}
                      </span>
                    </div>

                    {/* Route & Vendor Info */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-y-1">
                      <div className="flex items-center gap-1">
                        <MapPin size={13} className="text-blue-500 shrink-0" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{visit.sector || visit.route}</span>
                      </div>
                      <div className="font-semibold text-slate-600 dark:text-slate-300">
                        📅 {visit.visitDate}
                      </div>
                    </div>

                    {/* Vendor and GPS Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-slate-500 dark:text-slate-400">
                        Vendedor: <strong className="text-slate-800 dark:text-slate-200">{visit.vendorName}</strong>
                      </div>

                      {isAdmin && (
                        hasGps ? (
                          <button
                            type="button"
                            onClick={() => window.open(`https://www.google.com/maps?q=${visit.location.lat},${visit.location.lng}`, '_blank')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-200 transition-colors shadow-sm cursor-pointer"
                            title="Abrir ubicación exacta en Google Maps"
                          >
                            <Navigation size={12} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                            <span>📍 Ver Mapa GPS</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin size={11} /> Sin GPS
                          </span>
                        )
                      )}
                    </div>

                    {/* Amounts Badges (Venta & Cobro) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className={`p-2.5 rounded-xl border text-center ${
                        hasSaleVal 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60' 
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Venta</span>
                        <span className={`text-sm font-black ${
                          hasSaleVal ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}>
                          {hasSaleVal ? `Q${Number(visit.saleAmount).toFixed(2)}` : 'Q0.00'}
                        </span>
                      </div>

                      <div className={`p-2.5 rounded-xl border text-center ${
                        hasCollVal 
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60' 
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Cobro</span>
                        <span className={`text-sm font-black ${
                          hasCollVal ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                        }`}>
                          {hasCollVal ? `Q${Number(visit.collectionAmount).toFixed(2)}` : 'Q0.00'}
                        </span>
                      </div>
                    </div>

                    {/* Observation note */}
                    {visit.observations && (
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs italic text-slate-600 dark:text-slate-300">
                        "{visit.observations}"
                      </div>
                    )}

                    {/* Action Bar (Modify Sale/Collection & Admin delete) */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(visit)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer border border-blue-200 dark:border-blue-900 shadow-sm active:scale-95"
                        title="Modificar únicamente Venta, Cobro u Observaciones"
                      >
                        <Pencil size={13} />
                        <span>Modificar Venta / Cobro</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(visit)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Eliminar registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* TABLE VIEW (Tablets & Desktop: md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-4 px-6">Cliente & Código</th>
                  <th className="py-4 px-4">Vendedor & Ruta</th>
                  <th className="py-4 px-4">Fecha / Horario</th>
                  <th className="py-4 px-4">Venta (Q)</th>
                  <th className="py-4 px-4">Cobro (Q)</th>
                  <th className="py-4 px-4 text-center">Modificar</th>
                  {isAdmin && <th className="py-4 px-4">GPS</th>}
                  {isAdmin && <th className="py-4 px-6 text-right">Borrar</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 6} className="py-12 text-center text-slate-400 font-medium">
                      No hay visitas que coincidan con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtered.map(visit => {
                    const hasGps = visit.location && visit.location.lat && visit.location.lng;
                    const lateInfo = getVisitLateStatus(visit);

                    return (
                      <tr 
                        key={visit.id} 
                        className={`transition-colors ${
                          isAdmin && lateInfo.isLate
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-500 hover:bg-amber-100/40 dark:hover:bg-amber-900/30'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        
                        {/* Client */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{visit.clientName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              visit.clientType === 'nuevo' 
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' 
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            }`}>
                              {visit.clientType === 'nuevo' ? 'Nuevo' : 'Propio'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            Código: {visit.clientCode || '0000'} • {visit.phone || 'Sin tel'}
                          </div>
                          {visit.observations && (
                            <p className="text-[11px] text-slate-500 italic mt-1 max-w-xs truncate">
                              "{visit.observations}"
                            </p>
                          )}
                        </td>

                        {/* Vendor & Route */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {visit.vendorName}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin size={12} className="text-blue-500" />
                            <span>{visit.sector || visit.route}</span>
                          </div>
                        </td>

                        {/* Date & Period */}
                        <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-300">
                          <div className="font-bold text-slate-900 dark:text-white">{visit.visitDate}</div>
                          <div className="capitalize text-slate-400 text-[11px]">
                            {visit.dayPeriod === 'mañana' ? '☀️ Mañana' : '🌙 Tarde'} ({visit.visitType})
                          </div>
                          {lateInfo.isLate && (
                            <div className="mt-1">
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 text-[10px] font-black border border-amber-300 dark:border-amber-700 shadow-xs" 
                                title={`Visita del ${visit.visitDate} grabada en sistema el ${lateInfo.recordedDate} (${lateInfo.daysDiff} día(s) después)`}
                              >
                                <AlertTriangle size={11} className="text-amber-700 dark:text-amber-400 shrink-0" />
                                <span>⚠️ Fuera de fecha (+{lateInfo.daysDiff}d)</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Sale */}
                        <td className="py-4 px-4 font-bold">
                          {visit.hasSale || Number(visit.saleAmount) > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Q{Number(visit.saleAmount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Collection */}
                        <td className="py-4 px-4 font-bold">
                          {visit.hasCollection || Number(visit.collectionAmount) > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              Q{Number(visit.collectionAmount).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* Modify Button */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(visit)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer border border-blue-200 dark:border-blue-900 shadow-sm"
                            title="Modificar Venta, Cobro u Observaciones"
                          >
                            <Pencil size={12} />
                            <span>Modificar</span>
                          </button>
                        </td>

                        {/* GPS - Only visible for Admin */}
                        {isAdmin && (
                          <td className="py-4 px-4">
                            {hasGps ? (
                              <button
                                type="button"
                                onClick={() => window.open(`https://www.google.com/maps?q=${visit.location.lat},${visit.location.lng}`, '_blank')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer border border-emerald-200 dark:border-emerald-800 shadow-sm"
                                title={`Abrir coordenadas (${visit.location.lat.toFixed(4)}, ${visit.location.lng.toFixed(4)}) en Google Maps`}
                              >
                                <Navigation size={12} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                                <span>📍 Ver Mapa</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Sin GPS</span>
                            )}
                          </td>
                        )}

                        {/* Action (Admin delete) */}
                        {isAdmin && (
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleDelete(visit)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="Eliminar registro"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* MODAL MODIFICAR VENTA, COBRO Y OBSERVACIONES (Con scroll en celulares) */}
      {editingVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            
            {/* Header Fijo */}
            <div className="bg-gradient-to-r from-blue-800 via-indigo-900 to-blue-900 text-white p-4 sm:p-5 shrink-0 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Pencil size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black">Modificar Venta, Cobro y Notas</h4>
                  <p className="text-[11px] text-blue-200">
                    Droguería El Olam • Modificación Comercial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                title="Cerrar sin guardar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo con Scroll para celulares */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Información Fija de la Visita (Solo lectura) */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                    {editingVisit.clientName}
                  </span>
                  <span className="font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-md">
                    Cód: {editingVisit.clientCode || '0000'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                  <span>📍 {editingVisit.sector || editingVisit.route}</span>
                  <span>📅 {editingVisit.visitDate} ({editingVisit.dayPeriod === 'mañana' ? 'Mañana' : 'Tarde'})</span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * El cliente, fecha y ruta están protegidos para mantener la integridad del registro. Solo puedes modificar Venta, Cobro y Observaciones.
                </p>
              </div>

              {/* 1. SECCIÓN VENTA */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasSale}
                      onChange={(e) => setEditHasSale(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ¿Se realizó Venta en esta visita?
                    </span>
                  </label>
                  {editHasSale && (
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                      Venta Activa
                    </span>
                  )}
                </div>

                {editHasSale && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Modalidad de Venta
                      </label>
                      <select
                        value={editSaleType}
                        onChange={(e) => setEditSaleType(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold dark:text-white"
                      >
                        <option value="presencial">Presencial (En establecimiento)</option>
                        <option value="telemarketing">Telemarketing (Pedido Remoto)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Monto de Venta (Q) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required={editHasSale}
                        value={editSaleAmount}
                        onChange={(e) => setEditSaleAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SECCIÓN COBRO */}
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasCollection}
                      onChange={(e) => setEditHasCollection(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ¿Se realizó Cobro en esta visita?
                    </span>
                  </label>
                  {editHasCollection && (
                    <span className="text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">
                      Cobro Activo
                    </span>
                  )}
                </div>

                {editHasCollection && (
                  <div className="space-y-2.5 pt-1 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Efectivo (Q)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editCash}
                          onChange={(e) => setEditCash(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Transferencia (Q)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editTransfer}
                          onChange={(e) => setEditTransfer(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Cheque (Q)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editCheck}
                          onChange={(e) => setEditCheck(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Boleta Depósito (Q)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editBoleta}
                          onChange={(e) => setEditBoleta(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                        />
                      </div>
                    </div>

                    {/* Sumatoria automática */}
                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-900 dark:text-amber-200">
                      <span>Total Cobrado Calculado:</span>
                      <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                        Q{((Number(editCash) || 0) + (Number(editTransfer) || 0) + (Number(editCheck) || 0) + (Number(editBoleta) || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. SECCIÓN OBSERVACIONES */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones de la Visita
                </label>
                <textarea
                  rows={2}
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                  placeholder="Notas, acuerdos o aclaraciones de la visita..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs dark:text-white"
                />
              </div>

              {/* Botones Fijos */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Regresar / Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-black shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <RotateCcw className="animate-spin" size={14} />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Guardar Modificaciones</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL CUMPLIMIENTO DE METAS POR FECHA (VENDEDORES) */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Target size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Cumplimiento de Metas por Fecha</h3>
                  <p className="text-xs text-blue-100 font-medium">
                    {currentUser?.name ? `Vendedor: ${currentUser.name}` : 'Reporte Oficial de Metas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Seleccione el rango de fechas para generar el documento HTML interactivo. El reporte incluirá el logotipo oficial centrado, gráficas diarias de compromiso vs alcance, acumulación mensual y opciones de impresión / PDF.
              </p>

              {/* Rango de Fechas */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Fecha Desde:
                  </label>
                  <input
                    type="date"
                    value={goalStartDate}
                    onChange={(e) => setGoalStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Fecha Hasta:
                  </label>
                  <input
                    type="date"
                    value={goalEndDate}
                    onChange={(e) => setGoalEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"
                  />
                </div>
              </div>

              {/* Meta Diaria */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Compromiso / Meta Diaria
                  </label>
                  <span className="text-[11px] text-slate-400">Meta base para cada día del rango</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-500">Q</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={dailyGoalInput}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setDailyGoalInput(val);
                      const vName = currentUser?.name || 'default';
                      localStorage.setItem(`olam_commitment_${vName}_daily`, String(val));
                    }}
                    className="w-24 text-xs font-black text-slate-900 dark:text-white bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExportGoalComplianceHTML}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-95 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Target size={15} />
                <span>Generar y Descargar (HTML)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESUMEN MENSUAL POR RUTA/GIRA (VENDEDORES) */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-700 via-blue-700 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <PieChart size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">Resumen Mensual por Ruta/Gira</h3>
                  <p className="text-xs text-blue-100 font-medium">
                    {currentUser?.name ? `Vendedor: ${currentUser.name}` : 'Reporte Oficial de Rutas/Giras'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Seleccione el rango de fechas para generar el documento HTML. Acumulará todas las visitas, ventas y cobros realizados agrupados por ruta o gira con gráficas circulares y tabla de totales.
              </p>

              {/* Rango de Fechas */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Fecha Desde:
                  </label>
                  <input
                    type="date"
                    value={routeStartDate}
                    onChange={(e) => setRouteStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Fecha Hasta:
                  </label>
                  <input
                    type="date"
                    value={routeEndDate}
                    onChange={(e) => setRouteEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRouteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExportRouteReportHTML}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-700 via-blue-700 to-teal-600 hover:from-indigo-600 hover:to-teal-500 active:scale-95 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <PieChart size={15} />
                <span>Generar y Descargar (HTML)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


