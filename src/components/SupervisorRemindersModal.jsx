import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
  Trash2, 
  X,
  Filter,
  CheckCircle,
  Eye,
  RefreshCw,
  Building2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  getStoredReminders, 
  fetchRemoteReminders, 
  deleteClientReminder, 
  getAdvanceTimeLabel 
} from '../lib/remindersDb';
import { getLocalDateString } from '../lib/dateUtils';

export default function SupervisorRemindersModal({ isOpen, onClose, currentUser }) {
  if (!isOpen) return null;

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, completed, expired
  const [search, setSearch] = useState('');
  const [selectedReminder, setSelectedReminder] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setReminders(getStoredReminders());
    try {
      const fresh = await fetchRemoteReminders();
      if (fresh) setReminders(fresh);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      setReminders(getStoredReminders());
    };
    window.addEventListener('olam_reminders_updated', handleUpdate);
    return () => window.removeEventListener('olam_reminders_updated', handleUpdate);
  }, [isOpen]);

  // Vendedores únicos para el filtro
  const uniqueVendors = Array.from(new Set(reminders.map(r => r.vendorName).filter(Boolean))).sort();

  const nowMs = Date.now();

  // Filtrado
  const filtered = reminders.filter(r => {
    if (vendorFilter !== 'all' && r.vendorName !== vendorFilter) return false;
    
    const isCompleted = r.status === 'completed';
    const isExpired = !isCompleted && r.scheduledTimestamp && r.scheduledTimestamp < nowMs;
    const isPending = !isCompleted && !isExpired;

    if (statusFilter === 'completed' && !isCompleted) return false;
    if (statusFilter === 'pending' && !isPending) return false;
    if (statusFilter === 'expired' && !isExpired) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (r.clientName && r.clientName.toLowerCase().includes(q)) ||
                    (r.clientCode && r.clientCode.toLowerCase().includes(q)) ||
                    (r.vendorName && r.vendorName.toLowerCase().includes(q)) ||
                    (r.observations && r.observations.toLowerCase().includes(q)) ||
                    (r.completionNotes && r.completionNotes.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  // Métricas
  const totalCount = reminders.length;
  const completedCount = reminders.filter(r => r.status === 'completed').length;
  const expiredCount = reminders.filter(r => r.status !== 'completed' && r.scheduledTimestamp && r.scheduledTimestamp < nowMs).length;
  const pendingCount = reminders.filter(r => r.status !== 'completed' && (!r.scheduledTimestamp || r.scheduledTimestamp >= nowMs)).length;

  const handleDelete = async (id, clientName) => {
    if (window.confirm(`¿Estás seguro de eliminar el recordatorio de "${clientName}"?`)) {
      await deleteClientReminder(id);
      setReminders(getStoredReminders());
    }
  };

  const handleExportExcel = () => {
    const data = filtered.map((r, i) => {
      const isCompleted = r.status === 'completed';
      const isExpired = !isCompleted && r.scheduledTimestamp && r.scheduledTimestamp < nowMs;
      
      let estadoTexto = 'Pendiente';
      if (isCompleted) estadoTexto = 'Efectuado / Atendido';
      else if (isExpired) estadoTexto = 'Vencido sin atención';

      return {
        'No.': i + 1,
        'Código Cliente': r.clientCode || '—',
        'Nombre Farmacia': r.clientName || '—',
        'Ruta': r.route || '—',
        'Vendedor Asignado': r.vendorName || '—',
        'Fecha Programada': r.date || '—',
        'Hora': r.time || '—',
        'Anticipación Alarma': getAdvanceTimeLabel(r.advanceTime),
        'Estado': estadoTexto,
        'Efectuado En': r.completedAt ? new Date(r.completedAt).toLocaleString('es-GT') : '—',
        'Atendido Por': r.completedBy || '—',
        'Resultado Seguimiento': r.completionNotes || '—',
        'Observaciones Visita': r.observations || '—',
        'Notas Adicionales': r.additionalNotes || '—'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Recordatorios Seguimiento');
    XLSX.writeFile(wb, `Recordatorios_Seguimiento_Olam_${getLocalDateString()}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] max-h-[88vh] flex flex-col overflow-hidden text-xs">
        
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-indigo-500/30 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-2xl text-indigo-300 shadow-inner">
              <Bell size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Monitoreo de Recordatorios & Seguimiento
                </h3>
                <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                  Supervisión Oficial
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Auditoría en tiempo real de compromisos agendados y su cumplimiento en campo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
              title="Descargar reporte a Excel"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"
              title="Recargar datos de la nube"
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="shrink-0 p-3 sm:px-6 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Agendados</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">{totalCount}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 p-2.5 rounded-2xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">✅ Efectuados</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{completedCount}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/40 p-2.5 rounded-2xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">⏳ Pendientes</span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/40 p-2.5 rounded-2xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">⚠️ Vencidos</span>
            <div className="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 mt-0.5">{expiredCount}</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="shrink-0 p-3 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, código, notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Vendedor */}
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 dark:text-white cursor-pointer"
            >
              <option value="all">Todos los Vendedores</option>
              {uniqueVendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            {/* Filtro Estado */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Efectuados ({completedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('expired')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'expired' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Vencidos ({expiredCount})
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Recordatorios */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Bell size={40} className="mb-2 opacity-30 text-indigo-500" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No hay recordatorios registrados</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Cuando los vendedores agenden recordatorios desde el registro de visitas, aparecerán aquí para tu monitoreo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((item) => {
                const isCompleted = item.status === 'completed';
                const isExpired = !isCompleted && item.scheduledTimestamp && item.scheduledTimestamp < nowMs;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/80 dark:border-emerald-800/60'
                        : isExpired
                        ? 'bg-red-50/40 dark:bg-red-950/20 border-red-300/80 dark:border-red-800/60'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isExpired
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {item.clientName}
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              #{item.clientCode || '0000'}
                            </span>
                            <span>•</span>
                            <span>Ruta: {item.route || 'General'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badge de Estado */}
                      <div>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 size={11} />
                            EFECTUADO
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
                            <AlertTriangle size={11} />
                            VENCIDO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock size={11} />
                            PROGRAMADO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Vendedor y Fecha Programada */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 font-bold block">Vendedor Responsable:</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          👤 {item.vendorName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold block">Fecha & Hora:</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                          📅 {item.date} • {item.time} ({getAdvanceTimeLabel(item.advanceTime)})
                        </span>
                      </div>
                    </div>

                    {/* Observaciones iniciales */}
                    {item.observations && (
                      <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="font-bold text-slate-500 block mb-0.5">Observaciones de la Visita:</span>
                        <p className="text-slate-700 dark:text-slate-300">{item.observations}</p>
                      </div>
                    )}

                    {/* DETALLE DE CUMPLIMIENTO / SEGUIMIENTO EFECTUADO */}
                    {isCompleted && (
                      <div className="mt-2.5 p-2.5 bg-emerald-100/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200">
                          <span className="flex items-center gap-1">
                            <CheckCircle size={13} className="text-emerald-600" />
                            <span>Atendido por: {item.completedBy || item.vendorName}</span>
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            {item.completedAt ? new Date(item.completedAt).toLocaleString('es-GT') : ''}
                          </span>
                        </div>
                        <p className="text-emerald-950 dark:text-emerald-100 font-medium italic">
                          "{item.completionNotes}"
                        </p>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.clientName)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar recordatorio"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 sm:px-6 flex items-center justify-between text-slate-500 dark:text-slate-400">
          <span>Mostrando {filtered.length} de {reminders.length} recordatorios</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
