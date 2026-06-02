import { PemeriksaanLansia, Lansia } from '../lib/types';

export interface HealthAnalysisResult {
  imt: number | null;
  imtStatus: 'Sangat Kurus' | 'Kurus' | 'Normal' | 'Gemuk' | 'Obesitas' | 'N/A';
  alerts: {
    label: string;
    value: string;
    level: 'danger' | 'warning' | 'success';
    message?: string;
  }[];
}

export class HealthAnalyzer {
  public static analyze(pemeriksaan: Partial<PemeriksaanLansia>, lansia: Lansia): HealthAnalysisResult {
    const alerts: HealthAnalysisResult['alerts'] = [];
    
    // 1. IMT Calculation
    let imt: number | null = null;
    let imtStatus: HealthAnalysisResult['imtStatus'] = 'N/A';

    if (pemeriksaan.berat_badan && pemeriksaan.tinggi_badan) {
      const heightInMeters = pemeriksaan.tinggi_badan / 100;
      imt = pemeriksaan.berat_badan / (heightInMeters * heightInMeters);
      
      if (imt < 17.0) imtStatus = 'Sangat Kurus';
      else if (imt < 18.5) imtStatus = 'Kurus';
      else if (imt < 25) imtStatus = 'Normal';
      else if (imt < 27) imtStatus = 'Gemuk';
      else imtStatus = 'Obesitas';

      alerts.push({
        label: 'Status Gizi (IMT)',
        value: imtStatus,
        level: imtStatus === 'Normal' ? 'success' : imtStatus === 'Obesitas' ? 'danger' : 'warning',
        message: `IMT: ${imt.toFixed(1)}`
      });
    }

    // 2. Tekanan Darah
    if (pemeriksaan.tekanan_darah && /^\d+\/\d+$/.test(pemeriksaan.tekanan_darah.trim())) {
      const [sis, dias] = pemeriksaan.tekanan_darah.split('/').map(Number);
      if (sis >= 140 || dias >= 90) {
        alerts.push({ label: 'Tekanan Darah', value: 'Hipertensi', level: 'danger', message: `${sis}/${dias} mmHg` });
      } else if (sis >= 120 || dias >= 80) {
          alerts.push({ label: 'Tekanan Darah', value: 'Pre-Hipertensi', level: 'warning', message: `${sis}/${dias} mmHg` });
      } else {
          alerts.push({ label: 'Tekanan Darah', value: 'Normal', level: 'success', message: `${sis}/${dias} mmHg` });
      }
    } else {
      alerts.push({ label: 'Tekanan Darah', value: 'Tidak Diukur', level: 'warning', message: '-' });
    }

    // 3. Gula Darah
    if (pemeriksaan.gula_darah) {
        const isHigh = pemeriksaan.gula_darah > 200;
        alerts.push({
            label: 'Gula Darah',
            value: isHigh ? 'Tinggi' : 'Normal',
            level: isHigh ? 'danger' : 'success',
            message: `${pemeriksaan.gula_darah} mg/dL`
        });
    }

    // 4. Asam Urat
    if (pemeriksaan.asam_urat) {
        const limit = lansia.jenis_kelamin === 'Laki-laki' ? 7 : 6;
        const isHigh = pemeriksaan.asam_urat > limit;
        alerts.push({
            label: 'Asam Urat',
            value: isHigh ? 'Tinggi' : 'Normal',
            level: isHigh ? 'danger' : 'success',
            message: `${pemeriksaan.asam_urat} mg/dL`
        });
    }

    // 5. Kolesterol
    if (pemeriksaan.kolesterol) {
        const isHigh = pemeriksaan.kolesterol > 200;
        alerts.push({
            label: 'Kolesterol',
            value: isHigh ? 'Tinggi' : 'Normal',
            level: isHigh ? 'danger' : 'success',
            message: `${pemeriksaan.kolesterol} mg/dL`
        });
    }

    // 6. Trigliserida
    if (pemeriksaan.trigliserida) {
        const isHigh = pemeriksaan.trigliserida > 150;
        alerts.push({
            label: 'Trigliserida',
            value: isHigh ? 'Tinggi' : 'Normal',
            level: isHigh ? 'danger' : 'success',
            message: `${pemeriksaan.trigliserida} mg/dL`
        });
    }

    return { imt, imtStatus, alerts };
  }
}
