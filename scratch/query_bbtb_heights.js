const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data } = await supabase
    .from('who_bb_tb_standards')
    .select('*')
    .eq('jenis_kelamin', 'L')
    .in('measurement', [94, 94.5, 95])
    .order('measurement', { ascending: true });

  console.log('Standards for 94, 94.5, 95 (L):', data);
}

run();
