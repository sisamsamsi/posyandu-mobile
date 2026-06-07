const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const tempEmail = `temp_test_${Math.floor(Math.random() * 100000)}@test.com`;
  const tempPassword = 'password123';

  console.log('Signing up temporary user:', tempEmail);
  const signUpRes = await supabase.auth.signUp({
    email: tempEmail,
    password: tempPassword
  });

  if (signUpRes.error) {
    console.error('Sign up error:', signUpRes.error.message);
    return;
  }

  console.log('Signed up successfully! Session user ID:', signUpRes.data.user.id);

  console.log('Trying to update Freya...');
  const { error } = await supabase
    .from('balitas')
    .update({ nik: '3402084307220001' })
    .eq('id', '00000000-0000-0000-0000-000000000005');

  if (error) {
    console.error('Error updating balitas:', error.message);
  } else {
    console.log('Successfully updated Freya NIK!');
  }

  // Cleanup: sign out
  await supabase.auth.signOut();
}

main();
