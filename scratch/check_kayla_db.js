const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkKaylaDb() {
  console.log('Querying who_bb_tb_standards for P at 89 cm...');
  const { data, error } = await supabase
    .from('who_bb_tb_standards')
    .select('*')
    .eq('jenis_kelamin', 'P')
    .eq('measurement', 89);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result for P at 89 cm:', JSON.stringify(data, null, 2));
  }

  console.log('\nQuerying who_bb_tb_standards for P at 75 cm...');
  const { data: data75, error: error75 } = await supabase
    .from('who_bb_tb_standards')
    .select('*')
    .eq('jenis_kelamin', 'P')
    .eq('measurement', 75);

  if (error75) {
    console.error('Error:', error75);
  } else {
    console.log('Result for P at 75 cm:', JSON.stringify(data75, null, 2));
  }
}

checkKaylaDb();
