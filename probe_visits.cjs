const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function testClientType() {
  const types = ['propio', 'nuevo', 'cobertura', 'recuperado', 'revisita', 'Propio', 'Nuevo', 'PROPIO', 'NUEVO'];
  for (const ct of types) {
    const doc = {
      client_name: 'Cliente Test',
      client_code: '0001',
      visit_type: 'presencial',
      client_type: ct,
      sector: 'Coban #13',
      day_period: 'mañana',
      vendor_name: 'Ana Lucia Marroquín',
      route: 'Coban #13',
      visit_date: '2026-09-24'
    };
    const res = await fetch(`${url}/rest/v1/visits`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(doc)
    });
    const data = await res.json();
    if (res.status === 201) {
      console.log(`SUCCESS with client_type "${ct}"! Full inserted row:`, data[0]);
      // delete the test record
      await fetch(`${url}/rest/v1/visits?id=eq.${data[0].id}`, {
        method: 'DELETE',
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      break;
    } else {
      console.log(`"${ct}" failed:`, data.message);
    }
  }
}
testClientType();
