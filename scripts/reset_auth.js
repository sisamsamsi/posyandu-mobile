const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function resetPassword() {
  const email = 'kader@posyandu.com';
  const newPassword = 'password123';
  
  console.log(`--- Resetting Password for ${email} ---`);
  
  // 1. Get user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.log('User not found. Creating new user...');
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true
    });
    if (createError) console.error('Error creating user:', createError.message);
    else console.log(`User ${email} created with password: ${newPassword}`);
    return;
  }

  // 2. Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword
  });

  if (updateError) {
    console.error('Error resetting password:', updateError.message);
  } else {
    console.log(`Successfully reset password for ${email} to: ${newPassword}`);
  }
}

resetPassword();
