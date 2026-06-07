const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tuxwriojdglxfrcjayzz.supabase.co';
const supabaseAnonKey = 'sb_publishable_kDrINbNmCoGC3e3tjAoihQ_HNyau6Gd';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- Testing RLS Status Anonymously ---');
  
  const tables = [
    'posyandus',
    'balitas',
    'penimbangans',
    'penyuluhans',
    'lansias',
    'pemeriksaan_lansias',
    'kader_posyandu'
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });
        
      if (error) {
        console.log(`Table: ${table} | Error: ${error.message}`);
      } else {
        console.log(`Table: ${table} | RLS Status: ${data.length === 0 ? 'Possibly ENABLED (0 rows returned)' : 'DISABLED (Returned ' + data.length + ' rows)'}`);
      }
    } catch (err) {
      console.log(`Table: ${table} | Exception: ${err.message}`);
    }
  }
}

main();
