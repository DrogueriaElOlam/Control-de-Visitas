/**
 * Módulo de Sesiones en la Nube — DESACTIVADO POR SEGURIDAD
 * Droguería El Olam
 *
 * Por políticas de seguridad, se eliminó la exposición pública de sesiones activas
 * entre dispositivos (que permitía ingresar sin contraseña desde otro equipo).
 * Cada dispositivo autenticado conserva su propia sesión local en localStorage,
 * y cualquier nuevo dispositivo debe autenticarse siempre con contraseña o clave OTP.
 */

const LOCAL_ACTIVE_SESSIONS_KEY = 'olam_cloud_active_sessions_cache_v1';

export function normalizeUserKey(nameOrUsername) {
  if (!nameOrUsername) return '';
  return String(nameOrUsername)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function getLocalCloudSessions() {
  try {
    localStorage.removeItem(LOCAL_ACTIVE_SESSIONS_KEY);
  } catch (_) {}
  return {};
}

export function saveLocalCloudSessions() {
  try {
    localStorage.removeItem(LOCAL_ACTIVE_SESSIONS_KEY);
  } catch (_) {}
}

export async function fetchCloudActiveSessions() {
  try {
    localStorage.removeItem(LOCAL_ACTIVE_SESSIONS_KEY);
  } catch (_) {}
  return {};
}

export async function registerCloudActiveSession() {
  // Desactivado permanentemente por seguridad: nunca exponer sesiones abiertas en la nube
  return;
}

export async function revokeCloudActiveSession() {
  try {
    localStorage.removeItem(LOCAL_ACTIVE_SESSIONS_KEY);
  } catch (_) {}
  return;
}

export function getActiveSessionForUser() {
  return null;
}

export function subscribeToCloudSessions() {
  return () => {};
}

export function getLastKnownUserProfile() {
  return null;
}
