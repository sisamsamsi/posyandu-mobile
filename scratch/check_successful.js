const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSuccessful() {
  console.log('Querying penimbangans with successful BB/TB Z-scores...');
  const { data, error } = await supabase
    .from('penimbangans')
    .select(`
      id,
      berat_badan,
      tinggi_badan,
      tanggal,
      zscore_bb_tb,
      status_bb_tb,
      balita:balitas(
        id,
        nama,
        tanggal_lahir,
        jenis_kelamin
      )
    `)
    .not('status_bb_tb', 'is', null)
    .not('status_bb_tb', 'eq', 'Tidak dapat ditentukan')
    .limit(15);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found some successful records (showing up to 15):`);
  for (const r of data) {
    const balita = Array.isArray(r.balita) ? r.balita[0] : r.balita;
    if (!balita) continue;
    console.log(`- ${balita.nama} (${balita.jenis_kelamin}): Timbang: ${r.tanggal} | BB: ${r.berat_badan} kg, TB: ${r.tinggi_badan} cm | BB/TB: ${r.status_bb_tb} (Z: ${r.zscore_bb_tb})`);
  }
}

checkSuccessful();
