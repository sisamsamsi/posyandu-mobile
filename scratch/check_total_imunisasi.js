const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Logging in as kader...');
  const login = await supabase.auth.signInWithPassword({
    email: 'kader@posyandu.com',
    password: 'password123'
  });

  if (login.error) {
    console.error('Login error:', login.error.message);
    return;
  }

  const { data: balitas, error: bErr } = await supabase
    .from('balitas')
    .select('id, nama');
  
  if (bErr) {
    console.error('Error fetching balitas:', bErr.message);
    return;
  }

  console.log(`Fetched ${balitas.length} balitas.`);

  const { data: imunisasi, error: iErr } = await supabase
    .from('imunisasi')
    .select('*');

  if (iErr) {
    console.error('Error fetching imunisasi:', iErr.message);
    return;
  }

  console.log(`Fetched ${imunisasi.length} imunisasi rows.`);
  if (imunisasi.length > 0) {
    console.log('Sample immunization row:', imunisasi[0]);
  }
}

run();
