import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function listTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  if (error) {
    console.error('Error:', error);
    // Information schema might be restricted for anon key.
    // Try querying the known tables to see which ones fail.
    const tables = [
      'who_bb_u_standards',
      'who_tb_u_standards',
      'who_imt_standards',
      'who_imt_u_standards',
      'who_bb_tb_standards',
      'who_bbtb_standards'
    ];
    
    for (const t of tables) {
      const { error: e } = await supabase.from(t).select('id').limit(1);
      console.log(`Table ${t}: ${e ? 'ERROR: ' + e.message : 'EXISTS'}`);
    }
  } else {
    console.log('Tables:', data.map(t => t.table_name));
  }
}

listTables();
