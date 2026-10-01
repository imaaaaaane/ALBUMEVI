import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);

async function run() {
  const { data, error } = await supabase.from('products').update({ category: 'Okul İşleri' }).eq('id', '2b1c3718-3668-4607-86b9-2e632c4f36b5');
  console.log("Error:", error);
}
run();
