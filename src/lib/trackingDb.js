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

  // 2. Persistir en Supabase:
  // Se guarda en 'daily_supervision_history' con formato { date, datos: { tipo: 'gps_ping', ... } }
  let savedInSupabase = false;
  try {
    const supervisionEntry = {
      date: todayStr,
      datos: {
        tipo: 'gps_ping',
        ...record
      }
    };
    const { error: supErr } = await supabase.from('daily_supervision_history').insert([supervisionEntry]);
    if (!supErr) {
      savedInSupabase = true;
    }
  } catch (err) {
    console.warn('[Tracking] Error guardando ping en daily_supervision_history:', err);
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
 * Consulta tanto Supabase (daily_supervision_history y vendor_gps_tracking) como almacenamiento local.
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
 * @param {string} vendorName - (Opcional) Nombre del vendedor. Si es 'all' o null, trae de todos.
 * @returns {Promise<Array>} Lista de puntos ordenados cronológicamente.
 */
export async function getDailyTrackingPoints(dateStr, vendorName = null) {
  const targetDate = dateStr || getLocalDateString();
  const pointsMap = new Map();

  // 1. Consultar en Supabase: daily_supervision_history
  try {
    const { data: supData, error: supError } = await supabase
      .from('daily_supervision_history')
      .select('*')
      .eq('date', targetDate)
      .order('created_at', { ascending: true });

    if (!supError && Array.isArray(supData)) {
      supData.forEach(row => {
        if (row.datos && row.datos.tipo === 'gps_ping' && row.datos.latitude && row.datos.longitude) {
          const norm = normalizePointRecord({
            ...row.datos,
            created_at: row.created_at || row.datos.created_at || row.datos.createdAt
          });
          if (!vendorName || vendorName === 'all' || norm.vendorName === vendorName) {
            const key = norm.id || `${norm.vendorName}_${norm.latitude}_${norm.longitude}_${norm.createdAt}`;
            pointsMap.set(key, norm);
          }
        }
      });
    }
  } catch (e) {
    console.warn('[Tracking] Error consultando daily_supervision_history:', e);
  }

  // 2. Fallback / Complemento: Leer de almacenamiento local
  try {
    const storageKey = `${LOCAL_STORAGE_PREFIX}${targetDate}`;
    const localData = JSON.parse(localStorage.getItem(storageKey) || '[]');
    localData.forEach(p => {
      const norm = normalizePointRecord(p);
      if (!vendorName || vendorName === 'all' || norm.vendorName === vendorName) {
        const key = norm.id || `${norm.vendorName}_${norm.latitude}_${norm.longitude}_${norm.createdAt}`;
        if (!pointsMap.has(key)) {
          pointsMap.set(key, norm);
        }
      }
    });
  } catch (e) {
    console.warn('[Tracking] Error leyendo datos locales:', e);
  }

  // Convertir a lista y ordenar cronológicamente
  const points = Array.from(pointsMap.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return points;
}

/**
 * Normaliza un registro de punto de rastreo a un formato uniforme.
 */
function normalizePointRecord(p) {
  return {
    id: p.id || `pt_${p.latitude}_${p.longitude}_${p.created_at || p.createdAt}`,
    vendorId: p.vendor_id || p.vendorId || '',
    vendorName: p.vendor_name || p.vendorName || 'Vendedor',
    route: p.route || '',
    latitude: Number(p.latitude || p.lat),
    longitude: Number(p.longitude || p.lng),
    accuracy: p.accuracy ? Number(p.accuracy) : null,
    speed: p.speed ? Number(p.speed) : 0,
    batteryLevel: p.battery_level !== undefined ? Number(p.battery_level) : (p.batteryLevel !== undefined ? Number(p.batteryLevel) : null),
    isMocked: Boolean(p.is_mocked || p.isMocked),
    trackingDate: p.tracking_date || p.trackingDate || (p.created_at ? p.created_at.substring(0, 10) : ''),
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

  // Escuchar por Postgres Changes en daily_supervision_history y vendor_gps_tracking
  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'daily_supervision_history' }, (payload) => {
    if (payload?.new?.datos?.tipo === 'gps_ping') {
      onNewPoint(normalizePointRecord({
        ...payload.new.datos,
        created_at: payload.new.created_at || payload.new.datos.created_at
      }));
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

/**
 * Limpia los puntos de rastreo almacenados en el localStorage del navegador.
 */
export function clearLocalTrackingPoints(dateStr = null) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (dateStr) {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${dateStr}`);
    } else {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(LOCAL_STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (e) {}
}

/**
 * Purga de forma permanente los puntos de rastreo satelital GPS en Supabase y localmente.
 * @param {Object} options
 * @param {string|null} options.dateStr - Fecha específica a purgar (YYYY-MM-DD), o null si es purgeAll.
 * @param {boolean} options.purgeAll - Si es true, borra absolutamente TODOS los pings de todas las fechas.
 * @param {boolean} options.purgeVisitsCoords - Si es true, limpia también coordenadas de visitas.
 * @returns {Promise<{success: boolean, deletedCount: number}>}
 */
export async function purgeTrackingPoints({ dateStr = null, purgeAll = false, purgeVisitsCoords = true } = {}) {
  let deletedCount = 0;

  // 1. Limpiar localStorage local
  clearLocalTrackingPoints(purgeAll ? null : dateStr);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('olam_last_satellite_gps');
      localStorage.removeItem('olam_live_tracking_points');
      localStorage.removeItem('olam_tracking_points_v2');
      localStorage.removeItem('olam_gps_pings_history');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('olam_last_known_loc');
    }
  } catch (_) {}

  // 2. Limpiar en Supabase (daily_supervision_history)
  try {
    let query = supabase
      .from('daily_supervision_history')
      .select('id, date, datos');

    if (!purgeAll && dateStr) {
      query = query.eq('date', dateStr);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      // Proteger estrictamente las bóvedas OTP de fecha 2099-12-31
      const idsToDelete = data
        .filter(r => {
          if (r.date === '2099-12-31') return false;
          if (purgeAll) return true;
          return r.datos && (r.datos.tipo === 'gps_ping' || r.datos.tipo === 'gps_point');
        })
        .map(r => r.id);

      if (idsToDelete.length > 0) {
        for (let i = 0; i < idsToDelete.length; i += 80) {
          const chunk = idsToDelete.slice(i, i + 80);
          const { error: delErr } = await supabase
            .from('daily_supervision_history')
            .delete()
            .in('id', chunk);

          if (!delErr) {
            deletedCount += chunk.length;
          }
        }
      }
    }
  } catch (e) {
    console.error('[Tracking] Error purgando pings en Supabase:', e);
  }

  // 3. Limpiar coordenadas de visitas si se solicita o si es purga total
  if (purgeVisitsCoords || purgeAll) {
    try {
      if (purgeAll) {
        await supabase.from('visits').update({ latitude: null, longitude: null, location_accuracy: null }).gt('id', 0);
      } else if (dateStr) {
        await supabase.from('visits').update({ latitude: null, longitude: null, location_accuracy: null }).eq('visit_date', dateStr);
      }
    } catch (errVisits) {
      console.warn('[Tracking] Error limpiando coordenadas en visits:', errVisits);
    }
  }

  // 4. Emitir evento por Broadcast para que todas las pantallas conectadas limpien el mapa en vivo
  try {
    const channel = supabase.channel('olam_gps_live_channel');
    channel.send({
      type: 'broadcast',
      event: 'gps_purged',
      payload: { dateStr, purgeAll, timestamp: Date.now() }
    });
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_tracking_purged', { detail: { dateStr, purgeAll, deletedCount } }));
  }

  return { success: true, deletedCount };
}

