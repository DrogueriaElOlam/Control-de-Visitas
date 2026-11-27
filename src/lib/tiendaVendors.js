import { supabase } from './supabase';
import { DEFAULT_VENDORS, normalizeVendorName } from './db';
import { isSuperUser, normalizeText } from './formsPermissions';

const STORAGE_KEY_PHONES = 'olam_tienda_vendor_phones_v1';
const STORAGE_KEY_SHARE_BASE = 'olam_tienda_share_base_v1';
const STORAGE_KEY_SHARE_LABS_PREF = 'olam_tienda_share_labs_pref_v1';
const STORAGE_KEY_VISIBILITY_CONFIG = 'olam_tienda_visibility_config_v1';
const STORAGE_KEY_TELEMARKETING = 'olam_tienda_telemarketing_v1';
const CLOUD_PHONES_DATE_KEY = '2099-12-22';
const CLOUD_VISIBILITY_DATE_KEY = '2099-12-21';
const CLOUD_VISIBILITY_VENDOR_KEY = 'TIENDA_VISIBILITY_CONFIG';
const CLOUD_TELEMARKETING_DATE_KEY = '2099-12-20';
const CLOUD_TELEMARKETING_VENDOR_KEY = 'TIENDA_TELEMARKETING_VAULT';

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

export function getSavedShareFilterPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHARE_LABS_PREF);
    if (!raw) return { excludedIds: [], hideZeroPrice: false };
    const parsed = JSON.parse(raw);
    return {
      excludedIds: Array.isArray(parsed?.excludedIds) ? parsed.excludedIds.map((x) => String(x)) : [],
      hideZeroPrice: Boolean(parsed?.hideZeroPrice)
    };
  } catch (_) {
    return { excludedIds: [], hideZeroPrice: false };
  }
}

export function saveShareFilterPrefs({ excludedIds = [], hideZeroPrice = false } = {}) {
  try {
    const clean = {
      excludedIds: Array.from(new Set((excludedIds || []).map((x) => String(x)).filter(Boolean))),
      hideZeroPrice: Boolean(hideZeroPrice)
    };
    localStorage.setItem(STORAGE_KEY_SHARE_LABS_PREF, JSON.stringify(clean));
    return clean;
  } catch (_) {
    return { excludedIds: [], hideZeroPrice: false };
  }
}

function normalizePriceMode(val) {
  if (val === 'show' || val === 'hide' || val === 'inherit') return val;
  return 'inherit';
}

function normalizeVisibilityConfig(raw) {
  const globalRaw = raw?.global && typeof raw.global === 'object' ? raw.global : {};
  const perVendorRaw = raw?.perVendor && typeof raw.perVendor === 'object' ? raw.perVendor : {};
  const perVendor = {};

  Object.entries(perVendorRaw).forEach(([k, val]) => {
    const cleanKey = normalizeText(k);
    if (!cleanKey || !val || typeof val !== 'object') return;
    perVendor[cleanKey] = {
      useCustom: Boolean(val.useCustom),
      excludedIds: Array.from(new Set((Array.isArray(val.excludedIds) ? val.excludedIds : []).map((x) => String(x)).filter(Boolean))),
      hideZeroPrice: Boolean(val.hideZeroPrice),
      hideDisponibleCodes: Boolean(val.hideDisponibleCodes),
      priceMode: normalizePriceMode(val.priceMode)
    };
  });

  return {
    tipo: 'tienda_visibility_config',
    global: {
      excludedIds: Array.from(new Set((Array.isArray(globalRaw.excludedIds) ? globalRaw.excludedIds : []).map((x) => String(x)).filter(Boolean))),
      hideZeroPrice: Boolean(globalRaw.hideZeroPrice),
      hideDisponibleCodes: Boolean(globalRaw.hideDisponibleCodes),
      hidePrices: Boolean(globalRaw.hidePrices)
    },
    perVendor,
    updatedAt: raw?.updatedAt || ''
  };
}

export function getStoredVisibilityConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISIBILITY_CONFIG);
    if (!raw) return normalizeVisibilityConfig({});
    return normalizeVisibilityConfig(JSON.parse(raw));
  } catch (_) {
    return normalizeVisibilityConfig({});
  }
}

export function resolveVisibilityForVendor(config, vendorNameOrTarget = '') {
  const normalized = normalizeVisibilityConfig(config || {});
  let lookupKeys = [];
  if (vendorNameOrTarget && typeof vendorNameOrTarget === 'object') {
    const idKey = vendorNameOrTarget.id ? normalizeText(String(vendorNameOrTarget.id)) : '';
    const nameKey = vendorNameOrTarget.name ? getCanonicalPhoneKey(vendorNameOrTarget.name) : '';
    if (idKey) lookupKeys.push(idKey);
    if (nameKey && nameKey !== idKey) lookupKeys.push(nameKey);
  } else {
    const rawStr = String(vendorNameOrTarget || '').trim();
    if (rawStr.startsWith('tm:')) {
      lookupKeys.push(normalizeText(rawStr.slice(3)));
    } else if (rawStr) {
      const k = getCanonicalPhoneKey(rawStr);
      if (k) lookupKeys.push(k);
    }
  }

  let vendorEntry = null;
  for (const k of lookupKeys) {
    if (k && normalized.perVendor[k]) {
      vendorEntry = normalized.perVendor[k];
      break;
    }
  }

  const priceMode = vendorEntry ? normalizePriceMode(vendorEntry.priceMode) : 'inherit';
  const hidePrices = priceMode === 'hide'
    ? true
    : (priceMode === 'show' ? false : Boolean(normalized.global.hidePrices));

  if (vendorEntry && vendorEntry.useCustom) {
    return {
      excludedIds: vendorEntry.excludedIds,
      hideZeroPrice: vendorEntry.hideZeroPrice,
      hideDisponibleCodes: vendorEntry.hideDisponibleCodes,
      hidePrices,
      priceMode,
      isCustom: true
    };
  }
  return {
    excludedIds: normalized.global.excludedIds,
    hideZeroPrice: normalized.global.hideZeroPrice,
    hideDisponibleCodes: normalized.global.hideDisponibleCodes,
    hidePrices,
    priceMode,
    isCustom: false
  };
}

export async function syncVisibilityConfigFromCloud() {
  let localCfg = getStoredVisibilityConfig();
  try {
    const { data: rows, error } = await supabase
      .from('daily_supervision_history')
      .select('id, supervision_data')
      .eq('date', CLOUD_VISIBILITY_DATE_KEY)
      .eq('vendor_name', CLOUD_VISIBILITY_VENDOR_KEY)
      .order('id', { ascending: false })
      .limit(1);

    if (!error && Array.isArray(rows) && rows.length > 0 && rows[0]?.supervision_data) {
      const cloudCfg = normalizeVisibilityConfig(rows[0].supervision_data);
      localCfg = cloudCfg;
      try {
        localStorage.setItem(STORAGE_KEY_VISIBILITY_CONFIG, JSON.stringify(cloudCfg));
      } catch (_) {}
    }
  } catch (_) {}
  return localCfg;
}

export async function saveVisibilityConfigToCloud(config) {
  const clean = normalizeVisibilityConfig({
    ...config,
    updatedAt: new Date().toISOString()
  });

  try {
    localStorage.setItem(STORAGE_KEY_VISIBILITY_CONFIG, JSON.stringify(clean));
  } catch (_) {}

  const { data: existing, error: selErr } = await supabase
    .from('daily_supervision_history')
    .select('id')
    .eq('date', CLOUD_VISIBILITY_DATE_KEY)
    .eq('vendor_name', CLOUD_VISIBILITY_VENDOR_KEY)
    .order('id', { ascending: false })
    .limit(1);

  if (selErr) {
    throw new Error(`No se pudo consultar la nube: ${selErr.message}`);
  }

  if (Array.isArray(existing) && existing.length > 0 && existing[0]?.id) {
    const { error: updErr } = await supabase
      .from('daily_supervision_history')
      .update({ supervision_data: clean })
      .eq('id', existing[0].id);
    if (updErr) {
      throw new Error(`No se pudo actualizar la configuración en Supabase: ${updErr.message}`);
    }
  } else {
    const { error: insErr } = await supabase
      .from('daily_supervision_history')
      .insert([{
        date: CLOUD_VISIBILITY_DATE_KEY,
        vendor_name: CLOUD_VISIBILITY_VENDOR_KEY,
        supervision_data: clean
      }]);
    if (insErr) {
      throw new Error(`No se pudo guardar la configuración en Supabase: ${insErr.message}`);
    }
  }

  return clean;
}

/* ================= EQUIPO DE TELEMARKETING (INDEPENDIENTE DE VISITAS DE CAMPO) ================= */
function normalizeTelemarketingMember(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const cleanName = String(raw.name || '').trim();
  const id = String(raw.id || '').trim() || `tm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  if (!cleanName) return null;
  return {
    id,
    name: cleanName,
    phone: sanitizeWhatsAppPhone(raw.phone || ''),
    roleLabel: 'Ejecutiva de Telemarketing',
    type: 'telemarketing',
    active: raw.active !== false,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

export function getStoredTelemarketingTeam() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TELEMARKETING);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTelemarketingMember).filter((m) => m && m.active !== false);
  } catch (_) {
    return [];
  }
}

export async function syncTelemarketingTeamFromCloud() {
  let list = getStoredTelemarketingTeam();
  try {
    const { data: rows, error } = await supabase
      .from('daily_supervision_history')
      .select('id, supervision_data')
      .eq('date', CLOUD_TELEMARKETING_DATE_KEY)
      .eq('vendor_name', CLOUD_TELEMARKETING_VENDOR_KEY)
      .order('id', { ascending: false })
      .limit(1);

    if (!error && Array.isArray(rows) && rows.length > 0 && rows[0]?.supervision_data) {
      const membersRaw = Array.isArray(rows[0].supervision_data.members)
        ? rows[0].supervision_data.members
        : [];
      list = membersRaw.map(normalizeTelemarketingMember).filter((m) => m && m.active !== false);
      try {
        localStorage.setItem(STORAGE_KEY_TELEMARKETING, JSON.stringify(list));
      } catch (_) {}
    }
  } catch (_) {}
  return list;
}

export async function saveTelemarketingTeamToCloud(members = []) {
  const seenIds = new Set();
  const cleanList = [];
  (Array.isArray(members) ? members : []).forEach((raw) => {
    const norm = normalizeTelemarketingMember(raw);
    if (!norm || norm.active === false) return;
    if (seenIds.has(norm.id)) return;
    seenIds.add(norm.id);
    cleanList.push(norm);
  });

  try {
    localStorage.setItem(STORAGE_KEY_TELEMARKETING, JSON.stringify(cleanList));
  } catch (_) {}

  const payload = {
    tipo: 'tienda_telemarketing_team',
    members: cleanList,
    updatedAt: new Date().toISOString()
  };

  const { data: existing, error: selErr } = await supabase
    .from('daily_supervision_history')
    .select('id')
    .eq('date', CLOUD_TELEMARKETING_DATE_KEY)
    .eq('vendor_name', CLOUD_TELEMARKETING_VENDOR_KEY)
    .order('id', { ascending: false })
    .limit(1);

  if (selErr) {
    throw new Error(`No se pudo consultar la lista de Telemarketing en Supabase: ${selErr.message}`);
  }

  if (Array.isArray(existing) && existing.length > 0 && existing[0]?.id) {
    const { error: updErr } = await supabase
      .from('daily_supervision_history')
      .update({ supervision_data: payload })
      .eq('id', existing[0].id);
    if (updErr) {
      throw new Error(`No se pudo actualizar Telemarketing en Supabase: ${updErr.message}`);
    }
  } else {
    const { error: insErr } = await supabase
      .from('daily_supervision_history')
      .insert([{
        date: CLOUD_TELEMARKETING_DATE_KEY,
        vendor_name: CLOUD_TELEMARKETING_VENDOR_KEY,
        supervision_data: payload
      }]);
    if (insErr) {
      throw new Error(`No se pudo guardar Telemarketing en Supabase: ${insErr.message}`);
    }
  }

  return cleanList;
}

/**
 * Genera el enlace público para compartir con clientes.
 * IMPORTANTE: Jamás incluye permisos de administrador.
 * Al abrir este enlace, el botón "Administrar" permanece completamente oculto.
 * Soporta tanto vendedores de ruta (?vn=...&vp=...) como equipo de Telemarketing con ID inmutable (?tm=...),
 * permitiendo reasignar nombre y teléfono en Supabase sin romper los enlaces compartidos.
 */
export function buildPublicCatalogUrl({
  tmId = '',
  vendorName = '',
  vendorPhone = '',
  allLabIds = [],
  excludedLabIds = [],
  hideZeroPrice = false,
  hideDisponibleCodes = false,
  hidePrices = false
} = {}) {
  const base = getCatalogBaseUrl();
  const sep = base.includes('?') ? '&' : '?';
  const cleanTmId = String(tmId || '').trim();
  const cleanName = normalizeVendorName(vendorName || '');
  const cleanPhone = sanitizeWhatsAppPhone(vendorPhone);
  const parts = [];

  if (cleanTmId) {
    // ID estable de cartera de Telemarketing: permite cambiar el nombre de la Ejecutiva o su número en Supabase sin invalidar links previos
    parts.push(`tm=${encodeURIComponent(cleanTmId)}`);
  } else if (cleanName && cleanPhone) {
    parts.push(`vn=${encodeURIComponent(cleanName)}`);
    parts.push(`vp=${encodeURIComponent(cleanPhone)}`);
  }
  parts.push('cliente=1');

  const allIds = Array.isArray(allLabIds) ? allLabIds.map((id) => String(id)).filter(Boolean) : [];
  const exSet = new Set((Array.isArray(excludedLabIds) ? excludedLabIds : []).map((id) => String(id)).filter(Boolean));
  if (allIds.length > 0 && exSet.size > 0) {
    const includedIds = allIds.filter((id) => !exSet.has(id));
    if (includedIds.length > 0 && includedIds.length < allIds.length) {
      if (includedIds.length <= allIds.length / 2) {
        parts.push(`in=${encodeURIComponent(includedIds.join(','))}`);
      } else {
        const excludedValid = allIds.filter((id) => exSet.has(id));
        if (excludedValid.length > 0) {
          parts.push(`ex=${encodeURIComponent(excludedValid.join(','))}`);
        }
      }
    }
  } else if (allIds.length === 0 && exSet.size > 0) {
    parts.push(`ex=${encodeURIComponent(Array.from(exSet).join(','))}`);
  }

  if (hideZeroPrice) {
    parts.push('nz=1');
  }

  if (hideDisponibleCodes) {
    parts.push('nd=1');
  }

  if (hidePrices) {
    parts.push('np=1');
  }

  return `${base}${sep}${parts.join('&')}`;
}

export function buildAllVendorsPayload(vendorsList = [], telemarketingList = []) {
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
      phone: phone || '',
      type: 'vendor',
      roleLabel: 'Ejecutivo de ventas'
    });
  });

  (Array.isArray(telemarketingList) ? telemarketingList : []).forEach((rawTm) => {
    const tm = normalizeTelemarketingMember(rawTm);
    if (!tm || tm.active === false) return;
    result.push({
      id: tm.id,
      tmId: tm.id,
      name: tm.name,
      route: 'Telemarketing',
      phone: tm.phone || '',
      type: 'telemarketing',
      roleLabel: 'Ejecutiva de Telemarketing'
    });
  });

  return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function buildVendorSellersPayload(vendorsList = [], telemarketingList = []) {
  return buildAllVendorsPayload(vendorsList, telemarketingList).filter((v) => Boolean(v.phone));
}
