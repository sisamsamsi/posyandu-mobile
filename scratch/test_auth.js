const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' }); // load EXPO_PUBLIC_ variables from root

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tuxwriojdglxfrcjayzz.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', url);
console.log('Anon Key length:', anonKey?.length);

const supabase = createClient(url, anonKey);

async function testAuth(email, password) {
  console.log(`\nTesting auth for ${email}...`);
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      console.log(`Sign in failed: ${signInError.message}`);
      
      console.log('Attempting sign up...');
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        console.log(`Sign up failed: ${signUpError.message}`);
        return null;
      }
      console.log('Sign up result:', signUpData.user ? 'User created' : 'No user', 'Session:', signUpData.session ? 'Yes' : 'No');
      
      // Try signing in again
      const { data: signInData2, error: signInError2 } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError2) {
        console.log(`Second sign in failed: ${signInError2.message}`);
        return null;
      }
      console.log('Second sign in successful!');
      return signInData2.session;
    } else {
      console.log('Sign in successful!');
      return signInData.session;
    }
  } catch (err) {
    console.error('Exception:', err);
    return null;
  }
}

async function run() {
  // Test simulasi@posyandu.com
  const sessionSim = await testAuth('simulasi@posyandu.com', 'password123');
  
  // Test kader@posyandu.com
  const sessionKader = await testAuth('kader@posyandu.com', 'password123');
  
  // Try querying posyandus and balitas with active session
  if (sessionSim || sessionKader) {
    const activeSupabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    
    // Set session manually
    const targetSession = sessionKader || sessionSim;
    await activeSupabase.auth.setSession(targetSession);
    
    const { data: posyandus, error: pErr } = await activeSupabase.from('posyandus').select('id, nama_posyandu').limit(2);
    console.log('Posyandus fetch:', pErr ? `Error: ${pErr.message}` : `Success: ${posyandus.length} records`);
    if (posyandus && posyandus.length > 0) {
      console.log('First posyandu:', posyandus[0]);
    }
    
    const { data: balitas, error: bErr } = await activeSupabase.from('balitas').select('id, nama').limit(2);
    console.log('Balitas fetch:', bErr ? `Error: ${bErr.message}` : `Success: ${balitas.length} records`);
    if (balitas && balitas.length > 0) {
      console.log('First balita:', balitas[0]);
    }
  }
}

run();
