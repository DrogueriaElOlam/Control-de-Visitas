const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function checkOtherTables() {
  const tables = ['client_codes', 'productos_tienda', 'users', 'vendor_auth', 'app_settings', 'products'];
  for (const t of tables) {
    const res = await fetch(`${url}/rest/v1/${t}?limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log(`Table ${t}: status ${res.status}`);
    if (res.status === 200) {
      console.log(`  Sample:`, await res.json());
    }
  }
}
checkOtherTables();
