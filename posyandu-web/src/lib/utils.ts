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
