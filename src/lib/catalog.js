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
