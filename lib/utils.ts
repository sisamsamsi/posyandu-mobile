import { format } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Calculate age in months between two dates
 * @param birthDate Date of birth (YYYY-MM-DD)
 * @param referenceDate Reference date (defaults to now)
 */
export const calculateAgeMonths = (birthDate: string | Date, referenceDate: string | Date = new Date()): number => {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  
  const years = ref.getFullYear() - birth.getFullYear();
  const months = ref.getMonth() - birth.getMonth();
  const days = ref.getDate() - birth.getDate();
  
  let totalMonths = years * 12 + months;
  
  // If the current day is less than the birth day, subtract one month
  if (days < 0) {
    totalMonths--;
  }
  
  return Math.max(0, totalMonths);
};

/**
 * Calculate age in months as a float between two dates
 * @param birthDate Date of birth (YYYY-MM-DD)
 * @param referenceDate Reference date (defaults to now)
 */
export const calculateAgeMonthsDecimal = (birthDate: string | Date, referenceDate: string | Date = new Date()): number => {
  const birth = new Date(birthDate);
  const ref = new Date(referenceDate);
  const diffTime = Math.abs(ref.getTime() - birth.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays / 30.4375;
};


/**
 * Format date to Indonesian long format
 */
export const formatIndoDate = (date: string | Date): string => {
  return format(new Date(date), 'dd MMMM yyyy', { locale: id });
};

/**
 * Get Indonesian month name
 */
export const getIndoMonthName = (monthIndex: number): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthIndex];
};

/**
 * Check if a toddler is "Lulus" (Age > 60 months)
 */
export const isBalitaLulus = (birthDate: string): boolean => {
  return calculateAgeMonths(birthDate) > 60;
};

/**
 * Get Kenaikan Berat Badan Minimal (KBM) in kg based on age in months and gender.
 * Referensi: KMS Kemenkes RI
 * @param ageMonths Usia dalam bulan
 * @param jenisKelamin Jenis kelamin ('Laki-laki' | 'Perempuan')
 */
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

/**
 * Determine growth status 'N', 'T', '2T', or '-' for a sequence of weight measurements.
 * History list must be sorted descending by date (newest first).
 * @param history List of measurements, sorted by date descending.
 * @param birthDate Date of birth string or Date.
 * @param jenisKelamin Jenis kelamin ('Laki-laki' | 'Perempuan')
 */
export const calculateGrowthTrend = (
  history: { berat_badan: number; tanggal: string }[],
  birthDate: string | Date,
  jenisKelamin: 'Laki-laki' | 'Perempuan' | string
): 'N' | 'T' | '2T' | '-' => {
  if (history.length < 2) return '-';

  const w0 = history[0];
  const w1 = history[1];

  // Helper to determine if a transition from w_prev to w_curr is 'T' (Tidak Naik)
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
    // Check if the previous transition was also T to determine 2T
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
