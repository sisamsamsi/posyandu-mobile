import { WHOReferenceRow, ZScoreResult, NutritionStatus } from '../lib/types';

/**
 * Z-Score Engine
 * Ported from zscore_calculator.py
 * Uses linear interpolation between WHO standard SD lines
 */

export class ZScoreEngine {
  private static interpolateReference(
    sLower: WHOReferenceRow,
    sUpper: WHOReferenceRow,
    measurement: number
  ): WHOReferenceRow {
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

  private static findInterpolatedReference(
    standards: WHOReferenceRow[],
    sex: 'L' | 'P',
    measurement: number,
    indicator: 'IMT/U' | 'TB/U' | 'BB/U' | 'BB/TB',
    actualAgeMonths?: number
  ): WHOReferenceRow | undefined {
    if (indicator === 'BB/TB') {
      const lowerVal = Math.floor(measurement * 2) / 2;
      const upperVal = lowerVal + 0.5;
      
      let targetType: 'length_cm' | 'height_cm' = 'height_cm';
      let targetInd: 'BB/PB' | 'BB/TB' = 'BB/TB';
      
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

  /**
   * Calculate Z-Score for a given indicator
   */
  public static calculate(
    standards: WHOReferenceRow[],
    sex: 'L' | 'P',
    ageMonths: number, // height in cm for BB/TB, age in months for others
    value: number,
    indicator: 'IMT/U' | 'TB/U' | 'BB/U' | 'BB/TB',
    actualAgeMonths?: number
  ): ZScoreResult {
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

    // Linear interpolation logic using standard forward interpolation formula
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

    const status = this.determineStatus(zscore, sex, indicator);

    return {
      zscore: parseFloat(zscore.toFixed(2)),
      status,
      indicator
    };
  }


  private static determineStatus(
    zscore: number, 
    sex: 'L' | 'P', 
    indicator: 'IMT/U' | 'TB/U' | 'BB/U' | 'BB/TB'
  ): NutritionStatus {
    if (indicator === 'IMT/U') {
      if (zscore <= -3) return 'Gizi Buruk';
      if (zscore <= -2) return 'Gizi Kurang';
      if (zscore <= 1) return 'Gizi Baik';
      if (zscore <= 2) return 'Gizi Lebih';
      return 'Obesitas';
    }

    if (indicator === 'TB/U') {
      if (zscore <= -3) return 'Sangat Pendek (SP)';
      if (zscore <= -2) return 'Pendek (P)';
      if (zscore <= 3) return 'Normal (N)';
      return 'Tinggi (T)';
    }

    if (indicator === 'BB/U') {
      if (zscore <= -3) return 'BB Sangat Kurang (SK)';
      if (zscore <= -2) return 'BB Kurang (K)';
      if (zscore <= 1) return 'BB Normal (N)';
      return 'Resiko BB Lebih (RL)';
    }

    if (indicator === 'BB/TB') {
      if (zscore <= -3) return 'Gizi Buruk (Severely Wasted)';
      if (zscore <= -2) return 'Gizi Kurang (Wasted)';
      if (zscore <= 1) return 'Gizi Baik';
      if (zscore <= 2) return 'Berisiko Gizi Lebih';
      if (zscore <= 3) return 'Gizi Lebih (Overweight)';
      return 'Obesitas';
    }

    return 'Tidak dapat ditentukan';
  }
}
