import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, 
  Users, 
  User, 
  Calendar, 
  Play, 
  Pause, 
  RotateCcw, 
  Battery, 
  BatteryCharging, 
  Clock, 
  MapPin, 
  Activity, 
  ShieldAlert, 
  Layers, 
  Eye, 
  Radio, 
  ChevronRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { getDailyTrackingPoints, subscribeToLiveTracking } from '../lib/trackingDb';
import { getLocalDateString, getLocalYesterdayString } from '../lib/dateUtils';
import { DEFAULT_VENDORS, normalizeVendorName } from '../lib/db';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Paleta de colores de alta visibilidad para distinguir vendedores en modo grupal
const VENDOR_COLOR_PALETTE = [
  '#2563EB', // Azul Real
  '#059669', // Verde Esmeralda
  '#D97706', // Ámbar / Dorado
  '#7C3AED', // Violeta Intenso
  '#DC2626', // Carmesí
  '#0891B2', // Cian
  '#DB2777', // Rosa Fucsia
  '#4F46E5', // Índigo
  '#0D9488', // Teal
  '#EA580C', // Naranja Fuerte
  '#475569', // Pizarra
  '#65A30D'  // Lima
];

// Helper para crear marcadores circulares elegantes con las iniciales o icono del vendedor
function createVendorCustomMarker(vendorName, color, isLatest = false, isPlayback = false) {
  const initials = vendorName
    ? vendorName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'V';

  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${isLatest ? '38px' : '26px'};
      height: ${isLatest ? '38px' : '26px'};
      border-radius: 50%;
      background: ${color};
      color: white;
      font-weight: 800;
      font-size: ${isLatest ? '13px' : '10px'};
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      border: 3px solid #ffffff;
      transform: translate(-50%, -50%);
    ">
      ${initials}
      ${isLatest ? `
        <span style="
          position: absolute;
          top: -3px;
          right: -3px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10B981;
          border: 2px solid #ffffff;
          animation: pulse 1.5s infinite;
        "></span>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-vendor-marker',
    iconSize: [isLatest ? 38 : 26, isLatest ? 38 : 26],
    iconAnchor: [isLatest ? 19 : 13, isLatest ? 19 : 13],
    popupAnchor: [0, isLatest ? -22 : -15]
  });
}

// Icono pequeño para las migajas de pan (breadcrumbs) numeradas
function createBreadcrumbMarker(index, timeStr, color) {
  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${color};
      color: #ffffff;
      font-size: 9px;
      font-weight: bold;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 5px rgba(0,0,0,0.25);
      transform: translate(-50%, -50%);
    ">
      ${index}
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-breadcrumb-marker',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  });
}

export default function LiveVendorTrackingMap({ visits = [], vendors = [], currentUser }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const tileLayerRef = useRef(null);

  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalYesterdayString();

  // Estados de control del mapa
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedVendor, setSelectedVendor] = useState('all'); // 'all' = vista grupal
  const [mapType, setMapType] = useState('streets'); // 'streets' o 'satellite'
  const [trackingPoints, setTrackingPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVisitsPins, setShowVisitsPins] = useState(true);

  // Estados del reproductor de recorrido (Playback)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const playbackTimerRef = useRef(null);

  // Lista unificada y completa de todos los vendedores de Droguería El Olam
  const allVendorsList = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addVendor = (id, rawName, route) => {
      const cleanName = normalizeVendorName(rawName);
      if (!cleanName || seen.has(cleanName.toLowerCase())) return;
      seen.add(cleanName.toLowerCase());
      list.push({ id: id || cleanName, name: cleanName, route: route || '' });
    };

    // 1. Vendedores provistos por BD/props
    (vendors || []).forEach(v => addVendor(v.id, v.name, v.route));

    // 2. Vendedores oficiales por defecto de Droguería El Olam
    (DEFAULT_VENDORS || []).forEach(v => addVendor(v.id, v.name, v.route));

    // 3. Vendedores con puntos de rastreo registrados
    trackingPoints.forEach(p => addVendor(p.vendorId || p.vendorName, p.vendorName, p.route));

    // 4. Vendedores con visitas registradas
    visits.forEach(v => addVendor(v.vendorId || v.vendorName, v.vendorName, v.route || v.sector));

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors, trackingPoints, visits]);

  // Mapa de color asignado a cada vendedor de forma determinista
  const vendorColors = useMemo(() => {
    const map = {};
    allVendorsList.forEach((v, i) => {
      map[v.name] = VENDOR_COLOR_PALETTE[i % VENDOR_COLOR_PALETTE.length];
    });
    return map;
  }, [allVendorsList]);

  // 1. Cargar puntos de la fecha seleccionada (reinicio diario automático)
  const loadPointsForDate = async (dateToLoad) => {
    setLoading(true);
    setIsPlaying(false);
    setPlaybackIndex(0);
    try {
      const data = await getDailyTrackingPoints(dateToLoad, null);
      setTrackingPoints(data);
    } catch (e) {
      console.error('Error cargando puntos de rastreo:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPointsForDate(selectedDate);
  }, [selectedDate]);

  // 2. Suscripción en tiempo real: Si estamos viendo el día de HOY, recibir pings nuevos al instante
  useEffect(() => {
    if (selectedDate !== todayStr) return;

    const cleanup = subscribeToLiveTracking((newPoint) => {
      setTrackingPoints(prev => {
        // Evitar duplicados por id
        if (prev.some(p => p.id === newPoint.id)) return prev;
        return [...prev, newPoint];
      });
    });

    return () => cleanup();
  }, [selectedDate, todayStr]);

  // 2.1 Polling periódico automático cada 25 segundos para asegurar actualización constante desde Supabase
  useEffect(() => {
    if (selectedDate !== todayStr) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await getDailyTrackingPoints(todayStr, null);
        if (Array.isArray(fresh) && fresh.length > 0) {
          setTrackingPoints(prev => {
            const map = new Map(prev.map(p => [p.id, p]));
            let hasNew = false;
            fresh.forEach(p => {
              if (!map.has(p.id)) {
                map.set(p.id, p);
                hasNew = true;
              }
            });
            return hasNew ? Array.from(map.values()) : prev;
          });
        }
      } catch (e) {}
    }, 25000);

    return () => clearInterval(interval);
  }, [selectedDate, todayStr]);

  // 3. Inicializar Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Coordenadas centrales por defecto: Guatemala (14.6349, -90.5069)
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([14.6349, -90.5069], 8);

      const streetsLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      tileLayerRef.current = streetsLayer;
      layersGroupRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 4. Cambiar tipo de mapa (Calles vs Satélite)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    if (mapType === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 }
      ).addTo(map);
    }
  }, [mapType]);

  // Visitas del día seleccionado
  const visitsForDate = useMemo(() => {
    return visits.filter(v => v.visitDate === selectedDate && v.location?.lat && v.location?.lng);
  }, [visits, selectedDate]);

  // 5. Agrupar puntos por vendedor: Combina pings de GPS continuos y visitas comerciales registradas
  const pointsByVendor = useMemo(() => {
    const map = {};

    // A. Agregar pings de rastreo continuo
    trackingPoints.forEach(p => {
      const normName = normalizeVendorName(p.vendorName);
      if (!normName) return;
      if (!map[normName]) {
        map[normName] = [];
      }
      map[normName].push({
        ...p,
        vendorName: normName
      });
    });

    // B. Integrar visitas del día con GPS como puntos clave del recorrido
    visitsForDate.forEach(v => {
      const normName = normalizeVendorName(v.vendorName);
      if (!normName || !v.location?.lat || !v.location?.lng) return;
      if (!map[normName]) {
        map[normName] = [];
      }
      const visitTimeISO = v.createdAt || (v.visitTime ? `${selectedDate}T${v.visitTime}:00` : `${selectedDate}T12:00:00`);
      
      // Evitar duplicar si ya existe un punto en esas coordenadas exactas
      const alreadyHas = map[normName].some(p => 
        Math.abs(p.latitude - v.location.lat) < 0.0001 && Math.abs(p.longitude - v.location.lng) < 0.0001
      );

      if (!alreadyHas) {
        map[normName].push({
          id: `visit_${v.id || Math.random()}`,
          vendorId: v.vendorId || '',
          vendorName: normName,
          route: v.route || v.sector || '',
          latitude: Number(v.location.lat),
          longitude: Number(v.location.lng),
          accuracy: v.location.accuracy ? Number(v.location.accuracy) : null,
          speed: 0,
          batteryLevel: null,
          isMocked: false,
          isVisit: true,
          clientName: v.clientName,
          trackingDate: selectedDate,
          createdAt: visitTimeISO
        });
      }
    });

    // Ordenar cronológicamente cada lista
    Object.keys(map).forEach(v => {
      map[v].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return map;
  }, [trackingPoints, visitsForDate, selectedDate]);

  const activeVendorsToday = Object.keys(pointsByVendor);

  // 6. Dibujar recorridos, pines y visitas en el mapa
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;

    const layersGroup = layersGroupRef.current;
    layersGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // Determinar qué vendedores renderizar
    const vendorsToRender = selectedVendor === 'all'
      ? activeVendorsToday
      : [selectedVendor].filter(v => pointsByVendor[v]);

    vendorsToRender.forEach(vName => {
      const vendorPts = pointsByVendor[vName] || [];
      if (vendorPts.length === 0) return;

      const color = vendorColors[vName] || '#2563EB';

      // Filtrar puntos para reproducción si está en modo playback
      let ptsToDraw = vendorPts;
      if (selectedVendor !== 'all' && isPlaying) {
        ptsToDraw = vendorPts.slice(0, playbackIndex + 1);
      }

      // Dibujar Polilínea de Recorrido
      const latLngs = ptsToDraw.map(p => [p.latitude, p.longitude]);
      if (latLngs.length > 1) {
        const polyline = L.polyline(latLngs, {
          color,
          weight: 4,
          opacity: 0.85,
          dashArray: selectedVendor === 'all' ? null : '2, 6',
          lineJoin: 'round'
        }).addTo(layersGroup);

        latLngs.forEach(ll => bounds.extend(ll));
      }

      // Dibujar migajas de pan numeradas en modo individual
      if (selectedVendor !== 'all') {
        ptsToDraw.forEach((pt, idx) => {
          const time = new Date(pt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const marker = L.marker([pt.latitude, pt.longitude], {
            icon: createBreadcrumbMarker(idx + 1, time, color)
          }).addTo(layersGroup);

          bounds.extend([pt.latitude, pt.longitude]);

          const popupContent = `
            <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 170px;">
              <div style="font-weight: 800; color: ${color}; font-size: 13px; margin-bottom: 4px;">
                Parada #${idx + 1} • ${vName}
              </div>
              ${pt.isVisit ? `<div style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 2px 6px; border-radius: 6px; font-weight: bold; margin-bottom: 4px;">🏪 Visita: ${pt.clientName}</div>` : ''}
              <div style="color: #475569; margin-bottom: 2px;">
                🕒 Hora: <b>${time}</b>
              </div>
              ${pt.speed ? `<div style="color: #475569; margin-bottom: 2px;">🚗 Velocidad: <b>${pt.speed} km/h</b></div>` : ''}
              ${pt.batteryLevel !== null ? `<div style="color: #475569; margin-bottom: 2px;">🔋 Batería: <b>${pt.batteryLevel}%</b></div>` : ''}
              ${pt.accuracy ? `<div style="font-size: 10px; color: #94A3B8;">Precisión GPS: ±${pt.accuracy}m</div>` : ''}
              ${pt.isMocked ? `<div style="color: #DC2626; font-weight: bold; margin-top: 4px;">⚠️ ALERTA: GPS Simulado</div>` : ''}
            </div>
          `;
          marker.bindPopup(popupContent);
        });
      }

      // Marcador de Última Posición Conocida
      const latestPoint = ptsToDraw[ptsToDraw.length - 1];
      if (latestPoint) {
        const latestTime = new Date(latestPoint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const latestMarker = L.marker([latestPoint.latitude, latestPoint.longitude], {
          icon: createVendorCustomMarker(vName, color, true)
        }).addTo(layersGroup);

        bounds.extend([latestPoint.latitude, latestPoint.longitude]);

        const latestPopup = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 200px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-weight: 800; color: ${color}; font-size: 14px;">${vName}</span>
              <span style="background: #DCFCE7; color: #15803D; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px;">
                ${selectedDate === todayStr ? '● En Vivo' : 'Punto Final'}
              </span>
            </div>
            <div style="color: #475569; margin-bottom: 2px;">Ruta: <b>${latestPoint.route || 'General'}</b></div>
            <div style="color: #475569; margin-bottom: 2px;">Último reporte: <b>${latestTime}</b></div>
            <div style="color: #475569; margin-bottom: 2px;">
              Batería actual: <b>${latestPoint.batteryLevel !== null ? `${latestPoint.batteryLevel}%` : 'N/D'}</b>
            </div>
            ${latestPoint.speed > 0 ? `<div style="color: #0284C7; font-weight: bold;">En Movimiento (${latestPoint.speed} km/h)</div>` : '<div style="color: #64748B;">Detenido en este punto</div>'}
            ${latestPoint.isMocked ? `<div style="color: #DC2626; font-weight: bold; margin-top: 4px;">⚠️ ALERTA: Posible Fake GPS detectado</div>` : ''}
          </div>
        `;
        latestMarker.bindPopup(latestPopup);

        if (selectedVendor !== 'all' && !isPlaying) {
          latestMarker.openPopup();
        }
      }
    });

    // 7. Pines de Visitas Comerciales registradas en la misma fecha (para cruzar datos de clientes)
    if (showVisitsPins) {
      const displayVisits = selectedVendor === 'all'
        ? visitsForDate
        : visitsForDate.filter(v => normalizeVendorName(v.vendorName) === selectedVendor);

      displayVisits.forEach(v => {
        const visitHtml = `
          <div style="
            background: #10B981;
            color: white;
            width: 22px;
            height: 22px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            transform: translate(-50%, -50%);
          ">
            🏪
          </div>
        `;

        const visitMarker = L.marker([v.location.lat, v.location.lng], {
          icon: L.divIcon({
            html: visitHtml,
            className: 'custom-visit-marker',
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          })
        }).addTo(layersGroup);

        bounds.extend([v.location.lat, v.location.lng]);

        const visitPopup = `
          <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 180px;">
            <div style="font-weight: 800; color: #047857; font-size: 13px; margin-bottom: 4px;">
              ${v.clientName}
            </div>
            <div style="color: #475569; margin-bottom: 2px;">Código: <b>${v.clientCode || '0000'}</b></div>
            <div style="color: #475569; margin-bottom: 2px;">Vendedor: <b>${v.vendorName}</b></div>
            <div style="color: #475569; margin-bottom: 2px;">Hora visita: <b>${v.visitTime || v.dayPeriod || 'Registrada'}</b></div>
            ${v.saleAmount > 0 ? `<div style="color: #059669; font-weight: bold;">Venta: Q${Number(v.saleAmount).toFixed(2)}</div>` : ''}
            ${v.collectionAmount > 0 ? `<div style="color: #D97706; font-weight: bold;">Cobro: Q${Number(v.collectionAmount).toFixed(2)}</div>` : ''}
          </div>
        `;
        visitMarker.bindPopup(visitPopup);
      });
    }

    // Auto-ajustar encuadre del mapa
    try {
      if (bounds.isValid() && !isPlaying) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      }
    } catch (e) {}

  }, [pointsByVendor, activeVendorsToday, selectedVendor, vendorColors, selectedDate, todayStr, showVisitsPins, visitsForDate, isPlaying, playbackIndex]);

  // 8. Control del Reproductor de Recorrido (Playback)
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const currentVendorPts = pointsByVendor[selectedVendor] || [];
    if (currentVendorPts.length <= 1) {
      setIsPlaying(false);
      return;
    }

    playbackTimerRef.current = setInterval(() => {
      setPlaybackIndex(prev => {
        if (prev >= currentVendorPts.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, selectedVendor, pointsByVendor]);

  // Métricas del vendedor seleccionado para el panel informativo
  const selectedVendorStats = useMemo(() => {
    if (selectedVendor === 'all') return null;
    const pts = pointsByVendor[selectedVendor] || [];
    if (pts.length === 0) return null;

    const firstTime = new Date(pts[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lastPoint = pts[pts.length - 1];
    const lastTime = new Date(lastPoint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Distancia total aproximada en KM
    let totalMeters = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      totalMeters += L.latLng(p1.latitude, p1.longitude).distanceTo(L.latLng(p2.latitude, p2.longitude));
    }

    return {
      name: selectedVendor,
      route: lastPoint.route || 'General',
      totalPoints: pts.length,
      startTime: firstTime,
      lastTime,
      battery: lastPoint.batteryLevel,
      currentSpeed: lastPoint.speed,
      approxDistanceKm: (totalMeters / 1000).toFixed(2),
      hasMockedAlert: pts.some(p => p.isMocked)
    };
  }, [selectedVendor, pointsByVendor]);

  return (
    <div className="space-y-4">
      {/* HEADER DE CONTROL Y SELECTORES */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-wrap items-center justify-between gap-4">
        
        {/* Título y badge de estado */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Navigation size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Rastreo GPS en Tiempo Real & Recorridos
              </h2>
              {selectedDate === todayStr ? (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  En Vivo
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                  Histórico: {selectedDate}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeVendorsToday.length} vendedores con trayecto registrado • {trackingPoints.length} puntos capturados
            </p>
          </div>
        </div>

        {/* SELECTOR DE FECHAS (Reinicio diario & Consulta histórica) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Botón Rápido: Hoy */}
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
              selectedDate === todayStr
                ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400/30'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Radio size={14} className={selectedDate === todayStr ? 'animate-pulse' : ''} />
            Hoy ({todayStr})
          </button>

          {/* Botón Rápido: Ayer */}
          <button
            onClick={() => setSelectedDate(yesterdayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              selectedDate === yesterdayStr
                ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400/30'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Ayer
          </button>

          {/* Selector de Fecha Calendario */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-2.5 py-1 rounded-xl shadow-inner">
            <Calendar size={14} className="text-blue-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => loadPointsForDate(selectedDate)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            title="Recargar datos de la fecha"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

      </div>

      {/* BARRA DE FILTRO: MODO GRUPAL VS POR VENDEDOR */}
      <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md flex flex-wrap items-center justify-between gap-3">
        
        {/* Selector de Vista: Todos vs Vendedor Específico */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Visualización:
          </span>

          <button
            onClick={() => {
              setSelectedVendor('all');
              setIsPlaying(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedVendor === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Users size={14} />
            <span>Todos los Vendedores ({activeVendorsToday.length})</span>
          </button>

          {/* Dropdown de Todos los Vendedores Oficiales */}
          <div className="flex items-center gap-1">
            <select
              value={selectedVendor}
              onChange={(e) => {
                setSelectedVendor(e.target.value);
                setIsPlaying(false);
                setPlaybackIndex(0);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              <option value="all">🌐 Vista Grupal General (Todos los Vendedores)</option>
              <optgroup label="─── Vendedores Droguería El Olam ───">
                {allVendorsList.map(v => {
                  const pingsCount = pointsByVendor[v.name]?.length || 0;
                  return (
                    <option key={v.name} value={v.name}>
                      {pingsCount > 0 ? '🟢' : '⚪'} {v.name} {v.route ? `• ${v.route}` : ''} ({pingsCount > 0 ? `${pingsCount} pts hoy` : 'Sin señal'})
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Opciones Adicionales: Capa satélite, Ver visitas, Reproducir ruta */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Toggle Capa Satelital */}
          <button
            onClick={() => setMapType(mapType === 'streets' ? 'satellite' : 'streets')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              mapType === 'satellite'
                ? 'bg-amber-500 text-white border-amber-600 shadow'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
            }`}
            title="Alternar vista de calles o satélite"
          >
            <Layers size={13} />
            <span>{mapType === 'satellite' ? 'Satélite' : 'Calles'}</span>
          </button>

          {/* Toggle Pines de Visitas de Farmacias */}
          <button
            onClick={() => setShowVisitsPins(!showVisitsPins)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              showVisitsPins
                ? 'bg-emerald-600 text-white border-emerald-700 shadow'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'
            }`}
            title="Mostrar u ocultar los clientes y farmacias visitadas en el mapa"
          >
            <MapPin size={13} />
            <span>Farmacias ({visitsForDate.length})</span>
          </button>

          {/* Botón Reproductor de Recorrido (solo disponible en vista individual) */}
          {selectedVendor !== 'all' && (pointsByVendor[selectedVendor]?.length || 0) > 1 && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                isPlaying
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Pausar' : 'Reproducir Recorrido'}</span>
            </button>
          )}

        </div>

      </div>

      {/* SECCIÓN DE VENDEDORES: DEBAJO DE VISTA GRUPAL GENERAL */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-3">
        {/* Fila 1: Botón Principal Vista Grupal General */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
          <button
            onClick={() => {
              setSelectedVendor('all');
              setIsPlaying(false);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2.5 shadow-md cursor-pointer ${
              selectedVendor === 'all'
                ? 'bg-blue-600 text-white shadow-blue-500/30 ring-4 ring-blue-400/30 scale-[1.02]'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600'
            }`}
          >
            <Users size={16} />
            <span className="text-sm">🌐 Vista Grupal General (Todos los Vendedores)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/20 font-black">
              {activeVendorsToday.length} con señal hoy
            </span>
          </button>

          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {allVendorsList.length} vendedores en catálogo • Toca cualquiera abajo para aislar su recorrido:
          </span>
        </div>

        {/* Fila 2: Lista Completa de Vendedores Directamente DEBAJO de Vista Grupal General */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
          {allVendorsList.map(v => {
            const pingsCount = pointsByVendor[v.name]?.length || 0;
            const isSelected = selectedVendor === v.name;
            const color = vendorColors[v.name] || '#2563EB';
            const hasActivity = pingsCount > 0;

            return (
              <button
                key={v.name}
                onClick={() => {
                  setSelectedVendor(v.name);
                  setIsPlaying(false);
                  setPlaybackIndex(0);
                }}
                className={`p-2.5 rounded-2xl text-left transition-all border flex flex-col justify-between gap-1 shadow-sm cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-500 shadow-lg ring-2 ring-blue-400 scale-[1.02]'
                    : 'bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-extrabold text-xs truncate">{v.name}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] opacity-75 mt-0.5">
                  <span className="truncate">{v.route ? v.route.replace(/#.*/, '').trim() : 'Ruta'}</span>
                  {hasActivity ? (
                    <span className="font-black text-emerald-600 dark:text-emerald-300">
                      ● {pingsCount} pts
                    </span>
                  ) : (
                    <span className="text-slate-400">Sin señal</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* PANEL DE MÉTRICAS DEL VENDEDOR SELECCIONADO (Si está en modo individual) */}
      {selectedVendorStats && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-3xl shadow-xl border border-blue-700/40 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          
          <div>
            <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Vendedor</span>
            <div className="font-extrabold text-sm truncate flex items-center gap-1.5 text-white">
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: vendorColors[selectedVendorStats.name] || '#3B82F6' }}
              />
              {selectedVendorStats.name}
            </div>
            <span className="text-[11px] text-blue-200">{selectedVendorStats.route}</span>
          </div>

          <div>
            <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Inicio Jornada</span>
            <div className="font-extrabold text-sm flex items-center gap-1 text-white">
              <Clock size={13} className="text-emerald-400" />
              {selectedVendorStats.startTime}
            </div>
            <span className="text-[10px] text-blue-300">Primer reporte</span>
          </div>

          <div>
            <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Última Señal</span>
            <div className="font-extrabold text-sm flex items-center gap-1 text-white">
              <Activity size={13} className="text-amber-400" />
              {selectedVendorStats.lastTime}
            </div>
            <span className="text-[10px] text-blue-300">
              {selectedVendorStats.currentSpeed > 0 ? `${selectedVendorStats.currentSpeed} km/h` : 'Detenido'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Recorrido Total</span>
            <div className="font-extrabold text-sm text-emerald-300">
              {selectedVendorStats.approxDistanceKm} km
            </div>
            <span className="text-[10px] text-blue-300">{selectedVendorStats.totalPoints} puntos</span>
          </div>

          <div>
            <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Batería Teléfono</span>
            <div className="font-extrabold text-sm flex items-center gap-1 text-white">
              <Battery size={15} className={selectedVendorStats.battery < 20 ? 'text-rose-400' : 'text-emerald-400'} />
              {selectedVendorStats.battery !== null ? `${selectedVendorStats.battery}%` : 'N/D'}
            </div>
            <span className="text-[10px] text-blue-300">Nivel reportado</span>
          </div>

          <div>
            <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider">Seguridad</span>
            {selectedVendorStats.hasMockedAlert ? (
              <div className="font-bold text-xs text-rose-300 flex items-center gap-1 bg-rose-950/70 px-2 py-0.5 rounded-lg border border-rose-500/50">
                <ShieldAlert size={14} className="text-rose-400" />
                Alerta Fake GPS
              </div>
            ) : (
              <div className="font-bold text-xs text-emerald-300 flex items-center gap-1">
                ✓ GPS Satelital Válido
              </div>
            )}
            <span className="text-[10px] text-blue-300">Sin trampas</span>
          </div>

        </div>
      )}

      {/* CONTENEDOR DEL MAPA LEAFLET */}
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden h-[580px] z-0">
        
        {loading && (
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={28} className="animate-spin text-blue-600" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Cargando coordenadas satelitales del día...
            </span>
          </div>
        )}

        {/* Elemento donde Leaflet renderiza */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* LEYENDA FLOTANTE DE VENDEDORES (En Modo Grupal) */}
        {selectedVendor === 'all' && activeVendorsToday.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-xs max-h-48 overflow-y-auto">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
              Vendedores Activos en Ruta:
            </div>
            <div className="space-y-1.5">
              {activeVendorsToday.map(vName => {
                const pts = pointsByVendor[vName] || [];
                const last = pts[pts.length - 1];
                const color = vendorColors[vName] || '#2563EB';

                return (
                  <div
                    key={vName}
                    onClick={() => setSelectedVendor(vName)}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{vName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 flex-shrink-0">
                      {last?.batteryLevel !== null && (
                        <span>🔋{last.batteryLevel}%</span>
                      )}
                      <ChevronRight size={12} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AVISO SI NO HAY DATOS EN LA FECHA SELECCIONADA */}
        {!loading && activeVendorsToday.length === 0 && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[400] bg-amber-500/95 text-white px-4 py-2 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-2 backdrop-blur-sm">
            <Radio size={14} />
            No hay recorridos registrados el día {selectedDate}. Selecciona otra fecha o "Hoy".
          </div>
        )}

      </div>
    </div>
  );
}
