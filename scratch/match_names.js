const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const childData = [
  { name: "AFFANDRA DREARSA KANUGRAHAN", nik: "3402082203250001" },
  { name: "ALIF AZZAIN EL FRAZANDY", nik: "3402081311220001" },
  { name: "ALLEYA MIKHAYLA SHADIRA", nik: "3402086706240001" },
  { name: "ARKANA ARSA ATHARRAZKA", nik: "3402081110230003" },
  { name: "ARSHAKA AL THAFUNIZAM HAKIM", nik: "3402152508230001" },
  { name: "ATHANASIUS SHAKA HERDITYO", nik: "3404042705240002" },
  { name: "AZKA NUR AULIA", nik: "3402080904240001" },
  { name: "DAFA ARKATAMA YUNASKARA", nik: "3402080602240002" },
  { name: "DANISH GAMAL SETYAWAN", nik: "3402081009230001" },
  { name: "DEN JAVAS SASTRA DHARMAWAN", nik: "3402702502254201" },
  { name: "ELVANO ADINATHA GANENDRA", nik: "3402082511220001" },
  { name: "EZNADA RICHIA AURELANI", nik: "3402155006230004" },
  { name: "FREYA YUIYA S", nik: "3402084307220001" },
  { name: "HIJAZ ALVARENDRA HUTAMA", nik: "3402080302240004" },
  { name: "HILYA KARIMA FIRDAUSI", nik: "3402087108230001" },
  { name: "HILYA LANIKA EDRIANA", nik: "3402086007230003" },
  { name: "ISHWARI CHIRA SASMITA", nik: "3402086309240003" },
  { name: "IZYAN ARUTALA RAMADHAN", nik: "3402081203240002" },
  { name: "KAYLA AQSHA SALSABILA", nik: "3402086308210001" },
  { name: "KAYLA NADHIFA ALMAIRA", nik: "3402084402230001" },
  { name: "KEIFANO ZAFIER RAFARDHAN", nik: "3402081403250001" },
  { name: "MAYLAFAISHA AZKAYRA HAFIZAH", nik: "3402085206240001" },
  { name: "MUHAMMAD ARSYAD MAULANA", nik: "3402080711230002" },
  { name: "MUHAMMAD DAVIN SETYAWAN", nik: "3402082304240002" },
  { name: "MUHAMMAD DZAKI", nik: "3402082505220001" },
  { name: "MUHAMMAD IRSYAD MAULANA", nik: "3402080711230001" },
  { name: "MUHAMMAD NATHAN AL KAHFI", nik: "3402082204250001" },
  { name: "MUHAMMAD YAHYA KHAIRUNNAS", nik: "3402081404240001" },
  { name: "NAKEYSHA RANIA ZAHWA", nik: "3402086909210001" },
  { name: "NAZIVA SANAYA AZKAYRA WIDYATMOKO", nik: "3402106806250003" },
  { name: "NEANDRO RANU SAPUTRA", nik: "3402082610210003" },
  { name: "NOOR ABBIAN RAMADHAN", nik: "3402080904220001" },
  { name: "RADEVA KENZO", nik: "3402082806230002" },
  { name: "RAYYAN PUTRA PRADIBTA", nik: "3402081202220001" },
  { name: "SABA GHANIA HUMAIRA", nik: "3402084309220001" },
  { name: "SHAZA RAMANIA PUTRI", nik: "3402086911220001" },
  { name: "ZOVAN NARENDRA ALSAKI", nik: "3402083101220001" }
];

async function main() {
  const tempEmail = `temp_test_${Math.floor(Math.random() * 100000)}@test.com`;
  await supabase.auth.signUp({ email: tempEmail, password: 'password123' });

  const { data: dbBalitas } = await supabase.from('balitas').select('id, nama, nik');

  console.log(`Matching process...`);
  console.log(`Excel list length: ${childData.length}`);
  console.log(`DB list length: ${dbBalitas.length}`);

  let matches = [];
  let unmatchedExcel = [];
  
  for (const item of childData) {
    const cleanedExcel = item.name.trim().toUpperCase().replace(/\s+/g, ' ');
    
    // Try exact match
    let found = dbBalitas.find(db => db.nama.trim().toUpperCase().replace(/\s+/g, ' ') === cleanedExcel);
    
    if (found) {
      matches.push({ excel: item.name, db: found.nama, id: found.id, nik: item.nik });
      continue;
    }

    // Try fuzzy match (first name / first two words)
    const words = cleanedExcel.split(' ');
    const firstName = words[0];
    const firstTwo = words.slice(0, 2).join(' ');

    let candidates = dbBalitas.filter(db => {
      const dbName = db.nama.trim().toUpperCase().replace(/\s+/g, ' ');
      return dbName.startsWith(firstTwo) || dbName.startsWith(firstName);
    });

    if (candidates.length === 1) {
      matches.push({ excel: item.name, db: candidates[0].nama, id: candidates[0].id, nik: item.nik });
    } else if (candidates.length > 1) {
      // Pick the closest candidate (simplistic length similarity or word count)
      console.log(`Multiple candidates for "${item.name}":`, candidates.map(c => c.nama));
      // Let's find if one of them has a strong overlap
      let best = null;
      let maxOverlap = 0;
      for (const cand of candidates) {
        const candWords = cand.nama.toUpperCase().split(' ');
        const overlap = words.filter(w => candWords.includes(w)).length;
        if (overlap > maxOverlap) {
          maxOverlap = overlap;
          best = cand;
        }
      }
      if (best && maxOverlap >= 2) {
        matches.push({ excel: item.name, db: best.nama, id: best.id, nik: item.nik });
      } else {
        unmatchedExcel.push({ excelName: item.name, candidates: candidates.map(c => c.nama) });
      }
    } else {
      // Check if DB name contains Excel name or vice-versa
      let substringMatch = dbBalitas.filter(db => {
        const dbName = db.nama.trim().toUpperCase();
        return dbName.includes(firstName) || firstName.includes(dbName.split(' ')[0]);
      });
      if (substringMatch.length > 0) {
        unmatchedExcel.push({ excelName: item.name, candidates: substringMatch.map(c => c.nama) });
      } else {
        unmatchedExcel.push({ excelName: item.name, candidates: [] });
      }
    }
  }

  console.log(`\nMatched names mapping:`);
  matches.forEach(m => console.log(`  - Excel: "${m.excel}" => DB: "${m.db}"`));

  console.log(`\nUnmatched Excel names:`);
  unmatchedExcel.forEach(um => {
    console.log(`  - "${um.excelName}"`);
    if (um.candidates.length > 0) {
      console.log(`    Possible candidates: ${um.candidates.map(c => `"${c}"`).join(', ')}`);
    } else {
      console.log(`    No candidates.`);
    }
  });

  await supabase.auth.signOut();
}

main();
