import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkUndetermined() {
  console.log('Fetching penimbangans with undetermined Z-scores...');
  const { data, error } = await supabase
    .from('penimbangans')
    .select(`
      id,
      berat_badan,
      tinggi_badan,
      tanggal,
      zscore_bb_u,
      status_bb_u,
      zscore_bb_tb,
      status_bb_tb,
      balita:balitas(
        id,
        nama,
        tanggal_lahir,
        jenis_kelamin
      )
    `)
    .or("status_bb_tb.eq.Tidak dapat ditentukan,status_bb_u.eq.Tidak dapat ditentukan");

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} records with undetermined status.`);
  
  if (data && data.length > 0) {
    for (const r of data) {
      const balita: any = Array.isArray(r.balita) ? r.balita[0] : r.balita;
      if (!balita) {
        console.log(`\nRecord ${r.id} has no associated balita!`);
        continue;
      }
      const birthDate = balita.tanggal_lahir;
      const measureDate = r.tanggal;
      const sex = balita.jenis_kelamin;
      const nama = balita.nama;

      // Calculate age in months
      const birth = new Date(birthDate);
      const ref = new Date(measureDate);
      const years = ref.getFullYear() - birth.getFullYear();
      const months = ref.getMonth() - birth.getMonth();
      const days = ref.getDate() - birth.getDate();
      let ageMonths = years * 12 + months;
      if (days < 0) ageMonths--;
      ageMonths = Math.max(0, ageMonths);

      console.log(`\n---------------------------------`);
      console.log(`Balita: ${nama} (${sex})`);
      console.log(`Tanggal Lahir: ${birthDate}, Tanggal Timbang: ${measureDate}`);
      console.log(`Usia: ${ageMonths} bulan`);
      console.log(`BB: ${r.berat_badan} kg, TB: ${r.tinggi_badan} cm`);
      console.log(`Status BB/U: ${r.status_bb_u} (Z: ${r.zscore_bb_u})`);
      console.log(`Status BB/TB: ${r.status_bb_tb} (Z: ${r.zscore_bb_tb})`);
    }
  }
}

checkUndetermined();
