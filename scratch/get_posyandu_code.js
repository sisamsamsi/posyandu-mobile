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

  const { data: posyandus, error: posError } = await supabase
    .from('posyandus')
    .select('*');

  if (posError) {
    console.error('Error fetching posyandus:', posError.message);
    return;
  }

  console.log('All Posyandus found:');
  posyandus.forEach(p => {
    console.log(`- ID: ${p.id}, Nama: "${p.nama_posyandu}", Code/Keys:`, Object.keys(p).reduce((acc, key) => {
      if (key.includes('code') || key.includes('kode') || key.includes('invite') || key.includes('undangan') || key.includes('token') || key.includes('key')) {
        acc[key] = p[key];
      }
      return acc;
    }, {}));
  });

  const target = posyandus.find(p => p.nama_posyandu && p.nama_posyandu.toLowerCase().includes('mandingan'));
  if (target) {
    console.log('\nMATCHING POSYANDU:', JSON.stringify(target, null, 2));
  } else {
    console.log('\nNo posyandu matching "mandingan" found.');
  }
}

main();
