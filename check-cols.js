import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('/Users/Emy/Downloads/ALBUMEVI/.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, val] = line.split('=')
    env[key] = val.trim()
  }
})

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY'])

async function run() {
  const { data, error } = await supabase.from('students').select('*').limit(1)
  if (error) {
    console.error("Error:", error)
    return
  }
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]))
  } else {
    console.log("Empty table, but let's try an invalid column to see error.")
    const { error: err2 } = await supabase.from('students').select('some_non_existent_col').limit(1)
    console.log("Error details:", err2)
    
    // We can't get schema easily without a Postgres connection string, which isn't in .env.
    // Wait, let's just insert a dummy student and check what columns are returned if we select '*'.
    const { data: d2, error: err3 } = await supabase.from('students').insert({ name: 'Test', class_id: null }).select('*')
    console.log("Inserted:", d2, err3)
  }
}

run()
