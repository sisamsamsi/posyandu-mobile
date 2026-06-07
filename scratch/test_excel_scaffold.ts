import { normalizeKey, cleanNik, cleanGender, parseExcelDate } from '../services/eppgbm-utils';

function runTests() {
  console.log('--- RUNNING EXCEL SCAFFOLD UTILITIES TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(name: string, actual: any, expected: any) {
    if (actual === expected) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} (Expected: "${expected}", Got: "${actual}")`);
      failed++;
    }
  }

  // 1. Key normalization tests
  assert('Normalize NIK Balita', normalizeKey('NIK Balita'), 'nik');
  assert('Normalize Nama Anak', normalizeKey('Nama Anak'), 'nama');
  assert('Normalize Tgl Lahir', normalizeKey('Tgl Lahir'), 'tanggal_lahir');
  assert('Normalize Jenis Kelamin', normalizeKey('Jenis Kelamin'), 'jenis_kelamin');
  assert('Normalize BB (kg)', normalizeKey('BB (kg)'), 'berat_badan');
  assert('Normalize TB (cm)', normalizeKey('TB (cm)'), 'tinggi_badan');
  assert('Normalize LILA (cm)', normalizeKey('LILA (cm)'), 'lingkar_lengan');
  assert('Normalize LiKa (cm)', normalizeKey('LiKa (cm)'), 'lingkar_kepala');

  // 2. NIK cleaning tests (scientific notation, whitespace, length)
  assert('Clean NIK raw', cleanNik('3402082203250001'), '3402082203250001');
  assert('Clean NIK scientific', cleanNik('3.40208220325e+15'), '3402082203250000'); // Nearest rounded representation
  assert('Clean NIK too short', cleanNik('12345'), null);
  assert('Clean NIK dummy alphanumeric', cleanNik('320207090620ABCD'), '320207090620ABCD');

  // 3. Gender cleaning tests
  assert('Gender L', cleanGender('L'), 'Laki-laki');
  assert('Gender P', cleanGender('P'), 'Perempuan');
  assert('Gender Laki-laki', cleanGender('Laki-laki'), 'Laki-laki');
  assert('Gender Perempuan', cleanGender('Perempuan'), 'Perempuan');
  assert('Gender number 1', cleanGender(1), 'Laki-laki');
  assert('Gender number 2', cleanGender(2), 'Perempuan');

  // 4. Date parsing tests
  assert('Parse YYYY-MM-DD', parseExcelDate('2025-06-05'), '2025-06-05');
  assert('Parse DD/MM/YYYY', parseExcelDate('05/06/2025'), '2025-06-05');
  assert('Parse DD-MM-YYYY', parseExcelDate('05-06-2025'), '2025-06-05');
  assert('Parse Excel Serial', parseExcelDate(45813), '2025-06-05'); // 45813 is 5 June 2025 in Excel serial

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
