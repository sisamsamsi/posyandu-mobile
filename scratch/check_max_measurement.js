const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('who_bb_u_standards')
    .select('usia_bulan')
    .order('usia_bulan', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

main();
