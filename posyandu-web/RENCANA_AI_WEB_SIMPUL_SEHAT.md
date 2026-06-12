# RENCANA IMPLEMENTASI AI — SIMPUL SEHAT (Web)

**Dokumen:** Panduan penerapan AI pada posyandu-web  
**Tanggal:** 9 Juni 2026  
**Berdasarkan:** Analisis source code aktual + kondisi API route yang sudah ada  
**Stack:** Next.js 16 · Groq SDK · llama-3.3-70b-versatile · Supabase

---

## KONDISI SAAT INI (Sebelum Perubahan)

Tiga API route AI sudah ada, semuanya memakai **satu `GROQ_API_KEY` dari satu instance `groq`**:

| Route | Fungsi | Status |
|---|---|---|
| `/api/ai/chat` | Chat interaktif dengan streaming | ✅ Berjalan |
| `/api/ai/analyze` | Generate laporan epidemiologi | ✅ Berjalan |
| `/api/ai/matcher` | Pemetaan header Excel saat import | ✅ Berjalan |

**Masalah arsitektur sekarang:**
- Satu key untuk semua fungsi → tidak bisa monitor mana yang habis limit
- `/api/ai/chat` fetch seluruh tabel tanpa batas waktu → berpotensi timeout & boros token
- Nama puskesmas masih hardcoded `'Puskesmas Pondok I'` di system prompt
- Chat sebagai halaman penuh → antarmuka yang salah untuk pengguna puskesmas

---

## ARSITEKTUR BARU — 3 KEY, 3 SEGMEN

```
Akun Groq (satu akun, banyak key)
│
├── Key A: GROQ_KEY_INSIGHT
│   Fungsi: Narasi otomatis per halaman (Fungsi 1)
│   Karakter: Request sering, token kecil, non-blocking
│   Estimasi token: ~300 token/request (100 input + 200 output)
│
├── Key B: GROQ_KEY_REPORT  
│   Fungsi: Laporan naratif bulanan + AI analyze yang sudah ada (Fungsi 2)
│   Karakter: Request jarang, token besar, user-triggered
│   Estimasi token: ~3.000 token/request (1.500 input + 1.500 output)
│
└── Key C: GROQ_KEY_CHAT
    Fungsi: Chatbot kontekstual panel samping (Fungsi 3)
    Karakter: Request saat user aktif, token sedang, streaming
    Estimasi token: ~800 token/request (600 input + 200 output per giliran)
```

**Konfigurasi `.env.local`:**

```bash
# .env.local — posyandu-web

# Key A: Narasi otomatis per halaman (high frequency, low token)
GROQ_KEY_INSIGHT=gsk_insight_...

# Key B: Laporan naratif + analisis epidemiologi (low frequency, high token)
GROQ_KEY_REPORT=gsk_report_...

# Key C: Chatbot kontekstual panel samping (on-demand, medium token)
GROQ_KEY_CHAT=gsk_chat_...

# Supabase (tidak berubah)
NEXT_PUBLIC_SUPABASE_URL=https://tuxwriojdglxfrcjayzz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

---

## PERUBAHAN `src/lib/groq.ts`

Ganti satu instance menjadi tiga instance terpisah:

```typescript
// src/lib/groq.ts — VERSI BARU

import Groq from 'groq-sdk';

function createGroqClient(keyEnvName: string): Groq {
  const apiKey = process.env[keyEnvName] || '';
  if (!apiKey) {
    throw new Error(
      `[SIMPUL SEHAT] ${keyEnvName} wajib diisi di .env.local`
    );
  }
  return new Groq({ apiKey });
}

// Key A — narasi otomatis halaman (high frequency, low token)
export const groqInsight = createGroqClient('GROQ_KEY_INSIGHT');

// Key B — laporan naratif & analisis epidemiologi (low frequency, high token)
export const groqReport = createGroqClient('GROQ_KEY_REPORT');

// Key C — chatbot kontekstual panel samping (on-demand, streaming)
export const groqChat = createGroqClient('GROQ_KEY_CHAT');
```

**Update import di route yang sudah ada:**

```typescript
// /api/ai/analyze/route.ts — ganti import
import { groqReport } from '@/lib/groq';
// ganti: groq.chat... → groqReport.chat...

// /api/ai/matcher/route.ts — ganti import
// Matcher bisa pakai groqInsight karena token-nya kecil
import { groqInsight } from '@/lib/groq';
// ganti: groq.chat... → groqInsight.chat...
```

---

## FUNGSI 1 — NARASI OTOMATIS PER HALAMAN

### Apa ini

Setiap halaman analitik menampilkan kotak kecil berisi 2–3 kalimat ringkasan yang **digenerate otomatis** setelah data selesai di-fetch. Tidak ada input dari user. Tidak ada chat. AI membaca angka-angka hasil kalkulasi dan menuliskan kalimat yang mudah dibaca bidan.

### Cara kerja

```
halaman selesai fetch + hitung stats
    ↓
kirim payload agregat kecil ke /api/ai/insight
    ↓
groqInsight generate narasi 2-3 kalimat (~200 token)
    ↓
tampil di kotak "Ringkasan AI" bawah stat bar
```

### API Route Baru: `/api/ai/insight/route.ts`

```typescript
// src/app/api/ai/insight/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { groqInsight } from '@/lib/groq';

// Tipe payload — kecil dan terstruktur, bukan raw data
interface InsightPayload {
  konteks: string;       // nama halaman: "status_gizi" | "risiko_balita" | dll
  puskesmas: string;     // nama puskesmas dari settings
  bulan: string;         // "Juni 2026"
  filter: string;        // "Semua Posyandu" atau nama posyandu spesifik
  data: Record<string, number | string>; // angka-angka hasil kalkulasi
}

const SYSTEM_PROMPT = `Anda adalah asisten ringkasan data kesehatan untuk staf Puskesmas Indonesia.
Tugas: tulis 2-3 kalimat ringkasan kondisi berdasarkan data statistik yang diberikan.
Aturan:
- Gunakan Bahasa Indonesia formal tapi mudah dipahami
- Sebutkan angka spesifik dari data
- Akhiri dengan satu kalimat yang actionable (saran tindak lanjut konkret)
- Maksimal 60 kata total
- Jangan gunakan bullet point atau header, cukup paragraf singkat`;

export async function POST(req: NextRequest) {
  try {
    const payload: InsightPayload = await req.json();

    if (!payload.konteks || !payload.data) {
      return NextResponse.json(
        { error: 'Payload tidak valid' },
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
      max_tokens: 200  // batasi ketat — kita hanya butuh 2-3 kalimat
    });

    const insight = response.choices[0]?.message?.content?.trim() || '';
    return NextResponse.json({ insight });

  } catch (err: any) {
    console.error('[insight route]', err.message);
    return NextResponse.json(
      { error: 'Gagal generate insight' },
      { status: 500 }
    );
  }
}
```

### Komponen Baru: `<AIInsightBox>`

```typescript
// src/components/ui/AIInsightBox.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface AIInsightBoxProps {
  konteks: string;
  bulan: string;
  filter: string;
  data: Record<string, number | string>;
  // Trigger: re-fetch insight saat data berubah
  // Jika data kosong ({}) — kotak tidak dirender sama sekali
}

export default function AIInsightBox({
  konteks,
  bulan,
  filter,
  data
}: AIInsightBoxProps) {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Ambil nama puskesmas dari settings
  const getPuskesmasName = () => {
    try {
      const saved = localStorage.getItem('simpul_sehat_puskesmas_profile');
      return saved ? JSON.parse(saved).namaPuskesmas || 'Puskesmas' : 'Puskesmas';
    } catch { return 'Puskesmas'; }
  };

  const fetchInsight = useCallback(async () => {
    // Tidak fetch jika data kosong
    if (Object.keys(data).length === 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          konteks,
          puskesmas: getPuskesmasName(),
          bulan,
          filter,
          data
        })
      });
      const json = await res.json();
      setInsight(json.insight || '');
    } catch {
      setInsight('');
    } finally {
      setLoading(false);
    }
  }, [konteks, bulan, filter, JSON.stringify(data)]);

  // Auto-fetch saat data siap
  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  // Jangan render kalau data belum ada
  if (Object.keys(data).length === 0) return null;

  return (
    <div style={{
      padding: '14px 16px',
      backgroundColor: '#f0fdfa',
      borderRadius: '12px',
      borderLeft: '3px solid var(--color-primary)',
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start'
    }}>
      <Sparkles size={14} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        {loading ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Menyusun ringkasan...
          </span>
        ) : insight ? (
          <p style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
            {insight}
          </p>
        ) : null}
      </div>
      {!loading && insight && (
        <button
          onClick={fetchInsight}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
          title="Perbarui ringkasan"
        >
          <RefreshCw size={12} />
        </button>
      )}
    </div>
  );
}
```

### Cara Pasang di Halaman

Contoh di `balita/status-gizi/page.tsx`:

```typescript
// Hitung setelah data tersedia
const insightData = useMemo(() => {
  if (data.length === 0) return {};
  return {
    total_aktif: data.length,
    sudah_ditimbang: data.filter(d => d.status_tb_u !== 'Belum Ditimbang').length,
    stunting: data.filter(d => d.status_tb_u?.toLowerCase().includes('pendek')).length,
    wasting: data.filter(d => d.status_bb_tb?.toLowerCase().includes('kurus') || 
                               d.status_bb_tb?.toLowerCase().includes('wasting')).length,
  };
}, [data]);

// Taruh di dalam SubmenuPlaceholder, setelah tabel:
<AIInsightBox
  konteks="Status Gizi Balita"
  bulan={selectedMonth}
  filter={selectedPosyanduId === 'all' ? 'Semua Posyandu' : namaPostyandu}
  data={insightData}
/>
```

### Halaman yang Dipasang Komponen Ini

| Halaman | Data yang Dikirim ke AI |
|---|---|
| `balita/status-gizi` | total, sudah_ditimbang, stunting, wasting |
| `balita/risiko-tinggi` | total_berisiko, stunting, wasting, imunisasi_tidak_lengkap |
| `balita/penimbangan` | total_record, bulan_ini, status_kurang, status_normal |
| `lansia/risiko-ptm` | total_berisiko, hipertensi, diabetes, multi_risiko |
| `lansia/kunjungan-prioritas` | total_prioritas, absen_lama, kondisi_kritis, belum_pernah |
| `analisa-ai/prioritas-intervensi` | total_posyandu, prioritas_tinggi, prioritas_sedang |
| `analisa-ai/posyandu-bermasalah` | total_bermasalah, urgensi_tinggi, urgensi_sedang |

**Halaman yang TIDAK dipasang:**
- `balita/penyuluhan` — kontennya sudah rule-based, insight AI redundant
- `posyandu/kehadiran` — data kehadiran masih dummy/seed-based, insight tidak akurat
- `lansia/pemeriksaan` — data log murni, ringkasan sudah cukup dari stats

---

## FUNGSI 2 — LAPORAN NARATIF BULANAN

### Apa ini

Tombol di halaman Laporan (`/laporan`) yang men-generate narasi 3–5 paragraf siap pakai untuk laporan bulanan ke dinas kesehatan. Menggantikan penulisan manual bidan koordinator.

### Perubahan pada `/api/ai/analyze/route.ts`

Route ini sudah ada dan berfungsi. Yang perlu diubah hanya dua hal:

**1. Ganti instance ke `groqReport`:**
```typescript
import { groqReport } from '@/lib/groq';
// ...
const response = await groqReport.chat.completions.create({ ... });
```

**2. Tambah mode `'laporan_bulanan'` di samping mode `'balita'` dan `'lansia'` yang sudah ada:**

```typescript
// Tambahkan kondisi di userPrompt
if (toggleMode === 'laporan_bulanan') {
  // Format output: narasi paragraf siap masuk laporan dinas
  // System prompt berbeda — lebih formal, format surat laporan
}
```

### API Route Baru: `/api/ai/report/route.ts`

Khusus untuk mode laporan naratif bulanan (terpisah dari `/analyze` yang sudah ada):

```typescript
// src/app/api/ai/report/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { groqReport } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const {
      bulan,
      puskesmas,
      kecamatan,
      namaKepala,
      dataBalita,
      dataLansia
    } = await req.json();

    const systemPrompt = `Anda adalah penulis laporan kesehatan masyarakat resmi untuk Puskesmas Indonesia.
Tugas: tulis narasi laporan bulanan berdasarkan data statistik yang diberikan.
Format output: 4 paragraf dalam Bahasa Indonesia formal.

Paragraf 1 — Gambaran Umum: jumlah sasaran, kehadiran, cakupan layanan
Paragraf 2 — Status Gizi & Tumbuh Kembang Balita: angka stunting, wasting, tren
Paragraf 3 — Kesehatan Lansia: prevalensi PTM, kasus kritis, kunjungan prioritas
Paragraf 4 — Kesimpulan & Rencana Tindak Lanjut: 2-3 langkah konkret bulan depan

Gunakan angka dari data secara spesifik. Gunakan bahasa formal laporan dinas. 
Tidak perlu header atau bullet point — cukup 4 paragraf mengalir.
Maksimal 400 kata total.`;

    const userPrompt = `Buat narasi laporan bulanan berikut:

Puskesmas: ${puskesmas}
Kecamatan: ${kecamatan}
Kepala Puskesmas: ${namaKepala}
Periode: ${bulan}

DATA BALITA:
${JSON.stringify(dataBalita, null, 2)}

DATA LANSIA:
${JSON.stringify(dataLansia, null, 2)}`;

    const response = await groqReport.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 700
    });

    const narasi = response.choices[0]?.message?.content?.trim() || '';
    return NextResponse.json({ narasi });

  } catch (err: any) {
    console.error('[report route]', err.message);
    return NextResponse.json(
      { error: 'Gagal generate laporan: ' + err.message },
      { status: 500 }
    );
  }
}
```

### Perubahan di Halaman `/laporan`

Tambahkan tombol dan section setelah tabel laporan:

```typescript
// Tombol generate laporan naratif
<button
  onClick={handleGenerateNarasi}
  disabled={generatingNarasi || data.length === 0}
  className="btn btn-primary"
>
  {generatingNarasi ? 'Menyusun narasi...' : '✦ Generate Narasi Laporan'}
</button>

// Section hasil narasi
{narasiLaporan && (
  <div style={{ marginTop: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Narasi Laporan Bulanan</h3>
      <button onClick={() => navigator.clipboard.writeText(narasiLaporan)}>
        Salin Teks
      </button>
    </div>
    <div style={{
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      fontSize: '13px',
      lineHeight: '1.8',
      color: 'var(--text-main)',
      whiteSpace: 'pre-wrap'
    }}>
      {narasiLaporan}
    </div>
  </div>
)}
```

### Payload yang Dikirim

```typescript
const handleGenerateNarasi = async () => {
  setGeneratingNarasi(true);
  try {
    // Hitung agregat dari data yang sudah di-fetch di halaman laporan
    const dataBalita = {
      total_terdaftar: data.length,
      hadir_bulan_ini: data.filter(d => d.hadir).length,
      stunting: data.filter(d => d.status_tb_u?.toLowerCase().includes('pendek')).length,
      wasting: data.filter(d => d.status_bb_tb?.toLowerCase().includes('kurus')).length,
      underweight: data.filter(d => d.status_bb_u?.toLowerCase().includes('kurang')).length,
      // Tidak kirim data per-individu — hanya agregat
    };

    const res = await fetch('/api/ai/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bulan: selectedMonth,
        puskesmas: puskesmasProfile.namaPuskesmas,
        kecamatan: puskesmasProfile.kecamatan,
        namaKepala: puskesmasProfile.namaKepala,
        dataBalita,
        dataLansia  // fetch terpisah jika mode lansia
      })
    });

    const { narasi } = await res.json();
    setNarasiLaporan(narasi);
  } finally {
    setGeneratingNarasi(false);
  }
};
```

---

## FUNGSI 3 — CHATBOT KONTEKSTUAL PANEL SAMPING

### Apa ini

Chat yang bisa dibuka dari **halaman manapun** sebagai panel overlay di kanan layar. Bukan halaman tersendiri. AI sudah tahu halaman apa yang sedang dibuka dan data apa yang sedang ditampilkan — tanpa user perlu menjelaskan konteks.

### Perubahan pada `/api/ai/chat/route.ts`

**1. Ganti instance ke `groqChat`:**
```typescript
import { groqChat } from '@/lib/groq';
```

**2. Terima `pageContext` dari client:**
```typescript
const { messages, session, pageContext } = await req.json();
// pageContext: { halaman, filter, statsRingkas }
```

**3. Batasi query Supabase berdasarkan bulan berjalan** (perbaikan dari kondisi sekarang yang fetch semua data tanpa batas):
```typescript
// Sebelum: fetch semua penimbangans tanpa filter waktu
// Sesudah:
const thisMonth = new Date().toISOString().slice(0, 7);
supabase.from('penimbangans')
  .select('balita_id, status_tb_u')
  .gte('tanggal', `${thisMonth}-01`)  // hanya bulan berjalan
  .limit(500)                          // batas maksimum
```

**4. Inject `pageContext` ke system prompt:**
```typescript
const systemMessage = {
  role: 'system',
  content: `Anda adalah asisten kesehatan untuk staf ${puskesmasName}.

Konteks halaman yang sedang dibuka:
- Halaman: ${pageContext?.halaman || 'Dashboard'}
- Filter aktif: ${pageContext?.filter || 'Semua'}
- Ringkasan data tampil: ${JSON.stringify(pageContext?.statsRingkas || {})}

Data database real-time:
- Total balita: ${totalBalitas}
- Total stunting: ${stuntingCount}
- Total posyandu: ${totalPosyandus}

Anda membantu menjawab pertanyaan tentang data yang sedang dilihat staf.
Jawab ringkas, padat, langsung ke poin. Maksimal 150 kata per jawaban.`
};
```

### Komponen Baru: `<ChatPanel>`

Panel overlay yang bisa dibuka/ditutup dari tombol floating di pojok kanan bawah setiap halaman.

```typescript
// src/components/ui/ChatPanel.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  // Konteks halaman yang sedang aktif — dikirim ke API
  pageContext?: {
    halaman: string;
    filter: string;
    statsRingkas: Record<string, number | string>;
  };
}

export default function ChatPanel({ pageContext }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Ambil session dari Supabase untuk RLS
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          session,
          pageContext
        })
      });

      if (!res.body) throw new Error('No stream');

      // Handle streaming
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maaf, terjadi gangguan. Coba lagi.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Tombol floating */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}
        title="Tanya Asisten AI"
      >
        {isOpen ? <X size={18} /> : <MessageCircle size={18} />}
      </button>

      {/* Panel chat */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '24px',
          width: '320px',
          height: '440px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header panel */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Bot size={16} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>Asisten AI</div>
              {pageContext && (
                <div style={{ fontSize: '10px', opacity: 0.8 }}>
                  Konteks: {pageContext.halaman}
                </div>
              )}
            </div>
          </div>

          {/* Area pesan */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '20px' }}>
                Tanyakan sesuatu tentang data yang sedang ditampilkan.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '8px 12px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                backgroundColor: msg.role === 'user' ? 'var(--color-primary)' : '#f1f5f9',
                color: msg.role === 'user' ? '#fff' : 'var(--text-main)',
                fontSize: '12px',
                lineHeight: '1.5'
              }}>
                {msg.content || (loading && i === messages.length - 1 ? '...' : '')}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ketik pertanyaan..."
              style={{
                flex: 1,
                padding: '7px 10px',
                fontSize: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                padding: '7px 10px',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: (!input.trim() || loading) ? 0.5 : 1
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

### Cara Pasang di Layout Dashboard

Pasang sekali di `src/app/(dashboard)/layout.tsx` agar tersedia di semua halaman:

```typescript
// src/app/(dashboard)/layout.tsx

import ChatPanel from '@/components/ui/ChatPanel';

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-wrapper">
      <Sidebar ... />
      <main className="main-content">
        {children}
      </main>
      {/* ChatPanel tersedia di semua halaman dashboard */}
      <ChatPanel />
    </div>
  );
}
```

Untuk inject konteks halaman spesifik, setiap halaman bisa pass `pageContext` via Context atau tiap halaman render `<ChatPanel pageContext={...} />` sendiri jika butuh konteks yang berbeda.

---

## ESTIMASI TOKEN PER FUNGSI

| Fungsi | Input Token | Output Token | Total/Request | Frekuensi Estimasi |
|---|---|---|---|---|
| **F1 Insight** | ~100 | ~200 | ~300 | Setiap halaman dibuka |
| **F2 Laporan** | ~1.500 | ~700 | ~2.200 | 1–2x per bulan per puskesmas |
| **F3 Chat** | ~600 | ~200 | ~800 | Per giliran percakapan |
| **Analyze (existing)** | ~1.500 | ~1.500 | ~3.000 | On-demand, user-triggered |
| **Matcher (existing)** | ~200 | ~100 | ~300 | Per import data |

**Estimasi bulanan untuk 1 puskesmas aktif:**

```
F1 Insight:  20 halaman/hari × 22 hari kerja × 300 token = 132.000 token/bulan
F2 Laporan:  2 request × 2.200 token               =   4.400 token/bulan
F3 Chat:     10 pesan/hari × 22 hari × 800 token   = 176.000 token/bulan
Analyze:     4 request × 3.000 token               =  12.000 token/bulan
Matcher:     5 import × 300 token                  =   1.500 token/bulan
─────────────────────────────────────────────────────────────────
TOTAL ESTIMASI                                     ≈ 326.000 token/bulan
```

Groq free tier: **500.000 token/hari** → 326.000 token/bulan jauh di bawah limit.  
Untuk 3 puskesmas aktif bersamaan: ~1 juta token/bulan → mulai pertimbangkan paid tier.  
Biaya Groq paid (llama-3.3-70b): **$0.05/1 juta token** → sekitar **$0.05/bulan** untuk 1 puskesmas.

---

## URUTAN IMPLEMENTASI

### Tahap 1 — Infrastruktur Key (1 jam)
1. Buat 3 API key di Groq Console (beri nama deskriptif)
2. Update `.env.local` dengan 3 key baru
3. Update `src/lib/groq.ts` menjadi 3 instance
4. Update import di route yang sudah ada (`/analyze` → `groqReport`, `/matcher` → `groqInsight`)

### Tahap 2 — Fungsi 1: Insight Box (1 hari)
1. Buat `/api/ai/insight/route.ts`
2. Buat komponen `<AIInsightBox>`
3. Pasang di 7 halaman prioritas (mulai dari `status-gizi` dan `risiko-tinggi`)

### Tahap 3 — Fungsi 2: Laporan Naratif (1 hari)
1. Buat `/api/ai/report/route.ts`
2. Tambahkan tombol + section hasil di halaman `/laporan`
3. Tambahkan `dataLansia` aggregate untuk mode laporan lansia

### Tahap 4 — Fungsi 3: Chat Panel (1 hari)
1. Update `/api/ai/chat/route.ts` — ganti key, tambah `pageContext`, batasi query Supabase
2. Buat komponen `<ChatPanel>`
3. Pasang di `(dashboard)/layout.tsx`
4. Hapus halaman `/analisa-ai` yang lama sebagai halaman chat penuh (kontennya sudah dipindah ke panel)

### Tahap 5 — Perbaikan System Prompt (30 menit)
1. Ganti hardcoded `'Puskesmas Pondok I'` di semua route dengan nama dari database/settings
2. Pastikan semua route menggunakan nama puskesmas dinamis

---

## CATATAN PENTING

**Fungsi 1 jangan dijalankan saat data masih loading.** Komponen `<AIInsightBox>` sudah ada guard `if (Object.keys(data).length === 0) return null` — pastikan `data` yang dikirim hanya diisi setelah fetch selesai.

**Fungsi 2 hanya kirim data agregat, bukan data per-individu.** Nama balita, NIK, atau detail personal tidak perlu masuk ke prompt AI. Cukup angka-angka statistik. Ini menjaga privasi data dan memperkecil payload.

**Fungsi 3 reset percakapan saat halaman berganti.** State `messages` di `<ChatPanel>` tidak perlu dipersist — percakapan baru saat halaman berganti justru lebih bersih dan mengurangi token context yang membengkak.

**Halaman `posyandu/kehadiran` dan `balita/penyuluhan` skip dulu** untuk Fungsi 1 karena datanya belum akurat (kehadiran masih seed-based, penyuluhan masih rule-based). Insight dari data yang tidak akurat lebih berbahaya dari pada tidak ada insight sama sekali.

---

*Dokumen ini adalah rencana implementasi teknis. Kode yang ditampilkan adalah panduan, bukan final — sesuaikan dengan kondisi aktual file saat implementasi.*

**Versi:** 1.0 · **Tanggal:** 9 Juni 2026  
**Berlaku untuk:** `posyandu-web` subfolder dalam repo `sisamsamsi/posyandu-mobile`
