const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function run() {
  console.log('Logging in...');
  await supabase.auth.signInWithPassword({
    email: 'kader@posyandu.com',
    password: 'password123'
  });

  console.log('Querying penyuluhans...');
  const { data, error } = await supabase
    .from('penyuluhans')
    .select(`
      id,
      tanggal,
      pertanyaan,
      jawaban,
      rekomendasi,
      balitas(
        nama,
        rt
      )
    `)
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} records.`);
  data.forEach((r, idx) => {
    console.log(`\nRecord ${idx + 1}:`);
    console.log(`ID: ${r.id}`);
    console.log(`Tanggal: ${r.tanggal}`);
    console.log(`Balita: ${r.balitas?.nama} (RT ${r.balitas?.rt})`);
    console.log(`Pertanyaan:`, r.pertanyaan);
    console.log(`Jawaban:`, r.jawaban);
    console.log(`Rekomendasi (first 100 chars):`, r.rekomendasi?.substring(0, 100));
  });
}

run();
