const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function testVendors() {
  const res = await fetch(`${url}/rest/v1/vendors?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('Vendor columns:', Object.keys((await res.json())[0] || {}));
}
testVendors();
