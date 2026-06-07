const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
);

// Mapped indicators
const INDICATORS = ['bb_u', 'tb_u', 'imt_u', 'bb_tb'];

// Inlined ZScoreEngine & standards cache
const standardsCache = {};

async function getCachedStandards(indicator, sex) {
  const key = `${indicator}_${sex}`;
  if (standardsCache[key]) return standardsCache[key];

  const tableName = indicator === 'imt_u' ? 'who_imt_standards' : `who_${indicator}_standards`;
  const genderKey = sex === 'Laki-laki' ? 'L' : 'P';
  const orderColumn = indicator === 'bb_tb' ? 'measurement' : 'usia_bulan';

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('jenis_kelamin', genderKey)
    .order(orderColumn, { ascending: true });

  if (error) {
    console.error(`Error loading standard table ${tableName}:`, error);
    return [];
  }

  const mapped = data.map(r => ({
    sex: r.jenis_kelamin,
    measurement: r[orderColumn],
    median: r.median,
    minus_3sd: r.sd_minus_3,
    minus_2sd: r.sd_minus_2,
    minus_1sd: r.sd_minus_1,
    plus_1sd: r.sd_plus_1,
    plus_2sd: r.sd_plus_2,
    plus_3sd: r.sd_plus_3,
    indicator: r.indicator,
    measure_type: r.measure_type,
  }));

  standardsCache[key] = mapped;
  return mapped;
}

function interpolateReference(sLower, sUpper, measurement) {
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

function findInterpolatedReference(standards, sex, measurement, indicator, actualAgeMonths) {
  if (indicator === 'bb_tb') {
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
      return interpolateReference(sLower, sUpper, measurement);
    }
    return sLower || sUpper;
  } else {
    const lowerVal = Math.floor(measurement);
    const upperVal = lowerVal + 1;
    
    const sLower = standards.find(s => s.sex === sex && s.measurement === lowerVal);
    const sUpper = standards.find(s => s.sex === sex && s.measurement === upperVal);
    
    if (sLower && sUpper) {
      return interpolateReference(sLower, sUpper, measurement);
    }
    return sLower || sUpper;
  }
}

function calculateZScore(value, ref) {
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

  return parseFloat(zscore.toFixed(2));
}

function determineStatus(zscore, indicator) {
  if (indicator === 'imt_u') {
    if (zscore <= -3) return 'Gizi Buruk';
    if (zscore <= -2) return 'Gizi Kurang';
    if (zscore <= 1) return 'Gizi Baik';
    if (zscore <= 2) return 'Gizi Lebih';
    return 'Obesitas';
  }

  if (indicator === 'tb_u') {
    if (zscore <= -3) return 'Sangat Pendek (SP)';
    if (zscore <= -2) return 'Pendek (P)';
    if (zscore <= 3) return 'Normal (N)';
    return 'Tinggi (T)';
  }

  if (indicator === 'bb_u') {
    if (zscore <= -3) return 'BB Sangat Kurang (SK)';
    if (zscore <= -2) return 'BB Kurang (K)';
    if (zscore <= 1) return 'BB Normal (N)';
    return 'Resiko BB Lebih (RL)';
  }

  if (indicator === 'bb_tb') {
    if (zscore <= -3) return 'Gizi Buruk (Severely Wasted)';
    if (zscore <= -2) return 'Gizi Kurang (Wasted)';
    if (zscore <= 1) return 'Gizi Baik';
    if (zscore <= 2) return 'Berisiko Gizi Lebih';
    if (zscore <= 3) return 'Gizi Lebih (Overweight)';
    return 'Obesitas';
  }

  return 'Tidak dapat ditentukan';
}

async function repairZScores() {
  console.log('--- STARTING DATABASE Z-SCORE REPAIR ---');
  
  // 1. Fetch all penimbangans and associated balitas
  const { data: records, error } = await supabase
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
      zscore_imt_u,
      status_gizi_imt_u,
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

  console.log(`Fetched ${records.length} records from Supabase.`);
  let updatedCount = 0;

  for (const r of records) {
    const balita = Array.isArray(r.balita) ? r.balita[0] : r.balita;
    if (!balita) {
      console.warn(`Record ${r.id} has no associated balita. Skipping.`);
      continue;
    }

    const birth = new Date(balita.tanggal_lahir);
    const ref = new Date(r.tanggal);
    const diffTime = Math.abs(ref.getTime() - birth.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const ageMonthsDecimal = diffDays / 30.4375;

    // Use standard integer age comparison for <= 60 months limit
    const years = ref.getFullYear() - birth.getFullYear();
    const months = ref.getMonth() - birth.getMonth();
    const days = ref.getDate() - birth.getDate();
    let ageMonths = years * 12 + months;
    if (days < 0) ageMonths--;
    ageMonths = Math.max(0, ageMonths);

    const gender = balita.jenis_kelamin === 'Laki-laki' ? 'L' : 'P';
    
    // We will build the updated payload
    const payload = {};
    let needsUpdate = false;

    // Check if we can calculate age-based standards (only for <= 60 months)
    if (ageMonths <= 60) {
      // 1. BB/U
      const bbStd = await getCachedStandards('bb_u', balita.jenis_kelamin);
      const bbRef = findInterpolatedReference(bbStd, gender, ageMonthsDecimal, 'bb_u');
      if (bbRef) {
        const z = calculateZScore(r.berat_badan, bbRef);
        const status = determineStatus(z, 'bb_u');
        if (r.zscore_bb_u !== z || r.status_bb_u !== status) {
          payload.zscore_bb_u = z;
          payload.status_bb_u = status;
          needsUpdate = true;
        }
      }

      // 2. TB/U
      const tbStd = await getCachedStandards('tb_u', balita.jenis_kelamin);
      const tbRef = findInterpolatedReference(tbStd, gender, ageMonthsDecimal, 'tb_u');
      if (tbRef) {
        const z = calculateZScore(r.tinggi_badan, tbRef);
        const status = determineStatus(z, 'tb_u');
        if (r.zscore_tb_u !== z || r.status_tb_u !== status) {
          payload.zscore_tb_u = z;
          payload.status_tb_u = status;
          needsUpdate = true;
        }
      }

      // 3. IMT/U
      const imtStd = await getCachedStandards('imt_u', balita.jenis_kelamin);
      const imtRef = findInterpolatedReference(imtStd, gender, ageMonthsDecimal, 'imt_u');
      if (imtRef) {
        const bmi = r.berat_badan / ((r.tinggi_badan / 100) ** 2);
        const z = calculateZScore(bmi, imtRef);
        const status = determineStatus(z, 'imt_u');
        if (r.zscore_imt_u !== z || r.status_gizi_imt_u !== status) {
          payload.zscore_imt_u = z;
          payload.status_gizi_imt_u = status;
          needsUpdate = true;
        }
      }
    } else {
      // For children > 60 months, age-based z-scores should be set to 0 and 'Tidak dapat ditentukan'
      if (r.status_bb_u !== 'Tidak dapat ditentukan') {
        payload.zscore_bb_u = 0;
        payload.status_bb_u = 'Tidak dapat ditentukan';
        needsUpdate = true;
      }
      if (r.status_tb_u !== 'Tidak dapat ditentukan') {
        payload.zscore_tb_u = 0;
        payload.status_tb_u = 'Tidak dapat ditentukan';
        needsUpdate = true;
      }
      if (r.status_gizi_imt_u !== 'Tidak dapat ditentukan') {
        payload.zscore_imt_u = 0;
        payload.status_gizi_imt_u = 'Tidak dapat ditentukan';
        needsUpdate = true;
      }
    }

    // 4. BB/TB (Weight-for-Height) - defined by height, works as long as height is in range [45, 120] cm
    if (r.tinggi_badan >= 45 && r.tinggi_badan <= 120) {
      const bbtbStd = await getCachedStandards('bb_tb', balita.jenis_kelamin);
      const bbtbRef = findInterpolatedReference(bbtbStd, gender, r.tinggi_badan, 'bb_tb', ageMonthsDecimal);
      if (bbtbRef) {
        const z = calculateZScore(r.berat_badan, bbtbRef);
        const status = determineStatus(z, 'bb_tb');
        if (r.zscore_bb_tb !== z || r.status_bb_tb !== status) {
          payload.zscore_bb_tb = z;
          payload.status_bb_tb = status;
          needsUpdate = true;
        }
      }
    } else {
      if (r.status_bb_tb !== 'Tidak dapat ditentukan') {
        payload.zscore_bb_tb = 0;
        payload.status_bb_tb = 'Tidak dapat ditentukan';
        needsUpdate = true;
      }
    }

    // If update is needed, perform database query
    if (needsUpdate) {
      const { error: updateErr } = await supabase
        .from('penimbangans')
        .update(payload)
        .eq('id', r.id);
      
      if (updateErr) {
        console.error(`Failed to update record ${r.id}:`, updateErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`\n--- REPAIR COMPLETED ---`);
  console.log(`Successfully recalculated and repaired ${updatedCount} records in the database.`);
}

repairZScores();
