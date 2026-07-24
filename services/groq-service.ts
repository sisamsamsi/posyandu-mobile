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
  private static async callGroq(messages: any[], isJsonResponse = false): Promise<string> {
    try {
      console.log('Mengirim permintaan konseling ke server aman (Edge Function)...');
      
      const { data, error } = await supabase.functions.invoke('counseling', {
        body: { messages, isJsonResponse }
      });

      if (error) {
        console.error('Edge Function returned error:', error);
        throw error;
      }

      if (!data || typeof data.content !== 'string') {
        throw new Error('Respon dari server AI tidak valid.');
      }

      return data.content;
    } catch (e: any) {
      console.error('Gagal terhubung dengan layanan AI:', e);
      throw new Error(e.message || 'Gagal memproses rekomendasi gizi.');
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

    let currentTheme = '';
    let themeGuidance = '';

    if (step === 1) {
      currentTheme = 'ASUPAN MAKAN & PROTEIN HEWANI';
      themeGuidance = `Fokus pada frekuensi, porsi, dan terutama konsumsi PROTEIN HEWANI harian anak (seperti telur, hati ayam, ikan, daging). Sesuaikan pertanyaannya dengan data balita (Usia: ${ageMonths} bulan, Jenis Kelamin: ${balita.jenis_kelamin}, KMS: ${bbTrend || '-'}). Jika balita stunting/pendek, prioritaskan asupan protein hewani harian untuk merangsang tinggi badan. Jika balita mengalami T/2T (berat badan stagnan/turun), prioritaskan jumlah porsi makan dan asupan padat kalori.`;
    } else if (step === 2) {
      currentTheme = 'RIWAYAT SAKIT & IMUNISASI';
      themeGuidance = `Fokus pada apakah anak sempat mengalami penyakit infeksi dalam 2 minggu terakhir (seperti batuk, pilek, demam, diare), dan kaitkan dengan kelengkapan imunisasi anak (imunisasi yang terlewat/belum lengkap: ${imunisasiStatus?.missing && imunisasiStatus.missing.length > 0 ? imunisasiStatus.missing.join(', ') : 'terpantau lengkap'}). Tanyakan apakah kondisi sakit ini memicu nafsu makan turun atau menghambat pertumbuhan berat badannya.`;
    } else if (step === 3) {
      currentTheme = 'POLA PENGASUHAN MAKAN / FEEDING RULES';
      themeGuidance = `Fokus pada kedisiplinan dan perilaku makan anak (apakah terjadwal, durasi makan maksimal 30 menit, apakah anak sering melakukan gerakan tutup mulut (GTM), mengemut/melepeh makanan, atau memiliki kebiasaan makan sambil bermain/nonton gawai/HP, serta ketergantungan susu formula/camilan di luar jam makan).`;
    } else {
      currentTheme = 'SANITASI & AIR BERSIH';
      themeGuidance = `Fokus pada higienitas air minum untuk si kecil (dimasak mendidih atau air galon isi ulang langsung dikonsumsi) dan kebiasaan cuci tangan pakai sabun sebelum menyuapi anak. Hal ini sangat krusial terutama bagi anak berstatus stunting/pendek (enteropati lingkungan akibat bakteri air) atau anak yang rentan terkena diare berulang (KMS T/2T).`;
    }

    const systemPrompt = `Anda adalah mesin skrining gizi dan tumbuh kembang Posyandu (Kemenkes RI) yang efisien, to-the-point, dan berfokus medis.
Tugas Anda adalah merumuskan Pertanyaan Skrining Ke-${step} untuk kader posyandu (Tema: ${currentTheme}) dan Panduan Kader singkat.

TEMA WAJIB LANGHAK INI: ${currentTheme}
PANDUAN KHUSUS TEMA:
${themeGuidance}

ATURAN KRITIS GAYA PENULISAN (WAJIB DIPATUHI):
1. TO-THE-POINT (INTI POIN SAJA): DILARANG menuliskan salam pembuka (seperti "Halo Ibu", "Selamat pagi"), kalimat basa-basi, ungkapan simpati, empati, atau kalimat ramah panjang lebar (karena kader akan menyampaikan dengan bahasa kader sendiri di lapangan). Langsung ajukan pertanyaan inti.
2. DILARANG MEMBERIKAN SARAN/EDUKASI: Fokus pada penggalian data. Jangan menyisipkan saran, edukasi gizi, atau rekomendasi di dalam pertanyaan (semua rekomendasi hanya dikeluarkan di akhir sesi).
3. BATAS KATA (20 - 40 KATA): Rumuskan pertanyaan dengan panjang sekitar 20 hingga 40 kata. Pertanyaan harus memuat konteks klinis/alasan medis mengapa hal tersebut ditanyakan agar kader memahami pentingnya pertanyaan ini bagi kondisi balita saat ini.
4. ADAPTIF & SPESIFIK DATA (ANTI-TEMPLATE): Manfaatkan profil data balita saat ini (Usia: ${ageMonths} bulan, BB: ${metrics.berat_badan} kg, TB: ${metrics.tinggi_badan} cm, KMS: ${bbTrend}, Status TB/U: ${metrics.status_tb_u}) secara eksplisit di dalam kalimat pertanyaan. Jangan biarkan pertanyaan terasa generik atau sama untuk setiap anak.
5. PANDUAN KADER (GUIDANCE - MAKSIMAL 20 KATA): Tuliskan instruksi konkret pendek (1 poin saja) untuk kader guna mengarahkan wawancara jika jawaban orang tua kurang jelas.

Anda HARUS mengembalikan respon dalam format JSON objek dengan format sebagai berikut:
{
  "focus_area": "${currentTheme}",
  "question": "Kalimat pertanyaan langsung yang to-the-point, kaya konteks klinis sesuai data balita, panjang 20-40 kata, dan langsung ditujukan kepada orang tua",
  "guidance": "Instruksi konkret pendek bagi kader untuk mendalami jawaban"
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

${previousQA.length > 0 ? `### JAWABAN PERTANYAAN SEBELUMNYA DI SESI INI:\n${previousQA.map((qa, i) => `Langkah ${i+1} [Tema: ${qa.focus_area || 'Nutrisi'}] - Tanya: "${qa.question}"\nJawaban: "${qa.answer}"`).join('\n')}` : ''}

Tentukan Fokus Area Langkah ${step} yang wajib sesuai tema ${currentTheme}, lalu buatkan 1 objek JSON berisi "focus_area", "question", dan "guidance".`;

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
        focus_area: 'ASUPAN MAKAN & PROTEIN HEWANI',
        question: `Bagaimana porsi makan protein hewani seperti telur atau ikan sehari-hari untuk si kecil ${balita.nama} di usianya yang ${ageMonths} bulan saat ini?`,
        guidance: "Gali frekuensi & porsi makan protein hewani."
      };
    } else if (step === 2) {
      return {
        focus_area: 'RIWAYAT SAKIT & IMUNISASI',
        question: `Apakah ${balita.nama} sempat mengalami demam, batuk, pilek, atau diare dalam dua minggu terakhir ini yang menyebabkan berat badannya tidak naik?`,
        guidance: "Tanyakan durasi sakit anak."
      };
    } else if (step === 3) {
      return {
        focus_area: 'POLA PENGASUHAN MAKAN / FEEDING RULES',
        question: `Bagaimana kebiasaan makan ${balita.nama} sehari-hari? Apakah sering melakukan GTM (Gerakan Tutup Mulut) atau makan sambil bermain?`,
        guidance: "Tanyakan kebiasaan makan dan jadwal makan."
      };
    } else {
      return {
        focus_area: 'SANITASI & AIR BERSIH',
        question: `Apakah sumber air minum ${balita.nama} di rumah selalu direbus hingga mendidih dan apakah ibu mencuci tangan sebelum menyuapi anak?`,
        guidance: "Tanyakan higienitas air galon/rebusan."
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
