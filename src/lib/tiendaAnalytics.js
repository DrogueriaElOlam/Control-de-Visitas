import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import { getLocalDateString, getLocalStartOfMonthString } from './dateUtils';

export const TIENDA_LOG_VENDOR_KEY = 'TIENDA_VIEW_LOG';
const LOCAL_LOG_KEY = 'olam_tienda_views_log_v1';

function normalizeLogRow(raw, rowId = null) {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw.supervision_data && typeof raw.supervision_data === 'object' ? raw.supervision_data : raw;
  if (d.tipo && d.tipo !== 'tienda_view_log') return null;

  const ts = d.timestamp || raw.created_at || new Date().toISOString();
  const dateStr = d.date || raw.date || (typeof ts === 'string' ? ts.slice(0, 10) : getLocalDateString());
  const timeStr = d.time || (() => {
    try {
      return new Date(ts).toLocaleTimeString('es-GT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (_) {
      return '';
    }
  })();

  return {
    id: d.id || `row_${rowId || Math.random().toString(36).slice(2, 9)}`,
    dbId: rowId || d.dbId || null,
    visitorId: d.visitorId || 'anon',
    date: dateStr,
    time: timeStr,
    timestamp: ts,
    sellerName: d.sellerName || 'Catálogo General',
    sellerPhone: d.sellerPhone || '',
    source: d.source || 'cliente_link',
    device: d.device || 'Navegador Web',
    deviceType: d.deviceType || 'Móvil',
    referrer: d.referrer || 'Directo / WhatsApp',
    path: d.path || '/tienda/index.html'
  };
}

export async function fetchTiendaViewLogs({ limit = 2000 } = {}) {
  const byId = new Map();

  // 1. Leer respaldo local
  try {
    const localRaw = JSON.parse(localStorage.getItem(LOCAL_LOG_KEY) || '[]');
    if (Array.isArray(localRaw)) {
      localRaw.forEach((item) => {
        const norm = normalizeLogRow(item);
        if (norm && !byId.has(norm.id)) {
          byId.set(norm.id, norm);
        }
      });
    }
  } catch (_) {}

  // 2. Descargar registros oficiales desde Supabase (paginado hasta limit)
  try {
    const pageSize = 1000;
    let offset = 0;
    let keepFetching = true;

    while (keepFetching && offset < limit) {
      const { data, error } = await supabase
        .from('daily_supervision_history')
        .select('id, date, vendor_name, supervision_data, created_at')
        .eq('vendor_name', TIENDA_LOG_VENDOR_KEY)
        .order('id', { ascending: false })
        .range(offset, Math.min(offset + pageSize - 1, limit - 1));

      if (error || !Array.isArray(data) || data.length === 0) {
        keepFetching = false;
        break;
      }

      data.forEach((row) => {
        const norm = normalizeLogRow(row, row.id);
        if (norm) {
          byId.set(norm.id, norm);
        }
      });

      if (data.length < pageSize) {
        keepFetching = false;
      } else {
        offset += pageSize;
      }
    }
  } catch (err) {
    console.warn('[TiendaAnalytics] Error consultando logs en Supabase:', err);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime();
    const tb = new Date(b.timestamp || 0).getTime();
    return tb - ta;
  });
}

export function computeTiendaAnalytics(logs = []) {
  const todayStr = getLocalDateString();
  const monthStartStr = getLocalStartOfMonthString();

  const uniqueAll = new Set();
  const uniqueClients = new Set();
  const uniqueToday = new Set();

  let totalViews = 0;
  let clientViews = 0;
  let internalViews = 0;
  let todayViews = 0;
  let todayClientViews = 0;
  let monthViews = 0;
  let monthClientViews = 0;
  let mobileViews = 0;
  let desktopViews = 0;

  const bySellerMap = new Map();
  const byDayMap = new Map();

  logs.forEach((log) => {
    totalViews++;
    const isClient = log.source === 'cliente_link';
    if (isClient) clientViews++;
    else internalViews++;

    if (log.visitorId) {
      uniqueAll.add(log.visitorId);
      if (isClient) uniqueClients.add(log.visitorId);
    }

    if (log.date === todayStr) {
      todayViews++;
      if (isClient) todayClientViews++;
      if (log.visitorId) uniqueToday.add(log.visitorId);
    }

    if (log.date && log.date >= monthStartStr) {
      monthViews++;
      if (isClient) monthClientViews++;
    }

    if ((log.deviceType || '').toLowerCase().includes('escritorio') || (log.deviceType || '').toLowerCase().includes('pc')) {
      desktopViews++;
    } else {
      mobileViews++;
    }

    const sKey = log.sellerName || 'Catálogo General';
    if (!bySellerMap.has(sKey)) {
      bySellerMap.set(sKey, { sellerName: sKey, total: 0, clients: 0, internal: 0, visitors: new Set() });
    }
    const sEntry = bySellerMap.get(sKey);
    sEntry.total++;
    if (isClient) sEntry.clients++;
    else sEntry.internal++;
    if (log.visitorId) sEntry.visitors.add(log.visitorId);

    const dKey = log.date || todayStr;
    if (!byDayMap.has(dKey)) {
      byDayMap.set(dKey, { date: dKey, total: 0, clients: 0 });
    }
    const dEntry = byDayMap.get(dKey);
    dEntry.total++;
    if (isClient) dEntry.clients++;
  });

  const bySeller = Array.from(bySellerMap.values())
    .map((s) => ({
      sellerName: s.sellerName,
      total: s.total,
      clients: s.clients,
      internal: s.internal,
      uniqueVisitors: s.visitors.size
    }))
    .sort((a, b) => b.total - a.total);

  const byDay = Array.from(byDayMap.values()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  return {
    totalViews,
    clientViews,
    internalViews,
    uniqueVisitors: uniqueAll.size,
    uniqueClientVisitors: uniqueClients.size,
    todayViews,
    todayClientViews,
    todayUnique: uniqueToday.size,
    monthViews,
    monthClientViews,
    mobileViews,
    desktopViews,
    bySeller,
    byDay
  };
}

export async function clearTiendaViewLogs() {
  try {
    localStorage.removeItem(LOCAL_LOG_KEY);
  } catch (_) {}

  const { error } = await supabase
    .from('daily_supervision_history')
    .delete()
    .eq('vendor_name', TIENDA_LOG_VENDOR_KEY);

  if (error) {
    throw new Error(error.message || 'No se pudo limpiar el log en la nube.');
  }
  return true;
}

export function exportTiendaLogsToExcel(logs = []) {
  const rows = logs.map((l, idx) => ({
    'No.': idx + 1,
    'Fecha': l.date || '-',
    'Hora': l.time || '-',
    'Origen': l.source === 'cliente_link' ? 'Cliente (Link Compartido)' : 'App Interna (Olam)',
    'Vendedor / Enlace': l.sellerName || 'Catálogo General',
    'WhatsApp Destino': l.sellerPhone ? `+${l.sellerPhone}` : '-',
    'Tipo Dispositivo': l.deviceType || '-',
    'Dispositivo / Navegador': l.device || '-',
    'Referencia': l.referrer || '-',
    'ID Visitante': l.visitorId || '-'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 13 },
    { wch: 15 },
    { wch: 24 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 24 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Log Visualizaciones');
  const todayStr = getLocalDateString();
  const fileName = `Log_Visualizaciones_Tienda_Olam_${todayStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
