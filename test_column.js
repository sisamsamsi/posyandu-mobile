const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  // Login first to get JWT token and bypass RLS
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'kader@posyandu.com',
    password: 'password123'
  });

  if (authError) {
    console.error('Failed to log in:', authError.message);
    return;
  }
  console.log('Logged in successfully as:', authData.user.email);

  // Fetch posyandus
  const { data: posyandus, error: posyanduError } = await supabase
    .from('posyandus')
    .select('id, nama_posyandu')
    .limit(1);

  if (posyanduError || !posyandus || posyandus.length === 0) {
    console.error('Failed to fetch posyandu:', posyanduError);
    return;
  }

  const posyanduId = posyandus[0].id;
  console.log('Using posyandu:', posyandus[0]);

  const { data, error } = await supabase
    .from('balitas')
    .insert([{ 
      nama: 'Test Column Bb Tb Lahir', 
      nik: '9876543210123456',
      tanggal_lahir: '2025-01-01',
      jenis_kelamin: 'Laki-laki',
      nama_ortu: 'Ortu Test',
      alamat: 'Alamat Test',
      rt: 1,
      posyandu_id: posyanduId,
      bb_lahir: 3.2,
      tb_lahir: 49.5
    }])
    .select();

  console.log('Result:', { data, error });
  
  // Clean up test insert
  if (data && data[0]) {
    const { error: delError } = await supabase
      .from('balitas')
      .delete()
      .eq('id', data[0].id);
    console.log('Cleanup error:', delError);
  }
}

test();
