import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  const { data } = await supabase.from('daily_supervision_history').select('*').limit(3).order('created_at', {ascending: false})
  console.log(JSON.stringify(data, null, 2))
}
run()
