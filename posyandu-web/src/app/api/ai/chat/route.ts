import { NextRequest } from 'next/server';
import { groq } from '@/lib/groq';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { messages, session } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid messages array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Fetch real context from DB to make AI smarter
    let totalBalitas = 0;
    let totalLansias = 0;
    let totalPosyandus = 0;
    let stuntingCount = 0;
    let posyanduSummaryList: string[] = [];
    let stuntingByPosyandu: Record<string, number> = {};

    try {
      // Set session first to bypass RLS policies correctly
      if (session?.access_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token || ''
        });
      }

      const [bRes, lRes, pRes, penRes] = await Promise.all([
        supabase.from('balitas').select('id, nama, posyandu_id, posyandu:posyandus(nama_posyandu)'),
        supabase.from('lansias').select('id', { count: 'exact', head: true }),
        supabase.from('posyandus').select('id, nama_posyandu, kelurahan'),
        supabase.from('penimbangans').select('balita_id, status_tb_u, tanggal')
      ]);

      const balitas = bRes.data || [];
      const lansiasCount = lRes.count || 0;
      const posyandus = pRes.data || [];
      const penimbangans = penRes.data || [];

      totalBalitas = balitas.length;
      totalLansias = lansiasCount;
      totalPosyandus = posyandus.length;

      // Group penimbangans by balita to get latest check
      const latestPenimbanganMap = new Map<string, any>();
      penimbangans.forEach(p => {
        const existing = latestPenimbanganMap.get(p.balita_id);
        if (!existing || p.tanggal > existing.tanggal) {
          latestPenimbanganMap.set(p.balita_id, p);
        }
      });

      // Calculate stunting count and group by posyandu
      balitas.forEach(b => {
        const pName = (b.posyandu as any)?.nama_posyandu || 'Tanpa Posyandu';
        const latest = latestPenimbanganMap.get(b.id);
        const isStunted = latest && latest.status_tb_u && 
          (latest.status_tb_u.includes('Pendek') || latest.status_tb_u.includes('Sangat Pendek'));
        
        if (isStunted) {
          stuntingCount++;
          stuntingByPosyandu[pName] = (stuntingByPosyandu[pName] || 0) + 1;
        }
      });

      // Format summary lists
      posyanduSummaryList = posyandus.map(p => `- ${p.nama_posyandu} (Kelurahan: ${p.kelurahan || '-'})`);
    } catch (err) {
      console.error('Error fetching real-time context for AI:', err);
    }

    const systemMessage = {
      role: 'system',
      content: `Anda adalah AI Copilot Resmi untuk portal SIMPUL SEHAT Puskesmas Pondok I (Sistem Informasi Masyarakat untuk Pemantauan dan Layanan Kesehatan Terpadu).

Informasi Real-Time dari Database saat ini:
- Total Balita Terdaftar: ${totalBalitas} anak
- Total Lansia Terdaftar: ${totalLansias} orang
- Jumlah Unit Posyandu Terdaftar: ${totalPosyandus} posyandu
- Total Balita Stunting Aktif (Kategori Pendek / Sangat Pendek): ${stuntingCount} anak

Daftar Posyandu Terdaftar:
${posyanduSummaryList.length > 0 ? posyanduSummaryList.join('\n') : '- Belum ada posyandu'}

Distribusi Stunting per Posyandu:
${Object.keys(stuntingByPosyandu).length > 0 
  ? Object.entries(stuntingByPosyandu).map(([name, count]) => `- ${name}: ${count} anak`).join('\n')
  : '- Tidak ada kasus stunting terdeteksi'}

Tugas Anda:
1. Membantu Staf Puskesmas menjawab pertanyaan administratif, pengarsipan e-PPGBM, dan panduan tumbuh kembang (Z-score).
2. Membantu menyusun draf pesan WhatsApp pengingat posyandu atau draf rujukan gizi buruk secara sopan, hangat, dan profesional dalam Bahasa Indonesia.
3. Menjelaskan standar WHO untuk gizi balita (BB/U, TB/U, BB/TB) atau rekam klinis lansia (Hipertensi sistolik/diastolik, Diabetes gula darah acak).
4. Berikan jawaban yang padat, langsung pada poin utama, terstruktur rapi, dan mudah dimengerti. Jangan membuat kalimat basa-basi yang panjang.`
    };

    // Combine system message with conversation history
    const apiMessages = [systemMessage, ...messages];

    // 2. Call Groq with streaming enabled
    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: apiMessages as any[],
      stream: true,
      temperature: 0.3
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletion) {
            const text = chunk.choices[0]?.delta?.content || '';
            controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (err: any) {
    console.error('Error in AI Chat Route:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
