import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: o } = await supabase.from('orders').select('*').limit(1);
  const { data: oi } = await supabase.from('order_items').select('*').limit(1);
  console.log('orders sample:', o);
  console.log('order_items sample:', oi);
}
run();
