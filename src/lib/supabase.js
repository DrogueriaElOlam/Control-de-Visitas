import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  || 'https://zqwjhmiavxhswgbgejzx.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpxd2pobWlhdnhoc3dnYmdlanp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzQ5MTEsImV4cCI6MjA3OTg1MDkxMX0.-FdEjQyGmuM6DVt58ciFmQoTzMKdvYW6prXHRp57UsQ';

export function getSupabaseConfig() {
  try {
    const customUrl = localStorage.getItem('olam_custom_supabase_url');
    const customKey = localStorage.getItem('olam_custom_supabase_key');
    if (customUrl && customKey) {
      const urlClean = customUrl.trim();
      const match = urlClean.match(/https:\/\/([^.]+)\.supabase\.co/);
      const projectId = match ? match[1] : 'zqwjhmiavxhswgbgejzx';
      return {
        url: urlClean,
        anonKey: customKey.trim(),
        isCustom: true,
        projectId
      };
    }
  } catch (_) {}

  const match = DEFAULT_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectId = match ? match[1] : 'zqwjhmiavxhswgbgejzx';
  return {
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY,
    isCustom: false,
    projectId
  };
}

export function saveSupabaseConfig(url, anonKey) {
  if (!url || !anonKey) return false;
  try {
    localStorage.setItem('olam_custom_supabase_url', url.trim());
    localStorage.setItem('olam_custom_supabase_key', anonKey.trim());
    return true;
  } catch (_) {
    return false;
  }
}

export function resetSupabaseConfig() {
  try {
    localStorage.removeItem('olam_custom_supabase_url');
    localStorage.removeItem('olam_custom_supabase_key');
    return true;
  } catch (_) {
    return false;
  }
}

const currentConfig = getSupabaseConfig();
export const supabase = createClient(currentConfig.url, currentConfig.anonKey);

/**
 * Realiza una comprobación en vivo de la conexión con Supabase.
 * Retorna latencia y estado (activo vs pausado/desconectado).
 */
export async function checkSupabaseHealth() {
  const config = getSupabaseConfig();
  const startTime = Date.now();
  
  try {
    // 1. Intento por consulta ligera al cliente
    const { error } = await supabase.from('vendors').select('id').limit(1);
    const latencyMs = Date.now() - startTime;

    if (!error) {
      return {
        ok: true,
        latencyMs,
        status: 'online',
        message: 'Conexión activa y respondiendo correctamente',
        projectId: config.projectId,
        url: config.url
      };
    }

    // Si hubo error, verificar si es por pausa o red
    const isPaused = error?.message?.includes('FetchError') || 
                     error?.message?.includes('Failed to fetch') || 
                     error?.code === 'PGRST301' || 
                     error?.message?.includes('NetworkError');

    return {
      ok: false,
      latencyMs,
      status: isPaused ? 'paused' : 'error',
      message: isPaused ? 'El proyecto parece estar en Pausa por inactividad en Supabase.' : (error.message || 'Error de conexión'),
      error,
      projectId: config.projectId,
      url: config.url
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      latencyMs,
      status: 'paused',
      message: 'No responde la base de datos (Proyecto en Pausa o sin conexión a internet).',
      error: err,
      projectId: config.projectId,
      url: config.url
    };
  }
}
