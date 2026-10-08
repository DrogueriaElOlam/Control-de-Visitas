import { supabase } from './supabase';
import { getLocalDateString } from './dateUtils';

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
  // 1. Caché local para carga en 0 milisegundos
  try {
    const cached = localStorage.getItem('olam_client_codes_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Refrescar en segundo plano sin bloquear la UI
        supabase.from('client_codes').select('*').then(({ data }) => {
          if (data && data.length > 0) {
            const mapped = data.map(c => ({ code: c.code, name: c.client_name }));
            try { localStorage.setItem('olam_client_codes_cache', JSON.stringify(mapped)); } catch (_) {}
          }
        }).catch(() => {});
        return parsed;
      }
    }
  } catch (_) {}

  // 2. Consulta a Supabase si no hay caché
  try {
    const { data, error } = await supabase.from('client_codes').select('*');
    if (!error && data && data.length > 0) {
      const mapped = data.map(c => ({
        code: c.code,
        name: c.client_name
      }));
      try { localStorage.setItem('olam_client_codes_cache', JSON.stringify(mapped)); } catch (_) {}
      return mapped;
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

// Búsqueda en vivo y en tiempo real directamente contra Supabase
export async function searchClientLive(query) {
  if (!query || !query.trim()) return [];
  const q = query.trim();
  const results = [];
  const seen = new Set();

  try {
    // 1. Buscar en client_codes por código o nombre
    const { data: codeData } = await supabase
      .from('client_codes')
      .select('code, client_name')
      .or(`code.ilike.%${q}%,client_name.ilike.%${q}%`)
      .limit(30);

    if (codeData && Array.isArray(codeData)) {
      codeData.forEach(c => {
        if (!seen.has(c.code)) {
          seen.add(c.code);
          results.push({
            code: c.code,
            name: c.client_name || '',
            sector: '',
            route: '',
            phone: '',
            lastVisitDate: '',
            totalVisits: 0
          });
        }
      });
    }

    // 2. Buscar en visits para completar o encontrar visitas pasadas con sector y teléfono más reciente
    const { data: visitData } = await supabase
      .from('visits')
      .select('client_code, client_name, sector, route, phone, created_at')
      .or(`client_code.ilike.%${q}%,client_name.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(40);

    if (visitData && Array.isArray(visitData)) {
      visitData.forEach(v => {
        const k = v.client_code || v.client_name;
        if (!k) return;
        const existing = results.find(r => (r.code && r.code === v.client_code) || (r.name && r.name.toLowerCase() === (v.client_name || '').toLowerCase()));
        if (existing) {
          if (!existing.sector && (v.sector || v.route)) existing.sector = v.sector || v.route || '';
          if (!existing.route && (v.route || v.sector)) existing.route = v.route || v.sector || '';
          if (v.phone && (!existing.phone || v.phone !== existing.phone)) {
            existing.phone = v.phone;
          }
        } else if (v.client_code && !seen.has(v.client_code)) {
          seen.add(v.client_code);
          results.push({
            code: v.client_code || '',
            name: v.client_name || '',
            sector: v.sector || v.route || '',
            route: v.route || v.sector || '',
            phone: v.phone || '',
            lastVisitDate: v.created_at ? v.created_at.split('T')[0] : '',
            totalVisits: 1
          });
        }
      });
    }
  } catch (err) {
    console.warn('Error en búsqueda live de clientes en Supabase:', err);
  }

  return results;
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

  // Deduplicate prioritizing records with all necessary fields
  const rawList = Array.from(map.values());
  const result = deduplicateClientsList(rawList);

  return result;
}

// Save or update client record in directory and Supabase
export async function saveClientRecord({ code, name, sector, route, visitDate, phone, vendorName }) {
  if (!name && !code) return;
  const cleanCode = (code || '').trim();
  const cleanName = (name || '').trim();
  const cleanSector = (sector || route || '').trim();
  const cleanRoute = (route || sector || '').trim();
  const cleanDate = (visitDate || getLocalDateString()).trim();

  // 1. Update localStorage directory (olam_pharmacy_directory_v2)
  try {
    let list = getStoredPharmacyDirectory();
    
    // Buscar si ya existía el cliente por código o por nombre
    let idx = -1;

    // A. Prioridad 1: Coincidencia exacta de código propio (si no es 0000)
    if (cleanCode && cleanCode !== '0000') {
      idx = list.findIndex(c => (c.code || '').trim().toLowerCase() === cleanCode.toLowerCase());
    }

    // B. Prioridad 2: Coincidencia por nombre de farmacia (permite detectar clientes que tenían 0000 o cambiarles el código)
    if (idx === -1 && cleanName) {
      idx = list.findIndex(c => (c.name || '').trim().toLowerCase() === cleanName.toLowerCase());
    }

    const previousItem = idx !== -1 ? list[idx] : null;

    // Determinar el código final:
    // Si se especificó un código propio (no 0000), ese prevalece siempre
    let finalCode = cleanCode;
    if (!finalCode || finalCode === '0000') {
      // Si el cliente ya tenía un código propio previo en el catálogo, conservarlo para no degradarlo a 0000
      if (previousItem && previousItem.code && previousItem.code !== '0000') {
        finalCode = previousItem.code;
      } else {
        finalCode = cleanCode || '0000';
      }
    }

    // Determinar el nombre final: si se ingresó un nombre limpio, ese prevalece siempre (permite actualizar nombres de farmacia)
    const finalName = cleanName || (previousItem ? previousItem.name : 'Cliente Farmacia');

    const record = {
      code: finalCode,
      name: finalName,
      sector: cleanSector || (previousItem ? previousItem.sector : ''),
      route: cleanRoute || (previousItem ? previousItem.route : cleanSector),
      phone: (phone || '').trim() || (previousItem ? previousItem.phone : ''),
      last_visit_date: cleanDate,
      last_vendor: vendorName || '',
      total_visits: previousItem ? (previousItem.total_visits || 0) + 1 : 1,
      updated_at: new Date().toISOString()
    };

    if (idx !== -1) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push(record);
    }

    // Si se asignó un código propio real a un cliente que antes estaba registrado como '0000',
    // limpiar las entradas viejas '0000' con el mismo nombre para que no queden duplicadas
    if (finalCode && finalCode !== '0000' && finalName) {
      list = list.filter(item => {
        const isSameName = (item.name || '').trim().toLowerCase() === finalName.toLowerCase();
        const isOldZero = (item.code || '').trim() === '0000' || !item.code;
        return !(isSameName && isOldZero);
      });
      // Asegurarse de que el registro con código propio esté en la lista
      const exists = list.some(item => (item.code || '').trim().toLowerCase() === finalCode.toLowerCase());
      if (!exists) {
        list.push(record);
      }
    }

    localStorage.setItem('olam_pharmacy_directory_v2', JSON.stringify(list));

    // 2. Actualizar caché de códigos de cliente (olam_client_codes_cache) en caliente
    try {
      const rawCodes = localStorage.getItem('olam_client_codes_cache');
      let codesList = rawCodes ? JSON.parse(rawCodes) : [];
      if (Array.isArray(codesList)) {
        // Si tiene código propio real, actualizar o insertar en la lista de códigos oficiales
        if (finalCode && finalCode !== '0000') {
          const cIdx = codesList.findIndex(c => 
            (c.code || '').trim().toLowerCase() === finalCode.toLowerCase() ||
            (c.name || '').trim().toLowerCase() === finalName.toLowerCase()
          );
          if (cIdx !== -1) {
            codesList[cIdx] = { code: finalCode, name: finalName };
          } else {
            codesList.push({ code: finalCode, name: finalName });
          }
          localStorage.setItem('olam_client_codes_cache', JSON.stringify(codesList));
        }
      }
    } catch (_) {}

    // Notificar en tiempo real a todos los componentes y autocompletados
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('olam_clients_directory_updated', { detail: list }));
    }
  } catch (e) {
    console.warn('Error saving local pharmacy directory:', e);
  }

  // 3. Persistir y actualizar en Supabase en la tabla client_codes (cuando tenga código real asignado)
  if (cleanCode && cleanCode !== '0000' && cleanName) {
    try {
      await supabase.from('client_codes').upsert({
        code: cleanCode,
        client_name: cleanName
      }, { onConflict: 'code' });
    } catch (e) {
      console.warn('Error guardando código de cliente en Supabase:', e);
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

// Helper: Calcular nivel de completitud de campos de un cliente
export function calculateClientCompleteness(client) {
  if (!client) return { score: 0, percent: 0, missingFields: ['Código', 'Nombre', 'Teléfono', 'Ruta'], isComplete: false };
  
  const hasCode = !!(client.code && String(client.code).trim() && String(client.code).trim() !== '0000');
  const hasName = !!(client.name && String(client.name).trim() && String(client.name).trim().toLowerCase() !== 'cliente farmacia');
  const hasPhone = !!(client.phone && String(client.phone).trim().replace(/\D/g, '').length >= 7);
  const hasRoute = !!((client.sector && String(client.sector).trim()) || (client.route && String(client.route).trim()));

  const missingFields = [];
  if (!hasCode) missingFields.push('Código');
  if (!hasName) missingFields.push('Nombre');
  if (!hasPhone) missingFields.push('Teléfono');
  if (!hasRoute) missingFields.push('Ruta');

  let score = 0;
  if (hasCode) score += 1;
  if (hasName) score += 1;
  if (hasPhone) score += 1;
  if (hasRoute) score += 1;

  const percent = Math.round((score / 4) * 100);
  return {
    score,
    percent,
    hasCode,
    hasName,
    hasPhone,
    hasRoute,
    missingFields,
    isComplete: score === 4
  };
}

// Helper: Fusionar registros de clientes conservando los mejores campos
export function mergeClientRecords(base = {}, incoming = {}) {
  const clean = (val) => (val ? String(val).trim() : '');

  // Código más válido
  const code = (clean(incoming.code) && clean(incoming.code) !== '0000') ? clean(incoming.code) : (clean(base.code) || '0000');

  // Nombre no genérico
  let name = clean(incoming.name);
  if (!name || name.toLowerCase() === 'cliente farmacia') {
    name = clean(base.name) || 'Cliente Farmacia';
  }

  // Teléfono más completo
  const p1 = clean(base.phone);
  const p2 = clean(incoming.phone);
  const phone = (p2 && p2.replace(/\D/g, '').length >= 7) ? p2 : (p1 || p2);

  // Ruta / sector más completo
  const r1 = clean(base.route || base.sector);
  const r2 = clean(incoming.route || incoming.sector);
  const route = r2 || r1 || '';

  return {
    code,
    name,
    phone,
    sector: route,
    route,
    lastVisitDate: incoming.lastVisitDate || base.lastVisitDate || incoming.last_visit_date || base.last_visit_date || '',
    totalVisits: Math.max(Number(base.totalVisits || base.total_visits || 0), Number(incoming.totalVisits || incoming.total_visits || 0)),
    updated_at: new Date().toISOString()
  };
}

// Helper: Deduplicar lista de clientes agrupados por código, priorizando registros completos
export function deduplicateClientsList(list = []) {
  if (!Array.isArray(list) || list.length === 0) return [];

  const groups = new Map();

  list.forEach(item => {
    if (!item) return;
    const cleanCode = item.code ? String(item.code).trim().toLowerCase() : '';
    const cleanName = item.name ? String(item.name).trim().toLowerCase() : '';

    let groupKey = '';
    if (cleanCode && cleanCode !== '0000') {
      groupKey = `code:${cleanCode}`;
    } else if (cleanName && cleanName !== 'cliente farmacia') {
      groupKey = `name:${cleanName}`;
    } else {
      groupKey = `raw:${Math.random()}`;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(item);
  });

  const deduplicated = [];

  groups.forEach((groupItems) => {
    if (groupItems.length === 1) {
      deduplicated.push(groupItems[0]);
      return;
    }

    // Ordenar por puntaje de completitud descendente
    groupItems.sort((a, b) => {
      const scoreA = calculateClientCompleteness(a).score;
      const scoreB = calculateClientCompleteness(b).score;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (Number(b.totalVisits || b.total_visits || 0)) - (Number(a.totalVisits || a.total_visits || 0));
    });

    // Fusionar todos los campos del grupo en el registro principal
    let merged = groupItems[0];
    for (let i = 1; i < groupItems.length; i++) {
      merged = mergeClientRecords(merged, groupItems[i]);
    }

    deduplicated.push(merged);
  });

  return deduplicated;
}

// Bulk save clients imported from Excel file into directory and Supabase
export async function saveBulkClientsToDirectory(clientsList = []) {
  if (!Array.isArray(clientsList) || clientsList.length === 0) return { success: false, count: 0, duplicatesResolved: 0 };

  const currentList = getStoredPharmacyDirectory();

  // Deduplicar la lista entrante primero para asegurar que en el archivo no haya conflictos
  const cleanIncoming = deduplicateClientsList(clientsList);
  const duplicatesInUpload = clientsList.length - cleanIncoming.length;

  // Unificar con el directorio existente
  const combined = [...currentList, ...cleanIncoming];
  const finalDirectory = deduplicateClientsList(combined);
  const duplicatesResolved = combined.length - finalDirectory.length;

  // 1. Guardar en localStorage
  try {
    localStorage.setItem('olam_pharmacy_directory_v2', JSON.stringify(finalDirectory));
  } catch (e) {
    console.error('Error saving local directory bulk:', e);
  }

  // 2. Disparar evento para actualizar UI en caliente
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_clients_directory_updated', { detail: finalDirectory }));
  }

  // 3. Preparar e insertar en Supabase (client_codes) para autocompletado en tiempo real
  const supabaseBatch = [];
  finalDirectory.forEach(c => {
    if (c.code && c.code !== '0000' && c.name && c.name !== 'Cliente Farmacia') {
      supabaseBatch.push({
        code: String(c.code).trim(),
        client_name: String(c.name).trim()
      });
    }
  });

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
    count: cleanIncoming.length,
    totalInDirectory: finalDirectory.length,
    duplicatesResolved
  };
}

// Depuración automática de todo el directorio almacenado
export async function cleanAndDeduplicateDirectory() {
  const currentList = getStoredPharmacyDirectory();
  const beforeCount = currentList.length;
  const cleaned = deduplicateClientsList(currentList);
  const removedCount = beforeCount - cleaned.length;

  try {
    localStorage.setItem('olam_pharmacy_directory_v2', JSON.stringify(cleaned));
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_clients_directory_updated', { detail: cleaned }));
  }

  return {
    beforeCount,
    afterCount: cleaned.length,
    removedCount,
    cleaned
  };
}

// Delete an exact client record from the directory (permite borrar un duplicado específico sin borrar el otro)
export async function deleteExactClientRecord(clientToDelete = {}) {
  const currentList = getStoredPharmacyDirectory();
  const targetCode = String(clientToDelete.code || '').trim().toLowerCase();
  const targetName = String(clientToDelete.name || '').trim().toLowerCase();
  const targetPhone = String(clientToDelete.phone || '').trim();

  const idx = currentList.findIndex(c => {
    const cCode = String(c.code || '').trim().toLowerCase();
    const cName = String(c.name || '').trim().toLowerCase();
    const cPhone = String(c.phone || '').trim();

    const codeMatch = targetCode ? (cCode === targetCode) : true;
    const nameMatch = targetName ? (cName === targetName) : true;
    const phoneMatch = targetPhone ? (cPhone === targetPhone) : true;

    return codeMatch && nameMatch && phoneMatch;
  });

  if (idx !== -1) {
    currentList.splice(idx, 1);
  } else {
    // Fallback por código y nombre
    const fIdx = currentList.findIndex(c => {
      const cCode = String(c.code || '').trim().toLowerCase();
      const cName = String(c.name || '').trim().toLowerCase();
      return (targetCode && cCode === targetCode) && (targetName && cName === targetName);
    });
    if (fIdx !== -1) currentList.splice(fIdx, 1);
  }

  try {
    localStorage.setItem('olam_pharmacy_directory_v2', JSON.stringify(currentList));
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('olam_clients_directory_updated', { detail: currentList }));
  }

  // Si ya no queda NINGÚN registro con este código en el directorio, borrar de Supabase
  const stillHasCode = currentList.some(c => String(c.code || '').trim().toLowerCase() === targetCode);
  if (!stillHasCode && targetCode && targetCode !== '0000') {
    try {
      await supabase.from('client_codes').delete().eq('code', clientToDelete.code.trim());
    } catch (e) {}
  }

  return currentList;
}

// Delete a client from the directory (compatibilidad retroactiva)
export async function deleteClientFromDirectory(code, name) {
  return deleteExactClientRecord({ code, name });
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

