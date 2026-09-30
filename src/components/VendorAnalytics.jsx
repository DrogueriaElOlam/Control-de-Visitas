import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  Award, 
  CheckCircle2, 
  DollarSign, 
  Clock, 
  UserCheck, 
  AlertCircle,
  FileText,
  Filter
} from 'lucide-react';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function VendorAnalytics({ vendors = [], visits = [] }) {
  const [selectedVendorName, setSelectedVendorName] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, this_month, last_30, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected vendor object
  const currentVendorObj = vendors.find(v => v.name === selectedVendorName);

  // Filter visits based on date range and selected vendor
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      // Vendor filter
      if (selectedVendorName !== 'all' && v.vendorName !== selectedVendorName) {
        return false;
      }

      // Date filter
      if (!v.visitDate) return true;
      const vDate = new Date(v.visitDate);
      const now = new Date();

      if (dateFilter === 'this_month') {
        return vDate.getMonth() === now.getMonth() && vDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'last_30') {
        const diffDays = (now - vDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      }
      if (dateFilter === 'custom' && startDate && endDate) {
        return v.visitDate >= startDate && v.visitDate <= endDate;
      }
      return true;
    });
  }, [visits, selectedVendorName, dateFilter, startDate, endDate]);

  // VENDOR FREQUENCY & PERFORMANCE METRICS
  const vendorMetrics = useMemo(() => {
    if (selectedVendorName === 'all') return null;

    const vendorVisits = visits.filter(v => v.vendorName === selectedVendorName);
    const uniqueDates = new Set(vendorVisits.map(v => v.visitDate).filter(Boolean));
    const daysWithVisits = uniqueDates.size;

    // Employment dates
    const hireDate = currentVendorObj?.hire_date ? new Date(currentVendorObj.hire_date) : new Date('2025-12-05');
    const termDate = currentVendorObj?.termination_date ? new Date(currentVendorObj.termination_date) : new Date();
    
    // Total calendar working days (approx excluding Sundays)
    const diffTime = Math.max(1, Math.abs(termDate - hireDate));
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const approxWorkingDays = Math.max(1, Math.round(totalDays * (6 / 7))); // 6 working days/week

    // Frequency Score: % of working days that had visits
    const frequencyScore = Math.min(100, Math.round((daysWithVisits / approxWorkingDays) * 100));

    const totalVisitsCount = vendorVisits.length;
    const visitsWithSale = vendorVisits.filter(v => v.hasSale || v.saleAmount > 0).length;
    const visitsWithCollection = vendorVisits.filter(v => v.hasCollection || v.collectionAmount > 0).length;
    const effectiveVisits = vendorVisits.filter(v => (v.hasSale || v.saleAmount > 0) || (v.hasCollection || v.collectionAmount > 0)).length;
    
    const effectivenessRate = totalVisitsCount > 0 ? Math.round((effectiveVisits / totalVisitsCount) * 100) : 0;
    const totalSales = vendorVisits.reduce((acc, v) => acc + (Number(v.saleAmount) || 0), 0);
    const totalCollections = vendorVisits.reduce((acc, v) => acc + (Number(v.collectionAmount) || 0), 0);
    const avgVisitsPerDayWorked = daysWithVisits > 0 ? (totalVisitsCount / daysWithVisits).toFixed(1) : 0;

    return {
      totalVisitsCount,
      daysWithVisits,
      approxWorkingDays,
      frequencyScore,
      effectivenessRate,
      totalSales,
      totalCollections,
      avgVisitsPerDayWorked,
      hireDateStr: currentVendorObj?.hire_date || '2025-12-05',
      termDateStr: currentVendorObj?.termination_date || 'En funciones actuales',
      isActive: currentVendorObj?.active !== false
    };
  }, [selectedVendorName, visits, currentVendorObj]);

  // GLOBAL COMPARATIVE RANKING OF ALL VENDORS
  const comparativeRanking = useMemo(() => {
    return vendors.map(vendor => {
      const vVisits = visits.filter(v => v.vendorName === vendor.name);
      const uniqueDays = new Set(vVisits.map(v => v.visitDate).filter(Boolean)).size;
      const sales = vVisits.reduce((acc, v) => acc + (Number(v.saleAmount) || 0), 0);
      const collections = vVisits.reduce((acc, v) => acc + (Number(v.collectionAmount) || 0), 0);
      const effectiveCount = vVisits.filter(v => v.hasSale || v.hasCollection).length;
      const effRate = vVisits.length > 0 ? Math.round((effectiveCount / vVisits.length) * 100) : 0;

      return {
        id: vendor.id,
        name: vendor.name,
        route: vendor.route,
        active: vendor.active !== false,
        totalVisits: vVisits.length,
        daysWorked: uniqueDays,
        sales,
        collections,
        effectivenessRate: effRate
      };
    }).sort((a, b) => b.totalVisits - a.totalVisits);
  }, [vendors, visits]);

  // DAILY VISITS TIMELINE FOR CHARTS
  const visitsTimelineData = useMemo(() => {
    const map = {};
    filteredVisits.forEach(v => {
      if (!v.visitDate) return;
      if (!map[v.visitDate]) {
        map[v.visitDate] = { date: v.visitDate, visits: 0, sales: 0, collections: 0 };
      }
      map[v.visitDate].visits += 1;
      map[v.visitDate].sales += Number(v.saleAmount) || 0;
      map[v.visitDate].collections += Number(v.collectionAmount) || 0;
    });

    return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);
  }, [filteredVisits]);

  // STATUS BREAKDOWN (PIE CHART)
  const pieData = useMemo(() => {
    let conVenta = 0;
    let soloCobro = 0;
    let soloVisita = 0;

    filteredVisits.forEach(v => {
      if (v.hasSale || v.saleAmount > 0) conVenta += 1;
      else if (v.hasCollection || v.collectionAmount > 0) soloCobro += 1;
      else soloVisita += 1;
    });

    return [
      { name: 'Con Venta Realizada', value: conVenta },
      { name: 'Gestión de Cobro', value: soloCobro },
      { name: 'Seguimiento / Visita', value: soloVisita }
    ].filter(item => item.value > 0);
  }, [filteredVisits]);

  return (
    <div className="space-y-6">
      
      {/* Header & Vendor Selection */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Análisis de Frecuencia & Rendimiento por Vendedor
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Auditoría de constancia de visitas desde el inicio laboral hasta el cierre del ciclo.
          </p>
        </div>

        {/* Vendor Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-72">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Seleccionar Vendedor:
            </label>
            <select
              value={selectedVendorName}
              onChange={(e) => setSelectedVendorName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">🌟 Todos los Vendedores (Comparativa)</option>
              {vendors.map(v => (
                <option key={v.id} value={v.name}>
                  {v.name} {v.active === false ? '(Baja)' : ''} — {v.route}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-44">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Rango de Fecha:
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Todo el Histórico</option>
              <option value="this_month">Este Mes</option>
              <option value="last_30">Últimos 30 días</option>
              <option value="custom">Personalizado...</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom date range picker */}
      {dateFilter === 'custom' && (
        <div className="bg-blue-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-blue-200 dark:border-slate-700 flex flex-wrap items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span>Desde:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <span>Hasta:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* INDIVIDUAL VENDOR PROFILE BANNER (When specific vendor is chosen) */}
      {selectedVendorName !== 'all' && vendorMetrics && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-blue-700/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black">{selectedVendorName}</h3>
                  {vendorMetrics.isActive ? (
                    <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                      Activo en Ruta
                    </span>
                  ) : (
                    <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                      Relación Laboral Concluida
                    </span>
                  )}
                </div>
                <p className="text-blue-200 text-sm mt-1">
                  Ruta: <strong>{currentVendorObj?.route}</strong> • Contratación: <strong>{vendorMetrics.hireDateStr}</strong> • Fin de Labores: <strong>{vendorMetrics.termDateStr}</strong>
                </p>
              </div>

              {/* Frequency Score Gauge */}
              <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-center">
                <span className="text-[11px] uppercase tracking-wider text-blue-200 font-bold block">
                  Índice de Frecuencia / Constancia
                </span>
                <span className={`text-3xl font-black ${vendorMetrics.frequencyScore >= 70 ? 'text-emerald-400' : vendorMetrics.frequencyScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                  {vendorMetrics.frequencyScore}%
                </span>
                <span className="text-[10px] text-blue-200 block">Días activos con visitas</span>
              </div>
            </div>
          </div>

          {/* Individual Vendor KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Calendar size={14} className="text-blue-500" />
                Días con Visitas
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {vendorMetrics.daysWithVisits} <span className="text-xs font-normal text-slate-400">días</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Promedio: {vendorMetrics.avgVisitsPerDayWorked} visitas/día</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Target size={14} className="text-indigo-500" />
                Total Visitas
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {vendorMetrics.totalVisitsCount}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Efectividad: {vendorMetrics.effectivenessRate}%</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-500" />
                Total Ventas (Q)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                Q{vendorMetrics.totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Generado en ruta</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Award size={14} className="text-amber-500" />
                Cobros Recuperados (Q)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                Q{vendorMetrics.totalCollections.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Recaudación total</p>
            </div>
          </div>
        </div>
      )}

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h4 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            Tendencia de Visitas & Actividad
          </h4>
          <div className="h-64 sm:h-72 w-full">
            {visitsTimelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No hay datos suficientes registrados para este período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitsTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="visits" name="Visitas" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Breakdown Pie Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h4 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Target size={18} className="text-indigo-600" />
            Desglose de Efectividad
          </h4>
          <div className="h-64 sm:h-72 w-full">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Sin registros en el rango.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* COMPARATIVE RANKING TABLE (All Vendors) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="text-amber-500" />
              Ranking Comparativo de Desempeño
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparativa de constancia, cobertura de visitas y ventas acumuladas.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-4 px-6">Posición & Vendedor</th>
                <th className="py-4 px-4">Ruta</th>
                <th className="py-4 px-4 text-center">Días con Visitas</th>
                <th className="py-4 px-4 text-center">Total Visitas</th>
                <th className="py-4 px-4 text-center">Efectividad</th>
                <th className="py-4 px-4 text-right">Ventas Totales</th>
                <th className="py-4 px-6 text-right">Cobros Totales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm font-medium">
              {comparativeRanking.map((v, idx) => (
                <tr 
                  key={v.id}
                  onClick={() => setSelectedVendorName(v.name)}
                  className={`hover:bg-blue-50/50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                    selectedVendorName === v.name ? 'bg-blue-50 dark:bg-blue-950/40' : ''
                  }`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        idx === 0 ? 'bg-amber-400 text-slate-900' :
                        idx === 1 ? 'bg-slate-300 text-slate-800' :
                        idx === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{v.name}</span>
                          {!v.active && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 px-1.5 py-0.5 rounded">
                              Baja
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-300">{v.route}</td>
                  <td className="py-4 px-4 text-center font-semibold text-slate-700 dark:text-slate-200">{v.daysWorked}</td>
                  <td className="py-4 px-4 text-center font-bold text-blue-600 dark:text-blue-400">{v.totalVisits}</td>
                  <td className="py-4 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      {v.effectivenessRate}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    Q{v.sales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-slate-800 dark:text-slate-200">
                    Q{v.collections.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
