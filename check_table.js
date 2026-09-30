import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf8')
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1]
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1]

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('daily_supervision_history').select('*').limit(1)
  console.log('Error:', error)
  console.log('Data:', data)
}

check()
