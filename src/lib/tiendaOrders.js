import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import { getLocalDateString, getLocalStartOfMonthString } from './dateUtils';

export const TIENDA_ORDER_VENDOR_KEY = 'TIENDA_ORDER_HISTORY';
const LOCAL_ORDERS_KEY = 'olam_tienda_orders_history_v1';

function normalizeOrderRow(raw, dbId = null) {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw.supervision_data && typeof raw.supervision_data === 'object' ? raw.supervision_data : raw;
  if (d.tipo && d.tipo !== 'tienda_order_record') return null;

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

  const items = Array.isArray(d.items) ? d.items : [];
  const totalAmount = Number(d.totalAmount ?? d.total ?? 0) || 0;
  const totalUnits = Number(
    d.totalUnits ?? items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0)
  ) || 0;

  return {
    id: d.id || `ord_row_${dbId || Math.random().toString(36).slice(2, 8)}`,
    dbId: dbId || d.dbId || null,
    orderNumber: d.orderNumber || `PED-${String(dbId || d.id || '').slice(-6).toUpperCase()}`,
    date: dateStr,
    time: timeStr,
    timestamp: ts,
    clientName: d.clientName || 'Cliente sin nombre',
    sellerName: d.sellerName || 'Catálogo General',
    sellerPhone: d.sellerPhone || '',
    source: d.source || 'cliente_link',
    device: d.device || 'Navegador Web',
    deviceType: d.deviceType || 'Móvil',
    visitorId: d.visitorId || 'anon',
    itemsCount: Number(d.itemsCount ?? items.length) || items.length,
    totalUnits,
    totalAmount: Math.round(totalAmount * 100) / 100,
    items,
    whatsappText: d.whatsappText || '',
    status: d.status || 'Pendiente'
  };
}

export async function fetchTiendaOrders({ limit = 2000 } = {}) {
  const byId = new Map();

  // 1. Respaldo local
  try {
    const localRaw = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
    if (Array.isArray(localRaw)) {
      localRaw.forEach((item) => {
        const norm = normalizeOrderRow(item);
        if (norm && !byId.has(norm.id)) {
          byId.set(norm.id, norm);
        }
      });
    }
  } catch (_) {}

  // 2. Base de datos Supabase (paginado)
  try {
    const pageSize = 1000;
    let offset = 0;
    let keepFetching = true;

    while (keepFetching && offset < limit) {
      const { data, error } = await supabase
        .from('daily_supervision_history')
        .select('id, date, vendor_name, supervision_data, created_at')
        .eq('vendor_name', TIENDA_ORDER_VENDOR_KEY)
        .order('id', { ascending: false })
        .range(offset, Math.min(offset + pageSize - 1, limit - 1));

      if (error || !Array.isArray(data) || data.length === 0) {
        keepFetching = false;
        break;
      }

      data.forEach((row) => {
        const norm = normalizeOrderRow(row, row.id);
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
    console.warn('[TiendaOrders] Error consultando pedidos en Supabase:', err);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(a.timestamp || 0).getTime();
    const tb = new Date(b.timestamp || 0).getTime();
    return tb - ta;
  });
}

export async function updateTiendaOrderStatus(order, newStatus) {
  if (!order) return null;
  const updatedPayload = {
    tipo: 'tienda_order_record',
    id: order.id,
    orderNumber: order.orderNumber,
    date: order.date,
    time: order.time,
    timestamp: order.timestamp,
    clientName: order.clientName,
    sellerName: order.sellerName,
    sellerPhone: order.sellerPhone,
    source: order.source,
    device: order.device,
    deviceType: order.deviceType,
    visitorId: order.visitorId,
    itemsCount: order.itemsCount,
    totalUnits: order.totalUnits,
    totalAmount: order.totalAmount,
    items: order.items,
    whatsappText: order.whatsappText,
    status: newStatus,
    statusUpdatedAt: new Date().toISOString()
  };

  // Actualizar en localStorage
  try {
    const localRaw = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
    if (Array.isArray(localRaw)) {
      const next = localRaw.map((item) => (item.id === order.id ? { ...item, status: newStatus } : item));
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next));
    }
  } catch (_) {}

  // Actualizar en Supabase
  if (order.dbId) {
    const { error } = await supabase
      .from('daily_supervision_history')
      .update({ supervision_data: updatedPayload })
      .eq('id', order.dbId);
    if (error) throw new Error(error.message || 'No se pudo actualizar el estado en Supabase.');
  }

  return { ...order, status: newStatus };
}

export async function deleteTiendaOrder(order) {
  if (!order) return false;

  try {
    const localRaw = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
    if (Array.isArray(localRaw)) {
      const next = localRaw.filter((item) => item.id !== order.id);
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next));
    }
  } catch (_) {}

  if (order.dbId) {
    const { error } = await supabase
      .from('daily_supervision_history')
      .delete()
      .eq('id', order.dbId);
    if (error) throw new Error(error.message || 'No se pudo eliminar el pedido en Supabase.');
  }

  return true;
}

export function computeTiendaOrdersStats(orders = []) {
  const todayStr = getLocalDateString();
  const monthStartStr = getLocalStartOfMonthString();

  let totalOrders = 0;
  let totalAmount = 0;
  let todayOrders = 0;
  let todayAmount = 0;
  let monthOrders = 0;
  let monthAmount = 0;
  let pendingCount = 0;
  let attendedCount = 0;
  let cancelledCount = 0;
  let clientLinkOrders = 0;
  let internalOrders = 0;

  const bySellerMap = new Map();

  orders.forEach((o) => {
    totalOrders++;
    const amt = Number(o.totalAmount) || 0;
    const isCancelled = o.status === 'Anulado';

    if (!isCancelled) {
      totalAmount += amt;
    }

    if (o.status === 'Atendido') attendedCount++;
    else if (o.status === 'Anulado') cancelledCount++;
    else pendingCount++;

    if (o.source === 'cliente_link') clientLinkOrders++;
    else internalOrders++;

    if (o.date === todayStr) {
      todayOrders++;
      if (!isCancelled) todayAmount += amt;
    }
    if (o.date && o.date >= monthStartStr) {
      monthOrders++;
      if (!isCancelled) monthAmount += amt;
    }

    const sKey = o.sellerName || 'Catálogo General';
    if (!bySellerMap.has(sKey)) {
      bySellerMap.set(sKey, { sellerName: sKey, count: 0, amount: 0, pending: 0 });
    }
    const entry = bySellerMap.get(sKey);
    entry.count++;
    if (!isCancelled) entry.amount += amt;
    if (o.status !== 'Atendido' && o.status !== 'Anulado') entry.pending++;
  });

  const bySeller = Array.from(bySellerMap.values())
    .map((s) => ({ ...s, amount: Math.round(s.amount * 100) / 100 }))
    .sort((a, b) => b.count - a.count || b.amount - a.amount);

  return {
    totalOrders,
    totalAmount: Math.round(totalAmount * 100) / 100,
    todayOrders,
    todayAmount: Math.round(todayAmount * 100) / 100,
    monthOrders,
    monthAmount: Math.round(monthAmount * 100) / 100,
    pendingCount,
    attendedCount,
    cancelledCount,
    clientLinkOrders,
    internalOrders,
    bySeller
  };
}

export function exportTiendaOrdersToExcel(orders = []) {
  const summaryRows = orders.map((o, idx) => ({
    'No.': idx + 1,
    'No. Pedido': o.orderNumber || '-',
    'Fecha': o.date || '-',
    'Hora': o.time || '-',
    'Cliente / Farmacia': o.clientName || '-',
    'Vendedor / Enlace': o.sellerName || 'Catálogo General',
    'WhatsApp Destino': o.sellerPhone ? `+${o.sellerPhone}` : '-',
    'Origen': o.source === 'cliente_link' ? 'Cliente (Link Compartido)' : 'App Interna (Olam)',
    'Dispositivo': o.device || '-',
    'Productos Distintos': o.itemsCount || 0,
    'Unidades Totales': o.totalUnits || 0,
    'Total Estimado (Q)': Number(o.totalAmount || 0),
    'Estado': o.status || 'Pendiente'
  }));

  const detailRows = [];
  orders.forEach((o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    if (items.length === 0) {
      detailRows.push({
        'No. Pedido': o.orderNumber || '-',
        'Fecha': o.date || '-',
        'Hora': o.time || '-',
        'Cliente / Farmacia': o.clientName || '-',
        'Vendedor': o.sellerName || 'Catálogo General',
        'Estado': o.status || 'Pendiente',
        'Clave': '-',
        'Producto': '(Sin detalle de ítems)',
        'Cantidad': 0,
        'Precio Unit. (Q)': 0,
        'Subtotal (Q)': Number(o.totalAmount || 0)
      });
      return;
    }
    items.forEach((it) => {
      detailRows.push({
        'No. Pedido': o.orderNumber || '-',
        'Fecha': o.date || '-',
        'Hora': o.time || '-',
        'Cliente / Farmacia': o.clientName || '-',
        'Vendedor': o.sellerName || 'Catálogo General',
        'Estado': o.status || 'Pendiente',
        'Clave': it.code || '-',
        'Producto': it.name || it.rawDesc || '-',
        'Cantidad': Number(it.qty) || 0,
        'Precio Unit. (Q)': Number(it.unitPrice) || 0,
        'Subtotal (Q)': Number(it.subtotal) || 0
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 6 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 28 },
    { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Pedidos');

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 22 },
    { wch: 14 }, { wch: 12 }, { wch: 44 }, { wch: 11 }, { wch: 15 }, { wch: 15 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Productos');

  const todayStr = getLocalDateString();
  const fileName = `Historial_Pedidos_Tienda_Olam_${todayStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
