import React, { useState, useMemo } from 'react';
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
  Navigation
} from 'lucide-react';
import { deleteVisitRecord } from '../lib/db';

export default function VisitsListAndFilters({ 
  visits = [], 
  currentUser, 
  onVisitsChange, 
  onOpenMapLocation,
  onOpenReportModal
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, sale, collection, effective

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // List of unique vendors in visits
  const uniqueVendors = useMemo(() => {
    return Array.from(new Set(visits.map(v => v.vendorName).filter(Boolean))).sort();
  }, [visits]);

  // Filtered visits
  const filtered = useMemo(() => {
    return visits.filter(v => {
      // Vendor filter
      if (isAdmin && vendorFilter !== 'all' && v.vendorName !== vendorFilter) {
        return false;
      }
      if (!isAdmin && v.vendorName !== currentUser?.name) {
        return false;
      }

      // Date filter
      if (dateFilter === 'today' && v.visitDate !== todayStr) return false;
      if (dateFilter === 'yesterday' && v.visitDate !== yesterdayStr) return false;
      if (dateFilter === 'custom' && startDate && endDate) {
        if (v.visitDate < startDate || v.visitDate > endDate) return false;
      }

      // Type filter
      if (typeFilter === 'sale' && !(v.hasSale || v.saleAmount > 0)) return false;
      if (typeFilter === 'collection' && !(v.hasCollection || v.collectionAmount > 0)) return false;
      if (typeFilter === 'effective' && !((v.hasSale || v.saleAmount > 0) || (v.hasCollection || v.collectionAmount > 0))) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const clientMatch = v.clientName && v.clientName.toLowerCase().includes(q);
        const codeMatch = v.clientCode && v.clientCode.toLowerCase().includes(q);
        const routeMatch = v.sector && v.sector.toLowerCase().includes(q);
        const obsMatch = v.observations && v.observations.toLowerCase().includes(q);
        if (!clientMatch && !codeMatch && !routeMatch && !obsMatch) return false;
      }

      return true;
    });
  }, [visits, isAdmin, vendorFilter, currentUser, dateFilter, startDate, endDate, typeFilter, searchTerm, todayStr, yesterdayStr]);

  // Calculate quick stats of filtered list
  const totalCount = filtered.length;
  const totalSales = filtered.reduce((sum, v) => sum + (Number(v.saleAmount) || 0), 0);
  const totalCollections = filtered.reduce((sum, v) => sum + (Number(v.collectionAmount) || 0), 0);
  const effectiveCount = filtered.filter(v => v.hasSale || v.hasCollection).length;
  const effectivenessRate = totalCount > 0 ? Math.round((effectiveCount / totalCount) * 100) : 0;

  // Handle delete
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
      
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, código o sector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
            />
          </div>

          {/* Date quick select */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'all' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'today' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateFilter('yesterday')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'yesterday' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Ayer
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                dateFilter === 'custom' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Rango...
            </button>

            {/* Export Report Button */}
            <button
              onClick={() => onOpenReportModal && onOpenReportModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-emerald-500/25 transition-all ml-auto sm:ml-2"
              title="Generar y Exportar Reporte Oficial con Gráficas y Métricas"
            >
              <FileText size={14} />
              <span>Exportar Reporte</span>
            </button>
          </div>
        </div>

        {/* Second row filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          
          {/* Vendor dropdown (Admin only) */}
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

          {/* Type of visit */}
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
              <option value="sale">Con Venta Registrada</option>
              <option value="collection">Con Cobro Recaudado</option>
              <option value="effective">Visita Efectiva (Venta o Cobro)</option>
            </select>
          </div>

          {/* Custom date range inputs */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Metrics Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Visitas Filtradas</span>
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

      {/* List of Visits (Responsive: Cards on Mobile, Full Table on Tablet/Desktop) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        
        {/* MOBILE CARD VIEW (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium px-4">
              No hay visitas que coincidan con los criterios seleccionados.
            </div>
          ) : (
            filtered.map(visit => {
              const hasGps = visit.location && visit.location.lat && visit.location.lng;
              const hasSaleVal = visit.hasSale || Number(visit.saleAmount) > 0;
              const hasCollVal = visit.hasCollection || Number(visit.collectionAmount) > 0;

              return (
                <div key={visit.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                  
                  {/* Card Header: Client & Actions */}
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

                    {/* Admin delete action */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(visit)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Route & Vendor Info */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin size={13} className="text-blue-500" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">{visit.sector || visit.route}</span>
                    </div>
                    <div>
                      Por: <strong className="text-slate-800 dark:text-slate-200">{visit.vendorName}</strong>
                    </div>
                  </div>

                  {/* Date & Period */}
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>📅 {visit.visitDate}</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {visit.dayPeriod === 'mañana' ? '☀️ Mañana' : '🌙 Tarde'} ({visit.visitType})
                    </span>
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

                  {/* Observation note if present */}
                  {visit.observations && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs italic text-slate-600 dark:text-slate-300">
                      "{visit.observations}"
                    </div>
                  )}

                  {/* GPS Button (Admin only) */}
                  {isAdmin && hasGps && (
                    <div className="pt-1">
                      <button
                        onClick={() => onOpenMapLocation && onOpenMapLocation(visit)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <Navigation size={13} />
                        <span>Ver Coordenadas en Mapa GPS</span>
                      </button>
                    </div>
                  )}

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
                {isAdmin && <th className="py-4 px-4">GPS</th>}
                {isAdmin && <th className="py-4 px-6 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} className="py-12 text-center text-slate-400 font-medium">
                    No hay visitas que coincidan con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filtered.map(visit => {
                  const hasGps = visit.location && visit.location.lat && visit.location.lng;

                  return (
                    <tr key={visit.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                      
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
                        <div className="font-medium">{visit.visitDate}</div>
                        <div className="capitalize text-slate-400 text-[11px]">
                          {visit.dayPeriod === 'mañana' ? '☀️ Mañana' : '🌙 Tarde'} ({visit.visitType})
                        </div>
                      </td>

                      {/* Sale */}
                      <td className="py-4 px-4 font-bold">
                        {visit.hasSale || visit.saleAmount > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Q{Number(visit.saleAmount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Collection */}
                      <td className="py-4 px-4 font-bold">
                        {visit.hasCollection || visit.collectionAmount > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Q{Number(visit.collectionAmount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* GPS - Only visible for Admin */}
                      {isAdmin && (
                        <td className="py-4 px-4">
                          {hasGps ? (
                            <button
                              onClick={() => onOpenMapLocation && onOpenMapLocation(visit)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition-colors"
                              title="Ver en el mapa interactivo"
                            >
                              <Navigation size={12} />
                              <span>Ver GPS</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Sin GPS</span>
                          )}
                        </td>
                      )}

                      {/* Action (Admin delete) */}
                      {isAdmin && (
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleDelete(visit)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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

    </div>
  );
}
