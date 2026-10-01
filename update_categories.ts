import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching products...");
  const { data: products, error } = await supabase.from('products').select('*');
  
  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  console.log(`Found ${products?.length || 0} products.`);

  const namesToUpdate = ['Kumbara (şövale)', 'Askılı çerçeve (şövale)', 'Kargo'];

  let updatedCount = 0;

  for (const product of products || []) {
    const name = product.name || '';
    
    // Check if it's one of the exact names, OR if it starts with 'Panoramik ('
    if (namesToUpdate.includes(name) || name.startsWith('Panoramik (')) {
      console.log(`Updating product: ${name}`);
      const { error: updateError } = await supabase
        .from('products')
        .update({ category: 'Okul İşleri' })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Failed to update ${name}:`, updateError);
      } else {
        console.log(`Successfully updated ${name} to 'Okul İşleri'`);
        updatedCount++;
      }
    }
  }

  console.log(`Migration complete! Updated ${updatedCount} products.`);
}

run();
