const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
);

async function findUndetermined() {
  console.log('Finding records where Z-score status is "Tidak dapat ditentukan"...');
  
  const { data, error } = await supabase
    .from('penimbangans')
    .select(`
      id,
      berat_badan,
      tinggi_badan,
      tanggal,
      zscore_bb_u,
      status_bb_u,
      zscore_tb_u,
      status_tb_u,
      zscore_bb_tb,
      status_bb_tb,
      balita:balitas(
        id,
        nama,
        tanggal_lahir,
        jenis_kelamin
      )
    `);

  if (error) {
    console.error('Error fetching records:', error);
    return;
  }

  const undeterminedRecords = [];

  for (const r of data) {
    const statusBbTb = r.status_bb_tb;
    const statusBbU = r.status_bb_u;
    const statusTbU = r.status_tb_u;

    if (
      statusBbTb === 'Tidak dapat ditentukan' || 
      statusBbU === 'Tidak dapat ditentukan' ||
      statusTbU === 'Tidak dapat ditentukan'
    ) {
      undeterminedRecords.push(r);
    }
  }

  console.log(`Found ${undeterminedRecords.length} records with 'Tidak dapat ditentukan' status.`);

  for (const r of undeterminedRecords) {
    const balita = Array.isArray(r.balita) ? r.balita[0] : r.balita;
    if (!balita) {
      console.log(`Record ${r.id} has NO balita! BB: ${r.berat_badan}, TB: ${r.tinggi_badan}, Tanggal: ${r.tanggal}`);
      continue;
    }
    const birth = new Date(balita.tanggal_lahir);
    const ref = new Date(r.tanggal);
    const years = ref.getFullYear() - birth.getFullYear();
    const months = ref.getMonth() - birth.getMonth();
    const days = ref.getDate() - birth.getDate();
    let ageMonths = years * 12 + months;
    if (days < 0) ageMonths--;
    ageMonths = Math.max(0, ageMonths);

    console.log(`\n- ${balita.nama} (${balita.jenis_kelamin}):`);
    console.log(`  Lahir: ${balita.tanggal_lahir}, Timbang: ${r.tanggal} (${ageMonths} bln)`);
    console.log(`  BB: ${r.berat_badan} kg, TB: ${r.tinggi_badan} cm`);
    console.log(`  BB/U: ${r.status_bb_u} (${r.zscore_bb_u})`);
    console.log(`  TB/U: ${r.status_tb_u} (${r.zscore_tb_u})`);
    console.log(`  BB/TB: ${r.status_bb_tb} (${r.zscore_bb_tb})`);
  }
}

findUndetermined();
