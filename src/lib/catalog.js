import { supabase } from './supabase';

export const DEFAULT_PRODUCTS = [
  { id: 1, name: 'Paracetamol 500mg (Caja x 100)', price: 45.00, category: 'Analgésicos' },
  { id: 2, name: 'Ibuprofeno 400mg (Caja x 50)', price: 38.50, category: 'Antiinflamatorios' },
  { id: 3, name: 'Amoxicilina 500mg (Caja x 50)', price: 65.00, category: 'Antibióticos' },
  { id: 4, name: 'Complejo B Inyectable 10ml', price: 28.00, category: 'Vitaminas' },
  { id: 5, name: 'Loratadina 10mg (Caja x 30)', price: 32.00, category: 'Antialérgicos' },
  { id: 6, name: 'Omeprazol 20mg (Caja x 30)', price: 40.00, category: 'Gastrointestinal' },
  { id: 7, name: 'Suero Oral Rehidratante (Pack x 25)', price: 55.00, category: 'Soluciones' },
  { id: 8, name: 'Alcohol Etílico 70% 500ml', price: 18.00, category: 'Insumos y Cuidado' },
  { id: 9, name: 'Algodón Hidrófilo 100g', price: 12.00, category: 'Insumos y Cuidado' },
  { id: 10, name: 'Gasas Estériles 3x3 (Caja x 100)', price: 35.00, category: 'Insumos y Cuidado' },
  { id: 11, name: 'Guantes de Látex (Caja x 100)', price: 48.00, category: 'Material Médico' },
  { id: 12, name: 'Jeringas 5ml con aguja (Caja x 100)', price: 52.00, category: 'Material Médico' }
];

export async function fetchProductsCatalog() {
  try {
    const { data, error } = await supabase.from('productos_tienda').select('*').eq('activo', true);
    if (!error && data && data.length > 0) {
      return data.map(p => ({
        id: p.id,
        name: p.nombre,
        price: Number(p.precio) || 0,
        category: p.categoria || 'General',
        description: p.descripcion || ''
      }));
    }
  } catch (e) {
    console.warn('Fallback default products:', e);
  }
  return DEFAULT_PRODUCTS;
}

export async function fetchClientCodes() {
  try {
    const { data, error } = await supabase.from('client_codes').select('*');
    if (!error && data && data.length > 0) {
      return data.map(c => ({
        code: c.code,
        name: c.client_name
      }));
    }
  } catch (e) {
    console.warn('Fallback client codes:', e);
  }
  return [
    { code: '0001', name: 'Farmacia San Antonio' },
    { code: '0002', name: 'Farmacia La Esperanza' },
    { code: '0003', name: 'Droguería y Farmacia El Ahorro' },
    { code: '0004', name: 'Farmacia Santa María' },
    { code: '0005', name: 'Clínica y Farmacia San Juan' }
  ];
}

// Global Pharmacy Directory that stores and learns Code <-> Name <-> Sector/Route <-> Last Visit Date
export function getStoredPharmacyDirectory() {
  try {
    const raw = localStorage.getItem('olam_pharmacy_directory_v2');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

// Fetch complete pharmacy directory combining Supabase, LocalStorage and historical visits
export async function fetchPharmacyDirectory(allVisits = []) {
  const codes = await fetchClientCodes();
  const stored = getStoredPharmacyDirectory();

  // Create unified dictionary keyed by normalized name and code
  const map = new Map();

  // 1. Seed with predefined client codes
  codes.forEach(c => {
    const key = (c.code || '').trim().toLowerCase();
    if (key) {
      map.set(key, {
        code: c.code,
        name: c.name || '',
        sector: '',
        route: '',
        phone: '',
        lastVisitDate: '',
        totalVisits: 0
      });
    }
  });

  // 2. Merge with all historical visits
  if (Array.isArray(allVisits)) {
    allVisits.forEach(v => {
      if (!v.clientName && !v.clientCode) return;
      const codeKey = (v.clientCode || '').trim().toLowerCase();
      const nameKey = (v.clientName || '').trim().toLowerCase();

      const existing = (codeKey && map.get(codeKey)) || (nameKey && map.get(nameKey)) || {};
      const visitDate = v.visitDate || (v.created_at ? v.created_at.split('T')[0] : '');

      const merged = {
        code: v.clientCode || existing.code || '',
        name: v.clientName || existing.name || '',
        sector: v.sector || v.route || existing.sector || '',
        route: v.route || v.sector || existing.route || '',
        phone: v.phone || existing.phone || '',
        lastVisitDate: visitDate || existing.lastVisitDate || '',
        totalVisits: (existing.totalVisits || 0) + 1
      };

      if (codeKey) map.set(codeKey, merged);
      if (nameKey) map.set(nameKey, merged);
    });
  }

  // 3. Merge with stored directory (Excel imports, manual adds, and manual edits from Admin) - HIGHEST PRIORITY
  stored.forEach(s => {
    const codeKey = (s.code || '').trim().toLowerCase();
    const nameKey = (s.name || '').trim().toLowerCase();
    const existing = (codeKey && map.get(codeKey)) || (nameKey && map.get(nameKey)) || {};
    const merged = {
      code: s.code || existing.code || '',
      name: s.name || existing.name || '',
      sector: s.sector || s.route || existing.sector || '',
      route: s.route || s.sector || existing.route || '',
      phone: s.phone || existing.phone || '',
      lastVisitDate: s.last_visit_date || s.lastVisitDate || existing.lastVisitDate || '',
      totalVisits: (s.total_visits !== undefined ? s.total_visits : existing.totalVisits) || 0
    };
    if (codeKey) map.set(codeKey, merged);
    if (nameKey) map.set(nameKey, merged);
  });

  // Deduplicate by unique code or name
  const result = [];
  const seenCodes = new Set();
  const seenNames = new Set();

  map.forEach(item => {
    const cKey = (item.code || '').toLowerCase();
    const nKey = (item.name || '').toLowerCase();
    if (!cKey && !nKey) return;
    if (cKey && seenCodes.has(cKey)) return;
    if (nKey && seenNames.has(nKey)) return;

    if (cKey) seenCodes.add(cKey);
    if (nKey) seenNames.add(nKey);
    result.push(item);
  });

  return result;
}

// Save or update client record in directory and Supabase
export async function saveClientRecord({ code, name, sector, route, visitDate, phone, vendorName }) {
  if (!name && !code) return;
  const cleanCode = (code || '').trim();
  const cleanName = (name || '').trim();
  const cleanSector = (sector || route || '').trim();
  const cleanRoute = (route || sector || '').trim();
  const cleanDate = (visitDate || new Date().toISOString().split('T')[0]).trim();

  // 1. Update localStorage directory
  try {
    const list = getStoredPharmacyDirectory();
    const idx = list.findIndex(c => 
      (cleanCode && c.code && c.code.toLowerCase() === cleanCode.toLowerCase()) ||
      (cleanName && c.name && c.name.toLowerCase() === cleanName.toLowerCase())
    );

    const record = {
      code: cleanCode || (idx !== -1 ? list[idx].code : '0000'),
      name: cleanName || (idx !== -1 ? list[idx].name : 'Cliente Farmacia'),
      sector: cleanSector || (idx !== -1 ? list[idx].sector : ''),
      route: cleanRoute || (idx !== -1 ? list[idx].route : cleanSector),
      phone: (phone || '').trim() || (idx !== -1 ? list[idx].phone : ''),
      last_visit_date: cleanDate,
      last_vendor: vendorName || '',
      total_visits: idx !== -1 ? (list[idx].total_visits || 0) + 1 : 1,
      updated_at: new Date().toISOString()
    };

    if (idx !== -1) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push(record);
    }
    localStorage.setItem('olam_pharmacy_directory_v2', JSON.stringify(list));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olam_clients_directory_updated', { detail: list }));
    }
  } catch (e) {
    console.warn('Error saving local pharmacy directory:', e);
  }

  // 2. Persist to Supabase client_codes table
  if (cleanCode && cleanName) {
    try {
      await supabase.from('client_codes').upsert({
        code: cleanCode,
        client_name: cleanName
      }, { onConflict: 'code' });
    } catch (e) {
      // Ignore conflict or missing schema columns
    }
  }
}

// Update an existing client in the directory (supports changing code, name, phone, route/sector)
export async function updateClientInDirectory({ originalCode, originalName, code, name, phone, sector, route }) {
  const currentList = getStoredPharmacyDirectory();
  const origC = (originalCode || '').trim().toLowerCase();
  const origN = (originalName || '').trim().toLowerCase();
  const newC = (code || '').trim();
  const newN = (name || '').trim();
  const newPhone = (phone || '').trim();
  const newRoute = (route || sector || '').trim();

  // Find index of item in stored directory
  const idx = currentList.findIndex(item => {
    const itC = (item.code || '').trim().toLowerCase();
    const itN = (item.name || '').trim().toLowerCase();
    return (origC && itC === origC) || (origN && itN === origN);
  });

  const updatedRecord = {
    code: newC || originalCode || '0000',
    name: newN || originalName || 'Cliente Farmacia',
    phone: newPhone,
    sector: newRoute,
    route: newRoute,
    total_visits: idx !== -1 ? (currentList[idx].total_visits || 0) : 0,
    last_visit_date: idx !== -1 ? (currentList[idx].last_visit_date || '') : '',
    updated_at: new Date().toISOString()
  };

  if (idx !== -1) {
    currentList[idx] = { ...currentList[idx], ...updatedRecord };
  } else {
    currentList.push(updatedRecord);
  }

  // Save to localStorage
  try {
    localStorage.setItem('olam_pharmacy_directory_v2', JSON.stringify(currentList));
  } catch (e) {
    console.error('Error saving updated client directory:', e);
  }

  // Notify all components in real-time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_clients_directory_updated', { detail: currentList }));
  }

  // Update Supabase client_codes table
  try {
    if (originalCode && originalCode.trim() !== newC && origC) {
      await supabase.from('client_codes').delete().eq('code', originalCode.trim());
    }
    if (newC && newN) {
      await supabase.from('client_codes').upsert({
        code: newC,
        client_name: newN
      }, { onConflict: 'code' });
    }
  } catch (e) {
    console.warn('Supabase updateClientInDirectory note:', e);
  }

  return { success: true, client: updatedRecord };
}

// Bulk save clients imported from Excel file into directory and Supabase
export async function saveBulkClientsToDirectory(clientsList = []) {
  if (!Array.isArray(clientsList) || clientsList.length === 0) return { success: false, count: 0 };

  const currentList = getStoredPharmacyDirectory();
  const map = new Map();

  // Index existing by code and name
  currentList.forEach(item => {
    if (item.code) map.set(item.code.trim().toLowerCase(), item);
    if (item.name) map.set(item.name.trim().toLowerCase(), item);
  });

  const validToSave = [];
  const supabaseBatch = [];

  clientsList.forEach(c => {
    const code = String(c.code || c.codigo || c.clientCode || '').trim();
    const name = String(c.name || c.nombre || c.clientName || c.farmacia || '').trim();
    const phone = String(c.phone || c.telefono || c.tel || '').trim();
    const sector = String(c.sector || c.ruta || c.route || '').trim();
    const route = String(c.route || c.ruta || c.sector || '').trim();

    if (!code && !name) return;

    const codeKey = code.toLowerCase();
    const nameKey = name.toLowerCase();

    const existing = (codeKey && map.get(codeKey)) || (nameKey && map.get(nameKey)) || {};

    const updated = {
      code: code || existing.code || '0000',
      name: name || existing.name || 'Cliente Farmacia',
      phone: phone || existing.phone || '',
      sector: sector || existing.sector || '',
      route: route || existing.route || sector || '',
      total_visits: existing.total_visits || 0,
      last_visit_date: existing.last_visit_date || '',
      updated_at: new Date().toISOString()
    };

    if (codeKey) map.set(codeKey, updated);
    if (nameKey) map.set(nameKey, updated);

    validToSave.push(updated);

    if (code && name) {
      supabaseBatch.push({
        code: code,
        client_name: name
      });
    }
  });

  // Extract deduplicated list
  const deduplicated = [];
  const seenKeys = new Set();
  map.forEach(val => {
    const key = (val.code || '') + '|' + (val.name || '');
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicated.push(val);
    }
  });

  // 1. Save to local directory
  try {
    localStorage.setItem('olam_pharmacy_directory_v2', JSON.stringify(deduplicated));
  } catch (e) {
    console.error('Error saving local directory bulk:', e);
  }

  // 2. Dispatch custom event to notify all vendor forms in real-time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_clients_directory_updated', { detail: deduplicated }));
  }

  // 3. Upsert to Supabase in chunks of 50
  if (supabaseBatch.length > 0) {
    try {
      const chunkSize = 50;
      for (let i = 0; i < supabaseBatch.length; i += chunkSize) {
        const chunk = supabaseBatch.slice(i, i + chunkSize);
        await supabase.from('client_codes').upsert(chunk, { onConflict: 'code' });
      }
    } catch (e) {
      console.warn('Supabase bulk upsert note:', e);
    }
  }

  return {
    success: true,
    count: validToSave.length,
    totalInDirectory: deduplicated.length
  };
}

// Delete a client from the directory
export async function deleteClientFromDirectory(code, name) {
  const currentList = getStoredPharmacyDirectory();
  const cleanCode = (code || '').trim().toLowerCase();
  const cleanName = (name || '').trim().toLowerCase();

  const filtered = currentList.filter(c => {
    const cCode = (c.code || '').trim().toLowerCase();
    const cName = (c.name || '').trim().toLowerCase();
    if (cleanCode && cCode === cleanCode) return false;
    if (cleanName && cName === cleanName) return false;
    return true;
  });

  try {
    localStorage.setItem('olam_pharmacy_directory_v2', JSON.stringify(filtered));
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_clients_directory_updated', { detail: filtered }));
  }

  if (cleanCode) {
    try {
      await supabase.from('client_codes').delete().eq('code', code.trim());
    } catch (e) {}
  }

  return filtered;
}

// Generate and trigger download of official sample Excel template
export async function downloadClientsTemplateExcel() {
  const XLSX = await import('xlsx');
  
  const sampleData = [
    {
      'Código de Cliente': '0014',
      'Nombre de la Farmacia': 'Farmacia Santa María',
      'Teléfono': '79512345',
      'Ruta o Sector': 'Salama #14'
    },
    {
      'Código de Cliente': '0022',
      'Nombre de la Farmacia': 'Farmacia La Esperanza',
      'Teléfono': '77651234',
      'Ruta o Sector': 'Retalhuleu #22'
    },
    {
      'Código de Cliente': '0031',
      'Nombre de la Farmacia': 'Droguería y Farmacia El Ahorro',
      'Teléfono': '78329876',
      'Ruta o Sector': 'Sacatepéquez #31'
    },
    {
      'Código de Cliente': '0043',
      'Nombre de la Farmacia': 'Farmacia Central Chimal',
      'Teléfono': '78394567',
      'Ruta o Sector': 'Chimaltenango I #43'
    },
    {
      'Código de Cliente': '0063',
      'Nombre de la Farmacia': 'Farmacia San José',
      'Teléfono': '79423456',
      'Ruta o Sector': 'Chiquimula II #63'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData);

  ws['!cols'] = [
    { wch: 20 }, // Código de Cliente
    { wch: 35 }, // Nombre de la Farmacia
    { wch: 18 }, // Teléfono
    { wch: 30 }  // Ruta o Sector
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Directorio_Clientes');
  XLSX.writeFile(wb, 'Plantilla_Clientes_Farmacias_El_Olam.xlsx');
}

