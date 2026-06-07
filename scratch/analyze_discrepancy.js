const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function analyze() {
  const names = [
    'NOOR ABBIAN RAMADHAN',
    'HILYA KARIMA FIRDAUSI',
    'DANISH GAMAL SETYAWAN',
    'IZYAN ARUTALA RAMADHAN',
    'ALLEYA MIKHAYLA SYADIRA',
    'ISHWARI CHIRA SASMITA',
    'AFFANDRA DREARSA KANUGRAHAN',
    'NAZIVA SANAYA AZKAYRA WIDYATMOKO'
  ];

  // 1. Find balitas
  const { data: balitas, error: bError } = await supabase
    .from('balitas')
    .select('id, nama, tanggal_lahir, jenis_kelamin')
    .in('nama', names);

  if (bError) {
    console.error('Error fetching balitas:', bError);
    return;
  }

  console.log(`Found ${balitas.length} balitas in DB.`);

  const balitaIds = balitas.map(b => b.id);

  // 2. Find penimbangans in May 2026
  const { data: penimbangans, error: pError } = await supabase
    .from('penimbangans')
    .select('*, balitas(nama, tanggal_lahir, jenis_kelamin)')
    .in('balita_id', balitaIds)
    .gte('tanggal', '2026-05-01')
    .lte('tanggal', '2026-05-31');

  if (pError) {
    console.error('Error fetching penimbangans:', pError);
    return;
  }

  console.log(`Found ${penimbangans.length} penimbangan records for May 2026.`);
  penimbangans.forEach(p => {
    console.log(`\nChild: ${p.balitas.nama}`);
    console.log(`  DOB: ${p.balitas.tanggal_lahir} | Gender: ${p.balitas.jenis_kelamin}`);
    console.log(`  Date: ${p.tanggal}`);
    console.log(`  Weight: ${p.berat_badan} | Height: ${p.tinggi_badan}`);
    console.log(`  App ZScores: BB/U: ${p.zscore_bb_u} | TB/U: ${p.zscore_tb_u} | BB/TB: ${p.zscore_bb_tb}`);
    console.log(`  App Status: BB/U: ${p.status_bb_u} | TB/U: ${p.status_tb_u} | BB/TB: ${p.status_bb_tb}`);
  });
}

analyze();
