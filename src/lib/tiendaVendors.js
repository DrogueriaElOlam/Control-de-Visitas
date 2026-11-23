import { supabase } from './supabase';
import { DEFAULT_VENDORS, normalizeVendorName } from './db';
import { isSuperUser, normalizeText } from './formsPermissions';

const STORAGE_KEY_PHONES = 'olam_tienda_vendor_phones_v1';
const STORAGE_KEY_SHARE_BASE = 'olam_tienda_share_base_v1';
const CLOUD_PHONES_DATE_KEY = '2099-12-22';

/**
 * Regla estricta de acceso al botón "Administrar" de la Tienda Virtual:
 * Únicamente el Administrador (role === 'admin') y el Supervisor / Super Usuario (Antonio Celada).
 * Ningún vendedor regular ni cliente externo con enlace compartido puede verlo.
 */
export function canAccessCatalogAdmin(currentUser) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin' || currentUser.role === 'supervisor') return true;
  if (isSuperUser(currentUser)) return true;
  const norm = normalizeText(currentUser.name);
  return norm.includes('antonio celada') || norm.includes('administrador');
}

export function getCanonicalPhoneKey(vendorName) {
  const canonical = normalizeVendorName(vendorName || '');
  return normalizeText(canonical);
}

export function sanitizeWhatsAppPhone(raw) {
  return String(raw || '').replace(/[^\d]/g, '');
}

export function getStoredVendorPhones() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHONES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function getVendorWhatsAppPhone(vendorName, vendorsList = []) {
  const key = getCanonicalPhoneKey(vendorName);
  if (!key) return '';

  const stored = getStoredVendorPhones();
  if (stored[key]) return stored[key];

  // Fallback: revisar si el objeto del vendedor en vendorsList ya trae phone
  if (Array.isArray(vendorsList)) {
    const match = vendorsList.find((v) => getCanonicalPhoneKey(v?.name) === key);
    if (match?.phone) {
      return sanitizeWhatsAppPhone(match.phone);
    }
  }
  return '';
}

async function persistPhonesMapToCloudVault(phonesMap) {
  try {
    const { data: existing } = await supabase
      .from('daily_supervision_history')
      .select('id')
      .eq('date', CLOUD_PHONES_DATE_KEY)
      .eq('vendor_name', 'TIENDA_PHONES_VAULT')
      .limit(1);

    const payload = {
      tipo: 'tienda_vendor_phones',
      phones: phonesMap,
      updatedAt: new Date().toISOString()
    };

    if (Array.isArray(existing) && existing.length > 0 && existing[0]?.id) {
      await supabase
        .from('daily_supervision_history')
        .update({ supervision_data: payload })
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('daily_supervision_history')
        .insert([{ date: CLOUD_PHONES_DATE_KEY, vendor_name: 'TIENDA_PHONES_VAULT', supervision_data: payload }]);
    }
  } catch (_) {
    // Fallback silencioso
  }
}

export async function saveVendorWhatsAppPhone(vendorName, rawPhone, vendorsList = []) {
  const canonicalName = normalizeVendorName(vendorName || '');
  const key = getCanonicalPhoneKey(canonicalName);
  const cleanPhone = sanitizeWhatsAppPhone(rawPhone);
  if (!key) throw new Error('Nombre de vendedor no válido.');
  if (cleanPhone && cleanPhone.length < 8) {
    throw new Error('Ingresa un número de WhatsApp válido con código de país (ej. 50255551234).');
  }

  const stored = getStoredVendorPhones();
  if (cleanPhone) {
    stored[key] = cleanPhone;
  } else {
    delete stored[key];
  }
  localStorage.setItem(STORAGE_KEY_PHONES, JSON.stringify(stored));

  // Sincronizar en paralelo en tabla vendors (si tiene columna phone) y en bóveda espejo de Supabase
  try {
    const match = Array.isArray(vendorsList)
      ? vendorsList.find((v) => getCanonicalPhoneKey(v?.name) === key)
      : null;
    if (match?.id) {
      await supabase.from('vendors').update({ phone: cleanPhone || null }).eq('id', match.id);
    }
  } catch (_) {}

  await persistPhonesMapToCloudVault(stored);

  return cleanPhone;
}

export async function saveBatchVendorWhatsAppPhones(entries = [], vendorsList = []) {
  if (!Array.isArray(entries)) return getStoredVendorPhones();
  const stored = getStoredVendorPhones();
  const updatesForTable = [];

  entries.forEach((entry) => {
    const canonicalName = normalizeVendorName(entry?.name || '');
    const key = getCanonicalPhoneKey(canonicalName);
    if (!key) return;
    const cleanPhone = sanitizeWhatsAppPhone(entry?.phone || '');
    if (cleanPhone && cleanPhone.length >= 8) {
      stored[key] = cleanPhone;
    } else if (!cleanPhone) {
      delete stored[key];
    }
    const match = Array.isArray(vendorsList)
      ? vendorsList.find((v) => getCanonicalPhoneKey(v?.name) === key)
      : null;
    if (match?.id) {
      updatesForTable.push({ id: match.id, phone: cleanPhone || null });
    }
  });

  localStorage.setItem(STORAGE_KEY_PHONES, JSON.stringify(stored));

  if (updatesForTable.length > 0) {
    await Promise.all(
      updatesForTable.map(async (u) => {
        try {
          await supabase.from('vendors').update({ phone: u.phone }).eq('id', u.id);
        } catch (_) {}
      })
    );
  }

  await persistPhonesMapToCloudVault(stored);
  return stored;
}

export async function syncVendorPhonesFromCloud(vendorsList = []) {
  const stored = getStoredVendorPhones();
  let changed = false;

  if (Array.isArray(vendorsList)) {
    vendorsList.forEach((v) => {
      if (v?.name && v?.phone) {
        const key = getCanonicalPhoneKey(v.name);
        const clean = sanitizeWhatsAppPhone(v.phone);
        if (key && clean && !stored[key]) {
          stored[key] = clean;
          changed = true;
        }
      }
    });
  }

  try {
    const { data, error } = await supabase.from('vendors').select('id, name, phone');
    if (!error && Array.isArray(data)) {
      data.forEach((row) => {
        if (row?.name && row?.phone) {
          const key = getCanonicalPhoneKey(row.name);
          const clean = sanitizeWhatsAppPhone(row.phone);
          if (key && clean) {
            stored[key] = clean;
            changed = true;
          }
        }
      });
    }
  } catch (_) {}

  try {
    const { data: vaultRows } = await supabase
      .from('daily_supervision_history')
      .select('supervision_data')
      .eq('date', CLOUD_PHONES_DATE_KEY)
      .eq('vendor_name', 'TIENDA_PHONES_VAULT')
      .limit(1);

    const cloudPhones = vaultRows?.[0]?.supervision_data?.phones;
    if (cloudPhones && typeof cloudPhones === 'object') {
      Object.entries(cloudPhones).forEach(([k, val]) => {
        const clean = sanitizeWhatsAppPhone(val);
        if (k && clean && stored[k] !== clean) {
          stored[k] = clean;
          changed = true;
        }
      });
    }
  } catch (_) {}

  if (changed) {
    try {
      localStorage.setItem(STORAGE_KEY_PHONES, JSON.stringify(stored));
    } catch (_) {}
  }

  return stored;
}

export function getSavedShareBaseUrl() {
  try {
    return localStorage.getItem(STORAGE_KEY_SHARE_BASE) || '';
  } catch (_) {
    return '';
  }
}

export function saveShareBaseUrl(url) {
  try {
    const clean = String(url || '').trim().replace(/\/+$/, '');
    if (clean) localStorage.setItem(STORAGE_KEY_SHARE_BASE, clean);
    else localStorage.removeItem(STORAGE_KEY_SHARE_BASE);
  } catch (_) {}
}

export function getCatalogBaseUrl() {
  const custom = getSavedShareBaseUrl();
  if (custom) {
    return custom.endsWith('.html') ? custom : `${custom}/tienda/index.html`;
  }
  return `${window.location.origin}/tienda/index.html`;
}

/**
 * Genera el enlace público para compartir con clientes.
 * IMPORTANTE: Jamás incluye permisos de administrador.
 * Al abrir este enlace, el botón "Administrar" permanece completamente oculto.
 */
export function buildPublicCatalogUrl({ vendorName = '', vendorPhone = '' } = {}) {
  const base = getCatalogBaseUrl();
  const sep = base.includes('?') ? '&' : '?';
  const cleanName = normalizeVendorName(vendorName || '');
  const cleanPhone = sanitizeWhatsAppPhone(vendorPhone);

  if (cleanName && cleanPhone) {
    return `${base}${sep}vn=${encodeURIComponent(cleanName)}&vp=${encodeURIComponent(cleanPhone)}&cliente=1`;
  }
  return `${base}${sep}cliente=1`;
}

export function buildAllVendorsPayload(vendorsList = []) {
  const stored = getStoredVendorPhones();
  const baseList = Array.isArray(vendorsList) && vendorsList.length > 0 ? vendorsList : DEFAULT_VENDORS;
  const seen = new Set();
  const result = [];

  baseList.forEach((v) => {
    if (!v?.name || v.active === false) return;
    const canonical = normalizeVendorName(v.name);
    const key = getCanonicalPhoneKey(canonical);
    if (!key || seen.has(key)) return;
    seen.add(key);

    const phone = stored[key] || sanitizeWhatsAppPhone(v.phone || '');
    const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `vendedor-${result.length + 1}`;
    result.push({
      id: slug,
      name: canonical,
      route: v.route || '',
      phone: phone || ''
    });
  });

  return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function buildVendorSellersPayload(vendorsList = []) {
  return buildAllVendorsPayload(vendorsList).filter((v) => Boolean(v.phone));
}
