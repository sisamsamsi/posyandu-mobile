import { WHOReferenceRow, ZScoreResult, NutritionStatus } from '../lib/types';

/**
 * Z-Score Engine
 * Ported from zscore_calculator.py
 * Uses linear interpolation between WHO standard SD lines
 */

export class ZScoreEngine {
  private static findReference(
    standards: WHOReferenceRow[], 
    sex: 'L' | 'P', 
    measurement: number
  ): WHOReferenceRow | undefined {
    // Map Laki-laki/Perempuan to L/P if needed, but our JSON uses L/P
    return standards.find(s => s.sex === sex && s.measurement === measurement);
  }

  /**
   * Calculate Z-Score for a given indicator
   */
  public static calculate(
    standards: WHOReferenceRow[],
    sex: 'L' | 'P',
    ageMonths: number,
    value: number,
    indicator: 'IMT/U' | 'TB/U' | 'BB/U'
  ): ZScoreResult {
    const ref = this.findReference(standards, sex, ageMonths);
    
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

    // Linear interpolation logic from WHO/Python script
    if (value <= sd3neg) {
      zscore = -3.0 + (value - sd3neg) / (sd2neg - sd3neg || 1);
    } else if (value <= sd2neg) {
      zscore = -2.0 + (value - sd2neg) / (sd1neg - sd2neg || 1);
    } else if (value <= sd1neg) {
      zscore = -1.0 + (value - sd1neg) / (sd0 - sd1neg || 1);
    } else if (value <= sd0) {
      zscore = 0.0 + (value - sd0) / (sd1 - sd0 || 1);
    } else if (value <= sd1) {
      zscore = 1.0 + (value - sd1) / (sd2 - sd1 || 1);
    } else if (value <= sd2) {
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
    indicator: 'IMT/U' | 'TB/U' | 'BB/U'
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

    return 'Tidak dapat ditentukan';
  }
}
