import React, { useState, useMemo, useEffect } from 'react';
import { 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  Clock, 
  FileText, 
  Edit3, 
  Save, 
  PhoneCall, 
  MapPin, 
  Sparkles, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Check, 
  BarChart3, 
  PieChart as PieIcon,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';

export default function DailyGoalWidget({ currentUser, visits = [], vendors = [], onOpenReportModal }) {
  const isAdmin = currentUser?.role === 'admin';
  const todayStr = new Date().toISOString().split('T')[0];

  // Selected date (defaults to today)
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Selected vendor
  const [selectedVendorName, setSelectedVendorName] = useState(() => {
    if (!isAdmin && currentUser?.name) return currentUser.name;
    const vendorWithVisits = visits.find(v => v.vendorName)?.vendorName;
    return vendorWithVisits || vendors[0]?.name || currentUser?.name || 'Karina Pineda';
  });

  // Storage key for commitment
  const getCommitmentKey = (vendor, date) => `olam_daily_commitment_${vendor || 'default'}_${date || 'today'}`;
  const getVendorGeneralKey = (vendor) => `olam_commitment_${vendor || 'default'}_daily`;

  // Commitment goal state (editable)
  const [commitmentGoal, setCommitmentGoal] = useState(() => {
    const key = getCommitmentKey(selectedVendorName, todayStr);
    const saved = localStorage.getItem(key) || localStorage.getItem(getVendorGeneralKey(selectedVendorName));
    return saved && Number(saved) > 0 ? Number(saved) : 20000;
  });

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalInput, setTempGoalInput] = useState(String(commitmentGoal));

  // Sync commitment when vendor or date changes
  useEffect(() => {
    const key = getCommitmentKey(selectedVendorName, selectedDate);
    const saved = localStorage.getItem(key) || localStorage.getItem(getVendorGeneralKey(selectedVendorName));
    const val = saved && Number(saved) > 0 ? Number(saved) : 20000;
    setCommitmentGoal(val);
    setTempGoalInput(String(val));
  }, [selectedVendorName, selectedDate]);

  // Save updated commitment
  const handleSaveCommitment = (val) => {
    const num = Math.max(1, Number(val) || 0);
    setCommitmentGoal(num);
    setTempGoalInput(String(num));
    setIsEditingGoal(false);
    localStorage.setItem(getCommitmentKey(selectedVendorName, selectedDate), String(num));
    localStorage.setItem(getVendorGeneralKey(selectedVendorName), String(num));
  };

  // Helper to detect telemarketing
  const isTelemarketing = (v) => {
    const vt = (v.visitType || '').toLowerCase();
    const st = (v.saleType || '').toLowerCase();
    return vt.includes('tele') || vt.includes('tel') || st.includes('tele') || st.includes('tel');
  };

  // Filter visits for the selected vendor and date
  const todayVisits = useMemo(() => {
    return visits.filter(v => 
      v.vendorName === selectedVendorName && v.visitDate === selectedDate
    );
  }, [visits, selectedVendorName, selectedDate]);

  // Visits in which a sale was achieved (Visitas con Venta Lograda)
  const visitsWithSale = useMemo(() => {
    return todayVisits.filter(v => v.hasSale || (Number(v.saleAmount) || 0) > 0);
  }, [todayVisits]);

  const completedVisitsCount = todayVisits.length;
  const visitsWithSaleCount = visitsWithSale.length;
  const saleEffectivenessPercent = completedVisitsCount > 0 
    ? Math.round((visitsWithSaleCount / completedVisitsCount) * 100) 
    : 0;

  // Sales totals
  const totalSales = useMemo(() => {
    return todayVisits.reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
  }, [todayVisits]);

  const salesPresencial = useMemo(() => {
    return todayVisits
      .filter(v => !isTelemarketing(v))
      .reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
  }, [todayVisits]);

  const salesTelemarketing = useMemo(() => {
    return todayVisits
      .filter(v => isTelemarketing(v))
      .reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
  }, [todayVisits]);

  const ordersPhoneCount = todayVisits.filter(v => isTelemarketing(v) && (v.hasSale || (Number(v.saleAmount) || 0) > 0)).length;
  const ordersPresencialCount = todayVisits.filter(v => !isTelemarketing(v) && (v.hasSale || (Number(v.saleAmount) || 0) > 0)).length;

  // Collections totals
  const totalCollections = useMemo(() => {
    return todayVisits.reduce((sum, v) => {
      const cCash = Number(v.collectionCash) || 0;
      const cTrans = Number(v.collectionTransfer) || 0;
      const cCheck = Number(v.collectionCheck) || 0;
      const cBoleta = Number(v.collectionBoleta) || 0;
      const computed = (cCash + cTrans + cCheck + cBoleta);
      return sum + (computed > 0 ? computed : (Number(v.collectionAmount) || 0));
    }, 0);
  }, [todayVisits]);

  // Goal calculations
  const percent = commitmentGoal > 0 
    ? Math.round((totalSales / commitmentGoal) * 100) 
    : 0;

  const isGoalMet = totalSales >= commitmentGoal;
  const difference = totalSales - commitmentGoal;

  // Tricolor Logic requested by user:
  // 0% a 50%: Rojo
  // 51% a 85%: Amarillo
  // 86% a 100%+: Verde
  const getTricolorTheme = (pct) => {
    if (pct <= 50) {
      return {
        zone: 'Rojo (0% - 50%)',
        badgeText: 'Nivel Inicial / Crítico',
        barColor: 'bg-red-500',
        textColor: 'text-red-400',
        lightBg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-500/30',
        ring: 'ring-red-500',
        hex: '#ef4444'
      };
    } else if (pct <= 85) {
      return {
        zone: 'Amarillo (51% - 85%)',
        badgeText: 'En Progreso / Regular',
        barColor: 'bg-amber-400',
        textColor: 'text-amber-300',
        lightBg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-500/30',
        ring: 'ring-amber-400',
        hex: '#f59e0b'
      };
    } else {
      return {
        zone: 'Verde (86% - 100%+)',
        badgeText: '¡Meta Cumplida / Excelente!',
        barColor: 'bg-emerald-400',
        textColor: 'text-emerald-300',
        lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
        border: 'border-emerald-500/30',
        ring: 'ring-emerald-400',
        hex: '#10b981'
      };
    }
  };

  const tricolor = getTricolorTheme(percent);

  // Data for Doughnut Chart (Presencial vs Telemarketing)
  const salesDistributionData = useMemo(() => {
    const data = [];
    if (salesPresencial > 0) {
      data.push({ name: 'Ventas Presenciales', value: Number(salesPresencial.toFixed(2)), color: '#3b82f6' });
    }
    if (salesTelemarketing > 0) {
      data.push({ name: 'Ventas Telemarketing', value: Number(salesTelemarketing.toFixed(2)), color: '#8b5cf6' });
    }
    return data;
  }, [salesPresencial, salesTelemarketing]);

  // Data for 7-day trend
  const weeklyTrendData = useMemo(() => {
    const days = [];
    const baseDate = new Date(selectedDate);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayVisits = visits.filter(v => v.vendorName === selectedVendorName && v.visitDate === dStr);
      const daySales = dayVisits.reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
      const dayPresencial = dayVisits.filter(v => !isTelemarketing(v)).reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
      const dayTelemarketing = dayVisits.filter(v => isTelemarketing(v)).reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);

      const dayName = d.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric' });
      days.push({
        date: dStr,
        name: dayName,
        ventas: Number(daySales.toFixed(2)),
        presencial: Number(dayPresencial.toFixed(2)),
        telemarketing: Number(dayTelemarketing.toFixed(2)),
        compromiso: commitmentGoal
      });
    }
    return days;
  }, [visits, selectedVendorName, selectedDate, commitmentGoal]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-6">
      
      {/* Top Filter Bar (Date & Vendor selector for admin) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Fecha Evaluada:</span>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
          />
          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100"
            >
              Ir a Hoy
            </button>
          )}
        </div>

        {isAdmin && vendors.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Vendedor:</span>
            <select
              value={selectedVendorName}
              onChange={(e) => setSelectedVendorName(e.target.value)}
              className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
            >
              {vendors.map(v => (
                <option key={v.id} value={v.name}>{v.name} ({v.route})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* MAIN GOAL CARD: COMPROMISO DE VENTA CON BARRA TRICOLOR */}
      <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-blue-700/40 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          
          {/* Header Row: Title & Editable Goal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Left: Commitment Title & Editable input */}
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300 mb-1">
                <Target size={16} className="text-blue-400" />
                Compromiso de Venta Diario
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-blue-200 font-normal">
                  {selectedVendorName}
                </span>
              </div>

              {isEditingGoal ? (
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Q</span>
                    <input
                      type="number"
                      value={tempGoalInput}
                      onChange={(e) => setTempGoalInput(e.target.value)}
                      className="pl-8 pr-3 py-1.5 w-44 bg-slate-800 border-2 border-blue-400 rounded-xl text-lg font-black text-white focus:outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveCommitment(tempGoalInput)}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                  >
                    <Check size={14} /> Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditingGoal(false); setTempGoalInput(String(commitmentGoal)); }}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight flex items-baseline gap-2">
                    <span>Q{totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
                    <span className="text-sm sm:text-base font-semibold text-blue-300">
                      / Q{commitmentGoal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </span>
                  </h2>

                  <button
                    type="button"
                    onClick={() => setIsEditingGoal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-blue-200 rounded-lg text-xs font-bold transition-all border border-white/15"
                    title="Editar meta diaria de compromiso"
                  >
                    <Edit3 size={13} />
                    <span>Cambiar Compromiso</span>
                  </button>
                </div>
              )}

              {/* Status explanation */}
              <p className="text-xs sm:text-sm text-blue-200 mt-2 font-medium">
                {isGoalMet ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <Sparkles size={16} className="text-emerald-400" />
                    ¡Excelente trabajo! Has superado tu compromiso por Q{(difference).toLocaleString('es-GT', { minimumFractionDigits: 2 })}.
                  </span>
                ) : (
                  <span>
                    Faltan <strong className="text-white font-bold">Q{Math.abs(difference).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong> para cumplir el compromiso del día.
                  </span>
                )}
              </p>

              {/* Quick presets */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <span className="text-[10px] text-blue-300/70">Metas rápidas:</span>
                {[15000, 17500, 20000, 25000, 30000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSaveCommitment(amt)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                      commitmentGoal === amt
                        ? 'bg-blue-500 text-white font-bold shadow-sm'
                        : 'bg-white/10 text-blue-200 hover:bg-white/20'
                    }`}
                  >
                    Q{(amt / 1000).toFixed(1)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Percent badge with Tricolor Status */}
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center flex-shrink-0 self-start sm:self-auto">
              <span className={`text-4xl font-black ${tricolor.textColor}`}>
                {percent}%
              </span>
              <span className="block text-[11px] uppercase tracking-wider font-extrabold mt-0.5 text-white">
                {tricolor.badgeText}
              </span>
              <span className="block text-[9.5px] text-blue-200 font-medium mt-0.5">
                Escala: {tricolor.zone}
              </span>
            </div>

          </div>

          {/* BARRA DE PROGRESO TRICOLOR */}
          <div className="space-y-2 pt-2">
            
            {/* Legend for 3 colors */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> 0% - 50% Rojo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> 51% - 85% Amarillo
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> 86% - 100%+ Verde
              </span>
            </div>

            {/* Progress track */}
            <div className="relative w-full h-5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/20 shadow-inner">
              {/* Threshold guide markers */}
              <div className="absolute top-0 bottom-0 left-[50%] w-[1.5px] bg-white/30 z-10" title="50% Límite Rojo"></div>
              <div className="absolute top-0 bottom-0 left-[85%] w-[1.5px] bg-white/30 z-10" title="85% Límite Amarillo"></div>

              {/* Dynamic filled bar with user's tricolor rule */}
              <div 
                className={`h-full ${tricolor.barColor} rounded-full transition-all duration-700 ease-out shadow-lg`}
                style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-blue-300 font-medium pt-0.5">
              <span>Q0 (0%)</span>
              <span className="font-semibold text-white">Zona de Evaluación Diaria</span>
              <span>Compromiso: Q{commitmentGoal.toLocaleString('es-GT')} (100%)</span>
            </div>

          </div>

        </div>
      </div>

      {/* TODAY'S KPI GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* KPI 1: Visitas con Venta Lograda (Visitas Efectivas) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Award size={13} /> Visitas con Venta
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
              Efectivas
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {visitsWithSaleCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              de {completedVisitsCount} visitas ({saleEffectivenessPercent}% con venta)
            </p>
          </div>
        </div>

        {/* KPI 2: Ventas Totales Acumuladas */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp size={13} /> Ventas Totales
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isGoalMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {percent}%
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              Q{totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Acumulado total de hoy
            </p>
          </div>
        </div>

        {/* KPI 3: Ventas Telemarketing (NUEVO CAMPO SOLICITADO) */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-900/50 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-purple-50/40 dark:from-slate-800 dark:to-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400 flex items-center gap-1">
              <PhoneCall size={13} /> Telemarketing
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
              {ordersPhoneCount} pedidos
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300">
              Q{salesTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Ventas por llamada hoy
            </p>
          </div>
        </div>

        {/* KPI 4: Ventas Presenciales en Ruta */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <MapPin size={13} /> En Ruta (Campo)
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
              {ordersPresencialCount} pedidos
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300">
              Q{salesPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Visitas presenciales
            </p>
          </div>
        </div>

        {/* KPI 5: Cobros Recaudados Hoy */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <CheckCircle2 size={13} /> Cobros Recaudados
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              Ruta
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              Q{totalCollections.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Cobros ingresados hoy
            </p>
          </div>
        </div>

      </div>

      {/* SECCIÓN DE GRÁFICAS DE PROGRESO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Gráfica 1: Comparativa de Metas y Canales (Bar Chart) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" />
                Comparativa de Cumplimiento vs Compromiso
              </h3>
              <p className="text-[11px] text-slate-400">
                Compromiso fijado vs ventas reales desglosadas por canal
              </p>
            </div>

            <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${tricolor.lightBg} ${tricolor.textColor}`}>
              {percent}% Alcanzado
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  { name: 'Compromiso', monto: commitmentGoal, fill: '#3b82f6' },
                  { name: 'Total Venta', monto: totalSales, fill: tricolor.hex },
                  { name: 'Presencial', monto: salesPresencial, fill: '#0ea5e9' },
                  { name: 'Telemarketing', monto: salesTelemarketing, fill: '#8b5cf6' }
                ]}
                margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                <XAxis 
                  type="number" 
                  tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} 
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 11, fontWeight: 'bold' }} 
                />
                <RechartsTooltip 
                  formatter={(value) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Monto']}
                />
                <Bar dataKey="monto" radius={[0, 8, 8, 0]} barSize={22}>
                  {([
                    { fill: '#3b82f6' },
                    { fill: tricolor.hex },
                    { fill: '#0ea5e9' },
                    { fill: '#8b5cf6' }
                  ]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
            <span>Presencial: Q{salesPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
            <span>Telemarketing: Q{salesTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Total: Q{totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Gráfica 2: Desglose Redondo Presencial vs Telemarketing (Pie Chart) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
              <PieIcon size={16} className="text-purple-600" />
              Canales de Venta Hoy
            </h3>
            <p className="text-[11px] text-slate-400">
              Presencial vs Telemarketing
            </p>
          </div>

          {salesDistributionData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400 italic">
              Sin ventas registradas en esta fecha.
            </div>
          ) : (
            <>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={salesDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {salesDistributionData.map((entry, index) => (
                        <Cell key={`cell-d-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, 'Venta']}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/20">
                  <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    Presencial
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    Q{salesPresencial.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ({totalSales > 0 ? ((salesPresencial / totalSales) * 100).toFixed(0) : 0}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/20">
                  <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    Telemarketing
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    Q{salesTelemarketing.toLocaleString('es-GT', { minimumFractionDigits: 2 })} ({totalSales > 0 ? ((salesTelemarketing / totalSales) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-100 dark:border-slate-700">
            Total General: <strong className="text-slate-700 dark:text-slate-200">Q{totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

      </div>

      {/* Gráfica 3: Tendencia de los Últimos 7 Días */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-600" />
              Evolución de Ventas vs Compromiso (Últimos 7 Días)
            </h3>
            <p className="text-[11px] text-slate-400">
              Seguimiento histórico diario para observar la consistencia del vendedor
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="w-3 h-1 bg-emerald-500 inline-block rounded"></span> Ventas Alcanzadas
            </span>
            <span className="flex items-center gap-1 text-blue-500">
              <span className="w-3 h-1 bg-blue-500 inline-block rounded"></span> Compromiso (Q{commitmentGoal.toLocaleString('es-GT')})
            </span>
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <RechartsTooltip 
                formatter={(value, name) => [`Q${Number(value).toLocaleString('es-GT', { minimumFractionDigits: 2 })}`, name === 'ventas' ? 'Venta Alcanzada' : 'Compromiso']}
              />
              <Bar dataKey="ventas" name="ventas" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Action Banner to Generate and Export Report */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/80 p-6 rounded-3xl border border-blue-200/80 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-black text-base text-blue-950 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600 dark:text-blue-400" size={20} />
            Reporte Oficial de Rendimiento & Visitas
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            Genera el reporte oficial para imprimir o exportar a Excel/PDF (Diario, Semanal o Mensual) con gráficas de metas y sectores.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenReportModal && onOpenReportModal()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-blue-500/25 transition-all whitespace-nowrap"
        >
          <FileText size={16} />
          <span>Generar y Exportar Reporte</span>
        </button>
      </div>

    </div>
  );
}
