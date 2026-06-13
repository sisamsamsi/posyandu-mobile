/**
 * Menyensor angka NIK untuk melindungi data pribadi (PII).
 * Format output: 123456******7890 (menampilkan 6 digit pertama dan 4 digit terakhir)
 */
export function maskNik(nik: string | null | undefined): string {
  if (!nik) return '-';
  const clean = nik.trim();
  if (clean.length < 10) return clean;
  return `${clean.substring(0, 6)}******${clean.substring(clean.length - 4)}`;
}

export const calculateAgeMonths = (birthDate: string | Date, referenceDate: string | Date = new Date()): number => {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  
  const years = ref.getFullYear() - birth.getFullYear();
  const months = ref.getMonth() - birth.getMonth();
  const days = ref.getDate() - birth.getDate();
  
  let totalMonths = years * 12 + months;
  
  if (days < 0) {
    totalMonths--;
  }
  
  return Math.max(0, totalMonths);
};

export const getKBMValue = (ageMonths: number, jenisKelamin: 'Laki-laki' | 'Perempuan' | string): number => {
  if (ageMonths <= 0) return 0;
  if (ageMonths === 1) return 0.8;
  if (ageMonths === 2) return 0.9;
  if (ageMonths === 3) return 0.8;
  if (ageMonths === 4) return 0.6;
  if (ageMonths === 5) return 0.5;

  const isMale = typeof jenisKelamin === 'string' && 
    (jenisKelamin.toLowerCase() === 'laki-laki' || jenisKelamin.toLowerCase() === 'l' || jenisKelamin.toLowerCase() === 'male');

  if (isMale) {
    // Laki-laki:
    // 6-7 bulan: 400 gram
    // 8-11 bulan: 300 gram
    // 12 bulan ke atas: 200 gram
    if (ageMonths === 6 || ageMonths === 7) return 0.4;
    if (ageMonths >= 8 && ageMonths <= 11) return 0.3;
    if (ageMonths >= 12 && ageMonths <= 59) return 0.2;
  } else {
    // Perempuan:
    // 6 bulan: 400 gram
    // 7-10 bulan: 300 gram
    // 11 bulan ke atas: 200 gram
    if (ageMonths === 6) return 0.4;
    if (ageMonths >= 7 && ageMonths <= 10) return 0.3;
    if (ageMonths >= 11 && ageMonths <= 59) return 0.2;
  }
  
  return 0.2; // Fallback for >= 60 months
};

export const calculateGrowthTrend = (
  history: { berat_badan: number; tanggal: string }[],
  birthDate: string | Date,
  jenisKelamin: 'Laki-laki' | 'Perempuan' | string
): 'N' | 'T' | '2T' | '-' => {
  if (history.length < 2) return '-';

  const w0 = history[0];
  const w1 = history[1];

  const isTransitionT = (
    w_curr: { berat_badan: number; tanggal: string },
    w_prev: { berat_badan: number; tanggal: string }
  ): boolean => {
    const ageMonths = calculateAgeMonths(birthDate, w_curr.tanggal);
    const kbm = getKBMValue(ageMonths, jenisKelamin);
    const weightGain = w_curr.berat_badan - w_prev.berat_badan;
    return weightGain < kbm; // if weight gain is less than KBM, it is T
  };

  const currentIsT = isTransitionT(w0, w1);

  if (currentIsT) {
    if (history.length >= 3) {
      const w2 = history[2];
      const previousIsT = isTransitionT(w1, w2);
      if (previousIsT) {
        return '2T';
      }
    }
    return 'T';
  }

  return 'N';
};
