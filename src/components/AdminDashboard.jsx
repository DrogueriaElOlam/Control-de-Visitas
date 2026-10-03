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
  Award,
  LogOut,
  Building2
} from 'lucide-react';

export default function AdminDashboard({ 
  vendors = [], 
  visits = [], 
  onNavigate,
  onLogout,
  onOpenDirectoryModal,
  onlineVendors = {}
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

      // Buscar última visita con ubicación GPS registrada
      const latestWithLoc = [...vToday].reverse().find(v => v.location?.lat && v.location?.lng) ||
                            [...visits].filter(v => v.vendorName === vendor.name).reverse().find(v => v.location?.lat && v.location?.lng);

      return {
        id: vendor.id,
        name: vendor.name,
        route: vendor.route,
        todayCount: vToday.length,
        goal,
        progress,
        todaySales: vSales,
        lastGps: latestWithLoc?.location || null,
        lastClient: latestWithLoc?.clientName || null
      };
    }).sort((a, b) => b.todayCount - a.todayCount);
  }, [activeVendors, todayVisits, visits]);

  // Helper para verificar presencia en tiempo real
  const isVendorOnline = (v) => {
    if (!onlineVendors) return false;
    return !!(
      onlineVendors[v.name] || 
      onlineVendors[v.id] || 
      onlineVendors[String(v.id)] || 
      onlineVendors[`User_${v.id}`]
    );
  };

  const onlineVendorsCount = activeVendors.filter(v => isVendorOnline(v)).length;

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
            {onOpenDirectoryModal && (
              <button
                onClick={onOpenDirectoryModal}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 border border-emerald-400/40 cursor-pointer"
                title="Subir archivo Excel con directorio de farmacias y clientes"
              >
                <FileSpreadsheet size={16} />
                <span>Cargar Clientes (Excel)</span>
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 border border-red-400/40 cursor-pointer"
                title="Regresar a la pantalla de login"
              >
                <LogOut size={16} />
                <span>Salir / Regresar</span>
              </button>
            )}
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
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="text-blue-600" />
                Estado de los Vendedores en Ruta (Hoy)
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{onlineVendorsCount} de {activeVendors.length} en línea</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Progreso en tiempo real hacia la meta diaria y supervisión de conexión.
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
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{v.name}</h4>
                    {isVendorOnline(v) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 shadow-sm animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>EN LÍNEA</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                        <span>Desconectado</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={11} className="text-blue-500" />
                      <span>{v.route}</span>
                    </div>
                    {v.lastGps && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://www.google.com/maps?q=${v.lastGps.lat},${v.lastGps.lng}`, '_blank')}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] hover:bg-emerald-200 transition-colors shadow-sm cursor-pointer"
                        title="Ver ubicación en Google Maps"
                      >
                        <Navigation size={10} className="text-emerald-600 animate-pulse" />
                        <span>📍 GPS</span>
                      </button>
                    )}
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
                <th className="py-4 px-4 text-center">Última Ubicación</th>
                <th className="py-4 px-6 text-right">Ventas Hoy (Q)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {vendorTodayActivity.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <span>{v.name}</span>
                      {isVendorOnline(v) ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 shadow-sm animate-pulse" title="Vendedor activo y conectado en este momento">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>EN LÍNEA</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400" title="Desconectado">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                          <span>Desconectado</span>
                        </span>
                      )}
                    </div>
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
                  <td className="py-4 px-4 text-center">
                    {v.lastGps ? (
                      <button
                        type="button"
                        onClick={() => window.open(`https://www.google.com/maps?q=${v.lastGps.lat},${v.lastGps.lng}`, '_blank')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-all shadow-sm cursor-pointer"
                        title={`Último punto GPS en ${v.lastClient || 'ruta'}`}
                      >
                        <Navigation size={12} className="text-emerald-600 animate-pulse" />
                        <span>📍 GPS</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin registro</span>
                    )}
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
