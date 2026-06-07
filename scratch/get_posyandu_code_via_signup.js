const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tuxwriojdglxfrcjayzz.supabase.co';
const supabaseAnonKey = 'sb_publishable_kDrINbNmCoGC3e3tjAoihQ_HNyau6Gd';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const tempEmail = `temp_query_${Math.floor(Math.random() * 100000)}@test.com`;
  const tempPassword = 'password123';

  console.log('Signing up temporary user:', tempEmail);
  const signUpRes = await supabase.auth.signUp({
    email: tempEmail,
    password: tempPassword
  });

  if (signUpRes.error) {
    console.error('Sign up error:', signUpRes.error.message);
    // If signup is disabled, we will handle it.
    return;
  }

  console.log('Temporary user created & logged in!');

  const { data: posyandus, error: posError } = await supabase
    .from('posyandus')
    .select('*');

  if (posError) {
    console.error('Error fetching posyandus:', posError.message);
    return;
  }

  console.log(`Fetched ${posyandus.length} posyandus.`);

  console.log('Available Posyandus:');
  posyandus.forEach(p => {
    console.log(`- Nama: "${p.nama_posyandu}", ID: "${p.id}", Invite Code: "${p.invite_code}", Kode Posyandu: "${p.kode_posyandu}"`);
  });

  // Cleanup: sign out
  await supabase.auth.signOut();
}

main();
