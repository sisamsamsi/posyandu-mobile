import { SKDNStats, ProblematicBalita, WeighingItem, NutritionSummary, LansiaReportItem } from './report-service';
import { format } from 'date-fns';

export const generateMonthlyReportHtml = (
  posyanduName: string,
  monthName: string,
  year: number,
  skdn: SKDNStats,
  problems: ProblematicBalita[],
  weighings: WeighingItem[],
  nutritionSummary: NutritionSummary
) => {
  const newBalitaList = weighings.filter(w => w.is_baru);
  const newBalitaRows = newBalitaList.length > 0
    ? newBalitaList.map((w, i) => `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${w.nik || '-'}</td>
          <td style="font-weight: bold;">${w.nama}</td>
          <td style="text-align:center;">${w.tanggal_lahir ? format(new Date(w.tanggal_lahir), 'dd/MM/yyyy') : '-'}</td>
          <td style="text-align:center;">${w.jenis_kelamin}</td>
          <td>${w.nama_ortu}</td>
          <td>${w.alamat || '-'} / RT ${String(w.rt).padStart(2, '0')}</td>
        </tr>
      `).join('')
    : '';

  let sectionIdx = 1;
  const getSectionNum = () => {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    return numerals[sectionIdx++ - 1] || String(sectionIdx);
  };

  const dsPct = skdn.s > 0 ? (skdn.d / skdn.s) * 100 : 0;
  const ndPct = skdn.d > 0 ? (skdn.n / skdn.d) * 100 : 0;

  const dsColor = dsPct >= 85 ? '#0d9488' : '#ef4444';
  const ndColor = ndPct >= 88 ? '#22c55e' : '#ef4444';

  const problemsRows = problems.length > 0 
    ? problems.map((p, i) => `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="font-weight: bold;">${p.nama}</td>
          <td>${p.nik}</td>
          <td>
            ${p.jenis_masalah.map(m => `<span class="badge ${m.includes('Stunting') ? 'bg-orange' : m.includes('Wasting') ? 'bg-red' : m.includes('2T') ? 'bg-rose' : 'bg-blue'}">${m}</span>`).join(' ')}
          </td>
          <td style="font-size: 10px; color: #64748b;">${p.status_detail}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #94a3b8;">Tidak ada balita dengan masalah gizi bulan ini.</td></tr>';

  const weighingRows = weighings.length > 0
    ? weighings.map((w, i) => {
        const formattedDob = w.tanggal_lahir 
          ? format(new Date(w.tanggal_lahir), 'dd/MM/yyyy')
          : '-';
          
        const beratStr = w.berat_badan !== null ? w.berat_badan.toFixed(2) : '-';
        const tinggiStr = w.tinggi_badan !== null ? w.tinggi_badan.toFixed(2) : '-';
        const beratTinggi = w.status_kehadiran === 'Hadir' ? `${beratStr} / ${tinggiStr}` : '-';
        
        const trendBadge = w.bb_trend === 'N' 
          ? '<span class="badge bg-teal" style="font-size:10px;">N</span>' 
          : w.bb_trend === 'T' 
            ? '<span class="badge bg-orange" style="font-size:10px;">T</span>' 
            : '-';
            
        return `
          <tr style="${w.status_kehadiran === 'Tidak Hadir' ? 'background-color: #fffbeb; color: #64748b;' : ''}">
            <td style="text-align:center;">${i + 1}</td>
            <td>${w.nik || '-'}</td>
            <td style="font-weight: bold; color: ${w.status_kehadiran === 'Tidak Hadir' ? '#64748b' : '#1e293b'};">${w.nama}</td>
            <td style="text-align:center;">${w.jenis_kelamin}</td>
            <td style="text-align:center;">${formattedDob}</td>
            <td style="text-align:center;">${w.umur_bulan} bln</td>
            <td style="text-align:center; font-weight:bold;">${beratTinggi}</td>
            <td style="text-align:center;">${w.status_bb_u || '-'}</td>
            <td style="text-align:center; color: #0d9488; font-weight:bold;">${w.zscore_bb_u !== null && w.zscore_bb_u !== undefined ? w.zscore_bb_u.toFixed(2) : '-'}</td>
            <td style="text-align:center;">${w.status_tb_u || '-'}</td>
            <td style="text-align:center; color: #0d9488; font-weight:bold;">${w.zscore_tb_u !== null && w.zscore_tb_u !== undefined ? w.zscore_tb_u.toFixed(2) : '-'}</td>
            <td style="text-align:center;">${w.status_bb_tb || '-'}</td>
            <td style="text-align:center; color: #0d9488; font-weight:bold;">${w.zscore_bb_tb !== null && w.zscore_bb_tb !== undefined ? w.zscore_bb_tb.toFixed(2) : '-'}</td>
            <td style="text-align:center;">${trendBadge}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="14" style="text-align:center; padding: 20px;">Tidak ada data penimbangan.</td></tr>`;

  // Filter for children with counseling priority:
  // Only present children (Hadir) who have nutritional problems (Z-score <= -2)
  const priorityWeighings = weighings.filter(w => {
    if (w.status_kehadiran !== 'Hadir') return false;
    const isPoor = 
      (w.zscore_bb_u !== null && w.zscore_bb_u !== undefined && w.zscore_bb_u <= -2) || 
      (w.zscore_tb_u !== null && w.zscore_tb_u !== undefined && w.zscore_tb_u <= -2) || 
      (w.zscore_bb_tb !== null && w.zscore_bb_tb !== undefined && w.zscore_bb_tb <= -2);
    return isPoor;
  });

  // Helper to summarize long AI recommendations into brief bullet titles
  const summarizePenyuluhan = (text: string | null | undefined): string => {
    if (!text) return 'Perlu asupan gizi seimbang dan pemantauan berkala.';
    
    // Clean markdown bold and headers
    let clean = text.replace(/\*\*/g, '').replace(/###/g, '').replace(/#/g, '').trim();
    
    // Split into points
    const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const briefPoints: string[] = [];
    
    lines.forEach(line => {
      const match = line.match(/^(\d+\.|\-|\*)\s*(.*?)$/);
      if (match) {
        let content = match[2];
        const colonIdx = content.indexOf(':');
        if (colonIdx > -1) {
          content = content.substring(0, colonIdx).trim();
        } else {
          const firstSentence = content.split(/[.\n]/)[0].trim();
          if (firstSentence.length < 50) {
            content = firstSentence;
          } else {
            content = firstSentence.substring(0, 45) + '...';
          }
        }
        if (content.length > 0) {
          briefPoints.push(content);
        }
      }
    });

    if (briefPoints.length > 0) {
      return briefPoints.map((p, i) => `${i + 1}. ${p}`).join('; ');
    }

    if (clean.length > 120) {
      return clean.substring(0, 117) + '...';
    }
    return clean;
  };

  const counselingCardsHtml = priorityWeighings.length > 0
    ? priorityWeighings.map((w) => {
        const statusBadge = '<span class="badge bg-red">Perlu Perhatian Gizi</span>';
        const zscoreInfo = ` • BB/U: ${w.zscore_bb_u?.toFixed(2) || '-'} | TB/U: ${w.zscore_tb_u?.toFixed(2) || '-'} | BB/TB: ${w.zscore_bb_tb?.toFixed(2) || '-'}`;
        const briefAdvice = summarizePenyuluhan(w.catatan_penyuluhan);

        return `
          <div class="counseling-card">
            <div class="counseling-header">
              <div>
                <span class="counseling-name">${w.nama}</span>
                <span class="counseling-meta">(${w.umur_bulan} bln • RT ${String(w.rt).padStart(2, '0')}${zscoreInfo})</span>
              </div>
              <div>
                ${statusBadge}
              </div>
            </div>
            <div class="counseling-text counseling-text-warning">
              <strong>Ringkasan Hasil Penyuluhan AI:</strong><br/>
              ${briefAdvice}
            </div>
          </div>
        `;
      }).join('')
    : '<div style="text-align:center; padding: 30px; color: #94a3b8; border: 1px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; font-size: 12px;">Semua sasaran hadir dengan pertumbuhan optimal bulan ini. Tidak ada data penyuluhan khusus yang perlu dilaporkan.</div>';

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 1cm; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 0; }
          
          /* Header Styling */
          .header { display: flex; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 25px; }
          .header-text { flex: 1; }
          .instansi { color: #0d9488; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
          .title { font-size: 24px; font-weight: 900; color: #1e293b; margin: 5px 0; }
          .periode { font-size: 14px; color: #64748b; font-weight: 600; }
          
          /* Summary Cards */
          .summary-grid { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 10px; }
          .summary-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; }
          .summary-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
          .summary-value { font-size: 22px; font-weight: 900; color: #1e293b; }
          .summary-sub { font-size: 10px; color: #94a3b8; margin-top: 3px; }
          
          /* Section Styling */
          .section { margin-bottom: 35px; }
          .section-header { display: flex; align-items: center; margin-bottom: 15px; }
          .section-number { background: #0d9488; color: white; width: 24px; height: 24px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px; font-size: 14px; }
          .section-title { font-size: 16px; font-weight: 800; color: #1e293b; text-transform: uppercase; }
          
          /* Table Styling */
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
          th { background-color: #f1f5f9; color: #475569; font-weight: 800; font-size: 10px; text-transform: uppercase; padding: 10px 5px; text-align: center; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 5px; font-size: 10.5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          /* Badges */
          .badge { padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: 800; color: white; white-space: nowrap; display: inline-block; margin: 2px; }
          .bg-teal { background-color: #0d9488; }
          .bg-orange { background-color: #f59e0b; }
          .bg-red { background-color: #ef4444; }
          .bg-rose { background-color: #e11d48; }
          .bg-blue { background-color: #3b82f6; }
          
          /* Analyses Table */
          .analysis-row { display: flex; border: 1px solid #e2e8f0; border-radius: 10px; margin-top: 15px; padding: 15px; background: #fff; }
          .analysis-item { flex: 1; padding: 0 15px; border-right: 1px solid #f1f5f9; }
          .analysis-item:last-child { border-right: none; }
          .analysis-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
          .analysis-value { font-size: 18px; font-weight: 800; margin: 5px 0; }
          .analysis-desc { font-size: 11px; color: #475569; line-height: 1.4; }
 
           /* Counseling Cards Section */
          .counseling-container { display: flex; flex-direction: column; gap: 12px; }
          .counseling-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 15px; }
          .counseling-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px; }
          .counseling-name { font-weight: 800; font-size: 14px; color: #1e293b; }
          .counseling-meta { font-size: 11px; color: #64748b; font-weight: 600; }
          .counseling-text { font-size: 11.5px; line-height: 1.5; color: #334155; background: #f8fafc; padding: 10px 12px; border-radius: 8px; border-left: 4px solid #0d9488; }
          .counseling-text-warning { border-left: 4px solid #ef4444; background: #fef2f2; }
          .counseling-text-absent { border-left: 4px solid #f59e0b; background: #fffbeb; }
 
          /* Footer */
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; color: #94a3b8; font-size: 10px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-text">
            <div class="instansi">Sistem Informasi Posyandu Mobile</div>
            <div class="title">Laporan Bulanan Posyandu Balita</div>
            <div class="periode">Posyandu ${posyanduName} • Periode ${monthName} ${year}</div>
          </div>
        </div>
 
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">S (Semua)</div>
            <div class="summary-value">${skdn.s}</div>
            <div class="summary-sub">Total Sasaran</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">K (KMS)</div>
            <div class="summary-value">${skdn.k}</div>
            <div class="summary-sub">Memiliki KMS</div>
          </div>
          <div class="summary-card" style="border-bottom: 3px solid ${dsColor};">
            <div class="summary-label">D (Datang)</div>
            <div class="summary-value">${skdn.d}</div>
            <div class="summary-sub">Partisipasi: ${dsPct.toFixed(1)}%</div>
          </div>
          <div class="summary-card" style="border-bottom: 3px solid ${ndColor};">
            <div class="summary-label">N (Naik)</div>
            <div class="summary-value">${skdn.n}</div>
            <div class="summary-sub">Tingkat N/D: ${ndPct.toFixed(1)}%</div>
          </div>
        </div>
 
        <div class="section">
          <div class="section-header">
            <div class="section-number">${getSectionNum()}</div>
            <div class="section-title">Hasil Analisis Indikator</div>
          </div>
          <div class="analysis-row">
            <div class="analysis-item">
              <div class="analysis-label">Partisipasi Masyarakat (D/S)</div>
              <div class="analysis-value" style="color: ${dsColor};">${dsPct.toFixed(1)}%</div>
              <div class="analysis-desc">Target minimal 85%. Menggambarkan keaktifan warga datang ke Posyandu.</div>
            </div>
            <div class="analysis-item">
              <div class="analysis-label">Keberhasilan Program (N/D)</div>
              <div class="analysis-value" style="color: ${ndColor};">${ndPct.toFixed(1)}%</div>
              <div class="analysis-desc">Target minimal 88%. Indikator kesehatan balita. Menggambarkan persentase balita yang tumbuh baik.</div>
            </div>
          </div>
        </div>
 
        <div class="section">
          <div class="section-header">
            <div class="section-number">${getSectionNum()}</div>
            <div class="section-title">Ringkasan Validasi Gizi</div>
          </div>
          <div class="summary-grid" style="margin-bottom: 0;">
            <div class="summary-card">
              <div class="summary-label">Stunting</div>
              <div class="summary-value" style="color: #f59e0b;">${nutritionSummary.stunting}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Wasting</div>
              <div class="summary-value" style="color: #ef4444;">${nutritionSummary.wasting}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">Underweight</div>
              <div class="summary-value" style="color: #3b82f6;">${nutritionSummary.underweight}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">2T / Gizi Buruk</div>
              <div class="summary-value" style="color: #e11d48;">${nutritionSummary.dua_t} / ${nutritionSummary.gizi_buruk}</div>
            </div>
          </div>
        </div>
 
        ${newBalitaList.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <div class="section-number">${getSectionNum()}</div>
            <div class="section-title">Daftar Registrasi Balita Baru</div>
          </div>
          <div style="margin-bottom: 10px; font-size: 11px; color: #475569;">
            Berikut adalah daftar balita yang baru didaftarkan pada periode penimbangan bulan ini.
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align:center;">No</th>
                <th style="width: 100px; text-align:left;">NIK</th>
                <th style="text-align:left;">Nama Balita</th>
                <th style="width: 80px; text-align:center;">Tgl Lahir</th>
                <th style="width: 30px; text-align:center;">JK</th>
                <th style="text-align:left;">Nama Orang Tua</th>
                <th style="text-align:left;">Alamat / RT</th>
              </tr>
            </thead>
            <tbody>
              ${newBalitaRows}
            </tbody>
          </table>
        </div>
        ` : ''}
 
        <div class="section">
          <div class="section-header">
            <div class="section-number">${getSectionNum()}</div>
            <div class="section-title">Daftar Balita Prioritas (Bermasalah Gizi)</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align:center;">No</th>
                <th style="text-align:left;">Nama Balita</th>
                <th style="text-align:left;">NIK</th>
                <th style="text-align:left;">Jenis Masalah</th>
                <th style="text-align:left;">Detail Status Terakhir</th>
              </tr>
            </thead>
            <tbody>
              ${problemsRows}
            </tbody>
          </table>
        </div>
 
        <div class="section" style="page-break-before: always;">
          <div class="section-header">
            <div class="section-number">${getSectionNum()}</div>
            <div class="section-title">Daftar Penimbangan Keseluruhan</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px; text-align:center;">No</th>
                <th style="width: 100px; text-align:left;">NIK</th>
                <th style="text-align:left;">Nama Balita</th>
                <th style="width: 25px; text-align:center;">JK</th>
                <th style="width: 70px; text-align:center;">Tgl Lahir</th>
                <th style="width: 50px; text-align:center;">Usia</th>
                <th style="width: 85px; text-align:center;">Berat / Tinggi</th>
                <th style="width: 60px; text-align:center; background-color: #f0fdfa;">BB/U</th>
                <th style="width: 45px; text-align:center; background-color: #f0fdfa;">ZS BB/U</th>
                <th style="width: 60px; text-align:center; background-color: #f0fdfa;">TB/U</th>
                <th style="width: 45px; text-align:center; background-color: #f0fdfa;">ZS TB/U</th>
                <th style="width: 70px; text-align:center; background-color: #f0fdfa;">BB/TB</th>
                <th style="width: 45px; text-align:center; background-color: #f0fdfa;">ZS BB/TB</th>
                <th style="width: 45px; text-align:center;">Naik BB</th>
              </tr>
            </thead>
            <tbody>
              ${weighingRows}
            </tbody>
          </table>
        </div>
 
        <div class="section" style="page-break-before: always;">
          <div class="section-header">
            <div class="section-number">${getSectionNum()}</div>
            <div class="section-title">Hasil Penyuluhan & Tindak Lanjut Khusus (Klinis AI)</div>
          </div>
          <div style="margin-bottom: 15px; font-size: 11px; color: #475569; line-height: 1.5;">
            Berikut adalah rekomendasi penyuluhan otomatis berbasis AI untuk balita yang terdeteksi memiliki status gizi kurang baik (Stunting, Wasting, Underweight, 2T) serta instruksi tindak lanjut/keterangan penanganan bagi sasaran yang tidak hadir di Posyandu bulan ini.
          </div>
          <div class="counseling-container">
            ${counselingCardsHtml}
          </div>
        </div>
 
        <div class="footer">
          <div>Dicetak oleh sistem pada: ${format(new Date(), 'dd MMMM yyyy HH:mm')}</div>
          <div>Laporan PDF Standar Posyandu</div>
        </div>
      </body>
    </html>
  `;
};

export const generateLansiaReportHtml = (
  posyanduName: string,
  monthName: string,
  year: number,
  checks: LansiaReportItem[]
) => {
  const table1Rows = checks.length > 0
    ? checks.map((c, i) => `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="font-weight: bold;">${c.nama}</td>
          <td style="text-align:center;">${c.umur} thn</td>
          <td style="text-align:center;">RT ${String(c.rt).padStart(2, '0')}</td>
          <td style="text-align:center;">${c.berat_badan || '-'} kg</td>
          <td style="text-align:center;">${c.tinggi_badan || '-'} cm</td>
          <td style="text-align:center; font-weight:bold;">${c.bmi || '-'}</td>
          <td style="text-align:center;"><span class="badge ${c.status_bmi === 'Normal' ? 'bg-indigo' : 'bg-orange'}">${c.status_bmi}</span></td>
        </tr>
      `).join('')
    : '<tr><td colspan="8" style="text-align:center; padding: 20px;">Tidak ada data pemeriksaan.</td></tr>';

  const table2Rows = checks.length > 0
    ? checks.map((c, i) => `
        <tr>
          <td style="text-align:center;">${i + 1}</td>
          <td style="font-weight: bold;">${c.nama}</td>
          <td style="text-align:center;">${c.umur} thn</td>
          <td style="text-align:center;">RT ${String(c.rt).padStart(2, '0')}</td>
          <td style="text-align:center;">${c.tekanan_darah || '-'}</td>
          <td style="text-align:center;">${c.gula_darah || '-'}</td>
          <td style="text-align:center;">${c.asam_urat || '-'}</td>
          <td style="text-align:center;">${c.kolesterol || '-'}</td>
          <td>
            ${c.status_pemeriksaan.length > 0 
              ? c.status_pemeriksaan.map(s => `<span class="badge bg-red">${s}</span>`).join(' ') 
              : '<span class="badge bg-indigo">Sehat</span>'}
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="9" style="text-align:center; padding: 20px;">Tidak ada data pemeriksaan.</td></tr>';

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { margin: 1cm; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 0; }
          .header { display: flex; align-items: center; border-bottom: 3px solid #6366F1; padding-bottom: 15px; margin-bottom: 25px; }
          .header-text { flex: 1; }
          .instansi { color: #6366F1; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
          .title { font-size: 24px; font-weight: 900; color: #1e293b; margin: 5px 0; }
          .periode { font-size: 14px; color: #64748b; font-weight: 600; }
          .section { margin-bottom: 35px; }
          .section-header { display: flex; align-items: center; margin-bottom: 15px; }
          .section-number { background: #6366F1; color: white; width: 24px; height: 24px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px; font-size: 14px; }
          .section-title { font-size: 16px; font-weight: 800; color: #1e293b; text-transform: uppercase; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 10px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
          th { background-color: #f1f5f9; color: #475569; font-weight: 800; font-size: 11px; text-transform: uppercase; padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 10px 10px; font-size: 11px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .badge { padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: 800; color: white; white-space: nowrap; display: inline-block; margin: 2px; }
          .bg-indigo { background-color: #6366f1; }
          .bg-orange { background-color: #f59e0b; }
          .bg-red { background-color: #ef4444; }
          .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; color: #94a3b8; font-size: 10px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-text">
            <div class="instansi">Sistem Informasi Posyandu Mobile</div>
            <div class="title">Laporan Bulanan Posyandu Lansia</div>
            <div class="periode">Posyandu ${posyanduName} • Periode ${monthName} ${year}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <div class="section-number">I</div>
            <div class="section-title">Data Pemeriksaan Fisik & IMT</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Nama Lansia</th>
                <th style="text-align:center;">Umur</th>
                <th style="text-align:center;">Wilayah</th>
                <th style="text-align:center;">BB</th>
                <th style="text-align:center;">TB</th>
                <th style="text-align:center;">IMT</th>
                <th style="text-align:center;">Status IMT</th>
              </tr>
            </thead>
            <tbody>
              ${table1Rows}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-header">
            <div class="section-number">II</div>
            <div class="section-title">Hasil Pemeriksaan Vital & Laboratorium</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Nama</th>
                <th style="text-align:center;">Umur</th>
                <th style="text-align:center;">Wilayah</th>
                <th style="text-align:center;">T. Darah</th>
                <th style="text-align:center;">Gula</th>
                <th style="text-align:center;">Asam</th>
                <th style="text-align:center;">Kolest.</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${table2Rows}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div>Dicetak oleh sistem pada: ${format(new Date(), 'dd MMMM yyyy HH:mm')}</div>
          <div>Laporan PDF Standar Posyandu (Lansia)</div>
        </div>
      </body>
    </html>
  `;
};
