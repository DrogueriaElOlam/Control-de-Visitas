/**
 * Módulo de Presencia en Tiempo Real para Droguería El Olam.
 * Gestiona y supervisa qué vendedores están en línea en tiempo real
 * utilizando Supabase Realtime Presence Channels + Fallback de BroadcastChannel.
 */

import { supabase } from './supabase';

let activeChannel = null;
let broadcastChannel = null;

// Inicializa BroadcastChannel local para comunicación inter-pestañas
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('olam_local_presence');
  }
} catch (e) {
  console.warn('BroadcastChannel no soportado');
}

/**
 * Suscribe al usuario actual para transmitir su presencia y escuchar a los demás.
 * @param {Object} currentUser - Usuario autenticado (administrador o vendedor).
 * @param {Function} onOnlineChange - Callback que recibe un objeto o Set de vendedores en línea.
 * @returns {Function} cleanup - Función para cancelar suscripción y desmarcar al usuario.
 */
export function subscribeToOnlinePresence(currentUser, onOnlineChange) {
  if (!currentUser) return () => {};

  const onlineMap = new Map();

  const notify = () => {
    if (onOnlineChange) {
      // Retornar un objeto de vendedores en línea { [nombre]: info }
      const result = {};
      onlineMap.forEach((val, key) => {
        result[key] = val;
      });
      onOnlineChange(result);
    }
  };

  // Identificador único de presencia: nombre de vendedor o admin
  const presenceKey = currentUser.name || `User_${currentUser.id || 'anon'}`;

  // Canal Realtime en Supabase
  const channel = supabase.channel('olam_presence_room', {
    config: {
      presence: {
        key: presenceKey
      }
    }
  });

  activeChannel = channel;

  // Manejar sincronización de presencia en Supabase
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onlineMap.clear();

      Object.entries(state).forEach(([key, presences]) => {
        if (presences && presences.length > 0) {
          const info = presences[0];
          // Registrar nombre de vendedor en línea
          if (info.name) {
            onlineMap.set(info.name, info);
          }
          onlineMap.set(key, info);
        }
      });

      notify();
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (newPresences && newPresences.length > 0) {
        const info = newPresences[0];
        if (info.name) onlineMap.set(info.name, info);
        onlineMap.set(key, info);
        notify();
      }
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      if (leftPresences && leftPresences.length > 0) {
        const info = leftPresences[0];
        if (info.name) onlineMap.delete(info.name);
      }
      onlineMap.delete(key);
      notify();
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await channel.track({
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            route: currentUser.route || '',
            onlineAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Error al rastrear presencia:', err);
        }
      }
    });

  // Notificar al cerrar pestaña o salir
  const handleUnload = () => {
    try {
      if (channel) channel.untrack();
    } catch {}
  };
  window.addEventListener('beforeunload', handleUnload);

  // Escuchar también BroadcastChannel local por si hay pestañas múltiples
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'PING') {
        broadcastChannel.postMessage({
          type: 'PONG',
          user: {
            id: currentUser.id,
            name: currentUser.name,
            role: currentUser.role
          }
        });
      } else if (event.data?.type === 'PONG' && event.data.user) {
        onlineMap.set(event.data.user.name, event.data.user);
        notify();
      }
    };
    broadcastChannel.postMessage({ type: 'PING' });
  }

  // Cleanup al desmontar
  return () => {
    window.removeEventListener('beforeunload', handleUnload);
    try {
      if (channel) {
        channel.untrack();
        supabase.removeChannel(channel);
      }
    } catch (e) {
      console.warn('Error al cerrar canal de presencia:', e);
    }
  };
}
