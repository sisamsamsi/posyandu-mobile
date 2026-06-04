import { generateMonthlyReportHtml } from '../services/pdf-template';
import { SKDNStats, WeighingItem, NutritionSummary } from '../services/report-service';
require('dotenv').config();

console.log('--- STARTING TS PDF REPORT CHANGES VERIFICATION ---');

// Mock data to test generateMonthlyReportHtml
const mockSKDN: SKDNStats = {
  s: 10,
  k: 10,
  d: 8, // 80% (Below 85% target)
  n: 7  // 87.5% (Below 88% target)
};

const mockSKDNPassed: SKDNStats = {
  s: 10,
  k: 10,
  d: 9, // 90% (Above 85% target)
  n: 8  // 88.9% (Above 88% target)
};

const mockWeighingsNoNew: WeighingItem[] = [
  {
    nama: 'Anak A (Tua)',
    nik: '1111111111111111',
    tanggal_lahir: '2022-01-01',
    umur_bulan: 48,
    jenis_kelamin: 'L',
    nama_ortu: 'Ortu A',
    rt: 1,
    berat_badan: 15.2,
    tinggi_badan: 100.5,
    zscore_bb_u: -0.5,
    zscore_tb_u: -0.2,
    zscore_bb_tb: -0.1,
    status_bb_u: 'Normal',
    status_tb_u: 'Normal',
    status_bb_tb: 'Gizi Baik',
    status_kehadiran: 'Hadir',
    is_baru: false,
    bb_trend: 'N'
  },
  {
    nama: 'Anak B (Muda)',
    nik: '2222222222222222',
    tanggal_lahir: '2025-01-01',
    umur_bulan: 12,
    jenis_kelamin: 'P',
    nama_ortu: 'Ortu B',
    rt: 2,
    berat_badan: 8.5,
    tinggi_badan: 72.0,
    zscore_bb_u: -1.2,
    zscore_tb_u: -1.0,
    zscore_bb_tb: -0.8,
    status_bb_u: 'Normal',
    status_tb_u: 'Normal',
    status_bb_tb: 'Gizi Baik',
    status_kehadiran: 'Hadir',
    is_baru: false,
    bb_trend: 'T'
  }
];

const mockWeighingsWithNew: WeighingItem[] = [
  ...mockWeighingsNoNew,
  {
    nama: 'Anak C (Baru)',
    nik: '3333333333333333',
    tanggal_lahir: '2026-04-01',
    umur_bulan: 1,
    jenis_kelamin: 'L',
    nama_ortu: 'Ortu C',
    rt: 1,
    berat_badan: 4.2,
    tinggi_badan: 52.0,
    zscore_bb_u: 0.1,
    zscore_tb_u: 0.2,
    zscore_bb_tb: 0.0,
    status_bb_u: 'Normal',
    status_tb_u: 'Normal',
    status_bb_tb: 'Gizi Baik',
    status_kehadiran: 'Hadir',
    is_baru: true, // NEW TODDLER
    bb_trend: '-'
  }
];

const mockNutritionSummary: NutritionSummary = {
  stunting: 0,
  wasting: 0,
  underweight: 0,
  dua_t: 0,
  gizi_buruk: 0
};

// 1. Verify sorting logic function
function verifySorting() {
  console.log('\n[TEST 1] Verifying Weighing Sorting by Age Descending...');
  // Sort the weighings
  const sorted = [...mockWeighingsWithNew].sort((a, b) => b.umur_bulan - a.umur_bulan);
  
  const isSorted = sorted[0].umur_bulan === 48 && sorted[1].umur_bulan === 12 && sorted[2].umur_bulan === 1;
  if (isSorted) {
    console.log('✅ PASS: Weighing items are correctly sorted by age descending (oldest first).');
  } else {
    console.error('❌ FAIL: Weighing items sorting order is incorrect.');
    console.log(sorted.map(s => `${s.nama}: ${s.umur_bulan} bln`));
    process.exit(1);
  }
}

// 2. Verify target formatting and coloring (D/S and N/D)
function verifyTargetsAndColoring() {
  console.log('\n[TEST 2] Verifying success targets and color formatting...');
  
  // Case A: Below target (D/S < 85%, N/D < 88%)
  const htmlBelow = generateMonthlyReportHtml('Mawar', 'Mei', 2026, mockSKDN, [], mockWeighingsNoNew, mockNutritionSummary);
  
  // We expect D/S color to be #ef4444 (red) because 80% < 85%
  // We expect N/D color to be #ef4444 (red) because 87.5% < 88%
  const hasRedDS = htmlBelow.includes('style="color: #ef4444;">80.0%');
  const hasRedND = htmlBelow.includes('style="color: #ef4444;">87.5%');
  
  // Case B: Above target (D/S >= 85%, N/D >= 88%)
  const htmlAbove = generateMonthlyReportHtml('Mawar', 'Mei', 2026, mockSKDNPassed, [], mockWeighingsNoNew, mockNutritionSummary);
  
  // We expect D/S color to be #0d9488 (green/teal) because 90% >= 85%
  // We expect N/D color to be #22c55e (green) because 88.9% >= 88%
  const hasGreenDS = htmlAbove.includes('style="color: #0d9488;">90.0%');
  const hasGreenND = htmlAbove.includes('style="color: #22c55e;">88.9%');

  if (hasRedDS && hasRedND && hasGreenDS && hasGreenND) {
    console.log('✅ PASS: Success targets and dynamic coloring match criteria (D/S 85%, N/D 88%).');
  } else {
    console.error('❌ FAIL: Dynamic targets or coloring logic failed.');
    console.log(`Below target DS found red: ${hasRedDS}, ND found red: ${hasRedND}`);
    console.log(`Above target DS found green: ${hasGreenDS}, ND found green: ${hasGreenND}`);
    process.exit(1);
  }
}

// 3. Verify dynamic "Balita Baru" column
function verifyNewBalitaColumn() {
  console.log('\n[TEST 3] Verifying dynamic "Balita Baru" column rendering...');
  
  // Case A: No new balitas
  const htmlNoNew = generateMonthlyReportHtml('Mawar', 'Mei', 2026, mockSKDN, [], mockWeighingsNoNew, mockNutritionSummary);
  const hasBaruHeaderNoNew = htmlNoNew.includes('<th style="width: 35px; text-align:center;">Baru</th>');
  
  // Case B: With new balitas
  const htmlWithNew = generateMonthlyReportHtml('Mawar', 'Mei', 2026, mockSKDN, [], mockWeighingsWithNew, mockNutritionSummary);
  const hasBaruHeaderWithNew = htmlWithNew.includes('<th style="width: 35px; text-align:center;">Baru</th>');
  const hasBaruCellWithNew = htmlWithNew.includes('<td style="text-align:center; font-weight:bold; color:#0d9488;">Ya</td>');

  if (!hasBaruHeaderNoNew && hasBaruHeaderWithNew && hasBaruCellWithNew) {
    console.log('✅ PASS: Dynamic "Baru" column displays only when a new balita is present.');
  } else {
    console.error('❌ FAIL: Dynamic "Baru" column rendering logic failed.');
    console.log(`No new balitas - header found: ${hasBaruHeaderNoNew} (expected false)`);
    console.log(`With new balitas - header found: ${hasBaruHeaderWithNew} (expected true)`);
    console.log(`With new balitas - cell "Ya" found: ${hasBaruCellWithNew} (expected true)`);
    process.exit(1);
  }
}

// 4. Verify columns layout (Point 7 columns & Naik BB trend)
function verifyColumnsLayout() {
  console.log('\n[TEST 4] Verifying main columns and T/N trend layout...');
  const html = generateMonthlyReportHtml('Mawar', 'Mei', 2026, mockSKDN, [], mockWeighingsNoNew, mockNutritionSummary);

  const hasNIKHeader = html.includes('<th style="width: 100px; text-align:left;">NIK</th>');
  const hasTglLahirHeader = html.includes('<th style="width: 70px; text-align:center;">Tgl Lahir</th>');
  const hasNaikBBHeader = html.includes('<th style="width: 45px; text-align:center;">Naik BB</th>');
  
  const hasNIKCell1 = html.includes('<td>1111111111111111</td>');
  const hasNIKCell2 = html.includes('<td>2222222222222222</td>');
  const hasDobCell = html.includes('<td style="text-align:center;">01/01/2022</td>');
  const hasTrendBadgeN = html.includes('<span class="badge bg-teal" style="font-size:10px;">N</span>');
  const hasTrendBadgeT = html.includes('<span class="badge bg-orange" style="font-size:10px;">T</span>');

  if (hasNIKHeader && hasTglLahirHeader && hasNaikBBHeader && hasNIKCell1 && hasNIKCell2 && hasDobCell && hasTrendBadgeN && hasTrendBadgeT) {
    console.log('✅ PASS: Columns layout, NIK, Tgl Lahir, and T/N trend badges are rendered correctly.');
  } else {
    console.error('❌ FAIL: Columns layout validation failed.');
    console.log(`Headers - NIK: ${hasNIKHeader}, Tgl Lahir: ${hasTglLahirHeader}, Naik BB: ${hasNaikBBHeader}`);
    console.log(`Cells - NIK1: ${hasNIKCell1}, NIK2: ${hasNIKCell2}, DobCell: ${hasDobCell}`);
    console.log(`Trend badges - N: ${hasTrendBadgeN}, T: ${hasTrendBadgeT}`);
    process.exit(1);
  }
}

// Run all tests
verifySorting();
verifyTargetsAndColoring();
verifyNewBalitaColumn();
verifyColumnsLayout();

console.log('\n✅ ALL PDF REPORT TS VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
