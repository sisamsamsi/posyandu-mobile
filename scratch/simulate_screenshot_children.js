const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Copy findReference and determineStatus from zscore-engine.ts
function findReference(standards, sex, measurement, indicator, actualAgeMonths) {
  const filtered = standards.filter(s => s.sex === sex && s.measurement === measurement);
  if (filtered.length === 0) return undefined;
  if (filtered.length > 1 && indicator === 'BB/TB') {
    let targetType = 'height_cm';
    let targetInd = 'BB/TB';
    if (actualAgeMonths !== undefined) {
      if (actualAgeMonths < 24) {
        targetType = 'length_cm';
        targetInd = 'BB/PB';
      } else {
        targetType = 'height_cm';
        targetInd = 'BB/TB';
      }
    } else {
      if (measurement < 65.0) {
        targetType = 'length_cm';
        targetInd = 'BB/PB';
      } else if (measurement > 110.0) {
        targetType = 'height_cm';
        targetInd = 'BB/TB';
      } else {
        if (measurement < 85.0) {
          targetType = 'length_cm';
          targetInd = 'BB/PB';
        } else {
          targetType = 'height_cm';
          targetInd = 'BB/TB';
        }
      }
    }
    const match = filtered.find(s => s.measure_type === targetType || s.indicator === targetInd);
    if (match) return match;
  }
  return filtered[0];
}

function calculateOld(ref, value) {
  if (!ref) return 0;
  const {
    minus_3sd: sd3neg,
    minus_2sd: sd2neg,
    minus_1sd: sd1neg,
    median: sd0,
    plus_1sd: sd1,
    plus_2sd: sd2,
    plus_3sd: sd3
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
    minus_1sd: sd1neg,
    median: sd0,
    plus_1sd: sd1
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
  // Target children parameters
  const children = [
    {
      name: 'NOOR ABBIAN RAMADHAN',
      sex: 'L',
      ageMonths: 48,
      weight: 13.2,
      height: 94.8,
      indicator: 'BB/TB',
      eppgbmZscore: -0.75
    },
    {
      name: 'HILYA KARIMA FIRDAUSI',
      sex: 'P',
      ageMonths: 32,
      weight: 9.3,
      height: 83.0,
      indicator: 'BB/U',
      eppgbmZscore: -2.87
    },
    {
      name: 'DANISH GAMAL SETYAWAN',
      sex: 'L',
      ageMonths: 31,
      weight: 9.8,
      height: 81.9,
      indicator: 'BB/TB',
      eppgbmZscore: -1.38
    },
    {
      name: 'IZYAN ARUTALA RAMADHAN',
      sex: 'L',
      ageMonths: 25,
      weight: 10.05,
      height: 81.4,
      indicator: 'BB/TB',
      eppgbmZscore: -0.94
    },
    {
      name: 'ALLEYA MIKHAYLA SYADIRA',
      sex: 'P',
      ageMonths: 22,
      weight: 11.5,
      height: 81.0,
      indicator: 'BB/TB',
      eppgbmZscore: 1.21
    },
    {
      name: 'ISHWARI CHIRA SASMITA',
      sex: 'L',
      ageMonths: 19,
      weight: 9.7,
      height: 75.0,
      indicator: 'TB/U',
      eppgbmZscore: -3.10
    },
    {
      name: 'AFFANDRA DREARSA KANUGRAHAN',
      sex: 'P',
      ageMonths: 13,
      weight: 8.75,
      height: 70.0,
      indicator: 'TB/U',
      eppgbmZscore: -2.17
    },
    {
      name: 'NAZIVA SANAYA AZKAYRA WIDYATMOKO',
      sex: 'P',
      ageMonths: 10,
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
      minus_3sd: r.sd_minus_3,
      minus_2sd: r.sd_minus_2,
      minus_1sd: r.sd_minus_1,
      plus_1sd: r.sd_plus_1,
      plus_2sd: r.sd_plus_2,
      plus_3sd: r.sd_plus_3,
      indicator: r.indicator || indicator,
      measure_type: r.measure_type || null,
    }));
  };

  console.log('Fetching WHO standards from DB...');
  const cache = {};
  for (const key of ['L', 'P']) {
    cache[`BB/U_${key}`] = await fetchStandards('BB/U', key);
    cache[`TB/U_${key}`] = await fetchStandards('TB/U', key);
    cache[`BB/TB_${key}`] = await fetchStandards('BB/TB', key);
  }

  console.log('Running simulation for each child:');

  for (const child of children) {
    const key = `${child.indicator}_${child.sex}`;
    const standards = cache[key];
    
    let searchVal = child.ageMonths;
    if (child.indicator === 'BB/TB') {
      searchVal = Math.round(child.height * 2) / 2;
    } else if (child.indicator === 'TB/U') {
      searchVal = child.ageMonths;
    } else if (child.indicator === 'BB/U') {
      searchVal = child.ageMonths;
    }

    const ref = findReference(standards, child.sex, searchVal, child.indicator, child.ageMonths);
    if (!ref) {
      console.log(`[Error] Standards reference not found for ${child.name}`);
      continue;
    }

    const value = child.indicator === 'BB/TB' || child.indicator === 'BB/U' ? child.weight : child.height;

    const oldZ = calculateOld(ref, value);
    const newZ = calculateKemenkes(ref, value);

    console.log(`\n--------------------------------------------`);
    console.log(`Child: ${child.name} (${child.sex === 'L' ? 'Laki-laki' : 'Perempuan'}, ${child.ageMonths} bln)`);
    console.log(`Indicator: ${child.indicator} | Measurement Value: ${value}`);
    console.log(`Reference Row: Median=${ref.median}, -1SD=${ref.minus_1sd}, +1SD=${ref.plus_1sd}, -2SD=${ref.minus_2sd}, +2SD=${ref.plus_2sd}, -3SD=${ref.minus_3sd}, +3SD=${ref.plus_3sd}`);
    console.log(`e-PPGBM Z-Score: ${child.eppgbmZscore}`);
    console.log(`App (Old Method) Z-Score: ${oldZ}`);
    console.log(`Proposed (Kemenkes Method) Z-Score: ${newZ}`);
    console.log(`Discrepancy (Old vs e-PPGBM): ${parseFloat((oldZ - child.eppgbmZscore).toFixed(2))}`);
    console.log(`Discrepancy (Proposed vs e-PPGBM): ${parseFloat((newZ - child.eppgbmZscore).toFixed(2))}`);
  }
}

run();
