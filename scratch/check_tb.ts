import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkHeights() {
  const { data: penimbangans, error } = await supabase
    .from('penimbangans')
    .select('id, berat_badan, tinggi_badan, tanggal, status_bb_tb')
    .limit(10);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Penimbangans data:', JSON.stringify(penimbangans, null, 2));
  }
}

checkHeights();
