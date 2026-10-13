import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Phone, 
  Building2, 
  Calendar, 
  Clock, 
  FileText, 
  Volume2, 
  VolumeX, 
  AlertTriangle 
} from 'lucide-react';
import { completeClientReminder, playReminderAlarmSound } from '../lib/remindersDb';

export default function ActiveReminderAlertModal({ 
  reminder, 
  onClose, 
  currentUser,
  onCompleted 
}) {
  if (!reminder) return null;

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [soundPlaying, setSoundPlaying] = useState(true);

  useEffect(() => {
    // Tocar sonido inicial
    playReminderAlarmSound();

    // Repetir el sonido cada 15 segundos mientras esté abierta la alerta
    const interval = setInterval(() => {
      if (soundPlaying) {
        playReminderAlarmSound();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [soundPlaying]);

  const handleDeactivate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const completed = await completeClientReminder(reminder.id, {
        completionNotes: notes || 'Seguimiento completado y atendido en campo.',
        completedBy: currentUser?.name || reminder.vendorName || 'Vendedor'
      });
      if (onCompleted) onCompleted(completed);
      onClose();
    } catch (err) {
      console.error('Error al desactivar recordatorio:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-bounceSubtle text-xs">
        
        {/* Banner de Alerta Urgente */}
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl animate-pulse text-white">
              <Bell size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  ALERTA EN VIVO
                </span>
                <h3 className="text-base font-black text-white">
                  Recordatorio de Cliente Activo
                </h3>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Es momento de atender el compromiso pactado con esta farmacia.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSoundPlaying(!soundPlaying)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all cursor-pointer"
            title={soundPlaying ? 'Silenciar sonido' : 'Activar sonido'}
          >
            {soundPlaying ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 sm:p-6 space-y-4">
          
          {/* Farmacia y Datos Clave */}
          <div className="p-3.5 bg-amber-50 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/60 rounded-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Cliente a Atender
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {reminder.clientName}
                </h4>
                <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 mt-1">
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-300">
                    #{reminder.clientCode || '0000'}
                  </span>
                  <span>•</span>
                  <span>Ruta: {reminder.route || 'General'}</span>
                  <span>•</span>
                  <span>Vendedor: {reminder.vendorName}</span>
                </div>
              </div>
            </div>

            {/* Fecha y Hora */}
            <div className="mt-3 pt-3 border-t border-amber-200/60 dark:border-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-600" />
                <span>Fecha: {reminder.date}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-amber-600" />
                <span>Hora: {reminder.time}</span>
              </span>
            </div>
          </div>

          {/* Observaciones y Acuerdos */}
          <div className="space-y-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="font-extrabold text-slate-500 uppercase text-[10px] block mb-1">
                Observaciones y Compromiso:
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-medium">
                {reminder.observations || 'Sin observaciones registradas.'}
              </p>
              {reminder.additionalNotes && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 text-[10px] block">
                    Notas adicionales de seguimiento:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                    {reminder.additionalNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Formulario de Desactivación y Registro */}
          <form onSubmit={handleDeactivate} className="space-y-3 pt-1">
            <div>
              <label className="block font-black text-slate-800 dark:text-slate-200 mb-1">
                ¿Qué acordaste o qué gestión efectuaste con el cliente? *
              </label>
              <textarea
                rows={2}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Se llamó al cliente y confirmó pedido de Q1,500; se pasará a dejar factura mañana..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium dark:text-white"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Esta confirmación se sincroniza en vivo para la supervisión de Droguería El Olam.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs sm:text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={18} />
                <span>{submitting ? 'Registrando...' : '✅ Desactivar Alarma y Guardar Seguimiento'}</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
