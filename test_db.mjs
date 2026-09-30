import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  const { data: vData, error: vError } = await supabase.from('vendors').select('*').limit(1);
  console.log('vendors table test:', { vData, vError: vError ? vError.message : null });

  const { data: viData, error: viError } = await supabase.from('visits').select('*').limit(1);
  console.log('visits table test:', { viData, viError: viError ? viError.message : null });
}
test();
