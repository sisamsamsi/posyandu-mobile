import { NextRequest, NextResponse } from 'next/server';
import { groqInsight } from '@/lib/groq';

interface InsightPayload {
  konteks: string;       // Halaman aktif
  puskesmas: string;     // Nama Puskesmas
  bulan: string;         // Periode bulan/tahun
  filter: string;        // Nama Posyandu atau Kalurahan filter
  data: Record<string, number | string>; // Ringkasan data statistik
}

const SYSTEM_PROMPT = `Anda adalah asisten ringkasan data kesehatan untuk staf Puskesmas Indonesia.
Tugas: tulis 2-3 kalimat ringkasan kondisi berdasarkan data statistik yang diberikan.
Aturan:
- Gunakan Bahasa Indonesia formal tapi mudah dipahami
- Sebutkan angka spesifik dari data secara tepat dan akurat
- Akhiri dengan satu kalimat yang actionable (saran tindak lanjut konkret untuk kader/bidan)
- Maksimal 60 kata total
- Jangan gunakan bullet point, list, markdown tebal (**), atau header, cukup 1 paragraf singkat terpadu`;

export async function POST(req: NextRequest) {
  try {
    const payload: InsightPayload = await req.json();

    if (!payload.konteks || !payload.data) {
      return NextResponse.json(
        { error: 'Payload tidak valid. konteks dan data wajib diisi.' },
        { status: 400 }
      );
    }

    const userPrompt = `Halaman: ${payload.konteks}
Puskesmas: ${payload.puskesmas}
Periode: ${payload.bulan}
Filter: ${payload.filter}
Data: ${JSON.stringify(payload.data)}

Tulis ringkasan kondisi 2-3 kalimat.`;

    const response = await groqInsight.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 200 // Batasi token keluaran agar tetap ringkas
    });

    const insight = response.choices[0]?.message?.content?.trim() || '';
    return NextResponse.json({ insight });

  } catch (err: any) {
    console.error('Error in AI Insight Route:', err);
    return NextResponse.json(
      { error: 'Gagal generate AI insight: ' + err.message },
      { status: 500 }
    );
  }
}
