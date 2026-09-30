const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function testFetch() {
  const tables = ['vendors', 'visits', 'clients', 'products', 'daily_supervision_history'];
  for (const t of tables) {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log(`Table ${t}: status ${res.status}`);
    const text = await res.text();
    console.log(`Table ${t} response: ${text.slice(0, 120)}`);
  }
}
testFetch();
