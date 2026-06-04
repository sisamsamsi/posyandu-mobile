import { Balita, Penimbangan, RiskCalculationResult, RiskLevel, RiskColor, RiskBreakdownItem } from '../lib/types';
import { calculateAgeMonths } from '../lib/utils';

/**
 * Risk Prediction Service
 * Ported from RiskPredictionService.php
 */
export class RiskPredictionService {
  /**
   * Weights according to the web version
   */
  private static WEIGHTS = {
    stunting: 0.35,
    wasting: 0.25,
    underweight: 0.25,
    trend: 0.15
  };

  public static calculate(
    balita: Balita,
    currentPenimbangan: Partial<Penimbangan>,
    history: Penimbangan[] = []
  ): RiskCalculationResult {
    const ageMonths = calculateAgeMonths(balita.tanggal_lahir, currentPenimbangan.tanggal || new Date().toISOString());

    // 1. Calculate individual risk scores (0-100)
    const stuntingRisk = this.zscoreToRiskPercentage(currentPenimbangan.zscore_tb_u ?? 0);
    const wastingRisk = this.zscoreToRiskPercentage(currentPenimbangan.zscore_imt_u ?? 0);
    const underweightRisk = this.zscoreToRiskPercentage(currentPenimbangan.zscore_bb_u ?? 0);
    const trendRisk = this.calculateTrendRisk(currentPenimbangan.berat_badan ?? 0, history);

    // 2. Weighted score calculation
    const overallScore = 
      (stuntingRisk * this.WEIGHTS.stunting) +
      (wastingRisk * this.WEIGHTS.wasting) +
      (underweightRisk * this.WEIGHTS.underweight) +
      (trendRisk.score * this.WEIGHTS.trend);

    const roundedScore = Math.round(overallScore * 10) / 10;

    // 3. Determine Level & Color
    const riskLevel = this.getRiskLevel(overallScore);
    const riskColor = this.getRiskColor(overallScore);

    // 4. Generate Recommendations
    const recommendations = this.generateRecommendations(stuntingRisk, wastingRisk, underweightRisk, trendRisk.score);

    return {
      overall_score: roundedScore,
      risk_level: riskLevel,
      risk_color: riskColor,
      breakdown: {
        stunting: {
          label: 'Risiko Stunting (Pendek)',
          score: Math.round(stuntingRisk),
          status: currentPenimbangan.status_tb_u || '-',
          zscore: currentPenimbangan.zscore_tb_u ?? undefined,
          weight: '35%'
        },
        wasting: {
          label: 'Risiko Wasting (Kurus)',
          score: Math.round(wastingRisk),
          status: currentPenimbangan.status_gizi_imt_u || '-',
          zscore: currentPenimbangan.zscore_imt_u ?? undefined,
          weight: '25%'
        },
        underweight: {
          label: 'Risiko Underweight',
          score: Math.round(underweightRisk),
          status: currentPenimbangan.status_bb_u || '-',
          zscore: currentPenimbangan.zscore_bb_u ?? undefined,
          weight: '25%'
        },
        trend: {
          label: 'Tren Pertumbuhan',
          score: Math.round(trendRisk.score),
          status: trendRisk.status,
          weight: '15%'
        }
      },
      recommendations,
      usia_bulan: ageMonths,
      date: currentPenimbangan.tanggal,
      id: currentPenimbangan.id
    };
  }



  private static zscoreToRiskPercentage(zscore: number): number {
    if (zscore < -3) return 100;
    if (zscore < -2) return 70 + ((-2 - zscore) / 1) * 30;
    if (zscore < -1) return 30 + ((-1 - zscore) / 1) * 40;
    if (zscore < 0) return 10 + ((0 - zscore) / 1) * 20;
    if (zscore < 1) return 5 + ((1 - zscore) / 1) * 5;
    return 5;
  }

  private static calculateTrendRisk(currentWeight: number, history: Penimbangan[]): { score: number; status: string } {
    if (history.length === 0) return { score: 30, status: 'Data tidak cukup' };

    const lastWeights = [currentWeight, ...history.map(h => h.berat_badan)].slice(0, 3);
    
    if (lastWeights.length < 2) return { score: 30, status: 'Data tidak cukup' };

    let decreasingCount = 0;
    for (let i = 0; i < lastWeights.length - 1; i++) {
      if (lastWeights[i] < lastWeights[i + 1]) decreasingCount++;
    }

    if (decreasingCount >= 2) return { score: 80, status: 'Berat badan menurun' };
    if (decreasingCount === 1) return { score: 50, status: 'Pertumbuhan tidak konsisten' };
    
    // Check if stagnant (0 kg gain)
    if (lastWeights[0] === lastWeights[1]) {
      return { score: 40, status: 'Pertumbuhan stagnan (T)' };
    }

    // Check if increasing
    let increasing = true;
    for (let i = 0; i < lastWeights.length - 1; i++) {
        if (lastWeights[i] <= lastWeights[i + 1]) {
            increasing = false;
            break;
        }
    }

    if (increasing) return { score: 10, status: 'Pertumbuhan baik' };
    return { score: 20, status: 'Pertumbuhan stabil' };
  }

  private static getRiskLevel(score: number): RiskLevel {
    if (score >= 70) return 'Risiko Tinggi';
    if (score >= 40) return 'Risiko Sedang';
    if (score >= 20) return 'Risiko Rendah';
    return 'Risiko Sangat Rendah';
  }

  private static getRiskColor(score: number): RiskColor {
    if (score >= 70) return 'red';
    if (score >= 40) return 'orange';
    if (score >= 20) return 'yellow';
    return 'green';
  }

  private static generateRecommendations(stunting: number, wasting: number, underweight: number, trend: number): string[] {
    const recommendations: string[] = [];

    if (stunting >= 70) recommendations.push('⚠️ PRIORITAS: Risiko stunting tinggi. Segera konsultasi ke Puskesmas.');
    else if (stunting >= 40) recommendations.push('Perhatikan asupan protein dan kalsium untuk tinggi badan.');

    if (wasting >= 70) recommendations.push('⚠️ PRIORITAS: Risiko wasting tinggi. Perlu penanganan gizi segera.');
    else if (wasting >= 40) recommendations.push('Tingkatkan frekuensi makan dengan porsi lebih banyak.');

    if (underweight >= 70) recommendations.push('⚠️ PRIORITAS: Berat badan kurang. Konsultasi ke tenaga kesehatan.');
    else if (underweight >= 40) recommendations.push('Pastikan anak makan 3x sehari dengan 2x snack bergizi.');

    if (trend >= 70) recommendations.push('⚠️ Berat badan cenderung menurun. Perlu evaluasi penyebab.');

    if (recommendations.length === 0) {
      recommendations.push('✅ Pertumbuhan anak baik. Pertahankan pola makan dan pola asuh.');
      recommendations.push('Lanjutkan penimbangan rutin setiap bulan di Posyandu.');
    }

    return recommendations;
  }
}
