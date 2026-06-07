const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Helper to calculate exact age in months as a decimal based on days of life
function getExactAgeMonths(birthDateStr, measureDateStr) {
  const birth = new Date(birthDateStr);
  const ref = new Date(measureDateStr);
  const diffTime = Math.abs(ref - birth);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays / 30.4375;
}

// Linear interpolation between two rows of standards
function interpolateStandards(sLower, sUpper, ageDecimal) {
  const ageLower = sLower.measurement;
  const ageUpper = sUpper.measurement;
  const t = (ageDecimal - ageLower) / (ageUpper - ageLower);

  const keys = ['sd_minus_3', 'sd_minus_2', 'sd_minus_1', 'median', 'sd_plus_1', 'sd_plus_2', 'sd_plus_3'];
  const interpolated = {
    sex: sLower.sex,
    measurement: ageDecimal
  };

  keys.forEach(k => {
    interpolated[k] = sLower[k] + t * (sUpper[k] - sLower[k]);
  });

  return interpolated;
}

function findReferenceWithInterpolation(standards, sex, ageDecimal, indicator) {
  if (indicator === 'BB/TB') {
    // For BB/TB, measurement is height. Height has 0.5 cm increments.
    // Let's interpolate based on exact height.
    const height = ageDecimal; // height is passed as ageDecimal
    const lowerHeight = Math.floor(height * 2) / 2; // e.g. 81.4 -> 81.0
    const upperHeight = lowerHeight + 0.5;

    const sLower = standards.find(s => s.sex === sex && s.measurement === lowerHeight);
    const sUpper = standards.find(s => s.sex === sex && s.measurement === upperHeight);

    if (sLower && sUpper) {
      return interpolateStandards(sLower, sUpper, height);
    } else if (sLower) {
      return sLower;
    } else if (sUpper) {
      return sUpper;
    }
    return undefined;
  }

  // For age-based indicators (BB/U, TB/U, IMT/U)
  const lowerAge = Math.floor(ageDecimal);
  const upperAge = lowerAge + 1;

  const sLower = standards.find(s => s.sex === sex && s.measurement === lowerAge);
  const sUpper = standards.find(s => s.sex === sex && s.measurement === upperAge);

  if (sLower && sUpper) {
    return interpolateStandards(sLower, sUpper, ageDecimal);
  } else if (sLower) {
    return sLower;
  } else if (sUpper) {
    return sUpper;
  }
  return undefined;
}

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

function calculateKemenkes(ref, value) {
  if (!ref) return 0;
  const {
    sd_minus_1: sd1neg,
    median: sd0,
    sd_plus_1: sd1
  } = ref;

  let zscore = 0;
  if (value >= sd0) {
    zscore = (value - sd0) / (sd1 - sd0 || 1);
  } else {
    zscore = (value - sd0) / (sd0 - sd1neg || 1);
  }
  return parseFloat(zscore.toFixed(2));
}

async function run() {
  // Target children parameters from screenshot
  const children = [
    {
      name: 'NOOR ABBIAN RAMADHAN',
      sex: 'L',
      dob: '2022-04-09',
      measureDate: '2026-05-06', // 4 years 0 months 27 days
      weight: 13.2,
      height: 94.8,
      indicator: 'BB/TB',
      eppgbmZscore: -0.75
    },
    {
      name: 'HILYA KARIMA FIRDAUSI',
      sex: 'P',
      dob: '2023-08-31',
      measureDate: '2026-05-05', // 2 years 8 months 5 days
      weight: 9.3,
      height: 83.0,
      indicator: 'BB/U',
      eppgbmZscore: -2.87
    },
    {
      name: 'DANISH GAMAL SETYAWAN',
      sex: 'L',
      dob: '2023-09-10',
      measureDate: '2026-05-06', // 2 years 7 months 26 days
      weight: 9.8,
      height: 81.9,
      indicator: 'BB/TB',
      eppgbmZscore: -1.38
    },
    {
      name: 'IZYAN ARUTALA RAMADHAN',
      sex: 'L',
      dob: '2024-03-12',
      measureDate: '2026-05-06', // 2 years 1 month 24 days
      weight: 10.05,
      height: 81.4,
      indicator: 'BB/TB',
      eppgbmZscore: -0.94
    },
    {
      name: 'ALLEYA MIKHAYLA SYADIRA',
      sex: 'P',
      dob: '2024-06-27',
      measureDate: '2026-05-06', // 1 year 10 months 9 days
      weight: 11.5,
      height: 81.0,
      indicator: 'BB/TB',
      eppgbmZscore: 1.21
    },
    {
      name: 'ISHWARI CHIRA SASMITA',
      sex: 'L',
      dob: '2024-09-23',
      measureDate: '2026-05-06', // 1 year 7 months 13 days
      weight: 9.7,
      height: 75.0,
      indicator: 'TB/U',
      eppgbmZscore: -3.10
    },
    {
      name: 'AFFANDRA DREARSA KANUGRAHAN',
      sex: 'P',
      dob: '2025-03-22',
      measureDate: '2026-05-06', // 1 year 1 month 14 days
      weight: 8.75,
      height: 70.0,
      indicator: 'TB/U',
      eppgbmZscore: -2.17
    },
    {
      name: 'NAZIVA SANAYA AZKAYRA WIDYATMOKO',
      sex: 'P',
      dob: '2025-06-28',
      measureDate: '2026-05-06', // 0 years 10 months 8 days
      weight: 5.8,
      height: 65.0,
      indicator: 'TB/U',
      eppgbmZscore: -2.74
    }
  ];

  // Fetch all standard reference rows
  const fetchStandards = async (indicator, sex) => {
    let tableName = `who_${indicator.toLowerCase().replace('/', '_')}_standards`;
    if (indicator === 'IMT/U') tableName = 'who_imt_standards';
    const orderColumn = indicator === 'BB/TB' ? 'measurement' : 'usia_bulan';

    const { data } = await supabase
      .from(tableName)
      .select('*')
      .eq('jenis_kelamin', sex)
      .order(orderColumn, { ascending: true });

    return (data || []).map(r => ({
      sex: r.jenis_kelamin,
      measurement: r[orderColumn],
      median: r.median,
      sd_minus_3: r.sd_minus_3,
      sd_minus_2: r.sd_minus_2,
      sd_minus_1: r.sd_minus_1,
      sd_plus_1: r.sd_plus_1,
      sd_plus_2: r.sd_plus_2,
      sd_plus_3: r.sd_plus_3,
      indicator: r.indicator || indicator,
      measure_type: r.measure_type || null,
    }));
  };

  const cache = {};
  for (const key of ['L', 'P']) {
    cache[`BB/U_${key}`] = await fetchStandards('BB/U', key);
    cache[`TB/U_${key}`] = await fetchStandards('TB/U', key);
    cache[`BB/TB_${key}`] = await fetchStandards('BB/TB', key);
  }

  for (const child of children) {
    const key = `${child.indicator}_${child.sex}`;
    const standards = cache[key];
    
    let ageDecimal = getExactAgeMonths(child.dob, child.measureDate);
    let searchVal = ageDecimal;
    if (child.indicator === 'BB/TB') {
      searchVal = child.height; // Use exact height for interpolation
    }

    const ref = findReferenceWithInterpolation(standards, child.sex, searchVal, child.indicator);
    if (!ref) {
      console.log(`[Error] Standards reference not found for ${child.name}`);
      continue;
    }

    const value = child.indicator === 'BB/TB' || child.indicator === 'BB/U' ? child.weight : child.height;

    const oldZInterp = calculateOld(ref, value);
    const kemenkesZInterp = calculateKemenkes(ref, value);

    console.log(`\n--------------------------------------------`);
    console.log(`Child: ${child.name} (Age Decimal: ${ageDecimal.toFixed(3)} months)`);
    console.log(`Indicator: ${child.indicator} | Value: ${value}`);
    console.log(`e-PPGBM Z-Score: ${child.eppgbmZscore}`);
    console.log(`Old Piecewise + Age-Height Interp Z-Score: ${oldZInterp}`);
    console.log(`Kemenkes Manual + Age-Height Interp Z-Score: ${kemenkesZInterp}`);
    console.log(`Discrepancy (Old Interp vs e-PPGBM): ${parseFloat((oldZInterp - child.eppgbmZscore).toFixed(2))}`);
    console.log(`Discrepancy (Kemenkes Interp vs e-PPGBM): ${parseFloat((kemenkesZInterp - child.eppgbmZscore).toFixed(2))}`);
  }
}

run();
