import { createClient } from '@supabase/supabase-js';


const supabaseUrl = 'https://supxfoigtlhocppolvvb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cHhmb2lndGxob2NwcG9sdnZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkxMDE4MiwiZXhwIjoyMDk4NDg2MTgyfQ.J5ulKFrTeAg6PfzN9x5P3acVuwK_cccs9JzaSHrhAtI';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateUser() {
  const userId = '2e0257cb-94c8-4085-9e62-1676dde9ae77';
  const newEmail = 'albumevi72@gmail.com';
  const newPassword = 'Sg4433925103498';

  console.log(`Updating user: ${userId}...`);

  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    {
      email: newEmail,
      password: newPassword,
      email_confirm: true
    }
  );

  if (error) {
    console.error('Error updating user:', error.message);
  } else {
    console.log('Successfully updated user:', data.user.id);
    console.log('New Email:', data.user.email);
  }
}

updateUser();