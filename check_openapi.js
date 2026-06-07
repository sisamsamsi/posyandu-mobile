require('dotenv').config();

const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`;
const headers = {
  'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
};

async function run() {
  try {
    const res = await fetch(url, { headers });
    const spec = await res.json();
    console.log('Spec error:', spec);
  } catch (e) {
    console.error(e);
  }
}
run();
