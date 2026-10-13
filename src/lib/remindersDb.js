/**
 * Módulo de Recordatorios y Seguimiento de Clientes
 * Sincronización en la Nube Supabase & Local
 * Alarma Sonora Web Audio API & Notificaciones de Sistema Android/PC
 * Droguería El Olam 2026.
 */

import { supabase } from './supabase';
import { getLocalDateString } from './dateUtils';

const REMINDERS_STORAGE_KEY = 'olam_client_reminders_v2';
const REMINDERS_SYNC_KEY = 'reminders_sync_master';
const REMINDERS_CHANNEL_NAME = 'olam_reminders_live_channel';

let remindersRealtimeChannel = null;

/**
 * Obtiene los recordatorios almacenados localmente
 */
export function getStoredReminders() {
  try {
    const raw = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error al leer recordatorios locales:', e);
    return [];
  }
}

/**
 * Guarda los recordatorios localmente y emite evento reactivo
 */
export function saveStoredReminders(reminders) {
  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olam_reminders_updated', { detail: reminders }));
    }
  } catch (e) {
    console.error('Error al guardar recordatorios locales:', e);
  }
}

/**
 * Carga recordatorios desde Supabase y los unifica con los locales
 */
export async function fetchRemoteReminders() {
  const local = getStoredReminders();
  try {
    const { data, error } = await supabase
      .from('daily_supervision_history')
      .select('datos')
      .eq('date', REMINDERS_SYNC_KEY)
      .maybeSingle();

    if (!error && data?.datos?.reminders && Array.isArray(data.datos.reminders)) {
      const remote = data.datos.reminders;
      const map = new Map();
      local.forEach(r => map.set(r.id, r));
      remote.forEach(r => {
        const existing = map.get(r.id);
        // Si el remoto fue completado más recientemente o no existe localmente, se prioriza
        if (!existing || (r.status === 'completed' && existing.status !== 'completed')) {
          map.set(r.id, r);
        } else if (existing.completedAt && !r.completedAt) {
          // Mantener el local si ya fue completado
          map.set(r.id, existing);
        } else {
          map.set(r.id, { ...existing, ...r });
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => (b.scheduledTimestamp || 0) - (a.scheduledTimestamp || 0));
      saveStoredReminders(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Fallback al cargar recordatorios remotos:', err);
  }
  return local;
}

/**
 * Sincroniza la lista de recordatorios en Supabase
 */
export async function syncRemindersToSupabase(reminders) {
  try {
    // Conservar los últimos 300 recordatorios para optimizar espacio
    const payloadReminders = reminders.slice(0, 300);
    await supabase
      .from('daily_supervision_history')
      .upsert({
        date: REMINDERS_SYNC_KEY,
        datos: {
          tipo: 'client_reminders_sync',
          updatedAt: new Date().toISOString(),
          reminders: payloadReminders
        }
      }, { onConflict: 'date' });
  } catch (e) {
    console.warn('Error al sincronizar recordatorios en Supabase:', e);
  }
}

/**
 * Suscripción en Tiempo Real para cambios de recordatorios
 */
export function subscribeToReminders(onUpdateCallback) {
  if (remindersRealtimeChannel) {
    return () => {};
  }

  try {
    remindersRealtimeChannel = supabase
      .channel(REMINDERS_CHANNEL_NAME)
      .on('broadcast', { event: 'reminders_changed' }, (payload) => {
        if (payload?.payload?.reminders) {
          saveStoredReminders(payload.payload.reminders);
          if (onUpdateCallback) onUpdateCallback(payload.payload.reminders);
        }
      })
      .subscribe();
  } catch (err) {
    console.warn('Error suscribiendo a reminders channel:', err);
  }

  return () => {
    if (remindersRealtimeChannel) {
      supabase.removeChannel(remindersRealtimeChannel);
      remindersRealtimeChannel = null;
    }
  };
}

/**
 * Notifica a través del canal en vivo que hubo un cambio
 */
export async function broadcastRemindersChange(reminders) {
  try {
    if (remindersRealtimeChannel) {
      await remindersRealtimeChannel.send({
        type: 'broadcast',
        event: 'reminders_changed',
        payload: { reminders }
      });
    }
  } catch (e) {
    console.warn('Broadcast reminders error:', e);
  }
}

/**
 * Calcula el timestamp exacto en que debe activarse la alarma
 * basándose en la fecha, hora y el tiempo de anticipación
 */
export function calculateTriggerTimestamp(dateStr, timeStr, advanceTime = '0m') {
  // Ej: dateStr: '2026-10-15', timeStr: '14:30'
  const [year, month, day] = dateStr.split('-').map(Number);
  let [hours, minutes] = (timeStr || '09:00').split(':').map(Number);

  if (advanceTime === 'labor_start') {
    // Inicio de labores: 08:00 AM del día programado
    hours = 8;
    minutes = 0;
  }

  const targetDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  let targetMs = targetDate.getTime();

  // Descontar la anticipación si no es labor_start
  if (advanceTime === '10m') targetMs -= 10 * 60 * 1000;
  else if (advanceTime === '15m') targetMs -= 15 * 60 * 1000;
  else if (advanceTime === '30m') targetMs -= 30 * 60 * 1000;
  else if (advanceTime === '1h') targetMs -= 60 * 60 * 1000;
  else if (advanceTime === '2h') targetMs -= 120 * 60 * 1000;

  return targetMs;
}

/**
 * Agrega y programa un nuevo recordatorio
 */
export async function createClientReminder({
  clientCode,
  clientName,
  route,
  vendorName,
  date,
  time = '09:00',
  advanceTime = '15m',
  observations = '',
  additionalNotes = ''
}) {
  const currentList = getStoredReminders();
  const scheduledTimestamp = calculateTriggerTimestamp(date, time, advanceTime);

  const newReminder = {
    id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    clientCode: (clientCode || '').trim(),
    clientName: (clientName || 'Cliente').trim(),
    route: route || 'General',
    vendorName: vendorName || 'Vendedor',
    date,
    time,
    advanceTime,
    scheduledTimestamp,
    observations: observations || '',
    additionalNotes: additionalNotes || '',
    status: 'pending', // 'pending' | 'triggered' | 'completed'
    createdAt: new Date().toISOString(),
    completedAt: null,
    completedBy: null,
    completionNotes: ''
  };

  const updated = [newReminder, ...currentList];
  saveStoredReminders(updated);

  // Sincronizar en la nube
  await syncRemindersToSupabase(updated);
  await broadcastRemindersChange(updated);

  // Solicitar permiso de notificaciones proactivamente
  requestSystemNotificationPermission();

  return newReminder;
}

/**
 * Marca un recordatorio como completado / desactivado por el vendedor
 */
export async function completeClientReminder(id, { completionNotes = '', completedBy = '' }) {
  const currentList = getStoredReminders();
  const nowStr = new Date().toISOString();

  const updated = currentList.map(r => {
    if (r.id === id) {
      return {
        ...r,
        status: 'completed',
        completedAt: nowStr,
        completedBy: completedBy || r.vendorName,
        completionNotes: completionNotes || 'Seguimiento efectuado y desactivado.'
      };
    }
    return r;
  });

  saveStoredReminders(updated);
  await syncRemindersToSupabase(updated);
  await broadcastRemindersChange(updated);

  return updated.find(r => r.id === id);
}

/**
 * Elimina un recordatorio
 */
export async function deleteClientReminder(id) {
  const currentList = getStoredReminders();
  const updated = currentList.filter(r => r.id !== id);
  saveStoredReminders(updated);
  await syncRemindersToSupabase(updated);
  await broadcastRemindersChange(updated);
  return updated;
}

/**
 * Reproduce un tono de alarma sonoro nítido y armónico
 * usando Web Audio API (funciona en móvil y PC sin archivos externos)
 */
export function playReminderAlarmSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Secuencia de 3 beeps de alta atención
    const times = [0, 0.22, 0.44];
    const freqs = [880, 1174.66, 1318.51]; // La, Re, Mi (acorde brillante y claro)

    times.forEach((t, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[index % freqs.length], ctx.currentTime + t);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.22);
    });
  } catch (e) {
    console.warn('AudioContext playback warning:', e);
  }
}

/**
 * Solicita permiso para mostrar notificaciones del sistema
 */
export async function requestSystemNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch (_) {}
  }
}

/**
 * Emite una notificación en la barra de estado de Android / Tablets / PC
 */
export function triggerSystemNotification({ title, body, tag, icon }) {
  if (typeof window === 'undefined') return;

  // Vibración en dispositivos móviles Android
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 400]);
    } catch (_) {}
  }

  // Notificación nativa en la barra de notificaciones
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title || '⏰ Droguería El Olam - Recordatorio', {
        body: body || 'Tienes un seguimiento de cliente pendiente por atender.',
        icon: icon || '/vite.svg',
        tag: tag || 'olam_reminder',
        requireInteraction: true // Requiere que el usuario la desactive manualmente
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Error al disparar Notification nativa:', e);
    }
  }
}

/**
 * Formatea el texto de anticipación para visualización
 */
export function getAdvanceTimeLabel(advanceTime) {
  switch (advanceTime) {
    case '0m': return 'Al momento exacto';
    case '10m': return '10 min antes';
    case '15m': return '15 min antes';
    case '30m': return '30 min antes';
    case '1h': return '1 hora antes';
    case '2h': return '2 horas antes';
    case 'labor_start': return 'Al iniciar labores (8:00 AM)';
    default: return advanceTime || '15 min antes';
  }
}
