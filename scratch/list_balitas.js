const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('balitas')
    .select('id, nama, tanggal_lahir, jenis_kelamin')
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Balitas in DB:', data);
  }
}

check();
