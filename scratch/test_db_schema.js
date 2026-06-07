const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/posyandu-mobile/.env' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkColumns() {
  console.log('Testing specific columns on posyandus...');
  const { data, error } = await supabase
    .from('posyandus')
    .select('tipe_posyandu, kode_ketua')
    .limit(1);

  if (error) {
    console.log('Columns do not exist. Error:', error.message);
  } else {
    console.log('Columns tipe_posyandu and kode_ketua EXIST in posyandus table!', data);
  }
}

checkColumns();
