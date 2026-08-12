async function run() {
  const res = await fetch("https://supxfoigtlhocppolvvb.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cHhmb2lndGxob2NwcG9sdnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTAxODIsImV4cCI6MjA5ODQ4NjE4Mn0.r_2RJcvJ3wMMxVpArAfXXHRwMfYLDDOxGMXfkxi1V2k");
  const json = await res.json();
  console.log(Object.keys(json.definitions.print_expenses.properties));
}
run();
