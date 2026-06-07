const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const updateData = [
  { dbName: "Affandra Drearsa Kanugrahan", newNik: "3402082203250001" },
  { dbName: "Alif Azzain El Frazandy", newNik: "3402081311220001" },
  { dbName: "Alleya Mikhayla Syadira", newNik: "3402086706240001" },
  { dbName: "Arkana Arsa Atharrazka", newNik: "3402081110230003" },
  { dbName: "Arshaka Althafunizam Hakim", newNik: "3402152508230001" },
  { dbName: "Athanasius Shaka Herdityo", newNik: "3404042705240002" },
  { dbName: "Azka Nur Aulia", newNik: "3402080904240001" },
  { dbName: "Dafa Arkatama Yunaskara", newNik: "3402080602240002" },
  { dbName: "Danish Gamal Setyawan", newNik: "3402081009230001" },
  { dbName: "Den Javas Sastra Dharmawan", newNik: "3402702502254201" },
  { dbName: "Elvano Adinatha Ganendra", newNik: "3402082511220001" },
  { dbName: "Eznada Richia Aurelani", newNik: "3402155006230004" },
  { dbName: "Freya Yulfia S", newNik: "3402084307220001" },
  { dbName: "Hijaz Alvarendra Hutama", newNik: "3402080302240004" },
  { dbName: "Hilya Karima Firdausi", newNik: "3402087108230001" },
  { dbName: "Hilya Lanika Edriana", newNik: "3402086007230003" },
  { dbName: "Ishwari Chira Sasmita", newNik: "3402086309240003" },
  { dbName: "Izyan Arutala Ramadhan", newNik: "3402081203240002" },
  { dbName: "Kayla Aqsha Salsabila", newNik: "3402086308210001" },
  { dbName: "Kayla Nadhifa Almaira", newNik: "3402084402230001" },
  { dbName: "Keifano Zafier Rafardhan", newNik: "3402081403250001" },
  { dbName: "Maylafaisha Azkayra Hafizah", newNik: "3402085206240001" },
  { dbName: "Muhammad Arsyad Maulana", newNik: "3402080711230002" },
  { dbName: "Muhammad Davin Setiawan", newNik: "3402082304240002" },
  { dbName: "Muhammad Dzaki", newNik: "3402082505220001" },
  { dbName: "Muhammad Irsyad Maulana", newNik: "3402080711230001" },
  { dbName: "Muhammad Nathan Al Kahfi", newNik: "3402082204250001" },
  { dbName: "Muhammad Yahya Khairunnas", newNik: "3402081404240001" },
  { dbName: "Nakeisha Rania Zahwa", newNik: "3402086909210001" },
  { dbName: "Naziva Sanaya Azkayra Widyatmoko", newNik: "3402106806250003" },
  { dbName: "Neandro Ranu", newNik: "3402082610210003" },
  { dbName: "Noor Abbian Ramadhan", newNik: "3402080904220001" },
  { dbName: "Radeva Kenzo Wijaya", newNik: "3402082806230002" },
  { dbName: "Rayyan Putra Pradibta", newNik: "3402081202220001" },
  { dbName: "Saba Ghania Humaira", newNik: "3402084309220001" },
  { dbName: "Shaza Ramania Putri", newNik: "3402086911220001" },
  { dbName: "Zovan Narendra Aisaki", newNik: "3402083101220001" }
];

async function main() {
  const tempEmail = `temp_update_${Math.floor(Math.random() * 100000)}@test.com`;
  console.log('Signing up temporary session...');
  const signUpRes = await supabase.auth.signUp({ email: tempEmail, password: 'password123' });

  if (signUpRes.error) {
    console.error('Sign up error:', signUpRes.error.message);
    return;
  }
  console.log('Temporary session authenticated.');

  console.log('Fetching database children...');
  const { data: dbBalitas, error: fetchErr } = await supabase
    .from('balitas')
    .select('id, nama, nik');

  if (fetchErr) {
    console.error('Error fetching balitas:', fetchErr.message);
    await supabase.auth.signOut();
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const item of updateData) {
    // Find child by exact dbName (case-insensitive)
    const match = dbBalitas.find(db => db.nama.trim().toUpperCase() === item.dbName.trim().toUpperCase());

    if (match) {
      console.log(`Updating "${match.nama}" NIK: ${match.nik} -> ${item.newNik}`);
      const { error: updateErr } = await supabase
        .from('balitas')
        .update({ nik: item.newNik })
        .eq('id', match.id);

      if (updateErr) {
        console.error(`  Failed to update "${match.nama}":`, updateErr.message);
        failCount++;
      } else {
        successCount++;
      }
    } else {
      console.warn(`⚠️ Warning: Database record not found for name "${item.dbName}"`);
      failCount++;
    }
  }

  console.log(`\nUpdate completed.`);
  console.log(`- Successfully updated: ${successCount} records.`);
  console.log(`- Failed/Not found: ${failCount} records.`);

  await supabase.auth.signOut();
  console.log('Session closed.');
}

main();
