const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function check() {
  const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
  const swagger = await res.json();
  console.log('Available definitions in swagger:', Object.keys(swagger.definitions || {}));
}
check();
