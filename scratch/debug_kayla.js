const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
);

// Inline calculation logic to avoid CJS require error for TS file
function findReference(standards, sex, measurement) {
  return standards.find(s => s.sex === sex && s.measurement === measurement);
}

function calculate(standards, sex, ageMonths, value, indicator) {
  let searchVal = ageMonths;
  if (indicator === 'BB/TB') {
    searchVal = Math.round(ageMonths * 2) / 2;
  }
  
  console.log(`ZScoreEngine.calculate debug: searchVal for indicator ${indicator} is ${searchVal} (from original ageMonths/height: ${ageMonths})`);
  
  const ref = findReference(standards, sex, searchVal);
  
  if (!ref) {
    console.log(`ZScoreEngine.calculate debug: Reference not found in standards array!`);
    return { zscore: 0, status: 'Tidak dapat ditentukan', indicator };
  }

  console.log(`ZScoreEngine.calculate debug: Reference found!`, JSON.stringify(ref));
  return { zscore: 1, status: 'Success', indicator };
}

async function debugKayla() {
  console.log('Debugging Z-score calculation for Kayla Nadhifa Almaira...');
  
  // Fetch standards for Perempuan (P) for bb_tb
  const { data: bbtbRaw, error: fetchErr } = await supabase
    .from('who_bb_tb_standards')
    .select('*')
    .eq('jenis_kelamin', 'P');

  if (fetchErr) {
    console.error('Error fetching standards:', fetchErr);
    return;
  }

  // Map to WHOReferenceRow interface
  const bbtbStd = bbtbRaw.map(r => ({
    sex: r.jenis_kelamin,
    measurement: r.measurement,
    median: r.median,
    minus_3sd: r.sd_minus_3,
    minus_2sd: r.sd_minus_2,
    minus_1sd: r.sd_minus_1,
    plus_1sd: r.sd_plus_1,
    plus_2sd: r.sd_plus_2,
    plus_3sd: r.sd_plus_3,
    indicator: 'BB/TB',
  }));

  console.log(`Fetched ${bbtbStd.length} standard rows for 'P'.`);

  // Let's run calculate
  const height = 88.9;
  const weight = 12.8;
  const gender = 'P'; // Perempuan
  
  const bbtbResult = calculate(bbtbStd, gender, height, weight, 'BB/TB');
  console.log('\nBB/TB Calculation Result for Kayla:');
  console.log(JSON.stringify(bbtbResult, null, 2));
}

debugKayla();
