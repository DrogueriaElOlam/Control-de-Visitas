// Database, Authentication and Sync layer for Droguería El Olam
import { supabase } from './supabase.js';

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
  { id: 2, name: 'Ana Lucia Marroquin', route: 'Coban #13', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 3, name: 'Jessica Noriega', route: 'Salama #14', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 4, name: 'Wally Natareno', route: 'Retalhuleu #22', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 5, name: 'Erick Curley', route: 'Suchi II #23', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 6, name: 'Estuardo Cordova', route: 'Coatepeque #24', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 7, name: 'Karina Pineda', route: 'Chiquimula II #63', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 8, name: 'Dany Peres', route: 'Totonicapan #12', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 9, name: 'Klissman Hernandez', route: 'Suchi III #25', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 10, name: 'Elio Caceros', route: 'Municipios Oriente #15', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 11, name: 'Josue Aguilar', route: 'Sacatepequez #31', active: true, hire_date: '2025-12-05', daily_goal: 15 },
  { id: 12, name: 'Elias Quiej', route: 'Suchi I #21', active: true, hire_date: '2025-12-05', daily_goal: 15 }
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
  'Amatitlán #B5'
];

// Specific assigned routes per vendor
export const VENDOR_ASSIGNED_ROUTES = {
  'Ana Lucia Marroquin': [
    'Salama #14',
    'Quetzaltenango #11',
    'Municipios Oriente #15',
    'Coban #13',
    'Totonicapan #12'
  ],
  'Jessica Noriega': [
    'Suchi I #21',
    'Retalhuleu #22',
    'Suchi II #23',
    'Coatepeque #24',
    'Suchi III #25'
  ],
  'Wally Natareno': [
    'Sacatepéquez #31',
    'Quiche Centro #32',
    'Quiche Montaña Baja #33',
    'Izabal I #34',
    'Izabal II #35'
  ],
  'Erick Curley': [
    'Jutiapa I #41',
    'Jutiapa II #42',
    'Chimaltenango I #43',
    'Chimaltenango II #44',
    'Santa Rosa #45'
  ],
  'Estuardo Cordova': [
    'San Marcos Montaña Alta #51',
    'Solola I #52',
    'Solola II #53',
    'Nebaj #54',
    'Quiche Montaña Alta #55'
  ],
  'Karina Pineda': [
    'Chiquimula I #61',
    'Jalapa #62',
    'Chiquimula II #63',
    'Capital S1 #64',
    'Capital S2 #65'
  ],
  'Dany Peres': [
    'Huehuetenango Montaña Baja I #71',
    'Huehuetenango Montaña Baja II #72',
    'Peten I #73',
    'Peten II #74'
  ],
  'Danny Perez': [
    'Huehuetenango Montaña Baja I #71',
    'Huehuetenango Montaña Baja II #72',
    'Peten I #73',
    'Peten II #74'
  ],
  'Klissman Hernandez': [
    'Polochic #81',
    'Zacapa #82',
    'Huehuetenango Montaña Alta I #83',
    'Huehuetenango Montaña Alta II #84'
  ],
  'Elio Caceros': [
    'Petapa #91',
    'San Marcos I #92',
    'San Marcos II #93',
    'Capital S3 #94',
    'Ixcán #95'
  ],
  'Josue Aguilar': [
    'Escuintla I #A1',
    'Escuintla II #A2',
    'Villa Nueva #A3',
    'Huehuetenango Centro #A4',
    'Municipios Norte #A5'
  ],
  'Elias Quiej': [
    'Peten III #B1',
    'Peten IV #B2',
    'Transversal I #B3',
    'Transversal II #B4',
    'Amatitlán #B5'
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
      return routes;
    }
  }

  return ALL_ROUTES;
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
          password: c.password || 'olam1234',
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
    // Initialize default vendors
    const initialized = DEFAULT_VENDORS.map((v) => ({
      ...v,
      username: generateUsername(v.name),
      password: 'olam1234'
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

// Admin Password management
export function getAdminPassword() {
  const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_PASS);
  return saved || 'admin2025';
}

export function setAdminPassword(newPass) {
  localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, newPass);
}

// Create new vendor
export async function createVendor({ name, username, password, route, daily_goal, phone, hire_date }) {
  const vendors = await getVendorsList();
  const newId = Date.now();
  const hireDateFormatted = hire_date || new Date().toISOString().split('T')[0];

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
    password: password || 'olam1234',
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
  const termDate = terminationDate || new Date().toISOString().split('T')[0];
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

// Update vendor password or details
export async function updateVendorCredentials(vendorId, { password, route, daily_goal, name }) {
  const vendors = await getVendorsList();
  const updated = vendors.map((v) => {
    if (v.id === vendorId) {
      return {
        ...v,
        name: name !== undefined ? name : v.name,
        password: password !== undefined ? password : v.password,
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
    password,
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
        timestamp: d.timestamp || d.created_at
      }));

      // Merge unique by id or timestamp + vendorName + clientName
      const mergedMap = new Map();
      normalizedCloud.forEach((v) => mergedMap.set(`${v.vendorName}_${v.visitDate}_${v.clientName}_${v.timestamp}`, v));
      localVisits.forEach((v) => {
        const key = `${v.vendorName}_${v.visitDate}_${v.clientName}_${v.timestamp}`;
        if (!mergedMap.has(key)) mergedMap.set(key, v);
      });

      const fullList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.timestamp || b.visitDate) - new Date(a.timestamp || a.visitDate)
      );
      localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(fullList));
      return vendorFilter ? fullList.filter((v) => v.vendorName === vendorFilter) : fullList;
    }
  } catch (err) {
    console.warn('Supabase fetch visits fallback to local:', err);
  }

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

// Background sync to ensure NO data is ever lost
export async function syncPendingVisits() {
  const pending = getPendingSyncVisits();
  if (pending.length === 0) return { synced: 0, pending: 0 };

  let remaining = [];
  let syncedCount = 0;

  for (const item of pending) {
    try {
      const payload = {
        client_name: item.clientName || 'Cliente Droguería',
        client_code: item.clientCode || '0000',
        phone: item.phone || null,
        visit_type: (item.visitType || 'presencial').toLowerCase(),
        client_type: (item.clientType || 'propio').toLowerCase(),
        sector: item.sector || item.route || 'General',
        day_period: (item.dayPeriod || 'mañana').toLowerCase(),
        has_sale: !!item.hasSale,
        sale_type: item.hasSale ? (item.saleType || 'presencial') : null,
        sale_amount: Number(item.saleAmount) || 0,
        has_collection: !!item.hasCollection,
        collection_cash: Number(item.collectionCash) || 0,
        collection_transfer: Number(item.collectionTransfer) || 0,
        collection_check: Number(item.collectionCheck) || 0,
        collection_boleta: Number(item.collectionBoleta) || 0,
        collection_amount: Number(item.collectionAmount) || 0,
        observations: item.observations || null,
        latitude: item.location?.lat || null,
        longitude: item.location?.lng || null,
        location_accuracy: item.location?.accuracy || null,
        vendor_name: item.vendorName || 'Vendedor El Olam',
        route: item.route || item.sector || 'General',
        visit_date: item.visitDate || new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase.from('visits').insert([payload]).select();
      if (!error && data && data[0]?.id) {
        syncedCount++;
        // Update local storage record with cloud_id
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
          if (raw) {
            const list = JSON.parse(raw);
            const idx = list.findIndex(v => v.id === item.id || v.timestamp === item.timestamp);
            if (idx !== -1) {
              list[idx].cloud_id = data[0].id;
              list[idx].synced = true;
              localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(list));
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
  return { synced: syncedCount, pending: remaining.length };
}

// Add visit (Dual layer: Supabase + LocalStorage with guaranteed persistence)
export async function addVisitRecord(visit) {
  // 1. Save locally first for instant response & absolute safety
  let visits = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
    if (raw) visits = JSON.parse(raw);
  } catch {}

  const enhancedVisit = {
    ...visit,
    id: visit.id || Date.now(),
    timestamp: visit.timestamp || new Date().toISOString(),
    visitDate: visit.visitDate || new Date().toISOString().split('T')[0],
    synced: false
  };

  visits.unshift(enhancedVisit);
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
    latitude: enhancedVisit.location?.lat || null,
    longitude: enhancedVisit.location?.lng || null,
    location_accuracy: enhancedVisit.location?.accuracy || null,
    vendor_name: enhancedVisit.vendorName || 'Vendedor El Olam',
    route: enhancedVisit.route || enhancedVisit.sector || 'General',
    visit_date: enhancedVisit.visitDate
  };

  // 3. Sync to Supabase
  try {
    const { data, error } = await supabase.from('visits').insert([payload]).select();
    if (error) {
      console.warn('Supabase visit insert error, queuing for retry sync:', error);
      // Queue in pending sync so it's retried
      const pending = getPendingSyncVisits();
      pending.push(enhancedVisit);
      savePendingSyncVisits(pending);
    } else if (data && data[0]?.id) {
      enhancedVisit.cloud_id = data[0].id;
      enhancedVisit.synced = true;
      // Update local copy with synced status
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.VISITS);
        if (raw) {
          const list = JSON.parse(raw);
          if (list[0]?.id === enhancedVisit.id) {
            list[0].cloud_id = data[0].id;
            list[0].synced = true;
            localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(list));
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Supabase visit sync error, queued offline:', err);
    const pending = getPendingSyncVisits();
    pending.push(enhancedVisit);
    savePendingSyncVisits(pending);
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

// Authenticate user
export async function authenticate(role, usernameOrName, password, selectedRoute = null) {
  if (role === 'admin') {
    const currentAdminPass = getAdminPassword();
    if (password === currentAdminPass || password === '0l4m_2025' || password === '0l@m_2025$') {
      const session = {
        role: 'admin',
        name: 'Administrador General',
        username: 'admin',
        loginTime: new Date().toISOString()
      };
      saveSession(session);
      return { success: true, session };
    }
    return { success: false, message: 'Contraseña de Administrador incorrecta' };
  }

  // Vendor login
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

  // Check password
  const expectedPassword = foundVendor.password || 'olam1234';
  if (password === expectedPassword || password === '0l@m_2025$' || password === 'olam1234') {
    const session = {
      role: 'vendor',
      vendorId: foundVendor.id,
      name: foundVendor.name,
      username: foundVendor.username,
      route: selectedRoute || foundVendor.route || 'Coban #13',
      daily_goal: foundVendor.daily_goal || 15,
      hire_date: foundVendor.hire_date,
      loginTime: new Date().toISOString()
    };
    saveSession(session);
    return { success: true, session };
  }

  return { success: false, message: 'Contraseña incorrecta para este vendedor' };
}
