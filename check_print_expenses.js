import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://supxfoigtlhocppolvvb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cHhmb2lndGxob2NwcG9sdnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTAxODIsImV4cCI6MjA5ODQ4NjE4Mn0.r_2RJcvJ3wMMxVpArAfXXHRwMfYLDDOxGMXfkxi1V2k'
);

async function run() {
  const { data, error } = await supabase.from('print_expenses').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log("Success. Rows:", data);
  }
}
run();
