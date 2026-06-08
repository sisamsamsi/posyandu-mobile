const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAnonymous() {
  console.log('--- Checking Anonymous Access ---');
  
  const { data: posyandus, error: pErr } = await supabase.from('posyandus').select('id, nama_posyandu').limit(2);
  console.log('Anonymous posyandus:', pErr ? `Error: ${pErr.message}` : `Success: ${posyandus.length} records`);

  const { data: balitas, error: bErr } = await supabase.from('balitas').select('id, nama').limit(2);
  console.log('Anonymous balitas:', bErr ? `Error: ${bErr.message}` : `Success: ${balitas.length} records`);

  const { data: kader, error: kErr } = await supabase.from('kader_posyandu').select('*').limit(2);
  console.log('Anonymous kader_posyandu:', kErr ? `Error: ${kErr.message}` : `Success: ${kader.length} records`);

  const { data: imunisasi, error: iErr } = await supabase.from('imunisasi').select('*').limit(2);
  console.log('Anonymous imunisasi:', iErr ? `Error: ${iErr.message}` : `Success: ${imunisasi.length} records`);
}

checkAnonymous();
