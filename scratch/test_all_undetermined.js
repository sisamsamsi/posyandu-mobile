const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
);

// Copy ZScoreEngine's lookup and calculation logic
function findReference(standards, sex, measurement) {
  return standards.find(s => s.sex === sex && s.measurement === measurement);
}

function calculateZScore(value, ref) {
  const { minus_3sd: sd3neg, minus_2sd: sd2neg, minus_1sd: sd1neg, median: sd0, plus_1sd: sd1, plus_2sd: sd2, plus_3sd: sd3 } = ref;
  let zscore = 0;

  if (value <= sd3neg) {
    zscore = -3.0 + (value - sd3neg) / (sd2neg - sd3neg || 1);
  } else if (value <= sd2neg) {
    zscore = -2.0 + (value - sd2neg) / (sd1neg - sd2neg || 1);
  } else if (value <= sd1neg) {
    zscore = -1.0 + (value - sd1neg) / (sd0 - sd1neg || 1);
  } else if (value <= sd0) {
    zscore = 0.0 + (value - sd0) / (sd0 - sd1neg || 1);
  } else if (value <= sd1) {
    zscore = 1.0 + (value - sd1) / (sd2 - sd1 || 1);
  } else if (value <= sd2) {
    zscore = 2.0 + (value - sd2) / (sd3 - sd2 || 1);
  } else {
    zscore = 3.0 + (value - sd3) / (sd3 - sd2 || 1);
  }
  return parseFloat(zscore.toFixed(2));
}

async function testAll() {
  console.log('Fetching all 18 undetermined records...');
  
  const { data: penimbangans, error } = await supabase
    .from('penimbangans')
    .select(`
      id,
      berat_badan,
      tinggi_badan,
      tanggal,
      status_bb_tb,
      status_bb_u,
      status_tb_u,
      balita:balitas(
        id,
        nama,
        tanggal_lahir,
        jenis_kelamin
      )
    `);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const undetermined = penimbangans.filter(r => 
    r.status_bb_tb === 'Tidak dapat ditentukan' ||
    r.status_bb_u === 'Tidak dapat ditentukan' ||
    r.status_tb_u === 'Tidak dapat ditentukan'
  );

  console.log(`Analyzing ${undetermined.length} undetermined records...`);

  // Cache standards to avoid repetitive DB requests
  const standardsCache = {};
  async function getCachedStandards(indicator, sex) {
    const key = `${indicator}_${sex}`;
    if (standardsCache[key]) return standardsCache[key];

    const tableName = `who_${indicator}_standards`;
    const genderKey = sex === 'Laki-laki' ? 'L' : 'P';
    const orderColumn = indicator === 'bb_tb' ? 'measurement' : 'usia_bulan';

    const { data: rawData, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('jenis_kelamin', genderKey)
      .order(orderColumn, { ascending: true });

    if (error) {
      console.error(`Error loading standard table ${tableName}:`, error);
      return [];
    }

    const mapped = rawData.map(r => ({
      sex: r.jenis_kelamin,
      measurement: r[orderColumn],
      median: r.median,
      minus_3sd: r.sd_minus_3,
      minus_2sd: r.sd_minus_2,
      minus_1sd: r.sd_minus_1,
      plus_1sd: r.sd_plus_1,
      plus_2sd: r.sd_plus_2,
      plus_3sd: r.sd_plus_3,
    }));

    standardsCache[key] = mapped;
    return mapped;
  }

  for (const r of undetermined) {
    const balita = Array.isArray(r.balita) ? r.balita[0] : r.balita;
    if (!balita) continue;

    const birth = new Date(balita.tanggal_lahir);
    const ref = new Date(r.tanggal);
    const years = ref.getFullYear() - birth.getFullYear();
    const months = ref.getMonth() - birth.getMonth();
    const days = ref.getDate() - birth.getDate();
    let ageMonths = years * 12 + months;
    if (days < 0) ageMonths--;
    ageMonths = Math.max(0, ageMonths);

    console.log(`\nTesting: ${balita.nama} (${balita.jenis_kelamin}), Usia: ${ageMonths} bln, BB: ${r.berat_badan} kg, TB: ${r.tinggi_badan} cm`);

    const gender = balita.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';

    // 1. BB/U
    const bbStd = await getCachedStandards('bb_u', balita.jenis_kelamin);
    const bbRef = findReference(bbStd, gender, ageMonths);
    if (!bbRef) {
      console.log(`-> BB/U: Reference row NOT found for ageMonths ${ageMonths}! Current Status in DB: ${r.status_bb_u}`);
    } else {
      const z = calculateZScore(r.berat_badan, bbRef);
      console.log(`-> BB/U: Reference found! Recalculated Z: ${z}`);
    }

    // 2. TB/U
    const tbStd = await getCachedStandards('tb_u', balita.jenis_kelamin);
    const tbRef = findReference(tbStd, gender, ageMonths);
    if (!tbRef) {
      console.log(`-> TB/U: Reference row NOT found for ageMonths ${ageMonths}! Current Status in DB: ${r.status_tb_u}`);
    } else {
      const z = calculateZScore(r.tinggi_badan, tbRef);
      console.log(`-> TB/U: Reference found! Recalculated Z: ${z}`);
    }

    // 3. BB/TB
    const bbtbStd = await getCachedStandards('bb_tb', balita.jenis_kelamin);
    const searchVal = Math.round(r.tinggi_badan * 2) / 2;
    const bbtbRef = findReference(bbtbStd, gender, searchVal);
    if (!bbtbRef) {
      console.log(`-> BB/TB: Reference row NOT found for searchVal ${searchVal}! Current Status in DB: ${r.status_bb_tb}`);
    } else {
      const z = calculateZScore(r.berat_badan, bbtbRef);
      console.log(`-> BB/TB: Reference found! Recalculated Z: ${z}`);
    }
  }
}

testAll();
