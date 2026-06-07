const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkKayla() {
  const { data, error } = await supabase
    .from('penimbangans')
    .select(`
      id,
      berat_badan,
      tinggi_badan,
      tanggal,
      zscore_bb_tb,
      status_bb_tb,
      zscore_bb_u,
      status_bb_u,
      zscore_tb_u,
      status_tb_u,
      balita:balitas(
        id,
        nama,
        tanggal_lahir,
        jenis_kelamin
      )
    `)
    .ilike('balitas.nama', '%Kayla Nadhifa%');

  if (error) {
    console.error('Error fetching records:', error);
    return;
  }

  const filtered = data.filter(r => r.balita !== null);

  console.log(`Found ${filtered.length} records for Kayla:`);
  for (const r of filtered) {
    const balita = Array.isArray(r.balita) ? r.balita[0] : r.balita;
    console.log(`\nRecord ID: ${r.id}`);
    console.log(`Tanggal: ${r.tanggal}`);
    console.log(`BB: ${r.berat_badan} kg, TB: ${r.tinggi_badan} cm`);
    console.log(`BB/U: ${r.status_bb_u} (${r.zscore_bb_u})`);
    console.log(`TB/U: ${r.status_tb_u} (${r.zscore_tb_u})`);
    console.log(`BB/TB: ${r.status_bb_tb} (${r.zscore_bb_tb})`);
  }
}

checkKayla();
