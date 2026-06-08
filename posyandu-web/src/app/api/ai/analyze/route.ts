import { NextRequest, NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toggleMode, selectedDesa, selectedPosyanduId, selectedMonth, dataSummary, puskesmasName } = body;

    if (!toggleMode || !dataSummary) {
      return NextResponse.json(
        { error: 'Invalid payload. "toggleMode" and "dataSummary" are required.' },
        { status: 400 }
      );
    }

    const systemPrompt = `Anda adalah ahli epidemiologi klinis dan penasihat kesehatan masyarakat senior yang bekerja untuk Kementerian Kesehatan Republik Indonesia, ditugaskan mendampingi ${puskesmasName || 'Puskesmas'}.
Tugas Anda adalah menganalisis data rekapitulasi kesehatan masyarakat dari Posyandu di tingkat Puskesmas dan memberikan laporan analisis epidemiologi terstruktur beserta panduan intervensi yang konkret, taktis, dan "to-the-point" dalam Bahasa Indonesia.

Data yang diberikan mencakup:
1. Prevalensi kasus gizi/penyakit dan sebaran per Posyandu.
2. Proporsi detail status gizi (BB/U, TB/U [stunting], BB/TB [wasting]).
3. Cakupan imunisasi balita (BCG, Penta, IPV, MR, dll).
4. Topik keluhan/penyuluhan AI terbanyak dari orang tua di lapangan.

Format output Anda HARUS menggunakan Markdown yang rapi dengan struktur berikut:
# LAPORAN EPIDEMIOLOGI & RENCANA INTERVENSI AI

## 📊 1. Ringkasan Diagnostik Masalah
[Jelaskan tren data secara analitis. Sorot angka-angka kritis, persentase peningkatan/penurunan, serta sebaran hotspot/kluster wilayah (Dusun/Posyandu mana yang paling terdampak). Analisis juga kesenjangan cakupan imunisasi (imunisasi kejar) serta topik penyuluhan dominan jika dalam mode balita.]

## ⚠️ 2. Risiko Prioritas & Dampak Klinis
[Identifikasi 3 risiko utama jika masalah gizi/penyakit kronis serta celah imunisasi ini tidak segera ditangani secara intensif, hubungkan dengan implikasi klinis jangka panjang.]

## 📋 3. Blueprint Intervensi Taktis Puskesmas
[Berikan 3-4 langkah aksi nyata yang kooperatif dan aplikatif untuk Puskesmas. Hubungkan status gizi dengan rekomendasi imunisasi kejar di posyandu dengan cakupan rendah, serta tema edukasi penyuluhan spesifik berdasarkan keluhan terbanyak orang tua. Sebutkan nama Posyandu/Dusun yang menjadi sasaran utama.]

## 💊 4. Rekomendasi Stok Obat & Suplemen (Logistik)
[Berikan rekomendasi perencanaan logistik medis/suplemen gizi spesifik (misal: PMT lokal, Vit A, Fe, vaksin tambahan, alat penyuluhan, obat antihipertensi, reagen cek gula darah) berdasarkan data ini.]`;

    const userPrompt = `Analisis data berikut untuk wilayah ${selectedDesa === 'all' ? 'Semua Kalurahan' : 'Kalurahan ' + selectedDesa}, unit Posyandu: ${selectedPosyanduId === 'all' ? 'Semua Posyandu' : selectedPosyanduId}, periode ${selectedMonth}.

Tipe Analisis: ${toggleMode.toUpperCase()} (Pemetaan ${toggleMode === 'balita' ? 'Masalah Gizi Anak' : 'Penyakit Kronis Lansia'})
Ringkasan Data Agregat:
${JSON.stringify(dataSummary, null, 2)}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content || 'Gagal menghasilkan analisis.';
    return NextResponse.json({ analysis: content });
  } catch (err: any) {
    console.error('Error running AI Analysis:', err);
    return NextResponse.json(
      { error: 'Gagal menjalankan Analisis AI: ' + err.message },
      { status: 500 }
    );
  }
}
