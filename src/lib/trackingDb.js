/**
 * Módulo de Persistencia y Comunicación en Tiempo Real para Rastreo GPS de Vendedores
 * Droguería El Olam.
 * 
 * Soporta:
 * 1. Envío y recepción en tiempo real vía Supabase Realtime Broadcast.
 * 2. Persistencia en tabla 'vendor_gps_tracking'.
 * 3. Fallback inteligente a almacenamiento local/sincronizado por si la tabla no está creada aún en Supabase.
 */

import { supabase } from './supabase.js';
import { getLocalDateString } from './dateUtils.js';

const LOCAL_STORAGE_PREFIX = 'olam_gps_tracking_';

/**
 * Guarda un punto de geolocalización de un vendedor.
 * @param {Object} pointData - Datos del punto de rastreo.
 */
export async function saveGpsPoint(pointData) {
  if (!pointData || !pointData.vendorName || typeof pointData.latitude !== 'number') {
    return { success: false, error: 'Coordenadas o vendedor inválidos' };
  }

  const todayStr = pointData.trackingDate || getLocalDateString();
  const timestamp = pointData.createdAt || new Date().toISOString();

  const record = {
    id: pointData.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gps_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
    vendor_id: pointData.vendorId ? String(pointData.vendorId) : '',
    vendor_name: pointData.vendorName,
    route: pointData.route || '',
    latitude: Number(pointData.latitude),
    longitude: Number(pointData.longitude),
    accuracy: pointData.accuracy ? Number(pointData.accuracy) : null,
    speed: pointData.speed ? Number(pointData.speed) : null,
    battery_level: pointData.batteryLevel !== undefined ? Number(pointData.batteryLevel) : null,
    is_mocked: Boolean(pointData.isMocked),
    tracking_date: todayStr,
    created_at: timestamp
  };

  // 1. Guardar siempre en almacenamiento local (para resiliencia y modo offline)
  try {
    const storageKey = `${LOCAL_STORAGE_PREFIX}${todayStr}`;
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
    existing.push(record);
    // Limitar histórico local por día a los últimos 500 puntos por seguridad de memoria
    if (existing.length > 500) {
      existing.splice(0, existing.length - 500);
    }
    localStorage.setItem(storageKey, JSON.stringify(existing));
  } catch (e) {
    console.warn('[Tracking] Error al guardar punto en almacenamiento local:', e);
  }

  // 2. Intentar guardar en Supabase (tabla vendor_gps_tracking)
  let savedInSupabase = false;
  try {
    const { error } = await supabase.from('vendor_gps_tracking').insert([record]);
    if (!error) {
      savedInSupabase = true;
    }
  } catch (err) {
    // Si la tabla no existe en Supabase aún, no romper la ejecución
  }

  // 3. Emitir por Broadcast en tiempo real (Supabase Channel) para el panel del jefe
  try {
    const channel = supabase.channel('olam_gps_live_channel');
    channel.send({
      type: 'broadcast',
      event: 'gps_ping',
      payload: record
    });
  } catch (e) {
    // Silencioso
  }

  return { success: true, savedInSupabase, record };
}

/**
 * Obtiene los puntos de seguimiento de una fecha específica y opcionalmente filtrados por vendedor.
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
 * @param {string} vendorName - (Opcional) Nombre del vendedor. Si es 'all' o null, trae de todos.
 * @returns {Promise<Array>} Lista de puntos ordenados cronológicamente.
 */
export async function getDailyTrackingPoints(dateStr, vendorName = null) {
  const targetDate = dateStr || getLocalDateString();
  let points = [];

  // 1. Intentar consultar en Supabase
  try {
    let query = supabase
      .from('vendor_gps_tracking')
      .select('*')
      .eq('tracking_date', targetDate)
      .order('created_at', { ascending: true });

    if (vendorName && vendorName !== 'all') {
      query = query.eq('vendor_name', vendorName);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      points = data.map(normalizePointRecord);
      return points;
    }
  } catch (e) {
    console.warn('[Tracking] Fallback a datos locales para fecha:', targetDate);
  }

  // 2. Fallback: Leer de almacenamiento local
  try {
    const storageKey = `${LOCAL_STORAGE_PREFIX}${targetDate}`;
    const localData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    let filtered = localData;
    if (vendorName && vendorName !== 'all') {
      filtered = filtered.filter(p => p.vendor_name === vendorName);
    }
    points = filtered.map(normalizePointRecord);
  } catch (e) {
    console.warn('[Tracking] Error leyendo datos locales:', e);
  }

  return points;
}

/**
 * Normaliza un registro de punto de rastreo a un formato uniforme.
 */
function normalizePointRecord(p) {
  return {
    id: p.id,
    vendorId: p.vendor_id || p.vendorId,
    vendorName: p.vendor_name || p.vendorName,
    route: p.route || '',
    latitude: Number(p.latitude || p.lat),
    longitude: Number(p.longitude || p.lng),
    accuracy: p.accuracy ? Number(p.accuracy) : null,
    speed: p.speed ? Number(p.speed) : 0,
    batteryLevel: p.battery_level !== undefined ? Number(p.battery_level) : (p.batteryLevel !== undefined ? Number(p.batteryLevel) : null),
    isMocked: Boolean(p.is_mocked || p.isMocked),
    trackingDate: p.tracking_date || p.trackingDate,
    createdAt: p.created_at || p.createdAt || new Date().toISOString()
  };
}

/**
 * Se suscribe a actualizaciones de ubicación en vivo en tiempo real.
 * @param {Function} onNewPoint - Callback ejecutado con cada punto nuevo.
 * @returns {Function} cleanup - Función para desuscribirse.
 */
export function subscribeToLiveTracking(onNewPoint) {
  if (!onNewPoint) return () => {};

  const channel = supabase.channel('olam_gps_live_channel');

  // Escuchar por broadcast
  channel.on('broadcast', { event: 'gps_ping' }, (payload) => {
    if (payload?.payload) {
      onNewPoint(normalizePointRecord(payload.payload));
    }
  });

  // Escuchar por Postgres Changes si la tabla está habilitada para Realtime
  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vendor_gps_tracking' }, (payload) => {
    if (payload?.new) {
      onNewPoint(normalizePointRecord(payload.new));
    }
  });

  channel.subscribe();

  // Escuchar también BroadcastChannel local del navegador
  let localBc = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      localBc = new BroadcastChannel('olam_local_gps_pings');
      localBc.onmessage = (event) => {
        if (event.data?.point) {
          onNewPoint(normalizePointRecord(event.data.point));
        }
      };
    }
  } catch (e) {}

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (e) {}
    if (localBc) {
      try {
        localBc.close();
      } catch (e) {}
    }
  };
}

/**
 * Notifica a través del Broadcast local (para pestañas en la misma máquina).
 */
export function broadcastLocalGpsPoint(point) {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('olam_local_gps_pings');
      bc.postMessage({ point });
      bc.close();
    }
  } catch (e) {}
}
