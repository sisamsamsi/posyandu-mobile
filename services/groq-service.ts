// services/groq-service.ts
import { Balita } from '../lib/types';

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

  private static async callGroq(messages: any[], isJsonResponse = false): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.warn('Groq API Key is not set in environment variables.');
      throw new Error('API Key Groq belum diatur. Silakan periksa berkas .env Anda.');
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.DEFAULT_MODEL,
          messages,
          temperature: 0.5,
          response_format: isJsonResponse ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq API error:', errorText);
        throw new Error(`Groq API error: ${response.status} - ${response.statusText}`);
      }

      const json = await response.json();
      return json.choices[0]?.message?.content || '';
    } catch (e: any) {
      console.error('Failed to call Groq API:', e);
      throw new Error(e.message || 'Gagal terhubung dengan layanan AI Groq.');
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
    previousSession?: PreviousCounseling | null
  ): Promise<AdaptiveQuestion> {
    const step = previousQA.length + 1;
    let focusArea = '';
    let instructions = '';

    if (step === 1) {
      focusArea = 'GIZI, MPASI, DAN PROTEIN HEWANI (Asupan Nutrisi)';
      instructions = `Fokus pada asupan gizi anak sesuai usianya (${ageMonths} bulan). Tanyakan MPASI atau ASI secara mendalam.
Aturan Kritis:
- Pertanyaan harus spesifik menggali jenis protein hewani yang dikonsumsi (telur, ikan, daging, ayam, hati ayam), frekuensi makan, porsi makan dalam takaran sendok makan, dan tekstur makanan (apakah lumat, cincang kasar, atau padat).
- DILARANG mengajukan pertanyaan naratif atau generalis yang memicu jawaban ya/tidak, seperti 'apakah anak sudah MPASI?' atau 'apakah asupannya sudah baik?'.
- Panduan Kader ('guidance') harus berisi petunjuk taktis bagi kader tentang poin-poin yang harus ditanyakan secara bertahap kepada orang tua agar kader tidak hanya pasif menerima jawaban 'sudah' atau 'belum'.`;
    } else if (step === 2) {
      focusArea = 'RIWAYAT KESEHATAN, IMUNISASI, DAN PENYAKIT INFEKSI';
      instructions = `Fokus pada riwayat kesehatan dan infeksi anak dalam 2 minggu terakhir.
Aturan Kritis:
- Tanyakan apakah anak sempat demam, batuk-pilek, diare, atau infeksi lain baru-baru ini.
- Hubungkan dengan jawaban pertama jika relevan (Jawaban Gizi Langkah 1: "${previousQA[0]?.answer}").
- Tanyakan bagaimana nafsu makan anak saat atau setelah sakit tersebut.
- Panduan Kader ('guidance') harus menginstruksikan kader untuk menggali durasi sakit, rujukan dokter/puskesmas, serta kelengkapan imunisasi dasar dan pemberian Vitamin A.`;
    } else {
      focusArea = 'POLA PENGASUHAN, MAKAN AKTIF (FEEDING RULES), DAN SANITASI LINGKUNGAN';
      instructions = `Fokus pada pola asuh makan anak dan kebersihan lingkungan sekitar.
Aturan Kritis:
- Tanyakan siapa yang menyuapi anak sehari-hari, bagaimana perilaku anak saat makan (apakah rewel, dilepeh, harus dipaksa, atau makan sambil menonton HP/jalan-jalan).
- Tanyakan akses air bersih untuk memasak dan kebiasaan cuci tangan pakai sabun sebelum mengolah makanan anak.
- Hubungkan secara cerdas dengan jawaban sebelumnya (Langkah 1: "${previousQA[0]?.answer}", Langkah 2: "${previousQA[1]?.answer}").
- Panduan Kader ('guidance') harus menginstruksikan kader untuk meneliti kebiasaan mencuci tangan pakai sabun, perilaku feeding rules yang benar, dan kualitas air minum di rumah.`;
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

### MEMORI PENYULUHAN BULAN LALU:
${previousSession 
  ? `Tanggal: ${previousSession.tanggal}
Pertanyaan Sebelumnya: ${JSON.stringify(previousSession.pertanyaan)}
Jawaban Orang Tua Sebelumnya: ${JSON.stringify(previousSession.jawaban)}
Rekomendasi Sebelumnya: ${previousSession.rekomendasi}`
  : 'TIDAK ADA RIWAYAT PENYULUHAN BULAN LALU (Cold Start).'
}

${previousQA.length > 0 ? `### JAWABAN PERTANYAAN SEBELUMNYA DI SESI INI:\n${previousQA.map((qa, i) => `Langkah ${i+1} - Tanya: "${qa.question}"\nJawaban: "${qa.answer}"`).join('\n')}` : ''}

Buatkan 1 objek JSON berisi "question" dan "guidance" yang paling relevan untuk Langkah ${step}.`;

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
    catatanKader?: string
  ): Promise<string> {
    const systemPrompt = `Anda adalah Ahli Gizi dan Tumbuh Kembang Posyandu (Kemenkes RI) yang sangat ramah, hangat, dan profesional.
Tugas Anda adalah merumuskan ringkasan saran/rekomendasi gizi, MPASI praktis, dan panduan tumbuh kembang yang spesifik untuk anak berdasarkan hasil penimbangan serta jawaban wawancara orang tua ditambah catatan lapangan kader.

Panduan Penulisan Rekomendasi:
1. BAHASA: Gunakan bahasa Indonesia yang hangat, membangkitkan semangat, berempati tinggi, dan bebas dari istilah medis yang terlalu rumit. Berikan dukungan moral kepada orang tua anak.
2. PRAKTIS & EKONOMIS: Tawarkan rekomendasi pangan protein lokal terjangkau (misal: telur rebus harian, tempe kukus lumat, hati ayam, tahu) sesuai dengan kemampuan dan akses pasar lokal mereka.
3. KESEHATAN & RUJUKAN: 
   - Jika status gizi BB/U, TB/U, atau BB/TB masuk dalam kategori risiko tinggi ("Gizi Kurang", "Gizi Buruk", "Sangat Pendek"), berikan saran rujukan ke Puskesmas secara halus dan sopan tanpa membuat orang tua panik.
4. INTEGRASI CATATAN KADER: Jika kader menyertakan catatan lapangan (seperti kondisi fisik lemas, rambut kusam, atau situasi sosial-ekonomi mikro), Anda WAJIB menganalisis data observasi tersebut dan menyematkan rekomendasi klinis/asuhan tambahan yang relevan di dalam poin saran Anda.
5. STRUKTUR: Buatlah saran dalam bentuk 3-4 poin ringkas, padat, dan sangat mudah diingat oleh orang tua. Batasi panjang tulisan maksimal 150-200 kata agar nyaman dibaca di layar HP dan saat dikirim via WhatsApp.`;

    const userPrompt = `### PROFIL BALITA:
- Nama: ${balita.nama}
- Usia: ${ageMonths} bulan
- Status Gizi BB/U: ${metrics.status_bb_u ?? 'Normal'} (Z-Score: ${metrics.zscore_bb_u != null ? metrics.zscore_bb_u.toFixed(2) : 'N/A'})
- Status Tinggi TB/U: ${metrics.status_tb_u ?? 'Normal'} (Z-Score: ${metrics.zscore_tb_u != null ? metrics.zscore_tb_u.toFixed(2) : 'N/A'})
- Status Gizi BB/TB: ${metrics.status_bb_tb ?? 'Normal'} (Z-Score: ${metrics.zscore_bb_tb != null ? metrics.zscore_bb_tb.toFixed(2) : 'N/A'})

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
