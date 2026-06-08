const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testUser(email, password) {
  console.log(`\n===================================`);
  console.log(`Testing with user: ${email}`);
  console.log(`===================================`);
  
  const login = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (login.error) {
    console.error('Login error:', login.error.message);
    return;
  }

  const user = login.data.user;
  console.log(`Logged in successfully! User ID: ${user.id}`);

  // Check user role
  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('*');
  
  if (roleError) {
    console.error('Error fetching user_roles:', roleError.message);
  } else {
    console.log('User roles in DB:', roles);
  }

  // Check if user is in kader_posyandu
  const { data: kaderPosyandu, error: kpError } = await supabase
    .from('kader_posyandu')
    .select('*');
  
  if (kpError) {
    console.error('Error fetching kader_posyandu:', kpError.message);
  } else {
    console.log('Kader posyandu entries:', kaderPosyandu);
  }

  // Check access to balitas
  const { data: balitas, error: balitaError } = await supabase
    .from('balitas')
    .select('id, nama, posyandu_id')
    .limit(3);
  
  if (balitaError) {
    console.error('Error fetching balitas:', balitaError.message);
  } else {
    console.log(`Fetched ${balitas.length} balitas:`, balitas);
  }

  // Check access to imunisasi
  const { data: imunisasi, error: imunisasiError } = await supabase
    .from('imunisasi')
    .select('*')
    .limit(3);
  
  if (imunisasiError) {
    console.error('Error fetching imunisasi:', imunisasiError.message);
  } else {
    console.log(`Fetched ${imunisasi.length} imunisasi records:`, imunisasi);
  }
}

async function run() {
  await testUser('kader@posyandu.com', 'password123');
  await testUser('simulasi@posyandu.com', 'password123');
}

run();
