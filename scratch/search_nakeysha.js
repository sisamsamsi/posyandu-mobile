const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const tempEmail = `temp_test_${Math.floor(Math.random() * 100000)}@test.com`;
  await supabase.auth.signUp({ email: tempEmail, password: 'password123' });

  const { data: dbBalitas } = await supabase.from('balitas').select('id, nama, nik');

  console.log("Searching for names containing keysha, nakeysha, rania, or zahwa (case-insensitive):");
  const queries = ['KEYSHA', 'NAK', 'RANIA', 'ZAH', 'ZAHRA', 'NAKE', 'Nakeysha'];
  
  dbBalitas.forEach(db => {
    const nameUpper = db.nama.toUpperCase();
    if (nameUpper.includes('KEY') || nameUpper.includes('RAN') || nameUpper.includes('ZAH') || nameUpper.includes('NAK') || nameUpper.includes('SHA')) {
      console.log(`- "${db.nama}" (NIK: ${db.nik})`);
    }
  });

  await supabase.auth.signOut();
}

main();
