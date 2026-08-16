import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
async function test() {
  const { data, error } = await supabase.from('product_costs').select('*').limit(1);
  console.log("Data:", data, "Error:", error);
}
test();
