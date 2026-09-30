import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Layers, User, Calendar, DollarSign } from 'lucide-react';

// Fix leaflet default marker icons in React/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored icons
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const amberIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function InteractiveMapModal({ visits = [], targetVisit = null, currentUser }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');

  // Filter visits that have coordinates
  const visitsWithGps = visits.filter(v => v.location && typeof v.location.lat === 'number' && typeof v.location.lng === 'number');

  const uniqueVendors = Array.from(new Set(visitsWithGps.map(v => v.vendorName).filter(Boolean)));

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center Guatemala (approx 14.6349, -90.5069)
      const initialLat = targetVisit?.location?.lat || 14.6349;
      const initialLng = targetVisit?.location?.lng || -90.5069;
      const zoom = targetVisit ? 14 : 8;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      markersLayerRef.current = L.featureGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const layer = markersLayerRef.current;
    layer.clearLayers();

    const displayVisits = visitsWithGps.filter(v => {
      if (isAdmin && selectedVendor !== 'all' && v.vendorName !== selectedVendor) return false;
      if (!isAdmin && v.vendorName !== currentUser?.name) return false;
      if (selectedDate !== 'all' && v.visitDate !== selectedDate) return false;
      return true;
    });

    if (displayVisits.length === 0) return;

    displayVisits.forEach(v => {
      const isTarget = targetVisit && targetVisit.id === v.id;
      let icon = blueIcon;
      if (v.hasSale || v.saleAmount > 0) icon = greenIcon;
      else if (v.hasCollection || v.collectionAmount > 0) icon = amberIcon;

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 180px;">
          <h4 style="margin: 0 0 4px; font-size: 14px; font-weight: bold; color: #1E3A8A;">${v.clientName}</h4>
          <p style="margin: 0 0 4px; font-size: 11px; color: #64748B;">Código: <b>${v.clientCode || '0000'}</b> • Ruta: ${v.sector || v.route}</p>
          <p style="margin: 0 0 4px; font-size: 11px; color: #334155;">Vendedor: <b>${v.vendorName}</b></p>
          <p style="margin: 0 0 6px; font-size: 11px; color: #64748B;">Fecha: ${v.visitDate} (${v.dayPeriod || 'mañana'})</p>
          ${v.saleAmount > 0 ? `<div style="font-size: 12px; font-weight: bold; color: #059669;">Venta: Q${Number(v.saleAmount).toFixed(2)}</div>` : ''}
          ${v.collectionAmount > 0 ? `<div style="font-size: 12px; font-weight: bold; color: #D97706;">Cobro: Q${Number(v.collectionAmount).toFixed(2)}</div>` : ''}
          ${v.location?.accuracy ? `<div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">Precisión GPS: ±${v.location.accuracy}m</div>` : ''}
        </div>
      `;

      const marker = L.marker([v.location.lat, v.location.lng], { icon })
        .bindPopup(popupContent);

      layer.addLayer(marker);

      if (isTarget) {
        marker.openPopup();
      }
    });

    // Fit map bounds
    try {
      if (layer.getLayers().length > 0) {
        mapInstanceRef.current.fitBounds(layer.getBounds().pad(0.1));
      }
    } catch (e) {}

  }, [visitsWithGps, selectedVendor, selectedDate, targetVisit, isAdmin, currentUser]);

  return (
    <div className="space-y-4">
      {/* Map Control bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="text-blue-600" size={20} />
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Mapa GPS de Visitas en Campo
            </h3>
            <span className="text-xs text-slate-400">
              {visitsWithGps.length} visitas con geolocalización registrada
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold dark:text-white"
            >
              <option value="all">Todos los Vendedores</option>
              {uniqueVendors.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          )}

          {/* Color legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-300 ml-2">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Con Venta
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Con Cobro
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Solo Visita
            </span>
          </div>
        </div>
      </div>

      {/* Map Element */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden h-[540px] relative z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
