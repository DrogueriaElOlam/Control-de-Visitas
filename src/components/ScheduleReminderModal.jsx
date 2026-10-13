import React, { useState } from 'react';
import { 
  Bell, 
  Calendar, 
  Clock, 
  FileText, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  MapPin,
  Building2,
  Volume2
} from 'lucide-react';
import { getLocalDateString } from '../lib/dateUtils';
import { createClientReminder, getAdvanceTimeLabel } from '../lib/remindersDb';

export default function ScheduleReminderModal({ 
  isOpen, 
  onClose, 
  clientData = {}, 
  initialObservations = '',
  currentUser,
  onReminderSaved
}) {
  if (!isOpen) return null;

  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(() => {
    // Por defecto mañana si es tarde, o hoy
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  });
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [advanceTime, setAdvanceTime] = useState('15m'); // 10m, 15m, 30m, 1h, 2h, labor_start, 0m
  const [observations, setObservations] = useState(initialObservations || '');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Botones de acceso rápido para fechas
  const setQuickDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setSelectedDate(getLocalDateString(d));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedDate) {
      setErrorMsg('Por favor selecciona una fecha para el recordatorio.');
      return;
    }

    if (!clientData.clientName && !clientData.clientCode) {
      setErrorMsg('Debes ingresar al menos el nombre o código del cliente para agendar el recordatorio.');
      return;
    }

    setSaving(true);
    try {
      const created = await createClientReminder({
        clientCode: clientData.clientCode || '',
        clientName: clientData.clientName || 'Cliente Droguería El Olam',
        route: clientData.route || 'General',
        vendorName: currentUser?.name || clientData.vendorName || 'Vendedor',
        date: selectedDate,
        time: selectedTime,
        advanceTime,
        observations,
        additionalNotes
      });

      setSuccessMsg('¡Recordatorio agendado exitosamente!');
      if (onReminderSaved) onReminderSaved(created);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error al guardar recordatorio:', err);
      setErrorMsg('No se pudo guardar el recordatorio. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 border border-white/30 rounded-2xl shadow-inner text-white">
              <Bell size={24} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Agendar Recordatorio de Seguimiento
                </h3>
                <span className="bg-white text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                  Alarma Activa
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Alerta sonora y notificación en tu celular al llegar la fecha pactada.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content con scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Tarjeta Informativa del Cliente */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl">
                <Building2 size={18} />
              </div>
              <div>
                <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                  {clientData.clientName || 'Nombre de Farmacia no ingresado'}
                </div>
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    Código: #{clientData.clientCode || '0000'}
                  </span>
                  <span>•</span>
                  <span>Ruta: {clientData.route || 'General'}</span>
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-700/80 text-[11px] font-bold text-amber-800 dark:text-amber-200 shrink-0">
              👤 {currentUser?.name || 'Vendedor'}
            </span>
          </div>

          {/* Selector de Fecha & Hora (Mapa / Calendario Visual) */}
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <Calendar size={15} className="text-amber-600" />
                <span>Fecha y Hora de la Cita / Seguimiento:</span>
              </label>
              <span className="text-[11px] text-slate-500 font-semibold">
                Hoy es {todayStr}
              </span>
            </div>

            {/* Accesos Rápidos de Fecha */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                📅 Hoy
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="px-2.5 py-1 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                📅 Mañana
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(3)}
                className="px-2.5 py-1 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                📅 En 3 días
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(7)}
                className="px-2.5 py-1 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                📅 En 1 semana
              </button>
            </div>

            {/* Inputs de Fecha y Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Fecha Seleccionada:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs focus:ring-2 focus:ring-amber-500 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  Hora Programada:
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs focus:ring-2 focus:ring-amber-500 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Selector de Anticipación de la Alarma (10m, 15m, 30m, 1h, 2h, labor_start) */}
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-200 text-xs">
              <Volume2 size={15} className="text-amber-600" />
              <span>¿Con cuánta anticipación debe sonar la alarma?</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              El teléfono emitirá un tono de aviso y colocará una notificación fija en la barra de estado:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {[
                { id: '10m', label: '⏱️ 10 min antes' },
                { id: '15m', label: '⏱️ 15 min antes' },
                { id: '30m', label: '⏱️ 30 min antes' },
                { id: '1h', label: '🕐 1 hora antes' },
                { id: '2h', label: '🕑 2 horas antes' },
                { id: 'labor_start', label: '🌅 Al iniciar labores (8am)' },
                { id: '0m', label: '🎯 En el momento exacto' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAdvanceTime(item.id)}
                  className={`p-2 rounded-xl text-left font-bold transition-all border text-xs cursor-pointer flex items-center justify-between ${
                    advanceTime === item.id
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50/50'
                  }`}
                >
                  <span>{item.label}</span>
                  {advanceTime === item.id && <CheckCircle2 size={13} className="shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Observaciones Precargadas y Notas Adicionales */}
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Observaciones Registradas de la Visita:
              </label>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observaciones originales de la visita..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Detalles Adicionales del Seguimiento (Opcional):
              </label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Ej: Cliente pidió cotización de Amoxicilina y prometió cheque para el viernes a las 10am..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 dark:text-white"
              />
            </div>
          </div>

          {/* Alertas y Notificaciones */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 sm:px-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Bell size={15} />
            <span>{saving ? 'Guardando...' : '🔔 Agendar y Activar Alarma'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
