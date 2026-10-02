const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const targetVendors = [
  'Antonio Celada',
  'Ana Lucia Marroquin',
  'Jessica Noriega',
  'Wally Natareno',
  'Erick Curley',
  'Estuardo Cordova',
  'Karina Pineda',
  'Dany Peres',
  'Klissman Hernandez',
  'Elio Caceros',
  'Josue Aguilar',
  'Elias Quiej'
];

async function updateSupabaseVendors() {
  console.log('Fetching current vendors...');
  const res = await fetch(`${url}/rest/v1/vendors?select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const current = await res.json();
  console.log('Current count:', current.length);

  // Delete all current vendors from Supabase
  for (const v of current) {
    await fetch(`${url}/rest/v1/vendors?id=eq.${v.id}`, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
  }

  // Insert new vendors in the exact order
  for (let i = 0; i < targetVendors.length; i++) {
    const name = targetVendors[i];
    const insertRes = await fetch(`${url}/rest/v1/vendors`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: i + 1,
        name: name,
        active: true
      })
    });
    const inserted = await insertRes.json();
    console.log(`Inserted [${i + 1}]:`, inserted);
  }

  // Verify
  const verifyRes = await fetch(`${url}/rest/v1/vendors?select=*&order=id.asc`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const finalVendors = await verifyRes.json();
  console.log('Final Supabase vendors count:', finalVendors.length);
  finalVendors.forEach(v => console.log(`- ${v.id}: ${v.name}`));
}

updateSupabaseVendors();
