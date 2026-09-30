const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function testVendorsCRUD() {
  // Test insert
  const res = await fetch(`${url}/rest/v1/vendors`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ name: 'Vendedor Test Temporal', active: true })
  });
  console.log('Insert status:', res.status);
  const data = await res.json();
  console.log('Insert response:', data);

  if (res.status === 201 && data[0]?.id) {
    // Test delete
    const delRes = await fetch(`${url}/rest/v1/vendors?id=eq.${data[0].id}`, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log('Delete status:', delRes.status);
  }
}
testVendorsCRUD();
