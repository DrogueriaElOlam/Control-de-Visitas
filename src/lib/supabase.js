import { createClient } from '@supabase/supabase-js';

export const DEFAULT_SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  || 'https://mxomzjaupettwpijftcr.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14b216amF1cGV0dHdwaWpmdGNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NjkzNzksImV4cCI6MjEwODI0NTM3OX0.6rXWKJTqiyaEThzUzUqrti1c8yO3wS7cHvB6fCMBRa4';

export function getSupabaseConfig() {
  try {
    const customUrl = localStorage.getItem('olam_custom_supabase_url');
    const customKey = localStorage.getItem('olam_custom_supabase_key');
    if (customUrl && customKey) {
      const urlClean = customUrl.trim();
      const match = urlClean.match(/https:\/\/([^.]+)\.supabase\.co/);
      const projectId = match ? match[1] : 'mxomzjaupettwpijftcr';
      return {
        url: urlClean,
        anonKey: customKey.trim(),
        isCustom: true,
        projectId
      };
    }
  } catch (_) {}

  const match = DEFAULT_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectId = match ? match[1] : 'mxomzjaupettwpijftcr';
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

export function getSupabaseManagementToken() {
  try {
    return localStorage.getItem('olam_supabase_management_token') || '';
  } catch (_) {
    return '';
  }
}

export function saveSupabaseManagementToken(token) {
  try {
    if (token && token.trim()) {
      localStorage.setItem('olam_supabase_management_token', token.trim());
    } else {
      localStorage.removeItem('olam_supabase_management_token');
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Reanuda el proyecto directamente vía Management API de Supabase sin salir de la app
 */
export async function restoreSupabaseProjectViaApi(token) {
  const cfg = getSupabaseConfig();
  const pat = token || getSupabaseManagementToken();
  if (!pat) {
    return { ok: false, error: 'No se ha configurado un Token de Acceso de Supabase.' };
  }

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${cfg.projectId}/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat.trim()}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.ok || res.status === 201 || res.status === 200) {
      return { ok: true, message: '¡Proyecto reanudado exitosamente! El servidor está iniciando.' };
    }

    const errData = await res.json().catch(() => ({}));
    return { 
      ok: false, 
      status: res.status, 
      error: errData.message || `Error del servidor Supabase (${res.status})` 
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Fallo de red al contactar la API de Supabase.' };
  }
}

const currentConfig = getSupabaseConfig();
export const supabase = createClient(currentConfig.url, currentConfig.anonKey);

// AUTO KEEPALIVE SILENCIOSO: Evita que Supabase active la pausa por inactividad
if (typeof window !== 'undefined') {
  const keepAlive = () => {
    try {
      supabase.from('vendors').select('id').limit(1).then(() => {
        try { localStorage.setItem('olam_last_supabase_keepalive', Date.now().toString()); } catch (_) {}
      }).catch(() => {});
    } catch (_) {}
  };

  // Ejecutar al iniciar
  setTimeout(keepAlive, 3000);
  // Y mantener un pulso silencioso cada 4 horas mientras la app esté abierta
  setInterval(keepAlive, 4 * 60 * 60 * 1000);
}

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
