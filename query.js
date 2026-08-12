const URL = "https://supxfoigtlhocppolvvb.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cHhmb2lndGxob2NwcG9sdnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTAxODIsImV4cCI6MjA5ODQ4NjE4Mn0.r_2RJcvJ3wMMxVpArAfXXHRwMfYLDDOxGMXfkxi1V2k";

async function run() {
  const res = await fetch(`${URL}/rest/v1/expense_transactions?limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Prefer': 'return=representation', 'Content-Type': 'application/json' },
    method: 'POST',
    body: JSON.stringify({ transaction_type: 'payment', amount: 1 })
  });
  if (res.ok || res.status === 400 || res.status === 409 || res.status === 201) {
    const data = await res.json();
    console.log(data);
  } else {
    console.log(res.status, await res.text());
  }
}

run();
