const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

function calculateOld(ref, value) {
  if (!ref) return 0;
  const {
    sd_minus_3: sd3neg,
    sd_minus_2: sd2neg,
    sd_minus_1: sd1neg,
    median: sd0,
    sd_plus_1: sd1,
    sd_plus_2: sd2,
    sd_plus_3: sd3
  } = ref;

  let zscore = 0;
  if (value <= sd3neg) {
    zscore = -3.0 + (value - sd3neg) / (sd2neg - sd3neg || 1);
  } else if (value <= sd2neg) {
    zscore = -2.0 + (value - sd2neg) / (sd2neg - sd3neg || 1);
  } else if (value <= sd1neg) {
    zscore = -1.0 + (value - sd1neg) / (sd1neg - sd2neg || 1);
  } else if (value <= sd0) {
    zscore = 0.0 + (value - sd0) / (sd0 - sd1neg || 1);
  } else if (value <= sd1) {
    zscore = 1.0 + (value - sd1) / (sd1 - sd0 || 1);
  } else if (value <= sd2) {
    zscore = 2.0 + (value - sd2) / (sd2 - sd1 || 1);
  } else if (value <= sd3) {
    zscore = 3.0 + (value - sd3) / (sd3 - sd2 || 1);
  } else {
    zscore = 3.0 + (value - sd3) / (sd3 - sd2 || 1);
  }
  return parseFloat(zscore.toFixed(2));
}

function interpolateStandards(sLower, sUpper, height) {
  const ageLower = sLower.measurement;
  const ageUpper = sUpper.measurement;
  const t = (height - ageLower) / (ageUpper - ageLower);

  const keys = ['sd_minus_3', 'sd_minus_2', 'sd_minus_1', 'median', 'sd_plus_1', 'sd_plus_2', 'sd_plus_3'];
  const interpolated = {
    sex: sLower.sex,
    measurement: height
  };

  keys.forEach(k => {
    interpolated[k] = sLower[k] + t * (sUpper[k] - sLower[k]);
  });

  return interpolated;
}

async function testChild(name, sex, originalHeight, weight, targetZ, indicator) {
  // Fetch standards for BB/TB and BB/PB for this gender
  const { data } = await supabase
    .from('who_bb_tb_standards')
    .select('*')
    .eq('jenis_kelamin', sex)
    .order('measurement', { ascending: true });

  const mapped = data.map(r => ({
    sex: r.jenis_kelamin,
    measurement: r.measurement,
    median: r.median,
    sd_minus_3: r.sd_minus_3,
    sd_minus_2: r.sd_minus_2,
    sd_minus_1: r.sd_minus_1,
    sd_plus_1: r.sd_plus_1,
    sd_plus_2: r.sd_plus_2,
    sd_plus_3: r.sd_plus_3,
    measure_type: r.measure_type,
    indicator: r.indicator
  }));

  console.log(`\n============================================`);
  console.log(`Testing corrections for ${name} (Weight: ${weight} kg, Target E-PPGBM Z-Score: ${targetZ})`);

  const heightsToTest = [
    { label: 'Original Height (No Correction)', val: originalHeight },
    { label: 'Height + 0.7 cm (Standing measured as Lying?)', val: originalHeight + 0.7 },
    { label: 'Height - 0.7 cm (Lying measured as Standing?)', val: originalHeight - 0.7 }
  ];

  const typesToTest = ['height_cm', 'length_cm'];

  for (const hInfo of heightsToTest) {
    for (const type of typesToTest) {
      // Find lower and upper heights in standards of this type
      const standardsOfType = mapped.filter(s => s.measure_type === type);
      const lowerHeight = Math.floor(hInfo.val * 2) / 2;
      const upperHeight = lowerHeight + 0.5;

      const sLower = standardsOfType.find(s => s.measurement === lowerHeight);
      const sUpper = standardsOfType.find(s => s.measurement === upperHeight);

      if (sLower && sUpper) {
        const ref = interpolateStandards(sLower, sUpper, hInfo.val);
        const z = calculateOld(ref, weight);
        const diff = Math.abs(z - targetZ);
        console.log(`  - ${hInfo.label} (${hInfo.val.toFixed(1)} cm) | Type: ${type} -> Calculated Z: ${z} | Diff to Target: ${diff.toFixed(2)}`);
      }
    }
  }
}

async function run() {
  await testChild('NOOR ABBIAN RAMADHAN', 'L', 94.8, 13.2, -0.75);
  await testChild('DANISH GAMAL SETYAWAN', 'L', 81.9, 9.8, -1.38);
  await testChild('IZYAN ARUTALA RAMADHAN', 'L', 81.4, 10.05, -0.94);
}

run();
