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

  const user = login.data.user;
  const posyanduId = '3ffbae1e-9308-42e7-ab9a-cbab7752372d';

  // Fetch one balita
  const { data: balitas } = await supabase.from('balitas').select('id, nama').eq('posyandu_id', posyanduId).limit(1);
  if (!balitas || balitas.length === 0) {
    console.log('No balitas found in this posyandu.');
    return;
  }
  const balita = balitas[0];
  console.log(`Testing UPDATE with balita: ${balita.nama} (${balita.id})`);

  // Check if record exists
  const { data: existing, error: fetchErr } = await supabase
    .from('imunisasi')
    .select('*')
    .eq('balita_id', balita.id)
    .maybeSingle();

  if (fetchErr) {
    console.error('Fetch existing error:', fetchErr);
    return;
  }

  console.log('Existing record:', existing);

  if (existing) {
    console.log('Attempting UPDATE on existing record...');
    const updateRes = await supabase
      .from('imunisasi')
      .update({
        hb0_date: '2026-06-02',
        bcg_date: '2026-06-06'
      })
      .eq('id', existing.id)
      .select();

    if (updateRes.error) {
      console.error('Update error:', updateRes.error);
    } else {
      console.log('Update SUCCESS:', updateRes.data);
    }
  } else {
    console.log('No existing record found to update.');
  }
}

run();
