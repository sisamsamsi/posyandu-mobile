const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log('Connecting to Supabase:', process.env.EXPO_PUBLIC_SUPABASE_URL);
  
  const { data, error } = await supabase
    .from('balitas')
    .select('*, imunisasi(*)');

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Total Balitas found:', data.length);
    data.slice(0, 5).forEach(item => {
      console.log('Balita:', item.nama);
      console.log('Imunisasi type:', typeof item.imunisasi, 'IsArray:', Array.isArray(item.imunisasi));
      console.log('Imunisasi value:', item.imunisasi);
      console.log('---');
    });
  }
}

check();
