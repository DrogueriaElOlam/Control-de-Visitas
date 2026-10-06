import { supabase } from './supabase.js';
import { getLocalDateString, getLocalYesterdayString, getLocalStartOfMonthString } from './dateUtils.js';
import { 
  hashPassword, 
  verifyPassword, 
  getOtpKeysVault, 
  saveOtpKeysVault, 
  verifyAndConsumeOtpKey, 
  isOtpKeyFormat, 
  getOtpKeysStats,
  DEFAULT_VENDOR_HASH
} from './security.js';

export { 
  getLocalDateString, 
  getLocalYesterdayString, 
  getLocalStartOfMonthString,
  hashPassword,
  verifyPassword,
  getOtpKeysVault,
  saveOtpKeysVault,
  verifyAndConsumeOtpKey,
  isOtpKeyFormat,
  getOtpKeysStats
};

const STORAGE_KEYS = {
  VENDORS: 'olam_vendors_db_v3',
  VISITS: 'olam_visits_db_v2',
  AUTH: 'olam_current_auth_v2',
  VENDOR_CREDS: 'olam_vendor_credentials_v3',
  ADMIN_PASS: 'olam_admin_password_v2',
  CONFIG_UUID: 'a0000000-0000-0000-0000-000000000001',
  PENDING_SYNC: 'olam_pending_sync_visits_v2',
  LAST_SYNC: 'olam_last_successful_sync_v2'
};

// Initial default Droguería El Olam vendors
const DEFAULT_VENDORS = [
  { id: 1, name: 'Antonio Celada', route: 'Quetzaltenango #11', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 2, name: 'Ana Lucia Marroquin', route: 'Salama #14', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 3, name: 'Jessica Noriega', route: 'Suchi I #21', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 4, name: 'Wally Natareno', route: 'Sacatepéquez #31', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 5, name: 'Erick Curley', route: 'Jutiapa I #41', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 6, name: 'Estuardo Cordova', route: 'San Marcos Montaña Alta #51', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 7, name: 'Karina Pineda', route: 'Chiquimula I #61', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 8, name: 'Dany Perez', route: 'Huehuetenango Montaña Baja I #71', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 9, name: 'Klissman Hernandez', route: 'Polochic #81', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 10, name: 'Elio Caceros', route: 'Petapa #91', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 11, name: 'Josue Aguilar', route: 'Escuintla I #A1', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 12, name: 'Elias Quiej', route: 'Peten III #B1', active: true, hire_date: '2025-12-05', daily_goal: 15 }
];

export const ALL_ROUTES = [
  'Coban #13',
  'Salama #14',
  'Municipios Oriente #15',
  'Quetzaltenango #11',
  'Totonicapan #12',
  'Retalhuleu #22',
  'Suchi II #23',
  'Coatepeque #24',
  'Suchi III #25',
  'Suchi I #21',
  'Sacatepéquez #31',
  'Quiche Centro #32',
  'Quiche Montaña Baja #33',
  'Izabal I #34',
  'Izabal II #35',
  'Chimaltenango I #43',
  'Chimaltenango II #44',
  'Santa Rosa #45',
  'Jutiapa I #41',
  'Jutiapa II #42',
  'Quiche Montaña Alta #55',
  'San Marcos Montaña Alta #51',
  'Solola I #52',
  'Solola II #53',
  'Nebaj #54',
  'Capital S1 #64',
  'Capital S2 #65',
  'Chiquimula I #61',
  'Chiquimula II #63',
  'Jalapa #62',
  'Huehuetenango Montaña Baja I #71',
  'Huehuetenango Montaña Baja II #72',
  'Peten I #73',
  'Peten II #74',
  'Huehuetenango Montaña Alta I #83',
  'Huehuetenango Montaña Alta II #84',
  'Polochic #81',
  'Zacapa #82',
  'Capital S3 #94',
  'Ixcán #95',
  'Petapa #91',
  'San Marcos I #92',
  'San Marcos II #93',
  'Municipios Norte #A5',
  'Escuintla I #A1',
  'Escuintla II #A2',
  'Villa Nueva #A3',
  'Huehuetango Centro #A4',
  'Peten III #B1',
  'Peten IV #B2',
  'Transversal I #B3',
  'Transversal II #B4',
  'Amatitlán #B5',
  'Oficina'
];

// Specific assigned routes per vendor (all vendors include 'Oficina')
export const VENDOR_ASSIGNED_ROUTES = {
  'Ana Lucia Marroquin': [
    'Salama #14',
    'Quetzaltenango #11',
    'Municipios Oriente #15',
    'Coban #13',
    'Totonicapan #12',
    'Oficina'
  ],
  'Jessica Noriega': [
    'Suchi I #21',
    'Retalhuleu #22',
    'Suchi II #23',
    'Coatepeque #24',
    'Suchi III #25',
    'Oficina'
  ],
  'Wally Natareno': [
    'Sacatepéquez #31',
    'Quiche Centro #32',
    'Quiche Montaña Baja #33',
    'Izabal I #34',
    'Izabal II #35',
    'Oficina'
  ],
  'Erick Curley': [
    'Jutiapa I #41',
    'Jutiapa II #42',
    'Chimaltenango I #43',
    'Chimaltenango II #44',
    'Santa Rosa #45',
    'Oficina'
  ],
  'Estuardo Cordova': [
    'San Marcos Montaña Alta #51',
    'Solola I #52',
    'Solola II #53',
    'Nebaj #54',
    'Quiche Montaña Alta #55',
    'Oficina'
  ],
  'Karina Pineda': [
    'Chiquimula I #61',
    'Jalapa #62',
    'Chiquimula II #63',
    'Capital S1 #64',
    'Capital S2 #65',
    'Oficina'
  ],
  'Dany Perez': [
    'Huehuetenango Montaña Baja I #71',
    'Huehuetenango Montaña Baja II #72',
    'Peten I #73',
    'Peten II #74',
    'Oficina'
  ],
  'Dany Peres': [
    'Huehuetenango Montaña Baja I #71',
    'Huehuetenango Montaña Baja II #72',
    'Peten I #73',
    'Peten II #74',
    'Oficina'
  ],
  'Danny Perez': [
    'Huehuetenango Montaña Baja I #71',
    'Huehuetenango Montaña Baja II #72',
    'Peten I #73',
    'Peten II #74',
    'Oficina'
  ],
  'Klissman Hernandez': [
    'Polochic #81',
    'Zacapa #82',
    'Huehuetenango Montaña Alta I #83',
    'Huehuetenango Montaña Alta II #84',
    'Oficina'
  ],
  'Elio Caceros': [
    'Petapa #91',
    'San Marcos I #92',
    'San Marcos II #93',
    'Capital S3 #94',
    'Ixcán #95',
    'Oficina'
  ],
  'Josue Aguilar': [
    'Escuintla I #A1',
    'Escuintla II #A2',
    'Villa Nueva #A3',
    'Huehuetenango Centro #A4',
    'Municipios Norte #A5',
    'Oficina'
  ],
  'Elias Quiej': [
    'Peten III #B1',
    'Peten IV #B2',
    'Transversal I #B3',
    'Transversal II #B4',
    'Amatitlán #B5',
    'Oficina'
  ],
  'Antonio Celada': ALL_ROUTES
};

export function getRoutesForVendor(vendorName) {
  if (!vendorName) return ALL_ROUTES;
  const normalized = vendorName.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (normalized.includes('antonio') && normalized.includes('celada')) {
    return ALL_ROUTES;
  }

  for (const [key, routes] of Object.entries(VENDOR_ASSIGNED_ROUTES)) {
    const normKey = key.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normKey === normalized || normalized.includes(normKey) || normKey.includes(normalized)) {
      return Array.from(new Set([...routes, 'Oficina']));
    }
  }

  return Array.from(new Set([...ALL_ROUTES, 'Oficina']));
}

// Helper to normalize usernames
function generateUsername(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);
}

// Initialize and sync vendors
export async function getVendorsList() {
  let local = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VENDORS);
    if (raw) local = JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local vendors:', e);
  }

  // Try fetching from Supabase
  try {
    const { data, error } = await supabase.from('vendors').select('*').order('id', { ascending: true });
    if (!error && data && data.length > 0) {
      // Merge with credentials & route information stored locally or in cloud
      const creds = getStoredCredentials();
      const merged = data.map((v) => {
        const c = creds[v.id] || {};
        const localMatch = local.find((l) => l.name === v.name || (l.id === v.id && l.name === v.name));
        return {
          id: v.id,
          name: v.name,
          active: v.active !== false,
          created_at: v.created_at || v.hire_date || '2025-12-05',
          hire_date: c.hire_date || localMatch?.hire_date || (v.created_at ? v.created_at.split('T')[0] : '2025-12-05'),
          termination_date: c.termination_date || localMatch?.termination_date || null,
          route: c.route || localMatch?.route || DEFAULT_VENDORS.find((d) => d.name === v.name)?.route || 'Ruta General',
          daily_goal: c.daily_goal || localMatch?.daily_goal || 15,
          username: c.username || generateUsername(v.name),
          password: c.password ? (c.password.length === 64 ? c.password : hashPassword(c.password)) : DEFAULT_VENDOR_HASH,
          phone: c.phone || localMatch?.phone || ''
        };
      });
      localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Supabase fetch vendors offline/fallback:', err);
  }

  if (local.length === 0) {
    // Initialize default vendors with hashed credentials
    const initialized = DEFAULT_VENDORS.map((v) => ({
      ...v,
      username: generateUsername(v.name),
      password: DEFAULT_VENDOR_HASH
    }));
    localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(initialized));
    return initialized;
  }

  return local;
}

// Credentials storage helper
export function getStoredCredentials() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VENDOR_CREDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredCredentials(creds) {
  localStorage.setItem(STORAGE_KEYS.VENDOR_CREDS, JSON.stringify(creds));
}

// Admin Password management (Secure Hash)
const DEFAULT_ADMIN_HASH = '26b8337cde31e62b0dd382969c9eeb27d1f5d79a88cc0cd37c07ac7ef5b62054';

export function getAdminPassword() {
  const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_PASS);
  return saved || DEFAULT_ADMIN_HASH;
}

export function setAdminPassword(newPass) {
  const hashed = newPass.length === 64 ? newPass : hashPassword(newPass);
  localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, hashed);
}

// Create new vendor
export async function createVendor({ name, username, password, route, daily_goal, phone, hire_date }) {
  const vendors = await getVendorsList();
  const newId = Date.now();
  const hireDateFormatted = hire_date || getLocalDateString();

  // Try creating in Supabase
  let createdSupabaseId = null;
  try {
    const { data, error } = await supabase
      .from('vendors')
      .insert([{ name, active: true }])
      .select();
    if (!error && data && data[0]?.id) {
      createdSupabaseId = data[0].id;
    }
  } catch (e) {
    console.warn('Supabase insert vendor fallback:', e);
  }

  const finalId = createdSupabaseId || newId;
  const newVendor = {
    id: finalId,
    name,
    username: username || generateUsername(name),
    password: password ? hashPassword(password) : DEFAULT_VENDOR_HASH,
    route: route || 'Ruta General',
    daily_goal: Number(daily_goal) || 15,
    phone: phone || '',
    active: true,
    hire_date: hireDateFormatted,
    termination_date: null
  };

  const updated = [...vendors.filter((v) => v.id !== finalId), newVendor];
  localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(updated));

  // Save creds
  const creds = getStoredCredentials();
  creds[finalId] = {
    username: newVendor.username,
    password: newVendor.password,
    route: newVendor.route,
    daily_goal: newVendor.daily_goal,
    phone: newVendor.phone,
    hire_date: hireDateFormatted,
    termination_date: null
  };
  saveStoredCredentials(creds);

  return newVendor;
}

// Terminate / Deactivate vendor (Preserves their history for frequency/retention analysis)
export async function terminateVendor(vendorId, terminationDate) {
  const termDate = terminationDate || getLocalDateString();
  const vendors = await getVendorsList();

  const updated = vendors.map((v) => {
    if (v.id === vendorId) {
      return {
        ...v,
        active: false,
        termination_date: termDate
      };
    }
    return v;
  });
  localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(updated));

  const creds = getStoredCredentials();
  if (creds[vendorId]) {
    creds[vendorId].termination_date = termDate;
    creds[vendorId].active = false;
    saveStoredCredentials(creds);
  }

  // Update in Supabase
  try {
    await supabase.from('vendors').update({ active: false }).eq('id', vendorId);
  } catch (e) {
    console.warn('Supabase update active false fallback:', e);
  }

  return updated;
}

// Re-activate vendor
export async function reactivateVendor(vendorId) {
  const vendors = await getVendorsList();
  const updated = vendors.map((v) => {
    if (v.id === vendorId) {
      return {
        ...v,
        active: true,
        termination_date: null
      };
    }
    return v;
  });
  localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(updated));

  const creds = getStoredCredentials();
  if (creds[vendorId]) {
    creds[vendorId].termination_date = null;
    creds[vendorId].active = true;
    saveStoredCredentials(creds);
  }

  try {
    await supabase.from('vendors').update({ active: true }).eq('id', vendorId);
  } catch (e) {
    console.warn('Supabase reactivate fallback:', e);
  }

  return updated;
}

// Hard Delete vendor (Only if requested by admin)
export async function deleteVendorPermanently(vendorId) {
  const vendors = await getVendorsList();
  const updated = vendors.filter((v) => v.id !== vendorId);
  localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(updated));

  const creds = getStoredCredentials();
  delete creds[vendorId];
  saveStoredCredentials(creds);

  try {
    await supabase.from('vendors').delete().eq('id', vendorId);
  } catch (e) {
    console.warn('Supabase delete vendor fallback:', e);
  }

  return updated;
}

// Update vendor password or details (Secure Hash)
export async function updateVendorCredentials(vendorId, { password, route, daily_goal, name }) {
  const vendors = await getVendorsList();
  const hashedPassword = password ? (password.length === 64 ? password : hashPassword(password)) : undefined;

  const updated = vendors.map((v) => {
    if (v.id === vendorId) {
      return {
        ...v,
        name: name !== undefined ? name : v.name,
        password: hashedPassword !== undefined ? hashedPassword : v.password,
        route: route !== undefined ? route : v.route,
        daily_goal: daily_goal !== undefined ? Number(daily_goal) : v.daily_goal
      };
    }
    return v;
  });
  localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(updated));

  const creds = getStoredCredentials();
  creds[vendorId] = {
    ...(creds[vendorId] || {}),
    password: hashedPassword !== undefined ? hashedPassword : creds[vendorId]?.password,
    route,
    daily_goal
  };
  saveStoredCredentials(creds);

  if (name) {
    try {
      await supabase.from('vendors').update({ name }).eq('id', vendorId);
    } catch (e) {
      console.warn('Supabase update name fallback:', e);
    }
  }

  return updated;
}

// VISITS DEDUPLICATION & AUDIT HELPERS
export function deduplicateVisitsList(list) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const result = [];

  for (const item of list) {
    if (!item) continue;

    const existingIndex = result.findIndex(r => {
      // 1. Coincidencia idéntica de ID
      if (r.id != null && item.id != null && String(r.id) === String(item.id)) return true;

      // 2. Coincidencia de cloud_id
      if (item.cloud_id != null) {
        if (String(r.id) === String(item.cloud_id) || String(r.cloud_id) === String(item.cloud_id)) return true;
      }
      if (r.cloud_id != null && String(r.cloud_id) === String(item.id)) return true;

      // 3. Coincidencia semántica: Mismo vendedor + Mismo cliente + Misma fecha de visita
      const rVendor = (r.vendorName || '').trim().toLowerCase();
      const iVendor = (item.vendorName || '').trim().toLowerCase();
      const rClient = (r.clientName || '').trim().toLowerCase();
      const iClient = (item.clientName || '').trim().toLowerCase();
      const sameVendor = rVendor === iVendor;
      const sameClient = rClient === iClient;
      const sameDate = (r.visitDate || '').trim() === (item.visitDate || '').trim();

      if (sameVendor && sameClient && sameDate) {
        // Verificar si montos o sectores coinciden
        const sameSale = Math.abs((Number(r.saleAmount) || 0) - (Number(item.saleAmount) || 0)) < 0.01;
        const sameColl = Math.abs((Number(r.collectionAmount) || 0) - (Number(item.collectionAmount) || 0)) < 0.01;
        
        // O si las marcas de tiempo difieren en menos de 10 minutos
        const timeR = new Date(r.recordedAt || r.timestamp || r.created_at || 0).getTime();
        const timeI = new Date(item.recordedAt || item.timestamp || item.created_at || 0).getTime();
        const closeInTime = (timeR && timeI) ? Math.abs(timeR - timeI) < 10 * 60 * 1000 : true;

        if ((sameSale && sameColl) || closeInTime) {
          return true;
        }
      }

      return false;
    });

    if (existingIndex >= 0) {
      // Si ya existe, conservar la versión más enriquecida (con cloud_id, sync, o ubicación)
      const existing = result[existingIndex];
      result[existingIndex] = {
        ...existing,
        ...item,
        id: existing.cloud_id ? existing.id : (item.cloud_id ? item.id : existing.id),
        cloud_id: existing.cloud_id || item.cloud_id || null,
        synced: existing.synced || item.synced || !!(existing.cloud_id || item.cloud_id),
        location: existing.location || item.location || null,
        recordedDate: existing.recordedDate || item.recordedDate || (existing.created_at ? existing.created_at.split('T')[0] : null),
        recordedAt: existing.recordedAt || item.recordedAt || existing.created_at || item.created_at || null
      };
    } else {
      result.push(item);
    }
  }

  return result.sort((a, b) => new Date(b.timestamp || b.created_at || b.visitDate) - new Date(a.timestamp || a.created_at || a.visitDate));
}

// Helper para detectar si un reporte fue grabado fuera de la fecha de visita
export function getVisitLateStatus(visit) {
  if (!visit) return { isLate: false, daysDiff: 0, recordedDate: null, visitDate: null };
  const visitDate = (visit.visitDate || '').trim();
  if (!visitDate || visitDate.length < 10) return { isLate: false, daysDiff: 0, recordedDate: null, visitDate };

  let recordedStr = null;
  if (visit.recordedDate) {
    recordedStr = String(visit.recordedDate).split('T')[0];
  } else if (visit.created_at) {
    recordedStr = String(visit.created_at).split('T')[0];
  } else if (visit.recordedAt) {
    recordedStr = String(visit.recordedAt).split('T')[0];
  } else if (visit.timestamp && typeof visit.timestamp === 'string') {
    recordedStr = visit.timestamp.split('T')[0];
  }

  if (!recordedStr || recordedStr.length < 10) {
    return { isLate: false, daysDiff: 0, recordedDate: null, visitDate };
  }

  // Si la fecha en que se grabó en sistema es posterior a la fecha de la visita
  if (recordedStr > visitDate) {
    const dVisit = new Date(visitDate + 'T00:00:00');
    const dRec = new Date(recordedStr + 'T00:00:00');
    const diffMs = dRec.getTime() - dVisit.getTime();
    const daysDiff = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    return {
      isLate: true,
      daysDiff,
      recordedDate: recordedStr,
      visitDate
    };
  }

  return {
    isLate: false,
    daysDiff: 0,
    recordedDate: recordedStr,
    visitDate
  };
}

// VISITS MANAGEMENT
export async function getVisitsList(vendorFilter = null) {
  let localVisits = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
    if (raw) localVisits = JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local visits:', e);
  }

  // Also check previous version history key if local is empty
  if (localVisits.length === 0) {
    try {
      const v71 = localStorage.getItem('drogueriaElOlamHistory');
      if (v71) {
        localVisits = JSON.parse(v71);
        localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(localVisits));
      }
    } catch (e) {}
  }

  // Limpiar duplicados locales de antemano
  localVisits = deduplicateVisitsList(localVisits);

  // Try fetching from Supabase
  try {
    let query = supabase.from('visits').select('*').order('created_at', { ascending: false });
    if (vendorFilter) {
      query = query.eq('vendor_name', vendorFilter);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      // Normalize Supabase rows to match app format
      const normalizedCloud = data.map((d) => ({
        id: d.id,
        cloud_id: d.id,
        clientName: d.client_name,
        clientCode: d.client_code,
        phone: d.phone || '',
        visitType: d.visit_type,
        clientType: d.client_type,
        sector: d.sector,
        dayPeriod: d.day_period,
        hasSale: d.has_sale,
        saleType: d.sale_type,
        saleAmount: Number(d.sale_amount) || 0,
        hasCollection: d.has_collection,
        collectionCash: Number(d.collection_cash) || 0,
        collectionTransfer: Number(d.collection_transfer) || 0,
        collectionCheck: Number(d.collection_check) || 0,
        collectionBoleta: Number(d.collection_boleta) || 0,
        collectionAmount: Number(d.collection_amount) || 0,
        observations: d.observations || '',
        location: d.latitude ? { lat: Number(d.latitude), lng: Number(d.longitude), accuracy: Number(d.location_accuracy) } : null,
        vendorName: d.vendor_name,
        route: d.route,
        visitDate: d.visit_date,
        timestamp: d.timestamp || d.created_at,
        created_at: d.created_at,
        recordedDate: d.created_at ? d.created_at.split('T')[0] : (d.timestamp ? d.timestamp.split('T')[0] : d.visit_date),
        recordedAt: d.created_at || d.timestamp || null,
        synced: true
      }));

      // Deduplicación estricta y segura combinando nube y local
      const fullList = deduplicateVisitsList([...normalizedCloud, ...localVisits]);
      localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(fullList));
      return vendorFilter ? fullList.filter((v) => v.vendorName === vendorFilter) : fullList;
    }
  } catch (err) {
    console.warn('Supabase fetch visits fallback to local:', err);
  }

  // Si falló Supabase o no hay internet, devolver local deduplicado
  if (vendorFilter) {
    return localVisits.filter((v) => v.vendorName === vendorFilter);
  }
  return localVisits;
}

// Queue helper for offline/retry sync
export function getPendingSyncVisits() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePendingSyncVisits(list) {
  localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(list));
}

// Motor reactivo de sincronización inmediata en segundo plano
let isSyncing = false;
let syncTimeoutIds = [];

export function triggerReactiveSync() {
  if (typeof window === 'undefined') return;
  
  // Limpiar reintentos previos acumulados para evitar sobrecarga
  syncTimeoutIds.forEach(id => clearTimeout(id));
  syncTimeoutIds = [];

  const runImmediate = async () => {
    if (isSyncing) return;
    try {
      isSyncing = true;
      const res = await syncPendingVisits();
      if (res && res.synced > 0) {
        window.dispatchEvent(new CustomEvent('olam_visits_synced', { detail: res }));
      }
      // Si todavía quedan pendientes por mala conexión, reintentar progresivamente
      if (res && res.pending > 0) {
        const id1 = setTimeout(() => triggerReactiveSync(), 2500);
        const id2 = setTimeout(() => triggerReactiveSync(), 6000);
        syncTimeoutIds.push(id1, id2);
      }
    } catch (e) {
      console.warn('Error en ejecución reactiva de sync:', e);
    } finally {
      isSyncing = false;
    }
  };

  // Disparar primer intento de inmediato
  runImmediate();
}

// Background sync to ensure NO data is ever lost and executes immediately
export async function syncPendingVisits() {
  const pending = getPendingSyncVisits();
  if (!pending || pending.length === 0) return { synced: 0, pending: 0 };

  let remaining = [];
  let syncedCount = 0;

  for (const item of pending) {
    try {
      const payload = {
        client_name: (item.clientName || 'Cliente Droguería').trim(),
        client_code: (item.clientCode || '0000').trim(),
        phone: item.phone || null,
        visit_type: (item.visitType || 'presencial').toLowerCase(),
        client_type: (item.clientType || 'propio').toLowerCase(),
        sector: item.sector || item.route || 'General',
        day_period: (item.dayPeriod || 'mañana').toLowerCase(),
        has_sale: !!item.hasSale,
        sale_type: item.hasSale ? (item.saleType || 'presencial') : null,
        sale_amount: Number(item.saleAmount) || 0,
        has_collection: !!item.hasCollection,
        collection_cash: Number(item.collectionCash || item.collectionAmounts?.efectivo) || 0,
        collection_transfer: Number(item.collectionTransfer || item.collectionAmounts?.transferencia) || 0,
        collection_check: Number(item.collectionCheck || item.collectionAmounts?.cheque) || 0,
        collection_boleta: Number(item.collectionBoleta || item.collectionAmounts?.boleta) || 0,
        collection_amount: Number(item.collectionAmount) || 0,
        observations: item.observations || null,
        latitude: item.location?.lat ? Number(item.location.lat) : null,
        longitude: item.location?.lng ? Number(item.location.lng) : null,
        location_accuracy: item.location?.accuracy ? Number(item.location.accuracy) : null,
        vendor_name: item.vendorName || 'Vendedor El Olam',
        route: item.route || item.sector || 'General',
        visit_date: item.visitDate || getLocalDateString()
      };

      // Inserción con timeout de seguridad de 4 segundos
      const insertPromise = supabase.from('visits').insert([payload]).select();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de inserción Supabase')), 4000)
      );

      const { data, error } = await Promise.race([insertPromise, timeoutPromise]);
      
      if (!error && data && data[0]?.id) {
        syncedCount++;
        // Update local storage record with cloud_id and synced status
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
          if (raw) {
            const list = JSON.parse(raw);
            const idx = list.findIndex(v => v.id === item.id || v.timestamp === item.timestamp);
            if (idx !== -1) {
              list[idx].cloud_id = data[0].id;
              list[idx].synced = true;
              list[idx].created_at = data[0].created_at || list[idx].created_at;
              localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(deduplicateVisitsList(list)));
            }
          }
        } catch {}
      } else {
        remaining.push(item);
      }
    } catch (e) {
      remaining.push(item);
    }
  }

  savePendingSyncVisits(remaining);
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

  if (syncedCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_visits_synced', { detail: { synced: syncedCount, pending: remaining.length } }));
  }

  return { synced: syncedCount, pending: remaining.length };
}

// Add visit (Dual layer: Supabase + LocalStorage with guaranteed persistence & immediate sync)
export async function addVisitRecord(visit) {
  const now = new Date();
  const todayStr = getLocalDateString(now);

  // 1. Save locally first for instant response & absolute safety
  let visits = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
    if (raw) visits = JSON.parse(raw);
  } catch {}

  const enhancedVisit = {
    ...visit,
    id: visit.id || Date.now(),
    timestamp: visit.timestamp || now.toISOString(),
    visitDate: visit.visitDate || todayStr,
    recordedDate: visit.recordedDate || todayStr,
    recordedAt: visit.recordedAt || now.toISOString(),
    synced: false
  };

  // Deduplicar localmente para evitar duplicados en memoria
  visits = deduplicateVisitsList([enhancedVisit, ...visits]);
  localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));

  // 2. Prepare safe payload for Supabase (respects NOT NULL constraints)
  const payload = {
    client_name: (enhancedVisit.clientName || 'Cliente').trim(),
    client_code: (enhancedVisit.clientCode || (enhancedVisit.clientType === 'nuevo' ? '0000' : '0001')).trim(),
    phone: enhancedVisit.phone || null,
    visit_type: (enhancedVisit.visitType || 'presencial').toLowerCase(),
    client_type: (enhancedVisit.clientType || 'propio').toLowerCase(),
    sector: enhancedVisit.sector || enhancedVisit.route || 'General',
    day_period: (enhancedVisit.dayPeriod || 'mañana').toLowerCase(),
    has_sale: !!enhancedVisit.hasSale,
    sale_type: enhancedVisit.hasSale ? (enhancedVisit.saleType || 'presencial') : null,
    sale_amount: Number(enhancedVisit.saleAmount) || 0,
    has_collection: !!enhancedVisit.hasCollection,
    collection_cash: Number(enhancedVisit.collectionCash || enhancedVisit.collectionAmounts?.efectivo) || 0,
    collection_transfer: Number(enhancedVisit.collectionTransfer || enhancedVisit.collectionAmounts?.transferencia) || 0,
    collection_check: Number(enhancedVisit.collectionCheck || enhancedVisit.collectionAmounts?.cheque) || 0,
    collection_boleta: Number(enhancedVisit.collectionBoleta || enhancedVisit.collectionAmounts?.boleta) || 0,
    collection_amount: Number(enhancedVisit.collectionAmount) || 0,
    observations: enhancedVisit.observations || null,
    latitude: enhancedVisit.location?.lat ? Number(enhancedVisit.location.lat) : null,
    longitude: enhancedVisit.location?.lng ? Number(enhancedVisit.location.lng) : null,
    location_accuracy: enhancedVisit.location?.accuracy ? Number(enhancedVisit.location.accuracy) : null,
    vendor_name: enhancedVisit.vendorName || 'Vendedor El Olam',
    route: enhancedVisit.route || enhancedVisit.sector || 'General',
    visit_date: enhancedVisit.visitDate
  };

  // 3. Sync to Supabase con timeout de 3.5 segundos para no dejar en cola la ejecución
  try {
    const insertPromise = supabase.from('visits').insert([payload]).select();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de respuesta Supabase')), 3500)
    );

    const { data, error } = await Promise.race([insertPromise, timeoutPromise]);

    if (error) {
      console.warn('Supabase visit insert error, queuing and triggering immediate sync:', error);
      const pending = getPendingSyncVisits();
      pending.push(enhancedVisit);
      savePendingSyncVisits(pending);
      // Disparar reintento reactivo inmediato sin esperar
      setTimeout(() => triggerReactiveSync(), 400);
    } else if (data && data[0]?.id) {
      enhancedVisit.cloud_id = data[0].id;
      enhancedVisit.synced = true;
      if (data[0].created_at) {
        enhancedVisit.created_at = data[0].created_at;
      }
      // Update local copy with synced status and deduplicate
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map(item => {
            if (item.id === enhancedVisit.id || (item.clientName === enhancedVisit.clientName && item.visitDate === enhancedVisit.visitDate && item.vendorName === enhancedVisit.vendorName)) {
              return { ...item, cloud_id: data[0].id, synced: true, created_at: data[0].created_at || item.created_at };
            }
            return item;
          });
          localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(deduplicateVisitsList(updated)));
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Supabase visit sync error/timeout, queued offline and triggering immediate sync:', err);
    const pending = getPendingSyncVisits();
    pending.push(enhancedVisit);
    savePendingSyncVisits(pending);
    // Disparar reintento reactivo inmediato en segundo plano
    setTimeout(() => triggerReactiveSync(), 400);
  }

  return enhancedVisit;
}

// Delete visit (Admin only)
export async function deleteVisitRecord(visitId) {
  let visits = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
    if (raw) visits = JSON.parse(raw);
  } catch {}

  const updated = visits.filter((v) => v.id !== visitId && v.cloud_id !== visitId);
  localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(updated));

  try {
    await supabase.from('visits').delete().eq('id', visitId);
  } catch (e) {
    console.warn('Supabase delete visit fallback:', e);
  }

  return updated;
}

// Update only Sales, Collections and Observations of an existing visit (Allowed for Vendors & Admins)
export async function updateVisitSalesAndCollections(visitId, updates) {
  let visits = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
    if (raw) visits = JSON.parse(raw);
  } catch {}

  const idx = visits.findIndex(v => v.id === visitId || v.cloud_id === visitId || String(v.id) === String(visitId));
  if (idx === -1) return null;

  const current = visits[idx];
  
  const hasSale = updates.hasSale !== undefined ? !!updates.hasSale : !!current.hasSale;
  const saleAmount = hasSale ? (Number(updates.saleAmount) || 0) : 0;
  const saleType = hasSale ? (updates.saleType || current.saleType || 'presencial') : null;

  const hasCollection = updates.hasCollection !== undefined ? !!updates.hasCollection : !!current.hasCollection;
  const collectionCash = hasCollection ? (Number(updates.collectionCash ?? updates.collectionAmounts?.efectivo) || 0) : 0;
  const collectionTransfer = hasCollection ? (Number(updates.collectionTransfer ?? updates.collectionAmounts?.transferencia) || 0) : 0;
  const collectionCheck = hasCollection ? (Number(updates.collectionCheck ?? updates.collectionAmounts?.cheque) || 0) : 0;
  const collectionBoleta = hasCollection ? (Number(updates.collectionBoleta ?? updates.collectionAmounts?.boleta) || 0) : 0;
  const collectionAmount = hasCollection ? (collectionCash + collectionTransfer + collectionCheck + collectionBoleta) : 0;

  const observations = updates.observations !== undefined ? updates.observations : current.observations;

  const updatedVisit = {
    ...current,
    hasSale,
    saleAmount,
    saleType,
    hasCollection,
    collectionCash,
    collectionTransfer,
    collectionCheck,
    collectionBoleta,
    collectionAmount,
    collectionAmounts: {
      efectivo: collectionCash,
      transferencia: collectionTransfer,
      cheque: collectionCheck,
      boleta: collectionBoleta
    },
    observations,
    modified_at: new Date().toISOString()
  };

  visits[idx] = updatedVisit;
  localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));

  // Sync update to Supabase if cloud_id exists or targetId exists
  const targetId = current.cloud_id || (typeof current.id === 'string' && current.id.length > 20 ? current.id : null);
  if (targetId) {
    try {
      await supabase.from('visits').update({
        has_sale: hasSale,
        sale_amount: saleAmount,
        sale_type: saleType,
        has_collection: hasCollection,
        collection_cash: collectionCash,
        collection_transfer: collectionTransfer,
        collection_check: collectionCheck,
        collection_boleta: collectionBoleta,
        collection_amount: collectionAmount,
        observations: observations
      }).eq('id', targetId);
    } catch (e) {
      console.warn('Error updating visit in Supabase:', e);
    }
  }

  return updatedVisit;
}

// AUTH MANAGEMENT
export function getSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
}

// Authenticate user with Secure Hashing & One-Time Keys (OTP)
export async function authenticate(role, usernameOrName, password, selectedRoute = null) {
  if (!password) {
    return { success: false, message: 'Por favor ingrese su contraseña o clave de acceso' };
  }

  const cleanPass = password.trim();

  // CLAVE MAESTRA UNIVERSAL PARA VENDEDORES (Para desarrollo y mejoras sin consumir claves OTP de un solo uso)
  const MASTER_VENDOR_KEY = 'DEMOBUG_1234';
  if (role === 'vendor' && cleanPass === MASTER_VENDOR_KEY) {
    const vendors = await getVendorsList();
    const normalizedUser = (usernameOrName || '').toLowerCase().trim();
    const foundVendor = vendors.find(
      (v) =>
        v.name.toLowerCase() === normalizedUser ||
        v.username.toLowerCase() === normalizedUser ||
        (v.id && String(v.id) === normalizedUser)
    ) || vendors[0];

    const session = {
      role: 'vendor',
      vendorId: foundVendor?.id || 1,
      name: foundVendor?.name || usernameOrName,
      username: foundVendor?.username || usernameOrName,
      route: selectedRoute || foundVendor?.route || 'Coban #13',
      daily_goal: foundVendor?.daily_goal || 15,
      hire_date: foundVendor?.hire_date,
      loginMethod: 'master_key',
      loginTime: new Date().toISOString()
    };
    saveSession(session);
    return {
      success: true,
      session
    };
  }

  // 1. VERIFICAR SI ES UNA CLAVE DE UN SOLO TOQUE (OTP)
  if (isOtpKeyFormat(cleanPass)) {
    const otpResult = verifyAndConsumeOtpKey(cleanPass, {
      role,
      username: usernameOrName || (role === 'admin' ? 'admin' : 'vendedor'),
      name: usernameOrName || (role === 'admin' ? 'Administrador General' : 'Vendedor')
    });

    if (!otpResult.valid) {
      return {
        success: false,
        message: otpResult.message
      };
    }

    // Clave de un solo toque válida y consumida exitosamente
    if (role === 'admin') {
      const session = {
        role: 'admin',
        name: 'Administrador General',
        username: 'admin',
        loginMethod: 'otp_one_time_key',
        loginTime: new Date().toISOString()
      };
      saveSession(session);
      return { success: true, session, isOtp: true, message: otpResult.message };
    }

    // Si es vendedor accediendo con clave de un solo toque
    const vendors = await getVendorsList();
    const normalizedUser = (usernameOrName || '').toLowerCase().trim();
    const foundVendor = vendors.find(
      (v) =>
        v.name.toLowerCase() === normalizedUser ||
        v.username.toLowerCase() === normalizedUser ||
        (v.id && String(v.id) === normalizedUser)
    ) || vendors[0];

    const session = {
      role: 'vendor',
      vendorId: foundVendor?.id || 1,
      name: foundVendor?.name || usernameOrName,
      username: foundVendor?.username || usernameOrName,
      route: selectedRoute || foundVendor?.route || 'Coban #13',
      daily_goal: foundVendor?.daily_goal || 15,
      hire_date: foundVendor?.hire_date,
      loginMethod: 'otp_one_time_key',
      loginTime: new Date().toISOString()
    };
    saveSession(session);
    return { success: true, session, isOtp: true, message: otpResult.message };
  }

  // 2. AUTENTICACIÓN ADMINISTRADOR (HASH SEGURO)
  if (role === 'admin') {
    const currentAdminStored = getAdminPassword();
    const isValidAdmin = verifyPassword(cleanPass, currentAdminStored, 'admin');

    if (isValidAdmin) {
      const session = {
        role: 'admin',
        name: 'Administrador General',
        username: 'admin',
        loginMethod: 'password',
        loginTime: new Date().toISOString()
      };
      saveSession(session);
      return { success: true, session };
    }
    return { success: false, message: 'Contraseña de Administrador incorrecta' };
  }

  // 3. AUTENTICACIÓN VENDEDOR (HASH SEGURO)
  const vendors = await getVendorsList();
  const normalizedUser = (usernameOrName || '').toLowerCase().trim();

  const foundVendor = vendors.find(
    (v) =>
      v.name.toLowerCase() === normalizedUser ||
      v.username.toLowerCase() === normalizedUser ||
      (v.id && String(v.id) === normalizedUser)
  );

  if (!foundVendor) {
    return { success: false, message: 'Vendedor no encontrado en el sistema' };
  }

  if (!foundVendor.active) {
    return {
      success: false,
      message: 'Esta cuenta de vendedor se encuentra dada de baja. Contacte al administrador.'
    };
  }

  // Validar contraseña del vendedor con hash
  const isValidVendor = verifyPassword(cleanPass, foundVendor.password, 'vendor');
  if (isValidVendor) {
    const session = {
      role: 'vendor',
      vendorId: foundVendor.id,
      name: foundVendor.name,
      username: foundVendor.username,
      route: selectedRoute || foundVendor.route || 'Coban #13',
      daily_goal: foundVendor.daily_goal || 15,
      hire_date: foundVendor.hire_date,
      loginMethod: 'password',
      loginTime: new Date().toISOString()
    };
    saveSession(session);
    return { success: true, session };
  }

  return { success: false, message: 'Contraseña incorrecta para este vendedor' };
}
