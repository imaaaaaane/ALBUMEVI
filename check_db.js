import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    let { data: d1, error: e1 } = await supabase.from('orders').select('*').limit(1);
    console.log("orders:", d1, e1);
    let { data: d2, error: e2 } = await supabase.from('photo_shoots').select('*').limit(1);
    console.log("photo_shoots:", d2, e2);
}
run();
