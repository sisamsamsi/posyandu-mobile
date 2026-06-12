// services/groq-service.ts
import { Balita } from '../lib/types';
import { supabase } from '../lib/supabase';

export interface ZScoreData {
  berat_badan: number;
  tinggi_badan: number;
  lingkar_kepala: number | null;
  lingkar_lengan: number | null;
  zscore_bb_u: number | null;
  status_bb_u: string | null;
  zscore_tb_u: number | null;
  status_tb_u: string | null;
  zscore_bb_tb: number | null;
  status_bb_tb: string | null;
}

export interface PreviousCounseling {
  tanggal: string;
  pertanyaan: string[];
  jawaban: string[];
  rekomendasi: string;
}

export interface InterviewQA {
  question: string;
  answer: string;
}

export interface AdaptiveQuestion {
  question: string;
  guidance: string; // Detail panduan kader untuk menggali info lebih dalam (frekuensi, porsi, bahan pangan)
}

export class GroqService {
  private static API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private static DEFAULT_MODEL = 'llama-3.3-70b-versatile';

  private static getApiKey(): string {
    return process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
  }

  private static async callGemini(messages: any[], isJsonResponse = false): Promise<string> {
    try {
      const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
      if (!geminiApiKey) {
        throw new Error('API Key Gemini tidak dikonfigurasi di env.');
      }
      
      const systemMessage = messages.find(m => m.role === 'system');
      const systemInstruction = systemMessage ? {
        parts: [{ text: systemMessage.content }]
      } : undefined;

      const chatMessages = messages.filter(m => m.role !== 'system');

      const contents = chatMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const body: any = {
        contents,
        generationConfig: {
          temperature: 0.5,
          responseMimeType: isJsonResponse ? "application/json" : undefined
        }
      };

      if (systemInstruction) {
        body.systemInstruction = systemInstruction;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (e: any) {
      console.error('Failed to call Gemini API:', e);
      if (e.name === 'AbortError') {
        throw new Error('Timeout koneksi ke layanan AI Gemini.');
      }
      throw new Error(e.message || 'Gagal terhubung dengan layanan AI Gemini.');
    }
  }

  private static async callOpenAI(messages: any[], isJsonResponse = false): Promise<string> {
    try {
      const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
      if (!openaiApiKey) {
        throw new Error('API Key OpenAI tidak dikonfigurasi di env.');
      }

      const body: any = {
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
        response_format: isJsonResponse ? { type: 'json_object' } : undefined
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      return json.choices?.[0]?.message?.content || '';
    } catch (e: any) {
      console.error('Failed to call OpenAI API:', e);
      if (e.name === 'AbortError') {
        throw new Error('Timeout koneksi ke layanan AI OpenAI.');
      }
      throw new Error(e.message || 'Gagal terhubung dengan layanan AI OpenAI.');
    }
  }

  private static async callGroq(messages: any[], isJsonResponse = false): Promise<string> {
    // 1. Coba gunakan Gemini dahulu (Layanan Utama)
    try {
      console.log('Mencoba layanan AI utama (Gemini)...');
      return await this.callGemini(messages, isJsonResponse);
    } catch (geminiError: any) {
      console.warn('Layanan utama Gemini gagal atau limit, mencoba cadangan:', geminiError.message);
      
      // 2. Jika Gemini gagal, lakukan failover ke OpenAI (Layanan Cadangan)
      const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
      if (openaiApiKey) {
        try {
          console.log('Mengaktifkan failover ke layanan cadangan (OpenAI)...');
          return await this.callOpenAI(messages, isJsonResponse);
        } catch (openaiError: any) {
          console.error('Layanan cadangan OpenAI juga gagal:', openaiError.message);
          throw openaiError;
        }
      }
      
      // Jika tidak ada key OpenAI, lemparkan error asli dari Gemini
      throw geminiError;
    }
  }

  /**
   * Skema B: Membuat pertanyaan secara dinamis per langkah (Langkah 1 s.d. 3) secara adaptif.
   */
  static async generateNextQuestion(
    balita: Balita,
    metrics: ZScoreData,
    ageMonths: number,
    previousQA: InterviewQA[],
    previousSession?: PreviousCounseling | null,
    bbTrend?: 'N' | 'T' | '2T' | '-'
  ): Promise<AdaptiveQuestion> {
    const step = previousQA.length + 1;
    let focusArea = '';
    let instructions = '';

    const isStunting = metrics.status_tb_u?.includes('Pendek') || false;
    const isWasting = metrics.status_bb_tb?.includes('Kurus') || metrics.status_bb_tb?.includes('Wasted') || metrics.status_bb_tb?.includes('Buruk') || false;
    const isUnderweight = metrics.status_bb_u?.includes('Kurang') || false;

    if (step === 1) {
      focusArea = 'GIZI, MPASI, DAN PROTEIN HEWANI (Asupan Nutrisi)';
      instructions = `Fokus pada asupan gizi anak sesuai usianya (${ageMonths} bulan). Tanyakan MPASI atau ASI secara mendalam.
Aturan Kritis:
- Pertanyaan harus spesifik menggali jenis protein hewani yang dikonsumsi (telur, ikan, daging, ayam, hati ayam), frekuensi makan, porsi makan dalam takaran sendok makan, dan tekstur makanan (apakah lumat, cincang kasar, atau padat).
- DILARANG mengajukan pertanyaan naratif atau generalis yang memicu jawaban ya/tidak, seperti 'apakah anak sudah MPASI?' atau 'apakah asupannya sudah baik?'.
- Panduan Kader ('guidance') harus berisi petunjuk taktis bagi kader tentang poin-poin yang harus ditanyakan secara bertahap kepada orang tua agar kader tidak hanya pasif menerima jawaban 'sudah' atau 'belum'.
Adaptasi KMS (Status Gizi Aktual):
${bbTrend === '2T' ? `- ANAK MENGALAMI 2T (BERAT TIDAK NAIK 2 KALI BERURUT-TURUT): Fokuslah pada menyelidiki penurunan nafsu makan yang parah, penolakan makan berat (gerakan tutup mulut), atau anak lemas.` : ''}
${bbTrend === 'T' ? `- ANAK MENGALAMI T (BERAT TIDAK NAIK): Tanyakan apakah ada perubahan porsi makan, anak mulai pilih-pilih makanan (picky eater), atau asupan protein hewani yang berkurang akhir-akhir ini.` : ''}
${isStunting ? `- ANAK MENGALAMI STUNTING (PENDEK): Prioritaskan pertanyaan tentang asupan protein hewani harian dan mikronutrien (seng, zat besi) penting untuk mengejar tinggi badan anak.` : ''}
${isWasting ? `- ANAK MENGALAMI WASTING (KURUS): Prioritaskan kepadatan kalori MPASI, porsi makan, penambahan lemak sehat (minyak, santan, mentega), nafsu makan, dan asupan energi.` : ''}
${isUnderweight && !isWasting ? `- ANAK UNDERWEIGHT (BERAT KURANG): Fokus pada pemenuhan kalori total harian, frekuensi makan, porsi makan utama, dan selingan.` : ''}
${!isStunting && !isWasting && !isUnderweight && bbTrend !== 'T' && bbTrend !== '2T' ? `- ANAK NORMAL: Fokus pada pemeliharaan gizi seimbang, keragaman bahan pangan, dan pencegahan masalah gizi.` : ''}`;
    } else if (step === 2) {
      focusArea = 'RIWAYAT KESEHATAN, IMUNISASI, DAN PENYAKIT INFEKSI';
      instructions = `Fokus pada riwayat kesehatan dan infeksi anak dalam 2 minggu terakhir.
Aturan Kritis:
- Tanyakan apakah anak sempat demam, batuk-pilek, diare, atau infeksi lain baru-baru ini.
- Hubungkan dengan jawaban pertama jika relevan (Jawaban Gizi Langkah 1: "${previousQA[0]?.answer}").
- Tanyakan bagaimana nafsu makan anak saat atau setelah sakit tersebut.
- Tanyakan kelengkapan imunisasi dasar/booster sesuai usia anak dan pemberian Vitamin A (kapsul merah/biru).
- DILARANG mengajukan pertanyaan gejala bahaya darurat medis klinis (red flags) yang menakutkan karena anak diasumsikan dalam kondisi sehat saat datang ke posyandu.
Adaptasi KMS (Status Gizi Aktual):
${bbTrend === '2T' || bbTrend === 'T' ? `- ANAK MENGALAMI T ATAU 2T (BERAT TIDAK NAIK): Anda WAJIB menanyakan apakah anak sempat sakit (seperti demam, batuk pilek, diare berulang, tumbuh gigi, atau infeksi saluran kemih) dalam 2 minggu terakhir yang menyebabkan nafsu makan turun drastis atau penyerapan gizi terganggu.` : ''}
${isStunting ? `- ANAK MENGALAMI STUNTING: Tanyakan penyakit infeksi berulang/kronis dalam 2-4 minggu terakhir (misal diare, ISPA, TBC) karena penyakit berulang sangat menghambat pertumbuhan tulang/tinggi badan.` : ''}
${isWasting ? `- ANAK MENGALAMI WASTING: Tanyakan penyakit infeksi akut baru-baru ini (misal diare, flu berat) yang menurunkan nafsu makan dan menurunkan berat badan secara drastis.` : ''}
${!isStunting && !isWasting && bbTrend !== 'T' && bbTrend !== '2T' ? `- ANAK NORMAL: Tanyakan status imunisasi dasar dan booster lengkap sesuai jadwal usianya.` : ''}`;
    } else {
      focusArea = 'POLA PENGASUHAN, MAKAN AKTIF (FEEDING RULES), DAN SANITASI LINGKUNGAN';
      instructions = `Fokus pada pola asuh makan anak dan kebersihan lingkungan sekitar.
Aturan Kritis:
- Tanyakan siapa yang menyuapi anak sehari-hari, bagaimana perilaku anak saat makan (apakah rewel, dilepeh, harus dipaksa, atau makan sambil menonton HP/jalan-jalan).
- Tanyakan akses air bersih untuk memasak dan kebiasaan cuci tangan pakai sabun sebelum mengolah makanan anak.
- Hubungkan secara cerdas dengan jawaban sebelumnya (Langkah 1: "${previousQA[0]?.answer}", Langkah 2: "${previousQA[1]?.answer}").
Adaptasi KMS (Status Gizi Aktual):
${bbTrend === '2T' || bbTrend === 'T' ? `- ANAK MENGALAMI T ATAU 2T (BERAT TIDAK NAIK): Prioritaskan pertanyaan tentang kepatuhan feeding rules (jadwal makan disiplin, batas waktu makan maksimal 30 menit, tidak memaksa anak makan, membatasi susu/cemilan di sela jam makan utama).` : ''}
${isStunting ? `- ANAK MENGALAMI STUNTING: Prioritaskan sanitasi lingkungan rumah, kebersihan sumber air minum (apakah direbus mendidih), kebersihan jamban, dan kebiasaan mencuci tangan pakai sabun (CTPS) sebelum menyiapkan makanan untuk mencegah enteropati lingkungan.` : ''}
${(isWasting || isUnderweight) && bbTrend !== 'T' && bbTrend !== '2T' ? `- ANAK WASTING/UNDERWEIGHT: Prioritaskan penerapan Feeding Rules (makan aktif/responsif, batas waktu makan 30 menit, tidak memaksakan anak makan, membatasi susu/dot berlebih di sela jam makan utama agar anak merasa lapar).` : ''}
${!isStunting && !isWasting && !isUnderweight && bbTrend !== 'T' && bbTrend !== '2T' ? `- ANAK NORMAL: Fokus pada stimulasi motorik kasar/halus atau stimulasi bahasa sesuai usia anak (milestones) dan pengasuhan responsif.` : ''}`;
    }

    const systemPrompt = `Anda adalah Ahli Gizi dan Tumbuh Kembang Posyandu (Kemenkes RI) yang sangat ramah, hangat, dan profesional.
Tugas Anda adalah merumuskan Pertanyaan Langkah ${step} yang spesifik dan Panduan Kader untuk wawancara gizi balita.

FOKUS AREA LANGKAH ${step}: ${focusArea}
${instructions}

ATURAN KRITIS PENULISAN:
1. SENSOR SOSIAL-EKONOMI PRIVAT: Dilarang keras menanyakan tentang nominal pendapatan, harta, kekayaan, aset, kendaraan, kondisi rumah tangga privat, atau pekerjaan spesifik orang tua.
2. FOKUS SOSIAL-EKONOMI MIKRO YANG ETIS: Tanyakan aspek sosial-ekonomi mikro yang mempengaruhi asupan anak secara sopan (ketersediaan lauk murah di pasar lokal, pengasuh utama).
3. PERTANYAAN DETIL & SPESIFIK: Jangan membuat pertanyaan naratif atau generalis yang bisa dijawab ya/tidak. Berikan contoh bahan makanan konkret atau gejala konkret.
4. PANDUAN KADER (GUIDANCE): Wajib menuliskan instruksi yang sangat taktis bagi kader untuk menggali lebih dalam, mendeteksi jawaban menghindar, dan memberikan instruksi konkret apa saja yang harus kader tanyakan. Jangan membuat panduan yang bersifat terlalu umum.
5. INTEGRASI MEMORI LONGITUDINAL (BULAN LALU): Jika dalam data profil terdapat "MEMORI PENYULUHAN BULAN LALU", periksa data pertanyaan, jawaban, dan rekomendasi bulan lalu. Anda WAJIB memformulasikan pertanyaan Langkah ${step} yang secara cerdas menindaklanjuti progres dari masalah/isu bulan lalu tersebut untuk melihat perkembangannya.

Anda HARUS mengembalikan respon dalam format JSON objek dengan format sebagai berikut:
{
  "question": "Kalimat pertanyaan langsung yang hangat, spesifik, dan sopan kepada orang tua",
  "guidance": "Instruksi konkret bagi kader untuk menggali jawaban lebih dalam"
}`;

    const userPrompt = `### PROFIL BALITA:
- Nama: ${balita.nama}
- Jenis Kelamin: ${balita.jenis_kelamin}
- Usia saat ini: ${ageMonths} bulan
- Berat Badan: ${metrics.berat_badan} kg (Status BB/U: ${metrics.status_bb_u ?? 'Normal'}, Z-score: ${metrics.zscore_bb_u != null ? metrics.zscore_bb_u.toFixed(2) : 'N/A'})
- Tinggi Badan: ${metrics.tinggi_badan} cm (Status TB/U: ${metrics.status_tb_u ?? 'Normal'}, Z-score: ${metrics.zscore_tb_u != null ? metrics.zscore_tb_u.toFixed(2) : 'N/A'})
- Status Gizi (BB/TB): ${metrics.status_bb_tb ?? 'Normal'} (Z-score: ${metrics.zscore_bb_tb != null ? metrics.zscore_bb_tb.toFixed(2) : 'N/A'})
- Tren Berat Badan (KMS): ${bbTrend === '2T' ? '2T (Tidak Naik 2 Kali)' : bbTrend === 'T' ? 'T (Tidak Naik)' : bbTrend === 'N' ? 'N (Naik)' : '- (Baru/Tidak ada data)'}

### MEMORI PENYULUHAN BULAN LALU:
${previousSession 
  ? `Tanggal: ${previousSession.tanggal}
Pertanyaan Sebelumnya: ${JSON.stringify(previousSession.pertanyaan)}
Jawaban Orang Tua Sebelumnya: ${JSON.stringify(previousSession.jawaban)}
Rekomendasi Sebelumnya: ${previousSession.rekomendasi}`
  : 'TIDAK ADA RIWAYAT PENYULUHAN BULAN LALU (Cold Start).'
}

${previousQA.length > 0 ? `### JAWABAN PERTANYAAN SEBELUMNYA DI SESI INI:\n${previousQA.map((qa, i) => `Langkah ${i+1} - Tanya: "${qa.question}"\nJawaban: "${qa.answer}"`).join('\n')}` : ''}

Buatkan 1 objek JSON berisi "question" and "guidance" yang paling relevan untuk Langkah ${step}.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.callGroq(messages, true);
      const parsed = JSON.parse(response);
      if (parsed && typeof parsed.question === 'string' && typeof parsed.guidance === 'string') {
        return parsed as AdaptiveQuestion;
      }
    } catch (e) {
      console.error('Failed to parse Groq adaptive question JSON response, using fallback:', e);
    }

    // Fallbacks jika terjadi kegagalan sistem
    if (step === 1) {
      return {
        question: "Dalam 24 jam terakhir, apa saja makanan utama dan selingan yang dikonsumsi si kecil? Sebutkan jenis protein hewani (seperti telur, ikan, atau ayam), seberapa sering ia makan, dan berapa sendok makan porsinya.",
        guidance: "Panduan Kader: Jangan bertanya 'apakah anak sudah makan?' karena akan dijawab 'sudah' saja. Gali lebih dalam: tanyakan bahan pangan spesifik, porsi makan dalam sendok makan, teksturnya (apakah lumat, cincang kasar, atau padat), dan apakah ada protein hewani."
      };
    } else if (step === 2) {
      return {
        question: "Apakah si kecil sempat mengalami batuk, pilek, demam, atau diare dalam dua minggu terakhir? Jika ya, berapa hari sakitnya dan bagaimana pengaruhnya terhadap keinginan makannya?",
        guidance: "Panduan Kader: Gali riwayat penyakit infeksi dalam 2 minggu terakhir. Penyakit infeksi berulang sangat berkorelasi dengan penurunan berat badan yang memicu stunting. Tanyakan juga apakah imunisasi dasar lengkapnya sudah sesuai usia."
      };
    } else {
      return {
        question: "Siapa yang biasanya menyiapkan makanan dan menyuapi si kecil sehari-hari? Bagaimana suasana saat si kecil makan (apakah lahap, rewel, harus dipaksa, atau makan sambil menonton HP)?",
        guidance: "Panduan Kader: Gali pola pengasuhan makan (feeding rules). Tanyakan apakah anak diberi makan secara aktif/responsif. Tanyakan pula apakah air yang digunakan untuk memasak bersumber dari air bersih/PDAM dan kebiasaan cuci tangan pakai sabun sebelum menyuapi."
      };
    }
  }



  /**
   * Tahap 2: Menghasilkan rekomendasi gizi & MPASI adaptif yang hangat, terarah, dan sopan.
   */
  static async generateRecommendations(
    balita: Balita,
    metrics: ZScoreData,
    ageMonths: number,
    qaList: InterviewQA[],
    catatanKader?: string,
    bbTrend?: 'N' | 'T' | '2T' | '-'
  ): Promise<string> {
    const systemPrompt = `Anda adalah Ahli Gizi dan Tumbuh Kembang Posyandu (Kemenkes RI) yang sangat ramah, hangat, dan profesional.
Tugas Anda adalah merumuskan ringkasan saran/rekomendasi gizi, MPASI praktis, dan panduan tumbuh kembang yang spesifik untuk anak berdasarkan hasil penimbangan serta jawaban wawancara orang tua ditambah catatan lapangan kader.

Panduan Penulisan Rekomendasi:
1. BAHASA: Gunakan bahasa Indonesia yang hangat, membangkitkan semangat, berempati tinggi, dan bebas dari istilah medis yang terlalu rumit. Berikan dukungan moral kepada orang tua anak.
2. TREN BERAT BADAN (T & 2T):
   - Jika anak mengalami T (Tidak Naik) atau 2T (Tidak Naik 2x berturut-turut): Anda WAJIB memberikan perhatian khusus terkait tren berat badannya yang terhambat atau turun. Asumsikan kemungkinan penyebab seperti baru sembuh dari sakit (ISPA/ISK/diare), tumbuh gigi, atau penerapan feeding rules yang kurang tepat. Berikan rekomendasi asupan padat kalori (tambahkan lemak sehat seperti minyak kelapa, santan, atau mentega ke dalam makanan), porsi kecil tapi sering, prioritaskan porsi protein hewani harian, dan sarankan pemeriksaan ke Puskesmas/Bidan Desa jika berat badan tetap tidak naik bulan depan.
3. ADAPTIF KMS (Z-SCORE):
   - Jika anak mengalami STUNTING (TB/U Pendek/Sangat Pendek): Prioritaskan asupan protein hewani harian dan higienitas air minum/sanitasi rumah untuk mengejar tinggi badannya.
   - Jika anak mengalami WASTING (BB/TB Kurus/Sangat Kurus) atau UNDERWEIGHT: Prioritaskan penambahan kalori dan lemak sehat (minyak/santan/mentega), aturan jadwal feeding rules yang tertata, serta asupan nutrisi porsi kecil tapi sering.
   - Jika anak NORMAL (dan trennya naik/bagus): Apresiasi keberhasilan orang tua, sarankan pertahankan pola makan gizi seimbang, dan berikan stimulasi perkembangan sesuai usia.
4. INTEGRASI CATATAN KADER: Jika kader menyertakan catatan lapangan (seperti kondisi fisik lemas, rambut kusam, atau situasi sosial-ekonomi mikro), Anda WAJIB menganalisis data observasi tersebut dan menyematkan rekomendasi klinis/asuhan tambahan yang relevan di dalam poin saran Anda.
5. TANPA DARURAT RED FLAGS: Hindari rujukan klinis darurat rumah sakit yang menakutkan, cukup sarankan rujukan persuasif ke Puskesmas/Bidan Desa jika status gizi atau tren berat badan anak mengkhawatirkan dan tidak kunjung membaik.
6. STRUKTUR: Buatlah saran dalam bentuk 3-4 poin ringkas, padat, dan sangat mudah diingat oleh orang tua. Batasi panjang tulisan maksimal 120-150 kata agar nyaman dibaca di layar HP dan saat dikirim via WhatsApp maupun dicetak di laporan PDF.`;

    const userPrompt = `### PROFIL BALITA:
- Nama: ${balita.nama}
- Usia: ${ageMonths} bulan
- Status Gizi BB/U: ${metrics.status_bb_u ?? 'Normal'} (Z-Score: ${metrics.zscore_bb_u != null ? metrics.zscore_bb_u.toFixed(2) : 'N/A'})
- Status Tinggi TB/U: ${metrics.status_tb_u ?? 'Normal'} (Z-Score: ${metrics.zscore_tb_u != null ? metrics.zscore_tb_u.toFixed(2) : 'N/A'})
- Status Gizi BB/TB: ${metrics.status_bb_tb ?? 'Normal'} (Z-Score: ${metrics.zscore_bb_tb != null ? metrics.zscore_bb_tb.toFixed(2) : 'N/A'})
- Tren Berat Badan (KMS): ${bbTrend === '2T' ? '2T (Tidak Naik 2 Kali)' : bbTrend === 'T' ? 'T (Tidak Naik)' : bbTrend === 'N' ? 'N (Naik)' : '- (Baru/Tidak ada data)'}

### HASIL WAWANCARA MEJA 4/5:
${qaList.map((qa, index) => `${index + 1}. Tanya: "${qa.question}"\n   Jawab: "${qa.answer}"`).join('\n')}

${catatanKader && catatanKader.trim().length > 0 ? `### CATATAN KHUSUS WAWANCARA DARI KADER:\n"${catatanKader}"` : '### CATATAN KHUSUS WAWANCARA DARI KADER:\nTidak ada catatan tambahan.'}

Berikan rekomendasi gizi dan stimulasi tumbuh kembang yang personal, integratif, dan hangat sesuai instruksi.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return await this.callGroq(messages, false);
  }
}
