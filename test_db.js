import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://supxfoigtlhocppolvvb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cHhmb2lndGxob2NwcG9sdnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTAxODIsImV4cCI6MjA5ODQ4NjE4Mn0.r_2RJcvJ3wMMxVpArAfXXHRwMfYLDDOxGMXfkxi1V2k'
);

async function run() {
  const { data: oData, error: oErr } = await supabase.from('orders').select('*').limit(1);
  console.log('Orders:', oData, oErr);
  
  const { data: sData, error: sErr } = await supabase.from('school_transactions').select('*').limit(1);
  console.log('School Tx:', sData, sErr);
}
run();
