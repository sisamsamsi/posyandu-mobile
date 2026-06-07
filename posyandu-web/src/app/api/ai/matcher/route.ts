import { NextRequest, NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headers } = body;

    if (!headers || !Array.isArray(headers)) {
      return NextResponse.json(
        { error: 'Invalid payload. "headers" array is required.' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a data engineering AI assistant. Your task is to map a list of user-provided Excel column headers to standard database fields for a community healthcare application (Simpul Sehat / Posyandu).

Standard database fields:
- "nik" (for NIK, national ID number, KTP, KK)
- "nama" (for child/patient name, nama balita, nama anak, nama lengkap)
- "tanggal_lahir" (for date of birth, tgl lahir, lahir, ttl)
- "jenis_kelamin" (for gender, sex, JK, L/P)
- "nama_ortu" (for parents name, nama orang tua, wali, nama ibu, nama ayah)
- "no_hp_ortu" (for phone number, no hp, telp, wa)
- "alamat" (for address, alamat lengkap, jalan, dusun)
- "rt" (for RT, neighbourhood number)
- "bb_lahir" (for birth weight, berat lahir, bb lahir)
- "tb_lahir" (for birth height/length, panjang lahir, tb lahir, pbl)
- "anak_ke" (for child order, anak ke, urutan)
- "berat_badan" (for current weight, bbkg, berat badan saat ini)
- "tinggi_badan" (for current height/length, tbcm, tinggi badan saat ini)
- "posyandu" (for posyandu unit name)

Rules:
1. Return a JSON object where the keys are the EXACT elements from the user's headers array, and the values are the matching standard fields from the list above.
2. If a header cannot be reasonably mapped to any standard field, map it to null.
3. Keep the output strictly in JSON format as specified:
{
  "mappings": {
    "User Header 1": "standard_field_name",
    "User Header 2": "standard_field_name"
  }
}`;

    const userPrompt = `Headers to map: ${JSON.stringify(headers)}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error('Error running AI Column Matcher:', err);
    return NextResponse.json(
      { error: 'Gagal menjalankan pemetaan kolom AI: ' + err.message },
      { status: 500 }
    );
  }
}
