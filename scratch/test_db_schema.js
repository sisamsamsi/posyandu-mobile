const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/posyandu-mobile/.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkColumns() {
  console.log('Testing puskesmas_settings table...');
  const { data, error } = await supabase
    .from('puskesmas_settings')
    .select('*')
    .limit(1);

  if (error) {
    console.log('puskesmas_settings table does not exist or error:', error.message);
  } else {
    console.log('puskesmas_settings EXISTS! Data:', data);
  }
}

checkColumns();
