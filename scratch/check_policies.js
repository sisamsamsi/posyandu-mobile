const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkPolicies() {
  console.log('Querying database RLS policies...');
  
  const { data, error } = await supabase.rpc('get_policies');

  if (error) {
    console.log('RPC get_policies not available, trying manual SQL query via raw pg query...');
    // We can query pg_policies using a generic RPC or just query Information Schema
    // Let's try to query pg_policies using Supabase's SQL API or a custom RPC if we have one.
    // If not, we can just execute a query to check if anon can read who_bb_tb_standards.
    checkAnonAccess();
  } else {
    console.log('Policies:', JSON.stringify(data, null, 2));
  }
}

async function checkAnonAccess() {
  console.log('\nChecking what the ANON key can read...');
  
  const anonSupabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  const tables = [
    'who_bb_u_standards',
    'who_tb_u_standards',
    'who_imt_standards',
    'who_bb_tb_standards'
  ];

  for (const t of tables) {
    const { data, error, count } = await anonSupabase
      .from(t)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`Table ${t}: FAILED to read with ANON key. Error: ${error.message}`);
    } else {
      console.log(`Table ${t}: ANON key successfully read ${count} rows.`);
    }
  }
}

checkPolicies();
