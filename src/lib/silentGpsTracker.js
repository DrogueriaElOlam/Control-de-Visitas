/**
 * RASTREADOR GPS SILENCIOSO EN SEGUNDO PLANO
 * Droguería El Olam.
 * 
 * Este módulo opera de forma 100% invisible para el usuario vendedor:
 * - Sin alertas, diálogos ni ventanas emergentes.
 * - Registra coordenadas geográficas periódicas cada 2 a 3 minutos o al desplazarse.
 * - Captura nivel de batería, velocidad y precisión del satélite.
 * - Detecta y marca si se utilizan aplicaciones de 'Fake GPS / Ubicación simulada'.
 * - Encola puntos offline si se pierde la conexión y los sincroniza al regresar el internet.
 */

import { saveGpsPoint, broadcastLocalGpsPoint } from './trackingDb.js';
import { getLocalDateString } from './dateUtils.js';

let trackerInterval = null;
let watchId = null;
let lastRecordedCoord = null;
let lastRecordedTime = 0;
let isTrackingActive = false;

// Intervalo entre pings de rastreo: 2.5 minutos (150,000 ms)
const PING_INTERVAL_MS = 150000;
// Distancia mínima en metros para registrar un nuevo punto antes del intervalo
const MIN_DISTANCE_METERS = 40;

/**
 * Inicia el rastreador GPS silencioso para el vendedor actual.
 * @param {Object} currentUser - Objeto del usuario logueado.
 */
export function startSilentTracking(currentUser) {
  // Solo se activa para vendedores legítimos
  if (!currentUser || currentUser.role !== 'vendor') {
    return;
  }

  if (isTrackingActive) {
    return;
  }

  if (typeof window === 'undefined' || !navigator.geolocation) {
    return;
  }

  isTrackingActive = true;

  // Ejecutar un primer reporte silencioso inmediato
  captureAndReportLocation(currentUser);

  // Programar repetición periódica invisible
  trackerInterval = setInterval(() => {
    captureAndReportLocation(currentUser);
  }, PING_INTERVAL_MS);

  // Escuchar también cambios de posición con watchPosition si el dispositivo soporta movimiento fino
  try {
    watchId = navigator.geolocation.watchPosition(
      (pos) => handlePositionUpdate(pos, currentUser),
      () => {}, // Error callback silencioso, sin avisos al usuario
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000
      }
    );
  } catch (e) {
    // Silencioso
  }

  // Puente directo con el Servicio Nativo en Segundo Plano de la APK Android
  if (typeof window !== 'undefined') {
    window.onNativeGpsPing = (lat, lng, acc, spd) => {
      handlePositionUpdate({
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          speed: spd !== undefined ? spd : 0
        }
      }, currentUser);
    };
  }
}

/**
 * Detiene el rastreo (por ejemplo, al cerrar sesión).
 */
export function stopSilentTracking() {
  if (typeof window !== 'undefined') {
    window.onNativeGpsPing = null;
  }
  if (trackerInterval) {
    clearInterval(trackerInterval);
    trackerInterval = null;
  }
  if (watchId !== null && navigator.geolocation) {
    try {
      navigator.geolocation.clearWatch(watchId);
    } catch (e) {}
    watchId = null;
  }
  isTrackingActive = false;
  lastRecordedCoord = null;
}

/**
 * Captura la ubicación actual vía getCurrentPosition y la envía.
 */
async function captureAndReportLocation(currentUser) {
  if (!navigator.geolocation || !currentUser) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => handlePositionUpdate(pos, currentUser),
    () => {}, // Silencioso
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000
    }
  );
}

/**
 * Procesa la posición recibida y determina si debe guardarse.
 */
async function handlePositionUpdate(pos, currentUser) {
  if (!pos || !pos.coords || !currentUser) return;

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const accuracy = pos.coords.accuracy || null;
  const speed = pos.coords.speed !== null && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 3.6) : 0; // Convertir m/s a km/h
  const now = Date.now();

  // Detección anti-trampas: verificar si es ubicación simulada (Mocked Location)
  let isMocked = false;
  if ('mocked' in pos.coords && pos.coords.mocked) {
    isMocked = true;
  }

  // Filtrado de spam: si no se ha movido más de MIN_DISTANCE_METERS y no ha pasado el intervalo completo, esperar
  if (lastRecordedCoord) {
    const dist = calculateDistanceMeters(lastRecordedCoord.lat, lastRecordedCoord.lng, lat, lng);
    const timeDiff = now - lastRecordedTime;

    if (dist < MIN_DISTANCE_METERS && timeDiff < PING_INTERVAL_MS) {
      return; // Aún está detenido en el mismo punto, no saturar la base de datos
    }
  }

  // Obtener porcentaje de batería si el navegador/WebView lo soporta
  let batteryLevel = null;
  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      batteryLevel = Math.round(battery.level * 100);
    }
  } catch (e) {}

  const pointPayload = {
    vendorId: currentUser.id,
    vendorName: currentUser.name,
    route: currentUser.route || '',
    latitude: lat,
    longitude: lng,
    accuracy: accuracy ? Math.round(accuracy) : null,
    speed,
    batteryLevel,
    isMocked,
    trackingDate: getLocalDateString(),
    createdAt: new Date().toISOString()
  };

  lastRecordedCoord = { lat, lng };
  lastRecordedTime = now;

  // Guardar en la base de datos y emitir por broadcast
  try {
    await saveGpsPoint(pointPayload);
    broadcastLocalGpsPoint(pointPayload);
  } catch (e) {
    // Silencioso
  }
}

/**
 * Calcula la distancia en metros entre dos coordenadas geográficas (Fórmula de Haversine).
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
