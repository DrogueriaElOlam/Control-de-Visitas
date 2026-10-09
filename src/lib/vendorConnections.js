/**
 * Módulo de Registro y Control de Conexiones de Vendedores en Línea
 * Droguería El Olam
 * 
 * Gestiona:
 * 1. Registro automático de cada conexión en Supabase y almacenamiento local.
 * 2. Emisión y recepción en tiempo real de eventos de conexión.
 * 3. Consulta y filtrado de la bitácora de conexiones.
 * 4. Exportación a Excel con cuadro elegante (títulos en azul y celdas delimitadas por líneas delgadas).
 */

import { supabase } from './supabase';
import ExcelJS from 'exceljs';

const STORAGE_KEY = 'olam_vendor_connections_log_v1';
const LAST_REGISTERED_SESSION_KEY = 'olam_last_registered_session_time';

/**
 * Detecta la plataforma o dispositivo de forma amigable a partir del userAgent.
 */
export function getFriendlyDeviceInfo() {
  if (typeof navigator === 'undefined') return 'Dispositivo Desconocido';
  const ua = navigator.userAgent || '';
  
  let os = 'Dispositivo';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS (Apple)';
  else if (/Windows NT/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac OS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = '';
  if (/wv|WebView/i.test(ua) || (window.AndroidBridge !== undefined)) {
    browser = 'App Móvil El Olam';
  } else if (/Chrome|CriOS/i.test(ua) && !/Edge|Edg|OPR/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else {
    browser = 'Navegador Web';
  }

  return `${os} • ${browser}`;
}

/**
 * Registra una nueva conexión de vendedor en Supabase y localStorage.
 * Incluye protección contra llamadas repetidas en recargas rápidas (< 45 segundos).
 */
export async function recordVendorLoginSession(user) {
  if (!user || !user.name) return null;
  // Solo registramos conexiones de vendedores
  if (user.role === 'admin' || user.name === 'Administrador') return null;

  const now = new Date();
  const lastTime = sessionStorage.getItem(LAST_REGISTERED_SESSION_KEY);
  if (lastTime && (now.getTime() - parseInt(lastTime, 10)) < 45000) {
    // Sesión ya registrada recientemente en esta pestaña
    return null;
  }
  sessionStorage.setItem(LAST_REGISTERED_SESSION_KEY, now.getTime().toString());

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const timeStr = now.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const connectionRecord = {
    id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    date: dateStr,
    time: timeStr,
    vendor_name: user.name,
    vendor_id: user.id || null,
    route: user.route || 'Sin ruta asignada',
    device: getFriendlyDeviceInfo(),
    status: 'Conectado',
    timestamp: now.toISOString()
  };

  // 1. Guardar en localStorage
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.unshift(connectionRecord);
    // Conservar hasta 1000 registros locales
    if (existing.length > 1000) existing.splice(1000);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('[Connections] Error guardando local:', e);
  }

  // 2. Disparar evento local
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_vendor_connected', { detail: connectionRecord }));
  }

  // 3. Persistir en Supabase (daily_supervision_history)
  try {
    const entry = {
      date: dateStr,
      datos: {
        tipo: 'vendor_login_session',
        ...connectionRecord
      }
    };
    await supabase.from('daily_supervision_history').insert([entry]);
  } catch (err) {
    console.warn('[Connections] Error al guardar sesión en Supabase:', err);
  }

  // 4. Notificar a través de canal Realtime para administradores
  try {
    const channel = supabase.channel('olam_vendor_events_channel');
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'vendor_online_event',
          payload: connectionRecord
        }).then(() => {
          supabase.removeChannel(channel);
        });
      }
    });
  } catch (e) {
    console.warn('[Connections] Error transmitiendo evento en Realtime:', e);
  }

  return connectionRecord;
}

/**
 * Obtiene el historial de conexiones de vendedores desde Supabase y localStorage.
 */
export async function fetchVendorConnections({ dateStr = null, limit = 500 } = {}) {
  const localList = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(parsed)) {
      localList.push(...parsed);
    }
  } catch (e) {}

  const remoteList = [];
  try {
    let query = supabase
      .from('daily_supervision_history')
      .select('id, date, datos, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (dateStr) {
      query = query.eq('date', dateStr);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      data.forEach(row => {
        if (row.datos && row.datos.tipo === 'vendor_login_session') {
          remoteList.push({
            supabase_id: row.id,
            id: row.datos.id || `sup_${row.id}`,
            date: row.date || row.datos.date,
            time: row.datos.time || 'N/A',
            vendor_name: row.datos.vendor_name || 'Vendedor',
            vendor_id: row.datos.vendor_id,
            route: row.datos.route || 'Sin ruta asignada',
            device: row.datos.device || 'Dispositivo Web',
            status: row.datos.status || 'Conectado',
            timestamp: row.datos.timestamp || row.created_at
          });
        }
      });
    }
  } catch (err) {
    console.warn('[Connections] Error consultando Supabase:', err);
  }

  // Unificar y deduplicar registros por id o (vendor_name + date + time)
  const map = new Map();
  [...remoteList, ...localList].forEach(item => {
    const uniqueKey = item.id || `${item.vendor_name}_${item.date}_${item.time}`;
    if (!map.has(uniqueKey)) {
      map.set(uniqueKey, item);
    }
  });

  const combined = Array.from(map.values());
  // Ordenar cronológicamente descendente
  combined.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

  return combined;
}

/**
 * Exporta el registro de conexiones a un archivo Excel formateado con cuadro elegante:
 * - Título general con azul corporativo Droguería El Olam.
 * - Encabezados con fondo azul (#1E3A8A) y texto blanco en negrita.
 * - Celdas perfectamente delimitadas con líneas delgadas (thin borders).
 * - Cebreado suave y anchos de columna ajustados.
 */
export async function exportVendorConnectionsToExcel(connectionsList = [], options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Droguería El Olam';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Control de Conexiones', {
    views: [{ showGridLines: true }]
  });

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  const headerBorder = {
    top: { style: 'thin', color: { argb: 'FF1E293B' } },
    left: { style: 'thin', color: { argb: 'FF1E293B' } },
    bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    right: { style: 'thin', color: { argb: 'FF1E293B' } }
  };

  // Configurar columnas
  worksheet.columns = [
    { key: 'num', width: 8 },
    { key: 'date', width: 14 },
    { key: 'time', width: 16 },
    { key: 'vendor', width: 28 },
    { key: 'route', width: 26 },
    { key: 'device', width: 28 },
    { key: 'status', width: 16 }
  ];

  // Fila 1: Título de la Empresa
  worksheet.mergeCells('A1:G1');
  const titleRow1 = worksheet.getCell('A1');
  titleRow1.value = 'DROGUERÍA EL OLAM';
  titleRow1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow1.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' } // Azul oscuro corporativo
  };
  worksheet.getRow(1).height = 30;

  // Fila 2: Subtítulo
  worksheet.mergeCells('A2:G2');
  const titleRow2 = worksheet.getCell('A2');
  titleRow2.value = 'REGISTRO Y CONTROL DE CONEXIONES DE VENDEDORES EN LÍNEA';
  titleRow2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' } // Azul primario
  };
  worksheet.getRow(2).height = 24;

  // Fila 3: Metadatos y Fecha de Generación
  worksheet.mergeCells('A3:G3');
  const metaCell = worksheet.getCell('A3');
  const todayFormatted = new Date().toLocaleDateString('es-GT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  metaCell.value = `Auditoría del Sistema • Fecha de Emisión: ${todayFormatted} • Total Registros: ${connectionsList.length}`;
  metaCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' } // Gris azulado claro
  };
  worksheet.getRow(3).height = 20;

  // Fila 4: Espacio en blanco
  worksheet.getRow(4).height = 10;

  // Fila 5: Encabezados de Columna
  const headers = [
    'No.',
    'Fecha',
    'Hora',
    'Nombre del Vendedor',
    'Ruta Asignada',
    'Dispositivo / Plataforma',
    'Estado'
  ];

  const headerRow = worksheet.getRow(5);
  headerRow.height = 26;
  headers.forEach((text, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = text;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Azul elegante en títulos
    };
    cell.border = headerBorder;
  });

  // Filas de Datos con líneas delgadas delimitadas
  let currentRowIdx = 6;
  connectionsList.forEach((conn, index) => {
    const row = worksheet.getRow(currentRowIdx);
    row.height = 22;

    const isEven = index % 2 === 0;
    const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC'; // Cebreado suave

    const rowData = [
      index + 1,
      conn.date || '—',
      conn.time || '—',
      conn.vendor_name || 'Vendedor',
      conn.route || 'Sin ruta asignada',
      conn.device || 'Web Browser',
      conn.status || 'Conectado'
    ];

    rowData.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = val;
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF1E293B' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgArgb }
      };
      cell.border = thinBorder; // Delimitación exacta con líneas delgadas

      // Alineaciones específicas
      if (colIdx === 0) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF64748B' } };
      } else if (colIdx === 1 || colIdx === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colIdx === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
      } else if (colIdx === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF047857' } }; // Verde elegante
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });

    currentRowIdx++;
  });

  // Generar y descargar el archivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const nowStr = new Date().toISOString().split('T')[0];
  a.download = `Registro_Conexiones_Vendedores_${nowStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Sintetizador sutil de audio para notificación de conexión de vendedor (Web Audio API).
 * Funciona de inmediato sin requerir archivos mp3 externos.
 */
export function playVendorOnlineSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Acorde suave ascendente: 523.25 Hz (Do) -> 659.25 Hz (Mi)
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.36);
  } catch (e) {
    // Si el navegador bloquea audio sin interacción previa, no afecta la ejecución
  }
}
