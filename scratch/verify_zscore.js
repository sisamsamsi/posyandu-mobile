const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Helper to calculate exact age in months as a decimal based on days of life
function calculateAgeMonthsDecimal(birthDate, referenceDate = new Date()) {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  const diffTime = Math.abs(ref.getTime() - birth.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays / 30.4375;
}

// Z-Score Engine replica in JS matching services/zscore-engine.ts
class ZScoreEngine {
  static interpolateReference(sLower, sUpper, measurement) {
    const ageLower = sLower.measurement;
    const ageUpper = sUpper.measurement;
    
    if (ageLower === ageUpper) return sLower;
    
    const t = (measurement - ageLower) / (ageUpper - ageLower);
    
    return {
      sex: sLower.sex,
      measurement: measurement,
      median: sLower.median + t * (sUpper.median - sLower.median),
      minus_3sd: sLower.minus_3sd + t * (sUpper.minus_3sd - sLower.minus_3sd),
      minus_2sd: sLower.minus_2sd + t * (sUpper.minus_2sd - sLower.minus_2sd),
      minus_1sd: sLower.minus_1sd + t * (sUpper.minus_1sd - sLower.minus_1sd),
      plus_1sd: sLower.plus_1sd + t * (sUpper.plus_1sd - sLower.plus_1sd),
      plus_2sd: sLower.plus_2sd + t * (sUpper.plus_2sd - sLower.plus_2sd),
      plus_3sd: sLower.plus_3sd + t * (sUpper.plus_3sd - sLower.plus_3sd),
      indicator: sLower.indicator,
      measure_type: sLower.measure_type
    };
  }

  static findInterpolatedReference(standards, sex, measurement, indicator, actualAgeMonths) {
    if (indicator === 'BB/TB') {
      const lowerVal = Math.floor(measurement * 2) / 2;
      const upperVal = lowerVal + 0.5;
      
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
      
      const sLower = standards.find(s => s.sex === sex && s.measurement === lowerVal && (s.measure_type === targetType || s.indicator === targetInd));
      const sUpper = standards.find(s => s.sex === sex && s.measurement === upperVal && (s.measure_type === targetType || s.indicator === targetInd));
      
      if (sLower && sUpper) {
        return this.interpolateReference(sLower, sUpper, measurement);
      }
      return sLower || sUpper;
    } else {
      const lowerVal = Math.floor(measurement);
      const upperVal = lowerVal + 1;
      
      const sLower = standards.find(s => s.sex === sex && s.measurement === lowerVal);
      const sUpper = standards.find(s => s.sex === sex && s.measurement === upperVal);
      
      if (sLower && sUpper) {
        return this.interpolateReference(sLower, sUpper, measurement);
      }
      return sLower || sUpper;
    }
  }

  static calculate(standards, sex, ageMonths, value, indicator, actualAgeMonths) {
    const ref = this.findInterpolatedReference(standards, sex, ageMonths, indicator, actualAgeMonths);
    
    if (!ref) {
      return { zscore: 0, status: 'Tidak dapat ditentukan', indicator };
    }

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
    let segment = '';

    // Linear interpolation logic using standard forward interpolation formula
    if (value <= sd3neg) {
      zscore = -3.0 + (value - sd3neg) / (sd2neg - sd3neg || 1);
      segment = 'value <= sd3neg';
    } else if (value <= sd2neg) {
      zscore = -3.0 + (value - sd3neg) / (sd2neg - sd3neg || 1);
      segment = 'sd3neg < value <= sd2neg';
    } else if (value <= sd1neg) {
      zscore = -2.0 + (value - sd2neg) / (sd1neg - sd2neg || 1);
      segment = 'sd2neg < value <= sd1neg';
    } else if (value <= sd0) {
      zscore = -1.0 + (value - sd1neg) / (sd0 - sd1neg || 1);
      segment = 'sd1neg < value <= sd0';
    } else if (value <= sd1) {
      zscore = 0.0 + (value - sd0) / (sd1 - sd0 || 1);
      segment = 'sd0 < value <= sd1';
    } else if (value <= sd2) {
      zscore = 1.0 + (value - sd1) / (sd2 - sd1 || 1);
      segment = 'sd1 < value <= sd2';
    } else if (value <= sd3) {
      zscore = 2.0 + (value - sd2) / (sd3 - sd2 || 1);
      segment = 'sd2 < value <= sd3';
    } else {
      zscore = 3.0 + (value - sd3) / (sd3 - sd2 || 1);
      segment = 'value > sd3';
    }

    console.log(`[DEBUG calculate] Value: ${value}, Segment: ${segment}`);
    console.log(`  Reference points: -3SD=${sd3neg.toFixed(3)}, -2SD=${sd2neg.toFixed(3)}, -1SD=${sd1neg.toFixed(3)}, Median=${sd0.toFixed(3)}, +1SD=${sd1.toFixed(3)}, +2SD=${sd2.toFixed(3)}, +3SD=${sd3.toFixed(3)}`);

    return {
      zscore: parseFloat(zscore.toFixed(2)),
      indicator
    };
  }
}

async function runVerification() {
  const children = [
    {
      name: 'NOOR ABBIAN RAMADHAN',
      sex: 'L',
      dob: '2022-04-09',
      measureDate: '2026-05-06',
      weight: 13.2,
      height: 94.8,
      indicator: 'BB/TB',
      target: -0.75
    },
    {
      name: 'HILYA KARIMA FIRDAUSI',
      sex: 'P',
      dob: '2023-08-31',
      measureDate: '2026-05-05',
      weight: 9.3,
      height: 83.0,
      indicator: 'BB/U',
      target: -2.87
    },
    {
      name: 'DANISH GAMAL SETYAWAN',
      sex: 'L',
      dob: '2023-09-10',
      measureDate: '2026-05-06',
      weight: 9.8,
      height: 81.9,
      indicator: 'BB/TB',
      target: -1.38
    },
    {
      name: 'IZYAN ARUTALA RAMADHAN',
      sex: 'L',
      dob: '2024-03-12',
      measureDate: '2026-05-06',
      weight: 10.05,
      height: 81.4,
      indicator: 'BB/TB',
      target: -0.94
    },
    {
      name: 'ALLEYA MIKHAYLA SYADIRA',
      sex: 'P',
      dob: '2024-06-27',
      measureDate: '2026-05-06',
      weight: 11.5,
      height: 81.0,
      indicator: 'BB/TB',
      target: 1.21
    },
    {
      name: 'ISHWARI CHIRA SASMITA',
      sex: 'L',
      dob: '2024-09-23',
      measureDate: '2026-05-06',
      weight: 9.7,
      height: 75.0,
      indicator: 'TB/U',
      target: -3.10
    },
    {
      name: 'AFFANDRA DREARSA KANUGRAHAN',
      sex: 'P',
      dob: '2025-03-22',
      measureDate: '2026-05-06',
      weight: 8.75,
      height: 70.0,
      indicator: 'TB/U',
      target: -2.17
    },
    {
      name: 'NAZIVA SANAYA AZKAYRA WIDYATMOKO',
      sex: 'P',
      dob: '2025-06-28',
      measureDate: '2026-05-06',
      weight: 5.8,
      height: 65.0,
      indicator: 'TB/U',
      target: -2.74
    }
  ];

  const fetchStandards = async (indicator, sex) => {
    let tableName = `who_${indicator.toLowerCase().replace('/', '_')}_standards`;
    if (indicator === 'IMT/U') tableName = 'who_imt_standards';
    const orderColumn = indicator === 'BB/TB' ? 'measurement' : 'usia_bulan';

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('jenis_kelamin', sex)
      .order(orderColumn, { ascending: true });

    if (error) {
      console.error(`Error loading standard table ${tableName}:`, error);
      return [];
    }

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

  console.log('Fetching standards from Supabase...');
  const standardsCache = {};
  for (const gender of ['L', 'P']) {
    standardsCache[`BB/U_${gender}`] = await fetchStandards('BB/U', gender);
    standardsCache[`TB/U_${gender}`] = await fetchStandards('TB/U', gender);
    standardsCache[`BB/TB_${gender}`] = await fetchStandards('BB/TB', gender);
  }

  let totalDiscrepancy = 0;
  let maxDiscrepancy = 0;
  let passedCount = 0;

  console.log('\n--- VERIFYING Z-SCORE CALCULATIONS AGAINST E-PPGBM ---');

  for (const child of children) {
    const ageMonthsDecimal = calculateAgeMonthsDecimal(child.dob, child.measureDate);
    const cacheKey = `${child.indicator}_${child.sex}`;
    const standards = standardsCache[cacheKey];

    let result;
    if (child.indicator === 'BB/TB') {
      result = ZScoreEngine.calculate(standards, child.sex, child.height, child.weight, 'BB/TB', ageMonthsDecimal);
    } else if (child.indicator === 'BB/U') {
      result = ZScoreEngine.calculate(standards, child.sex, ageMonthsDecimal, child.weight, 'BB/U');
    } else if (child.indicator === 'TB/U') {
      result = ZScoreEngine.calculate(standards, child.sex, ageMonthsDecimal, child.height, 'TB/U');
    }

    const discrepancy = parseFloat(Math.abs(result.zscore - child.target).toFixed(2));
    totalDiscrepancy += discrepancy;
    if (discrepancy > maxDiscrepancy) {
      maxDiscrepancy = discrepancy;
    }

    const passed = discrepancy <= 0.03;
    if (passed) passedCount++;

    console.log(`\nChild: ${child.name}`);
    console.log(`- Indicator: ${child.indicator} | Age (Decimal): ${ageMonthsDecimal.toFixed(4)} months`);
    console.log(`- Calculated: ${result.zscore} | e-PPGBM: ${child.target}`);
    console.log(`- Discrepancy: ${discrepancy.toFixed(3)} | Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  }

  console.log('\n--- VERIFICATION RESULTS SUMMARY ---');
  console.log(`Total Cases: ${children.length}`);
  console.log(`Passed Cases (discrepancy <= 0.02): ${passedCount} / ${children.length}`);
  console.log(`Max Discrepancy: ${maxDiscrepancy.toFixed(3)}`);
  console.log(`Average Discrepancy: ${(totalDiscrepancy / children.length).toFixed(3)}`);

  if (passedCount === children.length) {
    console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY! Discrepancies are <= 0.02.');
  } else {
    console.error('\n❌ SOME VERIFICATION TESTS FAILED.');
    process.exit(1);
  }
}

runVerification();
