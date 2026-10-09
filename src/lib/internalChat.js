/**
 * Módulo de Chat Interno y Peticiones de Soporte
 * Comunicación Privada y Segura Vendedor <-> Administrador
 * Droguería El Olam 2026.
 */

import { supabase } from './supabase';
import { getLocalDateString } from './dateUtils';

const CHAT_STORAGE_KEY = 'olam_internal_chat_messages_v2';
const CHAT_CHANNEL_NAME = 'olam_internal_chat_room';

let chatRealtimeChannel = null;

/**
 * Obtiene todos los mensajes almacenados localmente
 */
export function getStoredChatMessages() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error al leer mensajes de chat interno:', e);
    return [];
  }
}

/**
 * Guarda todos los mensajes localmente
 */
export function saveStoredChatMessages(messages) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olam_chat_messages_updated', { detail: messages }));
    }
  } catch (e) {
    console.error('Error al guardar mensajes de chat interno:', e);
  }
}

/**
 * Carga mensajes desde Supabase y los unifica con los locales
 */
export async function fetchRemoteChatMessages() {
  const local = getStoredChatMessages();
  try {
    const today = getLocalDateString();
    const { data, error } = await supabase
      .from('daily_supervision_history')
      .select('datos')
      .eq('date', 'chat_sync_master')
      .maybeSingle();

    if (!error && data?.datos?.messages && Array.isArray(data.datos.messages)) {
      const remoteMsgs = data.datos.messages;
      const map = new Map();
      local.forEach(m => map.set(m.id, m));
      remoteMsgs.forEach(m => map.set(m.id, m));
      const merged = Array.from(map.values()).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      saveStoredChatMessages(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Fallback al cargar mensajes remotos:', err);
  }
  return local;
}

/**
 * Sincroniza todos los mensajes en Supabase
 */
export async function syncChatMessagesToSupabase(messages) {
  try {
    await supabase
      .from('daily_supervision_history')
      .upsert({
        date: 'chat_sync_master',
        datos: {
          tipo: 'internal_chat_messages',
          updatedAt: new Date().toISOString(),
          messages: messages.slice(-200) // Conservar los 200 más recientes
        }
      }, { onConflict: 'date' });
  } catch (e) {
    console.warn('Error al sincronizar chat en Supabase:', e);
  }
}

/**
 * Envía un mensaje o ticket de soporte
 */
export async function sendChatMessage({
  vendorName,
  sender, // 'vendor' | 'admin'
  senderName,
  message,
  type = 'chat', // 'chat' | 'ticket'
  clientCode = null,
  oldName = null,
  newName = null
}) {
  const cleanVendor = (vendorName || '').trim();
  if (!cleanVendor) return { success: false, error: 'Vendedor no especificado' };

  const now = new Date();
  const dateStr = getLocalDateString(now);
  const timeStr = now.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    vendorName: cleanVendor,
    sender,
    senderName: senderName || (sender === 'admin' ? 'Administración' : cleanVendor),
    message: message.trim(),
    type,
    clientCode: clientCode ? String(clientCode).trim() : null,
    oldName: oldName ? oldName.trim() : null,
    newName: newName ? newName.trim() : null,
    status: type === 'ticket' ? 'pending' : 'chat',
    date: dateStr,
    time: timeStr,
    createdAt: now.toISOString()
  };

  const current = getStoredChatMessages();
  const updated = [...current, newMsg];
  saveStoredChatMessages(updated);

  // Transmitir en tiempo real vía Supabase Realtime
  try {
    if (chatRealtimeChannel) {
      chatRealtimeChannel.send({
        type: 'broadcast',
        event: 'new_chat_message',
        payload: newMsg
      });
    }
  } catch (_) {}

  // Sincronizar en la nube
  syncChatMessagesToSupabase(updated).catch(() => {});

  return { success: true, message: newMsg };
}

/**
 * Resuelve una petición de soporte por parte del Administrador
 */
export async function resolveSupportTicket(ticketId, resolutionNote = '') {
  const current = getStoredChatMessages();
  const index = current.findIndex(m => m.id === ticketId);
  if (index === -1) return { success: false };

  const now = new Date();
  const target = current[index];
  target.status = 'resolved';
  target.resolvedAt = now.toISOString();
  target.resolutionNote = resolutionNote.trim();

  current[index] = target;
  saveStoredChatMessages(current);

  // Notificar por broadcast
  try {
    if (chatRealtimeChannel) {
      chatRealtimeChannel.send({
        type: 'broadcast',
        event: 'ticket_resolved',
        payload: target
      });
    }
  } catch (_) {}

  syncChatMessagesToSupabase(current).catch(() => {});
  return { success: true, ticket: target };
}

/**
 * Obtiene los mensajes filtrados para un vendedor específico (Privacidad total)
 */
export function getVendorConversation(vendorName) {
  if (!vendorName) return [];
  const clean = vendorName.trim().toLowerCase();
  const all = getStoredChatMessages();
  return all.filter(m => (m.vendorName || '').trim().toLowerCase() === clean);
}

/**
 * Obtiene estadísticas de peticiones para el Administrador
 */
export function getAdminSupportStats() {
  const all = getStoredChatMessages();
  const pendingTickets = all.filter(m => m.type === 'ticket' && m.status === 'pending');
  const resolvedTickets = all.filter(m => m.type === 'ticket' && m.status === 'resolved');

  // Vendedores únicos con mensajes
  const vendorsMap = {};
  all.forEach(m => {
    const v = m.vendorName;
    if (!v) return;
    if (!vendorsMap[v]) {
      vendorsMap[v] = {
        vendorName: v,
        total: 0,
        pendingCount: 0,
        lastMessage: m
      };
    }
    vendorsMap[v].total++;
    if (m.type === 'ticket' && m.status === 'pending') {
      vendorsMap[v].pendingCount++;
    }
    if (!vendorsMap[v].lastMessage || (m.createdAt > vendorsMap[v].lastMessage.createdAt)) {
      vendorsMap[v].lastMessage = m;
    }
  });

  return {
    totalPending: pendingTickets.length,
    totalResolved: resolvedTickets.length,
    vendorsList: Object.values(vendorsMap).sort((a, b) => b.pendingCount - a.pendingCount || (b.lastMessage?.createdAt || '').localeCompare(a.lastMessage?.createdAt || ''))
  };
}

/**
 * Suscribe a eventos en tiempo real para recibir mensajes instantáneos
 */
export function subscribeToInternalChat(onNewMessage) {
  if (!chatRealtimeChannel) {
    chatRealtimeChannel = supabase.channel(CHAT_CHANNEL_NAME);
  }

  chatRealtimeChannel
    .on('broadcast', { event: 'new_chat_message' }, ({ payload }) => {
      if (payload) {
        const current = getStoredChatMessages();
        if (!current.some(m => m.id === payload.id)) {
          const updated = [...current, payload];
          saveStoredChatMessages(updated);
        }
        if (onNewMessage) onNewMessage(payload);
      }
    })
    .on('broadcast', { event: 'ticket_resolved' }, ({ payload }) => {
      if (payload) {
        const current = getStoredChatMessages();
        const idx = current.findIndex(m => m.id === payload.id);
        if (idx !== -1) {
          current[idx] = payload;
          saveStoredChatMessages(current);
        }
        if (onNewMessage) onNewMessage(payload);
      }
    })
    .subscribe();

  // Escuchar eventos en pestaña local
  const handleLocalUpdate = (e) => {
    if (onNewMessage && e.detail) {
      onNewMessage(null);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('olam_chat_messages_updated', handleLocalUpdate);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('olam_chat_messages_updated', handleLocalUpdate);
    }
  };
}
