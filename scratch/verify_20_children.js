const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

function calculateAgeMonthsDecimal(birthDate, referenceDate = new Date()) {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  const diffTime = Math.abs(ref.getTime() - birth.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays / 30.4375;
}

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
      return { zscore: 0 };
    }
    const { minus_3sd: sd3neg, minus_2sd: sd2neg, minus_1sd: sd1neg, median: sd0, plus_1sd: sd1, plus_2sd: sd2, plus_3sd: sd3 } = ref;
    let zscore = 0;
    if (value <= sd3neg) {
      zscore = -3.0 + (value - sd3neg) / (sd2neg - sd3neg || 1);
    } else if (value <= sd2neg) {
      zscore = -3.0 + (value - sd3neg) / (sd2neg - sd3neg || 1);
    } else if (value <= sd1neg) {
      zscore = -2.0 + (value - sd2neg) / (sd1neg - sd2neg || 1);
    } else if (value <= sd0) {
      zscore = -1.0 + (value - sd1neg) / (sd0 - sd1neg || 1);
    } else if (value <= sd1) {
      zscore = 0.0 + (value - sd0) / (sd1 - sd0 || 1);
    } else if (value <= sd2) {
      zscore = 1.0 + (value - sd1) / (sd2 - sd1 || 1);
    } else if (value <= sd3) {
      zscore = 2.0 + (value - sd2) / (sd3 - sd2 || 1);
    } else {
      zscore = 3.0 + (value - sd3) / (sd3 - sd2 || 1);
    }
    return { zscore: parseFloat(zscore.toFixed(2)) };
  }
}

async function run() {
  const children = [
    { name: 'KAYLA AQSHA SALSABILA', sex: 'P', dob: '2021-08-23', measureDate: '2026-05-06', weight: 15.0, height: 99.0, targets: { 'BB/U': -1.12, 'TB/U': -1.84, 'BB/TB': 0.04 } },
    { name: 'NAKEISHA', sex: 'P', dob: '2021-09-29', measureDate: '2026-05-06', weight: 15.4, height: 100.0, targets: { 'BB/U': -0.85, 'TB/U': -1.49, 'BB/TB': 0.13 } },
    { name: 'NEANDRO RANU', sex: 'L', dob: '2021-10-26', measureDate: '2026-05-06', weight: 15.45, height: 103.7, targets: { 'BB/U': -0.91, 'TB/U': -0.71, 'BB/TB': -0.75 } },
    { name: 'ZOVAN NARENDRA ALSAKI', sex: 'L', dob: '2022-01-31', measureDate: '2026-05-06', weight: 18.0, height: 117.0, targets: { 'BB/U': 0.50, 'TB/U': 2.77, 'BB/TB': -1.81 } },
    { name: 'RAYYAN PUTRA PRADIBTA', sex: 'L', dob: '2022-02-12', measureDate: '2026-05-06', weight: 17.0, height: 96.0, targets: { 'BB/U': 0.09, 'TB/U': -2.06, 'BB/TB': 2.07 } },
    { name: 'NOOR ABBIAN RAMADHAN', sex: 'L', dob: '2022-04-09', measureDate: '2026-05-06', weight: 13.2, height: 94.8, targets: { 'BB/U': -1.76, 'TB/U': -2.14, 'BB/TB': -0.75 } },
    { name: 'MUHAMMAD DZAKI', sex: 'L', dob: '2022-05-25', measureDate: '2026-05-06', weight: 14.45, height: 98.5, targets: { 'BB/U': -0.93, 'TB/U': -1.07, 'BB/TB': -0.42 } },
    { name: 'FREYA YUIYA S', sex: 'L', dob: '2022-07-03', measureDate: '2026-05-06', weight: 15.0, height: 98.0, targets: { 'BB/U': -0.53, 'TB/U': -1.03, 'BB/TB': 0.15 } },
    { name: 'SABA GHANIA HUMAIRA', sex: 'P', dob: '2022-09-03', measureDate: '2026-05-06', weight: 12.2, height: 92.0, targets: { 'BB/U': -1.76, 'TB/U': -2.01, 'BB/TB': -0.84 } },
    { name: 'ALIF AZZAIN EL FRAZANDY', sex: 'L', dob: '2022-11-13', measureDate: '2026-05-06', weight: 13.55, height: 94.1, targets: { 'BB/U': -0.99, 'TB/U': -1.41, 'BB/TB': -0.27 } },
    { name: 'ELVANO ADINATHA GANENDRA', sex: 'L', dob: '2022-11-25', measureDate: '2026-05-06', weight: 15.2, height: 95.5, targets: { 'BB/U': -0.02, 'TB/U': -1.00, 'BB/TB': 0.85 } },
    { name: 'SHAZA RAMANIA PUTRI', sex: 'P', dob: '2022-11-29', measureDate: '2026-05-06', weight: 14.1, height: 99.0, targets: { 'BB/U': -0.38, 'TB/U': 0.12, 'BB/TB': -0.65 } },
    { name: 'HILYA KARIMA FIRDAUSI', sex: 'P', dob: '2023-08-31', measureDate: '2026-05-05', weight: 9.3, height: 83.0, targets: { 'BB/U': -2.87, 'TB/U': -2.56, 'BB/TB': -1.84 } },
    { name: 'DANISH GAMAL SETYAWAN', sex: 'L', dob: '2023-09-10', measureDate: '2026-05-06', weight: 9.8, height: 81.9, targets: { 'BB/U': -2.80, 'TB/U': -3.24, 'BB/TB': -1.38 } },
    { name: 'MUHAMMAD ARSYAD MAULANA', sex: 'L', dob: '2023-11-07', measureDate: '2026-05-06', weight: 10.5, height: 81.5, targets: { 'BB/U': -2.01, 'TB/U': -3.05, 'BB/TB': -0.42 } },
    { name: 'HIJAZ ALVARENDRA HUTAMA', sex: 'L', dob: '2024-02-03', measureDate: '2026-05-06', weight: 11.0, height: 86.7, targets: { 'BB/U': -1.27, 'TB/U': -0.91, 'BB/TB': -1.19 } },
    { name: 'IZYAN ARUTALA RAMADHAN', sex: 'L', dob: '2024-03-12', measureDate: '2026-05-06', weight: 10.05, height: 81.4, targets: { 'BB/U': -1.90, 'TB/U': -2.29, 'BB/TB': -0.94 } },
    { name: 'ALLEYA MIKHAYLA SYADIRA', sex: 'P', dob: '2024-06-27', measureDate: '2026-05-06', weight: 11.5, height: 81.0, targets: { 'BB/U': 0.27, 'TB/U': -1.23, 'BB/TB': 1.21 } },
    { name: 'ISHWARI CHIRA SASMITA', sex: 'L', dob: '2024-09-23', measureDate: '2026-05-06', weight: 9.7, height: 75.0, targets: { 'BB/U': -1.30, 'TB/U': -3.10, 'BB/TB': 0.25 } },
    { name: 'AFFANDRA DREARSA KANUGRAHAN', sex: 'P', dob: '2025-03-22', measureDate: '2026-05-06', weight: 8.75, height: 70.0, targets: { 'BB/U': -0.48, 'TB/U': -2.17, 'BB/TB': 0.76 } }
  ];

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

  console.log('Loading WHO standard files from database...');
  const cache = {};
  for (const gender of ['L', 'P']) {
    cache[`BB/U_${gender}`] = await fetchStandards('BB/U', gender);
    cache[`TB/U_${gender}`] = await fetchStandards('TB/U', gender);
    cache[`BB/TB_${gender}`] = await fetchStandards('BB/TB', gender);
  }

  console.log('\n--- TESTING 20 RANDOM CHILDREN (BB/U, TB/U, BB/TB) ---');

  const results = [];
  let totalTests = 0;
  let passedTests = 0;

  for (const child of children) {
    const ageMonthsDecimal = calculateAgeMonthsDecimal(child.dob, child.measureDate);
    const indicators = ['BB/U', 'TB/U', 'BB/TB'];
    
    const childResults = {
      name: child.name,
      sex: child.sex,
      age: ageMonthsDecimal,
      indicators: {}
    };

    for (const ind of indicators) {
      const cacheKey = `${ind}_${child.sex}`;
      const standards = cache[cacheKey];
      
      let calcRes;
      if (ind === 'BB/TB') {
        calcRes = ZScoreEngine.calculate(standards, child.sex, child.height, child.weight, 'BB/TB', ageMonthsDecimal);
      } else if (ind === 'BB/U') {
        calcRes = ZScoreEngine.calculate(standards, child.sex, ageMonthsDecimal, child.weight, 'BB/U');
      } else if (ind === 'TB/U') {
        calcRes = ZScoreEngine.calculate(standards, child.sex, ageMonthsDecimal, child.height, 'TB/U');
      }

      const targetVal = child.targets[ind];
      const diff = parseFloat(Math.abs(calcRes.zscore - targetVal).toFixed(2));
      const passed = diff <= 0.03; // Threshold for acceptable piecewise standard error vs daily LMS

      totalTests++;
      if (passed) passedTests++;

      childResults.indicators[ind] = {
        calculated: calcRes.zscore,
        target: targetVal,
        diff: diff,
        status: passed ? '✅ PASS' : '❌ FAIL'
      };
    }
    results.push(childResults);
  }

  // Print results as a nice table
  console.log('\n| No | Nama Balita | Indikator | Hasil Hitung | Target e-PPGBM | Selisih | Status |');
  console.log('|---|---|---|---|---|---|---|');
  results.forEach((r, idx) => {
    ['BB/U', 'TB/U', 'BB/TB'].forEach((ind, i) => {
      const row = r.indicators[ind];
      const numCol = i === 0 ? `${idx + 1}` : '';
      const nameCol = i === 0 ? r.name : '';
      console.log(`| ${numCol} | ${nameCol} | ${ind} | ${row.calculated.toFixed(2)} | ${row.target.toFixed(2)} | ${row.diff.toFixed(2)} | ${row.status} |`);
    });
    console.log('|---|---|---|---|---|---|---|');
  });

  console.log(`\nVerification Summary:`);
  console.log(`Total Calculations Tested: ${totalTests}`);
  console.log(`Passed (discrepancy <= 0.03): ${passedTests} / ${totalTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
}

run();
