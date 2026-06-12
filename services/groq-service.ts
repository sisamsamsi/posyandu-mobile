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
  focus_area?: string;
}

export interface AdaptiveQuestion {
  focus_area: string;
  question: string;
  guidance: string;
}

export interface WeighingHistoryItem {
  tanggal: string;
  berat_badan: number;
  tinggi_badan: number;
  zscore_bb_u: number | null;
  status_bb_u: string | null;
  zscore_tb_u: number | null;
  status_tb_u: string | null;
  zscore_bb_tb: number | null;
  status_bb_tb: string | null;
}

export interface ImunisasiStatus {
  completeness: number;
  missing: string[];
}

export class GroqService {
  private static API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private static DEFAULT_MODEL = 'llama-3.3-70b-versatile';

  private static getApiKey(): string {
    return process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
  }

  private static async callGemini(messages: any[], isJsonResponse = false): Promise<string> {
    try {
      const openrouterApiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
      if (!openrouterApiKey) {
        throw new Error('API Key OpenRouter tidak dikonfigurasi di env.');
      }

      const body: any = {
        model: 'google/gemini-2.5-flash',
        messages,
        temperature: 0.5,
        max_tokens: 2000,
        response_format: isJsonResponse ? { type: 'json_object' } : undefined
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 detik timeout

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openrouterApiKey}`,
          'HTTP-Referer': 'https://github.com/sisamsamsi/posyandu-mobile',
          'X-Title': 'Posyandu Mobile'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter Gemini API error:', errorText);
        throw new Error(`OpenRouter Gemini API error: ${response.status} - ${errorText}`);
      }

      const json = await response.json();
      return json.choices?.[0]?.message?.content || '';
    } catch (e: any) {
      console.error('Failed to call OpenRouter Gemini API:', e);
      if (e.name === 'AbortError') {
        throw new Error('Timeout koneksi ke layanan AI OpenRouter Gemini.');
      }
      throw new Error(e.message || 'Gagal terhubung dengan layanan AI OpenRouter Gemini.');
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
   * Skema B: Membuat pertanyaan secara dinamis per langkah secara adaptif dengan memori hingga 3 bulan.
   */
  static async generateNextQuestion(
    balita: Balita,
    metrics: ZScoreData,
    ageMonths: number,
    previousQA: InterviewQA[],
    previousSessions?: PreviousCounseling[] | null,
    bbTrend?: 'N' | 'T' | '2T' | '-',
    weighingHistory?: WeighingHistoryItem[] | null,
    imunisasiStatus?: ImunisasiStatus | null
  ): Promise<AdaptiveQuestion> {
    const step = previousQA.length + 1;

    const isStunting = metrics.status_tb_u?.includes('Pendek') || false;
    const isWasting = metrics.status_bb_tb?.includes('Kurus') || metrics.status_bb_tb?.includes('Wasted') || metrics.status_bb_tb?.includes('Buruk') || false;
    const isUnderweight = metrics.status_bb_u?.includes('Kurang') || false;

    const systemPrompt = `Anda adalah Ahli Gizi dan Tumbuh Kembang Posyandu (Kemenkes RI) yang sangat ramah, hangat, dan profesional.
Tugas Anda adalah memilih Fokus Wawancara terpenting untuk Langkah ${step} dan merumuskan Pertanyaan Langkah ${step} beserta Panduan Kader.

FOKUS AREA YANG TERSEDIA:
1. EVALUASI REKOMENDASI LALU: Mengevaluasi progres saran/rekomendasi dari bulan-bulan sebelumnya.
2. GIZI & MPASI: Kuantitas/kualitas makan, protein hewani, porsi, frekuensi.
3. RIWAYAT PENYAKIT & INFEKSI: Batuk, pilek, demam, diare dalam 2 minggu terakhir.
4. POLA PENGASUHAN & FEEDING RULES: Kebiasaan makan (GTM, rewel), kedisiplinan jadwal makan, pengasuh utama.
5. SANITASI & KEBERSIHAN: Air bersih, cuci tangan pakai sabun, kebersihan jamban/lingkungan.
6. STIMULASI & TUMBUH KEMBANG: Perkembangan motorik/bahasa sesuai usia anak.

ATURAN PEMILIHAN FOKUS AREA:
- Langkah ${step} HARUS memilih area yang paling mendesak/bermasalah bagi balita saat ini dan BELUM ditanyakan di langkah sebelumnya pada sesi ini.
- JIKA ada data "MEMORI PENYULUHAN & REKOMENDASI" dan ini adalah LANGKAH 1, Anda WAJIB memilih area "EVALUASI REKOMENDASI LALU" untuk memfollow-up progres dari rekomendasi terakhir yang diberikan ke orang tua.
- JIKA tidak ada memori bulan lalu (atau di Langkah 2 & 3), pilihlah Fokus Area yang paling kritis berdasarkan:
  * Tren KMS 2T/T atau status underweight/wasting: Prioritaskan "GIZI & MPASI" atau "RIWAYAT PENYAKIT & INFEKSI" atau "POLA PENGASUHAN & FEEDING RULES".
  * Status Stunting (pendek): Prioritaskan "GIZI & MPASI" (khusus lauk protein hewani) atau "SANITASI & KEBERSIHAN" (enteropati lingkungan).
  * Balita normal: Prioritaskan "STIMULASI & TUMBUH KEMBANG" atau "GIZI & MPASI" (edukasi gizi seimbang).

ATURAN KRITIS PENULISAN PERTANYAAN:
1. SENSOR SOSIAL-EKONOMI PRIVAT: Dilarang keras menanyakan tentang nominal pendapatan, harta, kekayaan, aset, kendaraan, kondisi rumah tangga privat, atau pekerjaan spesifik orang tua.
2. FOKUS SOSIAL-EKONOMI MIKRO YANG ETIS: Tanyakan aspek sosial-ekonomi mikro yang mempengaruhi asupan anak secara sopan (ketersediaan lauk murah di pasar lokal, pengasuh utama).
3. SATU PERTANYAAN TERFOKUS (ATURAN UTAMA): Hanya ajukan SATU pertanyaan utama (maksimal 2 kalimat tanya singkat) sesuai Fokus Area yang Anda pilih. DILARANG menumpuk banyak pertanyaan lintas topik sekaligus agar orang tua tidak kewalahan.
4. BATAS PANJANG PERTANYAAN (MAKSIMAL 30 KATA): Pertanyaan langsung ke orang tua wajib sangat singkat, hangat, ramah, dan santai.
5. PANDUAN KADER (GUIDANCE - MAKSIMAL 2 POIN & 25 KATA): Tuliskan instruksi singkat (maksimal 2 poin pendek) untuk kader guna mengarahkan wawancara jika orang tua menjawab terlalu singkat.

Anda HARUS mengembalikan respon dalam format JSON objek dengan format sebagai berikut:
{
  "focus_area": "NAMA_FOKUS_AREA_YANG_DIPILIH",
  "question": "Kalimat pertanyaan langsung yang hangat, spesifik, singkat, dan sopan kepada orang tua",
  "guidance": "Instruksi konkret pendek bagi kader untuk menggali jawaban"
}`;

    const userPrompt = `### PROFIL BALITA:
- Nama: ${balita.nama}
- Jenis Kelamin: ${balita.jenis_kelamin}
- Usia saat ini: ${ageMonths} bulan
- Berat Badan: ${metrics.berat_badan} kg (Status BB/U: ${metrics.status_bb_u ?? 'Normal'}, Z-score: ${metrics.zscore_bb_u != null ? metrics.zscore_bb_u.toFixed(2) : 'N/A'})
- Tinggi Badan: ${metrics.tinggi_badan} cm (Status TB/U: ${metrics.status_tb_u ?? 'Normal'}, Z-score: ${metrics.zscore_tb_u != null ? metrics.zscore_tb_u.toFixed(2) : 'N/A'})
- Status Gizi (BB/TB): ${metrics.status_bb_tb ?? 'Normal'} (Z-score: ${metrics.zscore_bb_tb != null ? metrics.zscore_bb_tb.toFixed(2) : 'N/A'})
- Tren Berat Badan (KMS): ${bbTrend === '2T' ? '2T (Tidak Naik 2 Kali)' : bbTrend === 'T' ? 'T (Tidak Naik)' : bbTrend === 'N' ? 'N (Naik)' : '- (Baru/Tidak ada data)'}

### RIWAYAT PENIMBANGAN & Z-SCORE (3 BULAN TERAKHIR):
${weighingHistory && weighingHistory.length > 0
  ? weighingHistory.map((h, i) => `- ${h.tanggal}: BB ${h.berat_badan} kg (Z-Score BB/U: ${h.zscore_bb_u?.toFixed(2) || 'N/A'}, Status TB/U: ${h.status_tb_u || 'Normal'})`).join('\n')
  : '- Tidak ada riwayat penimbangan sebelumnya.'
}

### STATUS IMUNISASI BALITA:
${imunisasiStatus
  ? `- Kelengkapan: ${imunisasiStatus.completeness}%
- Vaksin belum lengkap/terlewat: ${imunisasiStatus.missing.length > 0 ? imunisasiStatus.missing.join(', ') : 'Tidak ada (Lengkap)'}`
  : '- Data imunisasi belum tercatat.'
}

### MEMORI PENYULUHAN & REKOMENDASI (SAMPAI 3 BULAN TERAKHIR):
${previousSessions && previousSessions.length > 0
  ? previousSessions.map((s, idx) => `Tanggal: ${s.tanggal}
  * Pertanyaan: ${JSON.stringify(s.pertanyaan)}
  * Jawaban: ${JSON.stringify(s.jawaban)}
  * Rekomendasi Diberikan: ${s.rekomendasi}`).join('\n---\n')
  : '- Tidak ada riwayat penyuluhan sebelumnya (Cold Start).'
}

${previousQA.length > 0 ? `### JAWABAN PERTANYAAN SEBELUMNYA DI SESI INI:\n${previousQA.map((qa, i) => `Langkah ${i+1} [Fokus: ${qa.focus_area || 'Nutrisi'}] - Tanya: "${qa.question}"\nJawaban: "${qa.answer}"`).join('\n')}` : ''}

Tentukan Fokus Area Langkah ${step} yang paling krusial untuk diselidiki saat ini, lalu buatkan 1 objek JSON berisi "focus_area", "question", dan "guidance".`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.callGroq(messages, true);
      const parsed = JSON.parse(response);
      if (parsed && typeof parsed.focus_area === 'string' && typeof parsed.question === 'string' && typeof parsed.guidance === 'string') {
        return parsed as AdaptiveQuestion;
      }
    } catch (e) {
      console.error('Failed to parse Groq adaptive question JSON response, using fallback:', e);
    }

    // Fallbacks jika terjadi kegagalan sistem
    if (step === 1) {
      return {
        focus_area: 'GIZI & MPASI',
        question: "Ibu, apa saja lauk protein hewani (seperti telur atau ikan) yang dikonsumsi si kecil kemarin dan berapa kali makannya?",
        guidance: "- Gali frekuensi & porsi makan.\n- Pastikan jenis protein hewani yang dikonsumsi."
      };
    } else if (step === 2) {
      return {
        focus_area: 'RIWAYAT PENYAKIT & INFEKSI',
        question: "Apakah si kecil sempat mengalami batuk, pilek, demam, atau diare dalam dua minggu terakhir, Bu?",
        guidance: "- Gali durasi sakitnya.\n- Tanyakan status imunisasi dasar sesuai usianya."
      };
    } else {
      return {
        focus_area: 'POLA PENGASUHAN & FEEDING RULES',
        question: "Bagaimana perilaku makan si kecil sehari-hari? Apakah ia suka rewel atau melakukan gerakan tutup mulut (GTM)?",
        guidance: "- Tanyakan siapa yang menyuapinya sehari-hari.\n- Tanyakan status cuci tangan/sanitasi."
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
    bbTrend?: 'N' | 'T' | '2T' | '-',
    previousSessions?: PreviousCounseling[] | null,
    weighingHistory?: WeighingHistoryItem[] | null,
    imunisasiStatus?: ImunisasiStatus | null
  ): Promise<string> {
    const systemPrompt = `Anda adalah Ahli Gizi dan Tumbuh Kembang Posyandu (Kemenkes RI) yang sangat ramah, hangat, dan profesional.
Tugas Anda adalah merumuskan ringkasan saran/rekomendasi gizi, MPASI praktis, dan panduan tumbuh kembang yang spesifik untuk anak berdasarkan hasil penimbangan, wawancara hari ini, status imunisasi, serta riwayat perkembangan dan rekomendasi bulan-bulan sebelumnya.

Panduan Penulisan Rekomendasi:
1. BAHASA: Gunakan bahasa Indonesia yang hangat, membangkitkan semangat, berempati tinggi, dan bebas dari istilah medis yang terlalu rumit. Berikan dukungan moral kepada orang tua anak.
2. ANALISIS TREN JANGKA PANJANG (3 BULAN TERAKHIR):
   - Perhatikan riwayat penimbangan dan rekomendasi 3 bulan terakhir. Jika anak menunjukkan perbaikan (berat/tinggi naik), berikan apresiasi yang spesifik. Jika berat badan seret atau z-score stagnan/memburuk selama beberapa bulan terakhir, berikan evaluasi taktis mengapa saran bulan lalu belum bekerja maksimal (hubungkan dengan jawaban wawancara).
3. TREN BERAT BADAN (T & 2T):
   - Jika anak mengalami T atau 2T: Berikan perhatian khusus terkait tren berat badannya yang terhambat atau turun. Berikan rekomendasi asupan padat kalori (tambahkan lemak sehat seperti minyak kelapa, santan, atau mentega ke dalam makanan), porsi kecil tapi sering, prioritaskan porsi protein hewani harian, dan sarankan pemeriksaan ke Puskesmas/Bidan Desa jika berat badan tetap tidak naik bulan depan.
4. ADAPTIF KMS & IMUNISASI:
   - Jika anak mengalami STUNTING: Prioritaskan asupan protein hewani harian dan higienitas air minum/sanitasi rumah untuk mengejar tinggi badannya.
   - Jika ada imunisasi yang terlambat/terlewat, ingatkan orang tua dengan lembut untuk melengkapinya pada jadwal posyandu berikutnya.
5. INTEGRASI CATATAN KADER: Jika kader menyertakan catatan lapangan, Anda WAJIB menganalisis data observasi tersebut dan menyematkan rekomendasi klinis/asuhan tambahan yang relevan.
6. STRUKTUR: Buatlah saran dalam bentuk 3-4 poin ringkas, padat, dan sangat mudah diingat oleh orang tua. Batasi panjang tulisan maksimal 120-150 kata agar nyaman dibaca di layar HP dan saat dikirim via WhatsApp.`;

    const userPrompt = `### PROFIL BALITA:
- Nama: ${balita.nama}
- Usia: ${ageMonths} bulan
- Status Gizi BB/U: ${metrics.status_bb_u ?? 'Normal'} (Z-Score: ${metrics.zscore_bb_u != null ? metrics.zscore_bb_u.toFixed(2) : 'N/A'})
- Status Tinggi TB/U: ${metrics.status_tb_u ?? 'Normal'} (Z-Score: ${metrics.zscore_tb_u != null ? metrics.zscore_tb_u.toFixed(2) : 'N/A'})
- Status Gizi BB/TB: ${metrics.status_bb_tb ?? 'Normal'} (Z-Score: ${metrics.zscore_bb_tb != null ? metrics.zscore_bb_tb.toFixed(2) : 'N/A'})
- Tren Berat Badan (KMS): ${bbTrend === '2T' ? '2T (Tidak Naik 2 Kali)' : bbTrend === 'T' ? 'T (Tidak Naik)' : bbTrend === 'N' ? 'N (Naik)' : '- (Baru/Tidak ada data)'}

### RIWAYAT PENIMBANGAN (3 BULAN TERAKHIR):
${weighingHistory && weighingHistory.length > 0
  ? weighingHistory.map(h => `- ${h.tanggal}: BB ${h.berat_badan} kg (Z-Score BB/U: ${h.zscore_bb_u?.toFixed(2) || 'N/A'}, Status TB/U: ${h.status_tb_u || 'Normal'})`).join('\n')
  : '- Tidak ada riwayat penimbangan sebelumnya.'
}

### STATUS IMUNISASI:
${imunisasiStatus
  ? `- Kelengkapan: ${imunisasiStatus.completeness}%
- Vaksin belum lengkap/terlewat: ${imunisasiStatus.missing.length > 0 ? imunisasiStatus.missing.join(', ') : 'Tidak ada (Lengkap)'}`
  : '- Data imunisasi belum tercatat.'
}

### MEMORI PENYULUHAN & REKOMENDASI (SAMPAI 3 BULAN TERAKHIR):
${previousSessions && previousSessions.length > 0
  ? previousSessions.map((s, idx) => `Tanggal: ${s.tanggal}
  * Pertanyaan: ${JSON.stringify(s.pertanyaan)}
  * Jawaban: ${JSON.stringify(s.jawaban)}
  * Rekomendasi Diberikan: ${s.rekomendasi}`).join('\n---\n')
  : '- Tidak ada riwayat penyuluhan sebelumnya.'
}

### HASIL WAWANCARA SESI INI:
${qaList.map((qa, index) => `${index + 1}. [Fokus: ${qa.focus_area || 'Nutrisi'}] Tanya: "${qa.question}"\n   Jawab: "${qa.answer}"`).join('\n')}

${catatanKader && catatanKader.trim().length > 0 ? `### CATATAN KHUSUS WAWANCARA DARI KADER:\n"${catatanKader}"` : '### CATATAN KHUSUS WAWANCARA DARI KADER:\nTidak ada catatan tambahan.'}

Berikan rekomendasi gizi dan stimulasi tumbuh kembang yang personal, integratif, dan hangat sesuai instruksi.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    return await this.callGroq(messages, false);
  }
}
