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
   * Tahap 1: Membuat 3-4 pertanyaan interview gizi secara dinamis.
   * Pertanyaan bersifat berkembang jika ada riwayat bulan lalu, atau basic jika cold start.
   */
  static async generateQuestions(
    balita: Balita,
    metrics: ZScoreData,
    ageMonths: number,
    previousSession?: PreviousCounseling | null
  ): Promise<string[]> {
    const systemPrompt = `Anda adalah Ahli Gizi dan Tumbuh Kembang Posyandu (Kemenkes RI) yang sangat ramah, hangat, dan profesional. 
Tugas Anda adalah merumuskan 3-4 pertanyaan wawancara terarah untuk orang tua balita yang akan diajukan oleh kader posyandu.

Aturan Kritis Penulisan Pertanyaan:
1. SENSOR SOSIAL-EKONOMI PRIVAT: Dilarang keras menanyakan tentang nominal pendapatan, harta, kekayaan, aset, kendaraan, kondisi rumah tangga privat, atau pekerjaan spesifik orang tua.
2. FOKUS SOSIAL-EKONOMI MIKRO YANG ETIS: Tanyakan aspek sosial-ekonomi mikro yang mempengaruhi asupan anak secara sopan, misalnya:
   - Ketersediaan protein terjangkau di pasar terdekat (seperti tempe, tahu, atau telur).
   - Pola pengasuhan sehari-hari (siapa yang menyuapi jika ibu bekerja/sibuk).
   - Akses air bersih untuk pengolahan makanan anak.
3. KELANJUTAN MEMORI (EVOLVING MEMORY): 
   - Jika data penyuluhan bulan lalu ada, bandingkan dan tanyakan kelanjutan masalah lama (contoh: jika bulan lalu anak susah makan karena tumbuh gigi, tanyakan apakah giginya sudah tumbuh sempurna dan nafsu makan membaik).
   - Jika TIDAK ada data bulan lalu (Cold Start), mulailah dengan pertanyaan dasar (basic) seputar frekuensi menyusui (ASI), porsi MPASI, atau milestone tumbuh kembang basic sesuai usianya.
4. TATA BAHASA: Gunakan bahasa Indonesia yang hangat, sopan, komunikatif, dan mudah dipahami oleh kader dan orang tua dari kalangan masyarakat menengah ke bawah.

Anda HARUS mengembalikan respon dalam format JSON objek dengan format sebagai berikut:
{
  "questions": [
    "Pertanyaan 1",
    "Pertanyaan 2",
    "Pertanyaan 3"
  ]
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
  : 'TIDAK ADA RIWAYAT PENYULUHAN (Sesi pertama balita ini / Cold Start). Mulailah dengan pertanyaan dasar penggalian informasi awal.'
}

Buatkan 3 hingga 4 pertanyaan interview yang spesifik, relevan dengan profil tumbuh kembang balita di atas, dan sesuai dengan panduan etika sosial-ekonomi.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.callGroq(messages, true);
    try {
      const parsed = JSON.parse(response);
      if (parsed && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
      return [
        'Bagaimana nafsu makan si kecil dalam seminggu terakhir?',
        'Bahan protein apa saja yang biasanya mudah diperoleh dan dikonsumsi si kecil sehari-hari?',
        'Apakah si kecil sudah bisa melakukan gerakan fisik baru sesuai usianya?'
      ];
    } catch (e) {
      console.error('Failed to parse Groq questions JSON response:', response);
      // Fallback
      return [
        'Bagaimana nafsu makan si kecil dalam seminggu terakhir?',
        'Bahan protein apa saja yang biasanya mudah diperoleh dan dikonsumsi si kecil sehari-hari?',
        'Apakah si kecil sudah aktif bergerak atau menunjukkan pencapaian fisik baru bulan ini?'
      ];
    }
  }

  /**
   * Tahap 2: Menghasilkan rekomendasi gizi & MPASI adaptif yang hangat, terarah, dan sopan.
   */
  static async generateRecommendations(
    balita: Balita,
    metrics: ZScoreData,
    ageMonths: number,
    qaList: InterviewQA[]
  ): Promise<string> {
    const systemPrompt = `Anda adalah Ahli Gizi dan Tumbuh Kembang Posyandu (Kemenkes RI) yang sangat ramah, hangat, dan profesional.
Tugas Anda adalah merumuskan ringkasan saran/rekomendasi gizi, MPASI praktis, dan panduan tumbuh kembang yang spesifik untuk anak berdasarkan hasil penimbangan serta jawaban wawancara orang tua.

Panduan Penulisan Rekomendasi:
1. BAHASA: Gunakan bahasa Indonesia yang hangat, membangkitkan semangat, berempati tinggi, dan bebas dari istilah medis yang terlalu rumit. Berikan dukungan moral kepada orang tua anak.
2. PRAKTIS & EKONOMIS: Tawarkan rekomendasi pangan protein lokal terjangkau (misal: telur rebus harian, tempe kukus lumat, hati ayam, tahu) sesuai dengan kemampuan dan akses pasar lokal mereka.
3. KESEHATAN & RUJUKAN: 
   - Jika status gizi BB/U, TB/U, atau BB/TB masuk dalam kategori risiko tinggi ("Gizi Kurang", "Gizi Buruk", "Sangat Pendek"), berikan saran rujukan ke Puskesmas secara halus dan sopan tanpa membuat orang tua panik.
4. STRUKTUR: Buatlah saran dalam bentuk 3-4 poin ringkas, padat, dan sangat mudah diingat oleh orang tua. Batasi panjang tulisan maksimal 150-200 kata agar nyaman dibaca di layar HP dan saat dikirim via WhatsApp.`;

    const userPrompt = `### PROFIL BALITA:
- Nama: ${balita.nama}
- Usia: ${ageMonths} bulan
- Status Gizi BB/U: ${metrics.status_bb_u ?? 'Normal'} (Z-Score: ${metrics.zscore_bb_u != null ? metrics.zscore_bb_u.toFixed(2) : 'N/A'})
- Status Tinggi TB/U: ${metrics.status_tb_u ?? 'Normal'} (Z-Score: ${metrics.zscore_tb_u != null ? metrics.zscore_tb_u.toFixed(2) : 'N/A'})
- Status Gizi BB/TB: ${metrics.status_bb_tb ?? 'Normal'} (Z-Score: ${metrics.zscore_bb_tb != null ? metrics.zscore_bb_tb.toFixed(2) : 'N/A'})

### HASIL WAWANCARA MEJA 4/5:
${qaList.map((qa, index) => `${index + 1}. Tanya: "${qa.question}"\n   Jawab: "${qa.answer}"`).join('\n')}

Berikan rekomendasi gizi dan stimulasi tumbuh kembang yang personal dan hangat sesuai instruksi.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return await this.callGroq(messages, false);
  }
}
