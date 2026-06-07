const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: kaders, error: err1 } = await supabase
    .from('kader_posyandu')
    .select('*');

  if (err1) {
    console.error("kader_posyandu error:", err1.message);
  } else {
    console.log("kader_posyandu data:", kaders);
  }

  const { data: posyandus, error: err2 } = await supabase
    .from('posyandus')
    .select('*');

  if (err2) {
    console.error("posyandus error:", err2.message);
  } else {
    console.log("posyandus data:", posyandus);
  }
}

main();
