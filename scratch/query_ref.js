const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('who_bb_u_standards')
    .select('*')
    .eq('jenis_kelamin', 'L')
    .eq('usia_bulan', 12)
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('WHO BB/U standards for 12 months Male:', data);
  }
}

run();
