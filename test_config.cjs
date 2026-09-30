const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function testUUID() {
  const uuid = 'a0000000-0000-0000-0000-000000000001';
  const resUpsert = await fetch(`${url}/rest/v1/daily_supervision_history`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      id: uuid,
      date: '2026-09-24',
      datos: { type: 'vendor_auth_config', test: true }
    })
  });
  console.log('Upsert status:', resUpsert.status);
  console.log('Result:', await resUpsert.json());

  // Clean up
  await fetch(`${url}/rest/v1/daily_supervision_history?id=eq.${uuid}`, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
}
testUUID();
