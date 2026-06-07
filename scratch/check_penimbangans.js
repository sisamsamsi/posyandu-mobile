const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function run() {
  console.log('Logging in...');
  await supabase.auth.signInWithPassword({
    email: 'kader@posyandu.com',
    password: 'password123'
  });

  console.log('Querying penimbangans for Mei 2026...');
  // Mei 2026: 2026-05-01 to 2026-05-31
  const start = '2026-05-01T00:00:00.000Z';
  const end = '2026-05-31T23:59:59.999Z';

  const { data, error } = await supabase
    .from('penimbangans')
    .select('id, tanggal, status_bb_u, status_tb_u, status_bb_tb')
    .gte('tanggal', start)
    .lte('tanggal', end);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} records in Mei 2026.`);
  if (data.length > 0) {
    console.log('Sample records:');
    data.slice(0, 10).forEach(r => {
      console.log(`Date: ${r.tanggal} | BB/U: ${r.status_bb_u} | TB/U: ${r.status_tb_u} | BB/TB: ${r.status_bb_tb}`);
    });

    const stats = { bb_u: {}, tb_u: {}, bb_tb: {} };
    data.forEach((r) => {
      stats.bb_u[r.status_bb_u] = (stats.bb_u[r.status_bb_u] || 0) + 1;
      stats.tb_u[r.status_tb_u] = (stats.tb_u[r.status_tb_u] || 0) + 1;
      stats.bb_tb[r.status_bb_tb] = (stats.bb_tb[r.status_bb_tb] || 0) + 1;
    });

    console.log('\nBB/U Counts:', stats.bb_u);
    console.log('TB/U Counts:', stats.tb_u);
    console.log('BB/TB Counts:', stats.bb_tb);
  }
}

run();
