import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
  const { data, error } = await supabase.from('who_bb_tb_standards').select('*').limit(1);
  if (error) console.error(error);
  else console.log('Columns in who_bb_tb_standards:', Object.keys(data[0]));

  const { data: imtData, error: imtError } = await supabase.from('who_imt_standards').select('*').limit(1);
  if (imtError) console.error(imtError);
  else console.log('Columns in who_imt_standards:', Object.keys(imtData[0]));
}

checkColumns();
