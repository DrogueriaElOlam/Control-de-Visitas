import { supabase } from './supabase.js';
import { getLocalDateString } from './dateUtils.js';
import { normalizeVendorName, getVisitsList } from './db.js';

// Lista de los 11 vendedores oficiales canónicos de Droguería El Olam
export const OFFICIAL_VENDORS = [
  { id: 1, name: 'Danny Pérez', canonicalName: 'Dany Peres', defaultCompromiso: 2040500.00, route: 'Coatepeque #24' },
  { id: 2, name: 'Jessica Noriega', canonicalName: 'Jessica Noriega', defaultCompromiso: 2012001.00, route: 'Suchi I #21' },
  { id: 3, name: 'Wally Natareno', canonicalName: 'Wally Natareno', defaultCompromiso: 1988000.00, route: 'Peten I #73' },
  { id: 4, name: 'Ana Lucía Marroquín', canonicalName: 'Ana Lucia Marroquin', defaultCompromiso: 1968000.00, route: 'Escuintla I #A1' },
  { id: 5, name: 'Josué Aguilar', canonicalName: 'Josue Aguilar', defaultCompromiso: 1940000.00, route: 'Capital S1 #64' },
  { id: 6, name: 'Estuardo Córdova', canonicalName: 'Estuardo Cordova', defaultCompromiso: 1605500.00, route: 'Coban #13' },
  { id: 7, name: 'Karina Pineda', canonicalName: 'Karina Pineda', defaultCompromiso: 1560500.00, route: 'Quetzaltenango #11' },
  { id: 8, name: 'Elías Quiej', canonicalName: 'Elias Quiej', defaultCompromiso: 1403205.00, route: 'Chiquimula I #61' },
  { id: 9, name: 'Erick Curley', canonicalName: 'Erick Curley', defaultCompromiso: 1397736.50, route: 'Huehuetenango Centro #A4' },
  { id: 10, name: 'Elio Cáceres', canonicalName: 'Elio Caceros', defaultCompromiso: 1262500.00, route: 'San Marcos I #92' },
  { id: 11, name: 'Klissman Hernández', canonicalName: 'Klissman Hernandez', defaultCompromiso: 595000.00, route: 'Jalapa #62' }
];

const STORAGE_KEYS = {
  DAILY_COMMITMENTS: 'olam_daily_commitments_history_v1',
  SUPERVISION_RECORDS: 'olam_supervision_daily_records_v1'
};

/**
 * Normaliza cualquier nombre de vendedor a uno de los 11 canónicos
 */
export function getCanonicalVendorName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  const clean = rawName.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  for (const v of OFFICIAL_VENDORS) {
    const vClean = v.canonicalName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const vDisplayNameClean = v.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (clean === vClean || clean === vDisplayNameClean || clean.includes(vClean) || vClean.includes(clean)) {
      return v.name; // Retorna el nombre de visualización oficial
    }
  }

  return normalizeVendorName(rawName);
}

/**
 * Obtiene el compromiso de venta de una fecha específica
 */
export async function getDailyCommitments(dateStr = getLocalDateString()) {
  let localData = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_COMMITMENTS);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {
    console.error('Error al leer compromisos locales:', e);
  }

  // Si existe en almacenamiento local para esa fecha, retornarlo
  if (localData[dateStr]) {
    return localData[dateStr];
  }

  // Intentar consultar en Supabase
  try {
    const { data, error } = await supabase
      .from('daily_supervision_history')
      .select('*')
      .eq('date', dateStr)
      .limit(1)
      .maybeSingle();

    if (data && data.datos?.commitments) {
      localData[dateStr] = data.datos.commitments;
      localStorage.setItem(STORAGE_KEYS.DAILY_COMMITMENTS, JSON.stringify(localData));
      return data.datos.commitments;
    }
  } catch (err) {
    console.warn('Fallback Supabase compromisos:', err);
  }

  // Valores predeterminados oficiales
  const defaults = {};
  OFFICIAL_VENDORS.forEach(v => {
    defaults[v.name] = v.defaultCompromiso;
  });

  return defaults;
}

/**
 * Guarda o vacía los compromisos y registros diarios a la base de datos (Supabase y Local)
 */
export async function saveDailySupervisionSnapshot({
  date = getLocalDateString(),
  commitments = {},
  records = [],
  summary = {}
}) {
  const payload = {
    date,
    datos: {
      commitments,
      records,
      summary,
      total_compromiso: Object.values(commitments).reduce((sum, val) => sum + (Number(val) || 0), 0),
      timestamp: new Date().toISOString()
    }
  };

  // 1. Guardar localmente
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_COMMITMENTS) || '{}';
    const parsed = JSON.parse(raw);
    parsed[date] = commitments;
    localStorage.setItem(STORAGE_KEYS.DAILY_COMMITMENTS, JSON.stringify(parsed));
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
  }

  // 2. Guardar / Vaciar en Supabase
  try {
    const { error } = await supabase
      .from('daily_supervision_history')
      .upsert({
        date,
        datos: payload.datos
      }, { onConflict: 'date' });

    if (error) {
      // Si la tabla no tiene restricción de unicidad en date, insertar nuevo
      await supabase.from('daily_supervision_history').insert([payload]);
    }
  } catch (err) {
    console.warn('Fallback al vaciar data en Supabase:', err);
  }

  return true;
}

/**
 * Carga y unifica todos los registros que realicen los vendedores
 */
export async function loadUnifiedVendorRecords(dateFilter = null) {
  const allVisits = await getVisitsList();
  
  // Transformar visitas de vendedores a registros de supervisión
  const records = [];
  const processedKeys = new Set();

  for (const v of allVisits) {
    if (!v) continue;
    const vendorOfficialName = getCanonicalVendorName(v.vendorName);
    const visitDate = (v.visitDate || '').trim();

    if (dateFilter && visitDate !== dateFilter) continue;

    const key = `${vendorOfficialName}_${visitDate}_${v.clientName}_${v.id || ''}`;
    if (processedKeys.has(key)) continue;
    processedKeys.add(key);

    records.push({
      id: v.id || `rec_${Date.now()}_${Math.random()}`,
      fecha: visitDate,
      vendedor: vendorOfficialName,
      cliente: v.clientName || 'Cliente en Ruta',
      ruta: v.route || 'General',
      ventas: Number(v.saleAmount) || 0,
      cobros: Number(v.collectionAmount) || 0,
      devoluciones: v.devolutionAmount ? `Q${v.devolutionAmount}` : (v.hasDevolution ? 'Sí' : '-'),
      observaciones: v.notes || (v.hasSale ? 'Venta realizada' : (v.hasCollection ? 'Cobro realizado' : 'Visita'))
    });
  }

  return records;
}
