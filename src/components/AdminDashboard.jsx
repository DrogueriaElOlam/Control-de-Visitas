import React, { useMemo } from 'react';
import { 
  Users, 
  MapPin, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Target, 
  ArrowUpRight, 
  Navigation,
  FileSpreadsheet,
  Layers,
  Award
} from 'lucide-react';

export default function AdminDashboard({ 
  vendors = [], 
  visits = [], 
  onNavigate 
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const todayVisits = useMemo(() => visits.filter(v => v.visitDate === todayStr), [visits, todayStr]);
  const yesterdayVisits = useMemo(() => visits.filter(v => v.visitDate === yesterdayStr), [visits, yesterdayStr]);

  const activeVendors = useMemo(() => vendors.filter(v => v.active !== false), [vendors]);
  const inactiveVendors = useMemo(() => vendors.filter(v => v.active === false), [vendors]);

  const totalSales = useMemo(() => visits.reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0), [visits]);
  const totalCollections = useMemo(() => visits.reduce((sum, v) => sum + (Number(v.collectionAmount) || 0), 0), [visits]);
  const salesToday = useMemo(() => todayVisits.reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0), [todayVisits]);
  const collectionsToday = useMemo(() => todayVisits.reduce((sum, v) => sum + (Number(v.collectionAmount) || 0), 0), [todayVisits]);

  const totalVisitsCount = visits.length;
  const effectiveCount = visits.filter(v => v.hasSale || v.hasCollection).length;
  const globalEffectiveness = totalVisitsCount > 0 ? Math.round((effectiveCount / totalVisitsCount) * 100) : 0;

  // Vendors activity today
  const vendorTodayActivity = useMemo(() => {
    return activeVendors.map(vendor => {
      const vToday = todayVisits.filter(v => v.vendorName === vendor.name);
      const vSales = vToday.reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
      const goal = vendor.daily_goal || 15;
      const progress = Math.min(100, Math.round((vToday.length / goal) * 100));

      return {
        id: vendor.id,
        name: vendor.name,
        route: vendor.route,
        todayCount: vToday.length,
        goal,
        progress,
        todaySales: vSales
      };
    }).sort((a, b) => b.todayCount - a.todayCount);
  }, [activeVendors, todayVisits]);

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-blue-700/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Panel de Control General
            </span>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mt-0.5">
              Droguería El Olam — Monitoreo Global
            </h2>
            <p className="text-sm text-blue-200 mt-1 max-w-2xl">
              Resumen ejecutivo de operaciones en ruta, efectividad de ventas y constancia de visitas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('vendors')}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white text-blue-900 font-bold text-xs sm:text-sm hover:bg-blue-50 transition-all shadow-md flex items-center gap-1.5"
            >
              <Users size={16} />
              <span>Gestionar Vendedores</span>
            </button>
            <button
              onClick={() => onNavigate('frequency')}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5"
            >
              <Target size={16} />
              <span>Análisis de Frecuencia</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Visits */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Visitas Históricas</span>
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 dark:text-white">{totalVisitsCount}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>Hoy: <strong className="text-blue-600">{todayVisits.length}</strong></span>
              <span>•</span>
              <span>Ayer: {yesterdayVisits.length}</span>
            </div>
          </div>
        </div>

        {/* Global Effectiveness */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tasa de Efectividad</span>
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{globalEffectiveness}%</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {effectiveCount} visitas con venta o cobro
            </p>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ventas Acumuladas</span>
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              Q{totalSales.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hoy: Q{salesToday.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Total Collections */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cobros Recuperados</span>
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300">
              <Award size={20} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              Q{totalCollections.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hoy: Q{collectionsToday.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

      </div>

      {/* Vendors Activity Today Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="text-blue-600" />
              Estado de los Vendedores en Ruta (Hoy)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Progreso en tiempo real hacia la meta diaria de visitas.
            </p>
          </div>

          <button
            onClick={() => onNavigate('visits')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Ver todas las visitas</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* MOBILE CARD VIEW (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {vendorTodayActivity.map(v => (
            <div key={v.id} className="p-4 space-y-2 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{v.name}</h4>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin size={11} className="text-blue-500" />
                    <span>{v.route}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                    {v.todayCount} <span className="text-xs font-normal text-slate-400">/ {v.goal}</span>
                  </span>
                  <span className="block text-[10px] text-slate-400">visitas</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className={v.progress >= 100 ? 'text-emerald-600 font-extrabold' : 'text-slate-500'}>
                    {v.progress}% {v.progress >= 100 ? '✓ Meta lista' : ''}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {v.todaySales > 0 ? `Venta: Q${v.todaySales.toFixed(2)}` : 'Sin ventas'}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      v.progress >= 100 ? 'bg-emerald-500' : v.progress >= 50 ? 'bg-blue-600' : 'bg-amber-500'
                    }`}
                    style={{ width: `${v.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* TABLE VIEW (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-4 px-6">Vendedor</th>
                <th className="py-4 px-4">Ruta</th>
                <th className="py-4 px-4 text-center">Visitas Hoy</th>
                <th className="py-4 px-6">Progreso de Meta</th>
                <th className="py-4 px-6 text-right">Ventas Hoy (Q)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {vendorTodayActivity.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                    {v.name}
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-blue-500" />
                      {v.route}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center font-black text-blue-600 dark:text-blue-400">
                    {v.todayCount} <span className="text-xs font-normal text-slate-400">/ {v.goal}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between text-[11px] font-bold mb-1">
                        <span className={v.progress >= 100 ? 'text-emerald-600 font-extrabold' : 'text-slate-500'}>
                          {v.progress}% {v.progress >= 100 ? '✓ Meta lista' : ''}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            v.progress >= 100 ? 'bg-emerald-500' : v.progress >= 50 ? 'bg-blue-600' : 'bg-amber-500'
                          }`}
                          style={{ width: `${v.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {v.todaySales > 0 ? `Q${v.todaySales.toFixed(2)}` : '—'}
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
