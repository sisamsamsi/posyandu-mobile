const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/posyandu-mobile/.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function check() {
  const tempEmail = `temp_test_${Math.floor(Math.random() * 100000)}@test.com`;
  const tempPassword = 'password123';

  console.log('Signing up temporary user:', tempEmail);
  const signUpRes = await supabase.auth.signUp({
    email: tempEmail,
    password: tempPassword
  });

  if (signUpRes.error) {
    console.error('Sign up error:', signUpRes.error.message);
    return;
  }
  console.log('Logged in successfully!');

  const tables = [
    'posyandus',
    'balitas',
    'penimbangans',
    'penyuluhans',
    'lansias',
    'pemeriksaan_lansias',
    'kader_posyandu'
  ];

  for (const table of tables) {
    const { data, count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact' });

    if (error) {
      console.log(`Table: ${table} | Error: ${error.message}`);
    } else {
      console.log(`Table: ${table} | Rows: ${count} | Sample:`, data.slice(0, 2));
    }
  }

  await supabase.auth.signOut();
}

check();
