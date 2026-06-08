const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log('Logging in...');
  const login = await supabase.auth.signInWithPassword({
    email: 'kader@posyandu.com',
    password: 'password123'
  });

  if (login.error) {
    console.error('Login error:', login.error.message);
    return;
  }

  // Fetch one balita to test
  const { data: balitas } = await supabase.from('balitas').select('id, nama').limit(1);
  if (!balitas || balitas.length === 0) {
    console.log('No balitas found.');
    return;
  }
  const balita = balitas[0];
  console.log(`Testing with balita: ${balita.nama} (${balita.id})`);

  // Attempt to insert
  const payload = {
    balita_id: balita.id,
    hb0_date: '2026-06-01',
    bcg_date: '2026-06-05'
  };

  console.log('Attempting insert into imunisasi...');
  const insertRes = await supabase.from('imunisasi').insert(payload).select();
  if (insertRes.error) {
    console.error('Insert error:', insertRes.error);
  } else {
    console.log('Insert SUCCESS:', insertRes.data);
    
    // Clean up
    console.log('Cleaning up inserted record...');
    const deleteRes = await supabase.from('imunisasi').delete().eq('id', insertRes.data[0].id);
    console.log('Delete status:', deleteRes.error ? deleteRes.error.message : 'OK');
  }
}

check();
