const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function run() {
  console.log('Connecting to Supabase at:', url);

  // 1. Ensure Karina Pineda exists in vendors
  const checkV = await fetch(`${url}/rest/v1/vendors?name=eq.Karina%20Pineda`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  }).then(r => r.json());

  if (!checkV || checkV.length === 0) {
    const vRes = await fetch(`${url}/rest/v1/vendors`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ name: 'Karina Pineda', active: true })
    }).then(r => r.json());
    console.log('Inserted Karina Pineda:', vRes);
  } else {
    console.log('Karina Pineda vendor found with ID:', checkV[0].id);
  }

  // 2. Insert the 10 real sample visits from user's report
  const visits = [
    {
      client_code: '5259',
      client_name: 'Farmacia Yaneth',
      sector: 'Jalapa #62',
      visit_type: 'telemarketing',
      client_type: 'propio',
      day_period: 'mañana',
      has_sale: false,
      sale_type: null,
      sale_amount: 0,
      has_collection: true,
      collection_cash: 0,
      collection_transfer: 1000,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 1000,
      observations: 'Canceló con deposito',
      latitude: 14.800632,
      longitude: -89.540262,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '2134',
      client_name: 'Mariela Lilibeth Agustín',
      sector: 'Chiquimula I #61',
      visit_type: 'presencial',
      client_type: 'propio',
      day_period: 'mañana',
      has_sale: false,
      sale_type: null,
      sale_amount: 0,
      has_collection: true,
      collection_cash: 0,
      collection_transfer: 1670.75,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 1670.75,
      observations: 'Canceló con deposito',
      latitude: 14.800635,
      longitude: -89.540268,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '331',
      client_name: 'Marisol González',
      sector: 'Jalapa #62',
      visit_type: 'presencial',
      client_type: 'propio',
      day_period: 'mañana',
      has_sale: false,
      sale_type: null,
      sale_amount: 0,
      has_collection: true,
      collection_cash: 0,
      collection_transfer: 1133.55,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 1133.55,
      observations: 'Canceló con deposito',
      latitude: 14.800598,
      longitude: -89.540258,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '2817',
      client_name: 'Blue médica',
      sector: '#64 y #65',
      visit_type: 'presencial',
      client_type: 'propio',
      day_period: 'mañana',
      has_sale: true,
      sale_type: 'presencial',
      sale_amount: 845.45,
      has_collection: false,
      collection_cash: 0,
      collection_transfer: 0,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 0,
      observations: 'Realizó pedido',
      latitude: 14.800647,
      longitude: -89.540272,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '5273',
      client_name: 'Ingrid Moscoso',
      sector: 'Jalapa #62',
      visit_type: 'presencial',
      client_type: 'propio',
      day_period: 'mañana',
      has_sale: true,
      sale_type: 'presencial',
      sale_amount: 7600.00,
      has_collection: false,
      collection_cash: 0,
      collection_transfer: 0,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 0,
      observations: 'Realizó pedido',
      latitude: 14.800629,
      longitude: -89.540269,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '1323',
      client_name: 'Centro médico el nazareno',
      sector: 'Chiquimula II #63',
      visit_type: 'presencial',
      client_type: 'propio',
      day_period: 'mañana',
      has_sale: true,
      sale_type: 'presencial',
      sale_amount: 1413.75,
      has_collection: false,
      collection_cash: 0,
      collection_transfer: 0,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 0,
      observations: 'Realizó',
      latitude: 14.800631,
      longitude: -89.540266,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '338',
      client_name: 'Farmacia Eben-Ezer',
      sector: 'Chiquimula II #63',
      visit_type: 'presencial',
      client_type: 'propio',
      day_period: 'tarde',
      has_sale: false,
      sale_type: null,
      sale_amount: 0,
      has_collection: true,
      collection_cash: 0,
      collection_transfer: 0,
      collection_check: 3935.14,
      collection_boleta: 0,
      collection_amount: 3935.14,
      observations: 'Canceló con cheque prefechado',
      latitude: 14.800641,
      longitude: -89.540269,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '331',
      client_name: 'Marisol González',
      sector: 'Jalapa #62',
      visit_type: 'telemarketing',
      client_type: 'propio',
      day_period: 'tarde',
      has_sale: true,
      sale_type: 'telemarketing',
      sale_amount: 1447.76,
      has_collection: false,
      collection_cash: 0,
      collection_transfer: 0,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 0,
      observations: 'Realizó pedido',
      latitude: null,
      longitude: null,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '2971',
      client_name: 'Droguería Alegría',
      sector: '#64 y #65',
      visit_type: 'telemarketing',
      client_type: 'propio',
      day_period: 'tarde',
      has_sale: true,
      sale_type: 'telemarketing',
      sale_amount: 2567.56,
      has_collection: false,
      collection_cash: 0,
      collection_transfer: 0,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 0,
      observations: 'Realizó pedido',
      latitude: 14.800636,
      longitude: -89.540268,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    },
    {
      client_code: '4124',
      client_name: 'Permanencia Médica',
      sector: '#64 y #65',
      visit_type: 'telemarketing',
      client_type: 'propio',
      day_period: 'tarde',
      has_sale: true,
      sale_type: 'telemarketing',
      sale_amount: 12300.00,
      has_collection: false,
      collection_cash: 0,
      collection_transfer: 0,
      collection_check: 0,
      collection_boleta: 0,
      collection_amount: 0,
      observations: 'Realizó pedido',
      latitude: 14.800627,
      longitude: -89.540261,
      vendor_name: 'Karina Pineda',
      route: 'Chiquimula II #63',
      visit_date: '2026-09-24'
    }
  ];

  for (const v of visits) {
    const res = await fetch(`${url}/rest/v1/visits`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(v)
    });
    const data = await res.json();
    if (res.status === 201) {
      console.log(`✓ Inserted: ${v.client_name} (ID: ${data[0].id})`);
    } else {
      console.log(`✗ Failed ${v.client_name}:`, data);
    }
  }
}

run();
