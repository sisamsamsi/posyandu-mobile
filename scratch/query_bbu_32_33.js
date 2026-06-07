const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data } = await supabase
    .from('who_bb_u_standards')
    .select('*')
    .eq('jenis_kelamin', 'P')
    .in('usia_bulan', [32, 33])
    .order('usia_bulan', { ascending: true });

  console.log('Standards for 32 and 33 months Female:', data);
}

run();
