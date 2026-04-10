import * as fs from 'fs';
import * as path from 'path';

function toUUID(id: string | number): string {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
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
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

const sql = fs.readFileSync('backup-april-26.dump', 'utf8');

const tables = ['posyandus', 'balitas', 'lansias', 'penimbangans', 'pemeriksaan_lansias'];
for (const t of tables) {
  const rows = parseSqlInserts(sql, t);
  console.log(`Table ${t}: ${rows.length} rows found.`);
}

const balitaRows = parseSqlInserts(sql, 'balitas');
const balitaIds = new Set(balitaRows.map(r => r[0]));

const penRows = parseSqlInserts(sql, 'penimbangans');
const penOrphans = penRows.filter(r => !balitaIds.has(r[1]));
console.log(`Penimbangans Orphans (count): ${penOrphans.length}`);
if (penOrphans.length > 0) {
  console.log(`Sample Orphan Balita IDs:`, penOrphans.slice(0, 5).map(r => r[1]));
}
