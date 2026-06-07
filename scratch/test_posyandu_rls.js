const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tuxwriojdglxfrcjayzz.supabase.co';
const supabaseAnonKey = 'sb_publishable_kDrINbNmCoGC3e3tjAoihQ_HNyau6Gd';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const loginRes = await supabase.auth.signInWithPassword({
    email: 'kader@posyandu.com',
    password: 'password123'
  });

  if (loginRes.error) {
    console.error('Login error:', loginRes.error.message);
    return;
  }

  console.log('Logged in successfully!');

  // Test 1: Fetch posyandus
  const { data: posyandus, error: posError } = await supabase
    .from('posyandus')
    .select('*');

  if (posError) {
    console.error('Error fetching posyandus:', posError.message);
  } else {
    console.log(`Fetched ${posyandus.length} posyandus:`, posyandus.map(p => p.nama_posyandu));
  }

  // Test 2: Fetch kader_posyandu
  const { data: rels, error: relError } = await supabase
    .from('kader_posyandu')
    .select('id, user_id, posyandu_id');

  if (relError) {
    console.error('Error fetching kader_posyandu:', relError.message);
  } else {
    console.log(`Fetched ${rels.length} kader_posyandu relations:`, rels);
  }
}

main();
