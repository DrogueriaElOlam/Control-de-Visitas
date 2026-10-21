/**
 * Módulo de Continuidad de Sesión Multi-Dispositivo (Cloud Active Sessions)
 * Droguería El Olam
 * 
 * Permite que un vendedor o administrador que inició sesión en su celular,
 * tablet o computadora pueda continuar su trabajo en cualquier otro dispositivo
 * donde abra el sistema sin tener que volver a ingresar contraseñas o quemar
 * nuevas claves OTP de un solo uso.
 */

import { supabase } from './supabase';
import { getFriendlyDeviceInfo } from './vendorConnections';
import { getLocalDateString } from './dateUtils';

const CLOUD_SESSIONS_DATE = '2099-12-25';
const LOCAL_ACTIVE_SESSIONS_KEY = 'olam_cloud_active_sessions_cache_v1';
const LAST_ACTIVE_USER_KEY = 'olam_last_known_user_profile';

/**
 * Normaliza claves de usuario para indexación limpia
 */
export function normalizeUserKey(nameOrUsername) {
  if (!nameOrUsername) return '';
  return String(nameOrUsername)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Lee la caché local de sesiones activas
 */
export function getLocalCloudSessions() {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVE_SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
    }
  } catch (_) {}
  return {};
}

/**
 * Guarda en caché local las sesiones activas
 */
export function saveLocalCloudSessions(sessionsMap) {
  try {
    localStorage.setItem(LOCAL_ACTIVE_SESSIONS_KEY, JSON.stringify(sessionsMap));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olam_cloud_sessions_changed', { detail: sessionsMap }));
    }
  } catch (e) {
    console.warn('[CloudSessions] Error guardando caché local:', e);
  }
}

/**
 * Consulta la lista de sesiones activas en Supabase
 */
export async function fetchCloudActiveSessions() {
  let localMap = getLocalCloudSessions();

  try {
    const { data, error } = await supabase
      .from('daily_supervision_history')
      .select('datos')
      .eq('date', CLOUD_SESSIONS_DATE)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0 && data[0]?.datos?.sessions) {
      const cloudSessions = data[0].datos.sessions;
      const merged = { ...localMap, ...cloudSessions };
      
      // Filtrar sesiones expiradas (mayores a 36 horas)
      const now = Date.now();
      const validSessions = {};
      for (const [key, sess] of Object.entries(merged)) {
        if (sess && sess.status === 'active') {
          const sessTime = sess.timestamp ? new Date(sess.timestamp).getTime() : 0;
          if (now - sessTime < 36 * 60 * 60 * 1000) {
            validSessions[key] = sess;
          }
        }
      }

      saveLocalCloudSessions(validSessions);
      return validSessions;
    }
  } catch (err) {
    console.warn('[CloudSessions] Error consultando sesiones activas en la nube:', err);
  }

  return localMap;
}

/**
 * Registra una sesión activa en la nube al hacer login
 */
export async function registerCloudActiveSession(session) {
  if (!session) return;
  const userKey = normalizeUserKey(session.username || session.name);
  if (!userKey) return;

  const now = new Date();
  const dateStr = getLocalDateString(now);
  const timeStr = now.toLocaleTimeString('es-GT', { hour12: false });
  const device = getFriendlyDeviceInfo();

  const sessionData = {
    userKey,
    name: session.name,
    username: session.username || session.name,
    role: session.role || 'vendor',
    vendorId: session.vendorId || null,
    route: session.route || 'Ruta General',
    daily_goal: session.daily_goal || 15,
    hire_date: session.hire_date || null,
    loginMethod: session.loginMethod || 'cloud_continuity',
    device,
    date: dateStr,
    time: timeStr,
    timestamp: now.toISOString(),
    status: 'active'
  };

  // 1. Guardar localmente
  const currentLocal = getLocalCloudSessions();
  currentLocal[userKey] = sessionData;
  saveLocalCloudSessions(currentLocal);

  // Guardar último perfil conocido en este navegador para sugerencias rápidas
  try {
    localStorage.setItem(LAST_ACTIVE_USER_KEY, JSON.stringify({
      userKey,
      name: session.name,
      role: session.role
    }));
  } catch (_) {}

  // 2. Persistir en Supabase
  try {
    const freshMap = await fetchCloudActiveSessions();
    freshMap[userKey] = sessionData;
    saveLocalCloudSessions(freshMap);

    const payload = {
      date: CLOUD_SESSIONS_DATE,
      datos: {
        tipo: 'cloud_active_sessions_v1',
        sessions: freshMap,
        updated_at: now.toISOString()
      }
    };

    const { data: existingRows } = await supabase
      .from('daily_supervision_history')
      .select('id')
      .eq('date', CLOUD_SESSIONS_DATE);

    if (existingRows && existingRows.length > 0) {
      await supabase
        .from('daily_supervision_history')
        .update(payload)
        .eq('date', CLOUD_SESSIONS_DATE);
    } else {
      await supabase
        .from('daily_supervision_history')
        .insert([payload]);
    }

    // Emitir por Realtime para otros dispositivos
    try {
      const channel = supabase.channel('olam_cloud_sessions_realtime');
      channel.send({
        type: 'broadcast',
        event: 'session_activated',
        payload: { userKey, session: sessionData }
      });
    } catch (_) {}
  } catch (err) {
    console.warn('[CloudSessions] Error persistiendo sesión en Supabase:', err);
  }
}

/**
 * Revoca y cierra una sesión activa en la nube al hacer logout
 */
export async function revokeCloudActiveSession(nameOrUsername) {
  const userKey = normalizeUserKey(nameOrUsername);
  if (!userKey) return;

  // 1. Marcar como inactiva localmente
  const currentLocal = getLocalCloudSessions();
  if (currentLocal[userKey]) {
    delete currentLocal[userKey];
    saveLocalCloudSessions(currentLocal);
  }

  // 2. Persistir revocación en Supabase
  try {
    const freshMap = await fetchCloudActiveSessions();
    if (freshMap[userKey]) {
      delete freshMap[userKey];
      saveLocalCloudSessions(freshMap);

      const payload = {
        date: CLOUD_SESSIONS_DATE,
        datos: {
          tipo: 'cloud_active_sessions_v1',
          sessions: freshMap,
          updated_at: new Date().toISOString()
        }
      };

      await supabase
        .from('daily_supervision_history')
        .update(payload)
        .eq('date', CLOUD_SESSIONS_DATE);

      try {
        const channel = supabase.channel('olam_cloud_sessions_realtime');
        channel.send({
          type: 'broadcast',
          event: 'session_revoked',
          payload: { userKey }
        });
      } catch (_) {}
    }
  } catch (err) {
    console.warn('[CloudSessions] Error revocando sesión en Supabase:', err);
  }
}

/**
 * Obtiene la sesión activa de un usuario específico si existe
 */
export function getActiveSessionForUser(nameOrUsername, sessionsMap = null) {
  const userKey = normalizeUserKey(nameOrUsername);
  if (!userKey) return null;
  const map = sessionsMap || getLocalCloudSessions();
  const sess = map[userKey];
  if (!sess || sess.status !== 'active') return null;

  // Comprobar vigencia de 36 horas
  const now = Date.now();
  const sessTime = sess.timestamp ? new Date(sess.timestamp).getTime() : 0;
  if (now - sessTime > 36 * 60 * 60 * 1000) return null;

  return sess;
}

/**
 * Obtiene el último usuario que trabajó en este dispositivo
 */
export function getLastKnownUserProfile() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

/**
 * Suscripción en tiempo real a cambios de sesiones activas en la nube
 */
export function subscribeToCloudSessions(onUpdate) {
  try {
    const channel = supabase.channel('olam_cloud_sessions_realtime')
      .on('broadcast', { event: 'session_activated' }, (payload) => {
        fetchCloudActiveSessions().then(onUpdate).catch(() => {});
      })
      .on('broadcast', { event: 'session_revoked' }, (payload) => {
        fetchCloudActiveSessions().then(onUpdate).catch(() => {});
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    };
  } catch (_) {
    return () => {};
  }
}
