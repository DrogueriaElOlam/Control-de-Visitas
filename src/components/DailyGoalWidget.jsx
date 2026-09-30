import React from 'react';
import { Target, CheckCircle2, TrendingUp, Award, Clock, FileText } from 'lucide-react';

export default function DailyGoalWidget({ currentUser, visits = [], onOpenReportModal }) {
  const goal = currentUser?.daily_goal || 15;
  const todayStr = new Date().toISOString().split('T')[0];

  const todayVisits = visits.filter(
    v => v.vendorName === currentUser?.name && v.visitDate === todayStr
  );

  const completed = todayVisits.length;
  const percent = Math.min(100, Math.round((completed / goal) * 100));
  const remaining = Math.max(0, goal - completed);

  const salesToday = todayVisits.reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
  const collectionsToday = todayVisits.reduce((sum, v) => sum + (Number(v.collectionAmount) || 0), 0);
  const effectiveCount = todayVisits.filter(v => v.hasSale || v.hasCollection).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Main Goal Card */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-blue-700/40 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-300 mb-1">
              <Target size={16} /> Meta Diaria de Visitas
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Progreso de Hoy: {completed} / {goal}
            </h2>
            <p className="text-sm text-blue-200 mt-1">
              {percent >= 100 
                ? '🎉 ¡Felicidades! Has completado tu meta diaria para Droguería El Olam.' 
                : `Te faltan ${remaining} visitas para alcanzar tu objetivo del día.`}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center">
            <span className="text-3xl sm:text-4xl font-black text-emerald-400">{percent}%</span>
            <span className="block text-xs uppercase text-blue-200 font-bold mt-0.5">Completado</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 relative w-full h-4 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Today's KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Award size={15} className="text-blue-500" />
            Visitas Efectivas Hoy
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            {effectiveCount} <span className="text-xs font-normal text-slate-400">de {completed}</span>
          </div>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            {completed > 0 ? `${Math.round((effectiveCount / completed) * 100)}% de efectividad` : 'Sin visitas registradas aún'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <TrendingUp size={15} className="text-emerald-500" />
            Ventas de Hoy
          </span>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            Q{salesToday.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">Acumulado en pedidos hoy</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 size={15} className="text-amber-500" />
            Cobros Recaudados Hoy
          </span>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
            Q{collectionsToday.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">Recaudación en ruta hoy</p>
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
