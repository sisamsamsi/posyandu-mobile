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
