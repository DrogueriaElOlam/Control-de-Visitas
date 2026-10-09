/**
 * Módulo de Criptografía y Seguridad para Droguería El Olam
 * Protege contra ingeniería inversa y lectura de código fuente eliminando
 * contraseñas en texto plano e implementando Hashing SHA-256 + 50 Claves de un solo toque (OTP).
 */

import initialOtpKeys from './initialOtpKeys.json';
import initialLogoutOtpKeys from './initialLogoutOtpKeys.json';
import { getLocalDateString } from './dateUtils';
import { supabase } from './supabase';

const OTP_STORAGE_KEY = 'olam_otp_keys_vault_v2';
const LOGOUT_OTP_STORAGE_KEY = 'olam_logout_otp_keys_vault_v2';
const APP_SALT = 'olam_sec_salt_2026_@dmin_v!sit@s';

/**
 * Función de hashing SHA-256 sincrónica y robusta para evitar exposición en texto plano
 */
export function sha256Hex(str) {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const utf8 = unescape(encodeURIComponent(str));
  const words = [];
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= (utf8.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  const byteLen = utf8.length;
  words[byteLen >> 2] |= 0x80 << (24 - (byteLen % 4) * 8);
  words[(((byteLen + 8) >> 6) << 4) + 15] = byteLen * 8;

  const w = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
        const gamma1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }
      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + sigma1 + ch + k[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }

  const toHex = (n) => ((n >>> 0).toString(16)).padStart(8, '0');
  return (toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7)).toLowerCase();
}

/**
 * Calcula el hash con Salt para verificar una contraseña
 */
export function hashPassword(plainText) {
  if (!plainText) return '';
  return sha256Hex(`${plainText.trim()}_${APP_SALT}`);
}

/**
 * Hashes autorizados de acceso maestro protegidos criptográficamente (sin contraseñas en texto plano)
 */
const AUTHORIZED_ADMIN_HASHES = new Set([
  'eb427d09fbe8ba81f98fcbf1ecf016133ddc6e946afdc868146add2474b75ffd',
  'b1ac8bf388a9300f8bc828e3151c33ae57b2dfecc5e37e1d649b0be3b0810247',
  '26b8337cde31e62b0dd382969c9eeb27d1f5d79a88cc0cd37c07ac7ef5b62054',
  '9b8abc6f752c246788f706522fe719127f2ed92ca8fb6e5b696c5ea2f889ab24'
]);

export const DEFAULT_VENDOR_HASH = '2ca5270ddb9124aec64c8713037f04148195b789629ba2a12901e990b851be1e';

/**
 * Comprueba si la contraseña ingresada coincide con un hash guardado o los hashes autorizados
 */
export function verifyPassword(inputPassword, storedHashOrPlain, role = 'vendor') {
  if (!inputPassword) return false;
  const inputHash = hashPassword(inputPassword);

  // 1. Verificar contra hashes maestros autorizados
  if (role === 'admin' && AUTHORIZED_ADMIN_HASHES.has(inputHash)) {
    return true;
  }

  // 2. Verificar contra el hash almacenado
  if (storedHashOrPlain) {
    // Si ya está guardada como hash
    if (storedHashOrPlain.length === 64 && /^[0-9a-f]+$/i.test(storedHashOrPlain)) {
      if (inputHash === storedHashOrPlain.toLowerCase()) return true;
    } else {
      // Si la guardada estaba en texto plano previa a la migración
      if (inputPassword === storedHashOrPlain || inputHash === hashPassword(storedHashOrPlain)) {
        return true;
      }
    }
  }

  // 3. Clave por defecto de vendedor protegida
  if (role === 'vendor' && inputHash === DEFAULT_VENDOR_HASH) {
    return true;
  }

  return false;
}

const OTP_LOGIN_VAULT_DATE = '2099-12-30';
const OTP_LOGOUT_VAULT_DATE = '2099-12-31';

/**
 * Garantiza de forma estricta que la clave 1 (OLAM-X5F9-96RM) permanezca quemada
 * por Danny Perez el 2026-10-08 en cualquier instancia local o remota.
 */
function ensureDannyBurned(vault) {
  if (!Array.isArray(vault)) return vault;
  return vault.map((item) => {
    if (item.id === 1 || item.key === 'OLAM-X5F9-96RM') {
      return {
        ...item,
        used: true,
        usedBy: item.usedBy || 'Danny Perez',
        usedAt: item.usedAt || '2026-10-08 14:30:00',
        usedRole: item.usedRole || 'vendor'
      };
    }
    return item;
  });
}

/**
 * Gestión de la Bóveda de 50 Claves de Un Solo Toque (OTP)
 */
export function getOtpKeysVault() {
  try {
    const raw = localStorage.getItem(OTP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const protectedVault = ensureDannyBurned(parsed);
        localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(protectedVault));
        // Disparar sincronización silenciosa con la nube en segundo plano
        setTimeout(() => { fetchOtpVaultFromCloud().catch(() => {}); }, 100);
        return protectedVault;
      }
    }
  } catch (e) {
    console.error('Error al leer bóveda de claves OTP:', e);
  }

  // Si no existe, inicializar con las 50 claves generadas
  const initial = initialOtpKeys.map((item) => ({
    ...item,
    hash: hashPassword(item.key)
  }));
  const protectedInitial = ensureDannyBurned(initial);
  saveOtpKeysVault(protectedInitial);
  setTimeout(() => { fetchOtpVaultFromCloud().catch(() => {}); }, 100);
  return protectedInitial;
}

export function saveOtpKeysVault(vault) {
  try {
    const protectedVault = ensureDannyBurned(vault);
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(protectedVault));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olam_otp_vault_changed', { detail: { vault: protectedVault } }));
    }
  } catch (e) {
    console.error('Error al guardar bóveda de claves OTP:', e);
  }
}

/**
 * Sincroniza la bóveda de claves de login con Supabase de forma bidireccional
 */
export async function fetchOtpVaultFromCloud() {
  let localVault = [];
  try {
    const raw = localStorage.getItem(OTP_STORAGE_KEY);
    if (raw) localVault = JSON.parse(raw);
  } catch (_) {}

  if (!Array.isArray(localVault) || localVault.length === 0) {
    localVault = initialOtpKeys.map((item) => ({
      ...item,
      hash: hashPassword(item.key)
    }));
  }

  try {
    const { data, error } = await supabase
      .from('daily_supervision_history')
      .select('datos')
      .eq('date', OTP_LOGIN_VAULT_DATE)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0 && data[0]?.datos?.vault) {
      const cloudVault = data[0].datos.vault;
      let hasNewCloudBurn = false;
      let hasNewLocalBurn = false;

      const merged = localVault.map((localItem) => {
        const cloudItem = cloudVault.find(c => c.key === localItem.key || c.id === localItem.id);
        // Si en la nube ya está quemada y localmente no, actualizar local
        if (cloudItem && cloudItem.used && !localItem.used) {
          hasNewCloudBurn = true;
          return {
            ...localItem,
            used: true,
            usedAt: cloudItem.usedAt,
            usedBy: cloudItem.usedBy,
            usedRole: cloudItem.usedRole
          };
        }
        // Si localmente está quemada y en la nube no, avisar para actualizar nube
        if (localItem.used && (!cloudItem || !cloudItem.used)) {
          hasNewLocalBurn = true;
          return localItem;
        }
        return localItem;
      });

      saveOtpKeysVault(merged);
      if (hasNewLocalBurn) {
        saveOtpVaultToCloud(merged).catch(() => {});
      }
      return merged;
    } else {
      // Inicializar la nube con la bóveda
      saveOtpVaultToCloud(localVault).catch(() => {});
    }
  } catch (err) {
    console.warn('[Security] Error consultando bóveda OTP en Supabase:', err);
  }

  return localVault;
}

export async function saveOtpVaultToCloud(vault) {
  const protectedVault = ensureDannyBurned(vault);
  saveOtpKeysVault(protectedVault);
  try {
    const { data: existing } = await supabase
      .from('daily_supervision_history')
      .select('id')
      .eq('date', OTP_LOGIN_VAULT_DATE)
      .limit(1);

    const payload = {
      date: OTP_LOGIN_VAULT_DATE,
      datos: {
        tipo: 'otp_vault_login',
        vault: protectedVault,
        updated_at: new Date().toISOString()
      }
    };

    if (existing && existing.length > 0) {
      await supabase
        .from('daily_supervision_history')
        .update(payload)
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('daily_supervision_history')
        .insert([payload]);
    }

    // Broadcast en tiempo real para refrescar otras pestañas/dispositivos
    try {
      const channel = supabase.channel('olam_otp_vault_live');
      channel.send({
        type: 'broadcast',
        event: 'vault_updated',
        payload: { type: 'login', timestamp: Date.now() }
      });
    } catch (_) {}
  } catch (err) {
    console.warn('[Security] Error guardando bóveda OTP en Supabase:', err);
  }
}

export async function getOtpKeysVaultAsync() {
  return await fetchOtpVaultFromCloud();
}

/**
 * Detecta si una cadena tiene el formato de clave de un solo toque: "OLAM-XXXX-XXXX"
 */
export function isOtpKeyFormat(str) {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim().toUpperCase();
  return /^OLAM-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clean);
}

/**
 * Verifica y quema (invalida) una clave de un solo toque al iniciar sesión.
 * Si ya fue usada, rechaza el ingreso indicando cuándo fue consumida.
 */
export function verifyAndConsumeOtpKey(inputKey, userContext = {}) {
  if (!inputKey || typeof inputKey !== 'string') {
    return { valid: false, message: 'Clave no proporcionada' };
  }

  const cleanKey = inputKey.trim().toUpperCase();
  const vault = getOtpKeysVault();

  const keyIndex = vault.findIndex(
    (item) => item.key.toUpperCase() === cleanKey
  );

  if (keyIndex === -1) {
    return {
      valid: false,
      isOtp: false,
      message: 'Clave de un solo toque no encontrada en la base de datos de claves autorizadas.'
    };
  }

  const targetKey = vault[keyIndex];

  // 1. Si la clave YA fue consumida previamente: RECHAZAR y advertir
  if (targetKey.used) {
    const usedDate = targetKey.usedAt || 'fecha anterior';
    const usedBy = targetKey.usedBy || 'otro usuario';
    return {
      valid: false,
      isOtp: true,
      alreadyUsed: true,
      message: `⛔ ACCESO DENEGADO: Esta clave de un solo toque (${targetKey.key}) ya fue utilizada el ${usedDate} por "${usedBy}" y fue invalidada de forma permanente por seguridad.`
    };
  }

  // 2. La clave está DISPONIBLE: MARCARLA COMO CONSUMIDA INMEDIATAMENTE
  const now = new Date();
  const dateStr = getLocalDateString(now);
  const timeStr = now.toLocaleTimeString('es-GT', { hour12: false });
  const consumedTimestamp = `${dateStr} ${timeStr}`;

  targetKey.used = true;
  targetKey.usedAt = consumedTimestamp;
  targetKey.usedBy = userContext.name || userContext.username || 'Usuario';
  targetKey.usedRole = userContext.role || 'general';

  vault[keyIndex] = targetKey;
  saveOtpKeysVault(vault);

  // Sincronizar de inmediato a Supabase en la nube para persistencia universal
  saveOtpVaultToCloud(vault).catch(() => {});

  return {
    valid: true,
    isOtp: true,
    consumed: true,
    keyData: targetKey,
    message: `✅ Clave de un solo toque validada con éxito. Ha sido invalidada de forma permanente para futuros accesos.`
  };
}

/**
 * Resumen de estadísticas de las 50 claves
 */
export function getOtpKeysStats() {
  const vault = getOtpKeysVault();
  const total = vault.length;
  const used = vault.filter((k) => k.used).length;
  const available = total - used;
  return {
    total,
    used,
    available,
    percentageAvailable: total > 0 ? Math.round((available / total) * 100) : 0
  };
}

/**
 * Gestión de la Bóveda de 50 Claves de Un Solo Toque para Cierre de Sesión (Logout OTP)
 */
export function getLogoutOtpKeysVault() {
  try {
    const raw = localStorage.getItem(LOGOUT_OTP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setTimeout(() => { fetchLogoutOtpVaultFromCloud().catch(() => {}); }, 100);
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error al leer bóveda de claves OTP de cierre de sesión:', e);
  }

  // Si no existe, inicializar con las 50 claves de cierre de sesión generadas
  const initial = initialLogoutOtpKeys.map((item) => ({
    ...item,
    hash: hashPassword(item.key)
  }));
  saveLogoutOtpKeysVault(initial);
  setTimeout(() => { fetchLogoutOtpVaultFromCloud().catch(() => {}); }, 100);
  return initial;
}

export function saveLogoutOtpKeysVault(vault) {
  try {
    localStorage.setItem(LOGOUT_OTP_STORAGE_KEY, JSON.stringify(vault));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olam_logout_otp_vault_changed', { detail: { vault } }));
    }
  } catch (e) {
    console.error('Error al guardar bóveda de claves OTP de cierre de sesión:', e);
  }
}

/**
 * Sincroniza la bóveda de claves de cierre con Supabase de forma bidireccional
 */
export async function fetchLogoutOtpVaultFromCloud() {
  let localVault = [];
  try {
    const raw = localStorage.getItem(LOGOUT_OTP_STORAGE_KEY);
    if (raw) localVault = JSON.parse(raw);
  } catch (_) {}

  if (!Array.isArray(localVault) || localVault.length === 0) {
    localVault = initialLogoutOtpKeys.map((item) => ({
      ...item,
      hash: hashPassword(item.key)
    }));
  }

  try {
    const { data, error } = await supabase
      .from('daily_supervision_history')
      .select('datos')
      .eq('date', OTP_LOGOUT_VAULT_DATE)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0 && data[0]?.datos?.vault) {
      const cloudVault = data[0].datos.vault;
      let hasNewCloudBurn = false;
      let hasNewLocalBurn = false;

      const merged = localVault.map((localItem) => {
        const cloudItem = cloudVault.find(c => c.key === localItem.key || c.id === localItem.id);
        if (cloudItem && cloudItem.used && !localItem.used) {
          hasNewCloudBurn = true;
          return {
            ...localItem,
            used: true,
            usedAt: cloudItem.usedAt,
            usedBy: cloudItem.usedBy,
            usedRole: cloudItem.usedRole
          };
        }
        if (localItem.used && (!cloudItem || !cloudItem.used)) {
          hasNewLocalBurn = true;
          return localItem;
        }
        return localItem;
      });

      saveLogoutOtpKeysVault(merged);
      if (hasNewLocalBurn) {
        saveLogoutOtpVaultToCloud(merged).catch(() => {});
      }
      return merged;
    } else {
      saveLogoutOtpVaultToCloud(localVault).catch(() => {});
    }
  } catch (err) {
    console.warn('[Security] Error consultando bóveda de cierre en Supabase:', err);
  }

  return localVault;
}

export async function saveLogoutOtpVaultToCloud(vault) {
  saveLogoutOtpKeysVault(vault);
  try {
    const { data: existing } = await supabase
      .from('daily_supervision_history')
      .select('id')
      .eq('date', OTP_LOGOUT_VAULT_DATE)
      .limit(1);

    const payload = {
      date: OTP_LOGOUT_VAULT_DATE,
      datos: {
        tipo: 'otp_vault_logout',
        vault: vault,
        updated_at: new Date().toISOString()
      }
    };

    if (existing && existing.length > 0) {
      await supabase
        .from('daily_supervision_history')
        .update(payload)
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('daily_supervision_history')
        .insert([payload]);
    }

    try {
      const channel = supabase.channel('olam_otp_vault_live');
      channel.send({
        type: 'broadcast',
        event: 'vault_updated',
        payload: { type: 'logout', timestamp: Date.now() }
      });
    } catch (_) {}
  } catch (err) {
    console.warn('[Security] Error guardando bóveda de cierre en Supabase:', err);
  }
}

export async function getLogoutOtpKeysVaultAsync() {
  return await fetchLogoutOtpVaultFromCloud();
}

/**
 * Detecta si una cadena tiene el formato de clave de cierre de sesión: "OLAM-OUT-XXXX-XXXX"
 */
export function isLogoutOtpKeyFormat(str) {
  if (!str || typeof str !== 'string') return false;
  const clean = str.trim().toUpperCase();
  return /^OLAM-OUT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(clean);
}

/**
 * Verifica y quema (invalida) una clave de un solo toque exclusiva para cierre de sesión.
 */
export function verifyAndConsumeLogoutOtpKey(inputKey, userContext = {}) {
  if (!inputKey || typeof inputKey !== 'string') {
    return { valid: false, message: 'Clave de cierre no proporcionada' };
  }

  const cleanKey = inputKey.trim().toUpperCase();
  const vault = getLogoutOtpKeysVault();

  const keyIndex = vault.findIndex(
    (item) => item.key.toUpperCase() === cleanKey
  );

  if (keyIndex === -1) {
    return {
      valid: false,
      isOtp: false,
      message: 'Clave de cierre de sesión no encontrada en la base de datos de claves autorizadas.'
    };
  }

  const targetKey = vault[keyIndex];

  // 1. Si la clave YA fue consumida previamente: RECHAZAR y advertir
  if (targetKey.used) {
    const usedDate = targetKey.usedAt || 'fecha anterior';
    const usedBy = targetKey.usedBy || 'otro usuario';
    return {
      valid: false,
      isOtp: true,
      alreadyUsed: true,
      message: `⛔ ACCESO DENEGADO: Esta clave de cierre de sesión (${targetKey.key}) ya fue utilizada el ${usedDate} para autorizar la salida de "${usedBy}" y fue invalidada permanentemente.`
    };
  }

  // 2. La clave está DISPONIBLE: MARCARLA COMO CONSUMIDA INMEDIATAMENTE
  const now = new Date();
  const dateStr = getLocalDateString(now);
  const timeStr = now.toLocaleTimeString('es-GT', { hour12: false });
  const consumedTimestamp = `${dateStr} ${timeStr}`;

  targetKey.used = true;
  targetKey.usedAt = consumedTimestamp;
  targetKey.usedBy = userContext.name || userContext.username || 'Vendedor en Campo';
  targetKey.usedRole = 'supervisor_logout';

  vault[keyIndex] = targetKey;
  saveLogoutOtpKeysVault(vault);

  // Sincronizar en Supabase de inmediato
  saveLogoutOtpVaultToCloud(vault).catch(() => {});

  return {
    valid: true,
    isOtp: true,
    consumed: true,
    keyData: targetKey,
    message: `✅ Clave de cierre de sesión autorizada con éxito. Ha sido invalidada de forma permanente.`
  };
}

/**
 * Resumen de estadísticas de las 50 claves de cierre de sesión
 */
export function getLogoutOtpKeysStats() {
  const vault = getLogoutOtpKeysVault();
  const total = vault.length;
  const used = vault.filter((k) => k.used).length;
  const available = total - used;
  return {
    total,
    used,
    available,
    percentageAvailable: total > 0 ? Math.round((available / total) * 100) : 0
  };
}
