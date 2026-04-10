import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_URL or keys not found in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DUMP_FILE = path.join(process.cwd(), 'backup-april-26.dump');

function toUUID(id: string | number): string {
  if (id === null || id === undefined) return '00000000-0000-0000-0000-000000000000';
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numId)) return '00000000-0000-0000-0000-000000000000';
  return `00000000-0000-0000-0000-${numId.toString().padStart(12, '0')}`;
}

function parseSqlInserts(sql: string, tableName: string): any[] {
  const regex = new RegExp(`INSERT INTO \`${tableName}\` VALUES (.*?);`, 'sg');
  const matches = sql.matchAll(regex);
  const results: any[] = [];

  for (const match of matches) {
    const valuesStr = match[1];
    const rows = valuesStr.split(/\),(?=\()/);
    for (let row of rows) {
      row = row.replace(/^\(|\)$/g, '');
      const values = parseRowValues(row);
      results.push(values);
    }
  }
  return results;
}

function parseRowValues(row: string): any[] {
  const values: any[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if ((char === "'" || char === '"') && row[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(cleanValue(current));
      current = '';
    } else {
      current += char;
    }
  }
  values.push(cleanValue(current));
  return values;
}

function cleanValue(val: string): any {
  val = val.trim();
  if (val.toUpperCase() === 'NULL') return null;
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.substring(1, val.length - 1).replace(/\\'/g, "'").replace(/\\"/g, '"');
  }
  if (!isNaN(Number(val)) && val !== '') return Number(val);
  return val;
}

async function migrate() {
  console.log('--- Starting Migration (Final Fix) ---');
  if (!fs.existsSync(DUMP_FILE)) {
    console.error(`File ${DUMP_FILE} not found!`);
    return;
  }

  const sql = fs.readFileSync(DUMP_FILE, 'utf8');

  // 1. Posyandus
  const posyandusRaw = parseSqlInserts(sql, 'posyandus');
  const posyandus = posyandusRaw.map(r => ({
    id: toUUID(r[0]),
    nama_posyandu: r[1],
    lokasi: r[2],
    keterangan: r[3],
    created_at: r[4],
    updated_at: r[5]
  }));
  await supabase.from('posyandus').upsert(posyandus);
  console.log(`Migrated ${posyandus.length} posyandus.`);

  // 2. Balitas
  console.log('Migrating Balitas...');
  const balitasRaw = parseSqlInserts(sql, 'balitas');
  const balitas = balitasRaw.map(r => ({
    id: toUUID(r[0]),
    posyandu_id: toUUID(r[1]),
    nik: r[2],
    nama: r[3],
    tanggal_lahir: r[4],
    jenis_kelamin: r[5] === 'L' || r[5] === 'Laki-laki' ? 'Laki-laki' : 'Perempuan',
    anak_ke: r[6],
    nama_ortu: r[7],
    alamat: r[8],
    rt: Number(r[9]) || 1,
    bb_lahir: r[10] || 0,
    tb_lahir: r[11] || 0,
    created_at: r[12],
    updated_at: r[13]
  }));

  const successfullyMigratedBalitaIds = new Set<string>();
  for (const b of balitas) {
    const { error: bErr } = await supabase.from('balitas').upsert(b);
    if (bErr) {
      console.warn(`Balita ${b.nama} (ID ${b.id}) failed: ${bErr.message}`);
    } else {
      successfullyMigratedBalitaIds.add(b.id);
    }
  }
  console.log(`Successfully migrated ${successfullyMigratedBalitaIds.size} / ${balitas.length} balitas.`);

  // 3. Lansias
  console.log('Migrating Lansias...');
  const lansiasRaw = parseSqlInserts(sql, 'lansias');
  const lansias = lansiasRaw.map(r => {
    let penyakit = [];
    try {
      if (r[8]) {
        let cleanJson = r[8].toString().trim();
        if (cleanJson.startsWith('"') && cleanJson.endsWith('"')) {
          cleanJson = cleanJson.substring(1, cleanJson.length - 1);
        }
        cleanJson = cleanJson.replace(/\\"/g, '"');
        penyakit = JSON.parse(cleanJson || '[]');
      }
    } catch (e) {}

    return {
      id: toUUID(r[0]),
      posyandu_id: toUUID(r[1]),
      nik: r[2],
      nama: r[3],
      tanggal_lahir: r[4],
      jenis_kelamin: r[5] === 'L' || r[5] === 'Laki-laki' ? 'Laki-laki' : 'Perempuan',
      alamat: r[6],
      rt: Number(r[7]) || 1,
      penyakit_bawaan: Array.isArray(penyakit) ? penyakit : [],
      created_at: r[9],
      updated_at: r[10]
    };
  });
  const successfullyMigratedLansiaIds = new Set<string>();
  for (let i = 0; i < lansias.length; i += 50) {
    const batch = lansias.slice(i, i + 50);
    const { data: bData, error: lErr } = await supabase.from('lansias').upsert(batch).select('id');
    if (lErr) {
       for(const l of batch) {
         const { error } = await supabase.from('lansias').upsert(l);
         if (!error) successfullyMigratedLansiaIds.add(l.id);
       }
    } else {
       batch.forEach(l => successfullyMigratedLansiaIds.add(l.id));
    }
  }
  console.log(`Successfully migrated ${successfullyMigratedLansiaIds.size} / ${lansias.length} lansias.`);

  // 4. Penimbangans
  console.log('Migrating Penimbangans...');
  const penRaw = parseSqlInserts(sql, 'penimbangans');
  const penimbangans = penRaw
    .filter(r => successfullyMigratedBalitaIds.has(toUUID(r[1])))
    .map(r => ({
      id: toUUID(r[0]),
      balita_id: toUUID(r[1]),
      tanggal: r[2],
      berat_badan: r[3] || 0,
      tinggi_badan: r[4] || 0,
      lingkar_kepala: r[5],
      zscore_imt_u: r[8],
      status_gizi_imt_u: r[9],
      created_at: r[11],
      updated_at: r[12],
      zscore_bb_u: r[13],
      status_bb_u: r[14],
      zscore_tb_u: r[15],
      status_tb_u: r[16]
    }));
  
  let penCount = 0;
  for (let i = 0; i < penimbangans.length; i += 50) {
    const batch = penimbangans.slice(i, i + 50);
    const { error: penErr } = await supabase.from('penimbangans').upsert(batch);
    if (!penErr) penCount += batch.length;
    else console.warn(`Batch penimbangans ${i} failed: ${penErr.message}`);
  }
  console.log(`Successfully migrated ${penCount} / ${penimbangans.length} penimbangans.`);

  // 5. Pemeriksaan Lansias
  console.log('Migrating Pemeriksaan Lansias...');
  const pemRaw = parseSqlInserts(sql, 'pemeriksaan_lansias');
  const pemeriksaanLansias = pemRaw
    .filter(r => successfullyMigratedLansiaIds.has(toUUID(r[1])))
    .map(r => ({
      id: toUUID(r[0]),
      lansia_id: toUUID(r[1]),
      tanggal_periksa: r[2],
      keluhan: r[3],
      tekanan_darah: r[4],
      tinggi_badan: r[5],
      berat_badan: r[6],
      lingkar_perut: r[7],
      gula_darah: r[10],
      asam_urat: r[11],
      kolesterol: r[9],
      created_at: r[13],
      updated_at: r[14]
    }));
  await supabase.from('pemeriksaan_lansias').upsert(pemeriksaanLansias);
  console.log(`Migrated ${pemeriksaanLansias.length} pemeriksaan_lansias.`);

  // 6. WHO Standards
  const standardTables = [
    { name: 'who_imt_standards', map: (r: any) => ({
      id: Number(r[0]), jenis_kelamin: r[1], usia_bulan: Number(r[2]), median: r[3],
      sd_minus_3: r[4], sd_minus_2: r[5], sd_minus_1: r[6], sd_plus_1: r[7], sd_plus_2: r[8], sd_plus_3: r[9]
    })},
    { name: 'who_tb_u_standards', map: (r: any) => ({
      id: Number(r[0]), jenis_kelamin: r[1], usia_bulan: Number(r[2]), median: r[3],
      sd_minus_3: r[4], sd_minus_2: r[5], sd_minus_1: r[6], sd_plus_1: r[7], sd_plus_2: r[8], sd_plus_3: r[9]
    })},
    { name: 'who_bb_u_standards', map: (r: any) => ({
      id: Number(r[0]), jenis_kelamin: r[2], usia_bulan: Number(r[4]), sd_minus_3: r[5],
      sd_minus_2: r[6], sd_minus_1: r[7], median: r[8], sd_plus_1: r[9], sd_plus_2: r[10], sd_plus_3: r[11]
    })}
  ];

  for (const st of standardTables) {
    const raw = parseSqlInserts(sql, st.name);
    const data = raw.map(st.map);
    await supabase.from(st.name).upsert(data);
    console.log(`Migrated ${data.length} records for ${st.name}.`);
  }

  console.log('--- Migration Finished ---');
}

migrate();
