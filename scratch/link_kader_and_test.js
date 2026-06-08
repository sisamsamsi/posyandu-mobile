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
  console.log(`User ID: ${user.id}`);

  // Try to find if already linked
  const { data: existingLinks } = await supabase.from('kader_posyandu').select('*');
  console.log('Existing links:', existingLinks);

  const posyanduId = '3ffbae1e-9308-42e7-ab9a-cbab7752372d'; // from the balita fetched earlier

  if (!existingLinks || existingLinks.length === 0) {
    console.log(`No existing link found. Linking user to posyandu ${posyanduId}...`);
    const { data: insertLink, error: linkErr } = await supabase
      .from('kader_posyandu')
      .insert({
        user_id: user.id,
        posyandu_id: posyanduId,
        role: 'ketua',
        fokus_layanan: 'semua'
      })
      .select();

    if (linkErr) {
      console.error('Failed to link kader to posyandu:', linkErr);
      return;
    }
    console.log('Successfully linked kader!', insertLink);
  }

  // Fetch one balita
  const { data: balitas } = await supabase.from('balitas').select('id, nama').eq('posyandu_id', posyanduId).limit(1);
  if (!balitas || balitas.length === 0) {
    console.log('No balitas found in this posyandu.');
    return;
  }
  const balita = balitas[0];
  console.log(`Testing with balita: ${balita.nama} (${balita.id})`);

  // Attempt insert into imunisasi
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

run();
