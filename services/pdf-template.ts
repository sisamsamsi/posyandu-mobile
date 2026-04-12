import { SKDNStats, ProblematicBalita } from './report-service';
import { format } from 'date-fns';

export const generateMonthlyReportHtml = (
  posyanduName: string,
  monthName: string,
  year: number,
  skdn: SKDNStats,
  problems: ProblematicBalita[]
) => {
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
    : '<tr><td colspan="5" style="text-align:center; padding: 30px; color: #94a3b8;">Tidak ada balita dengan masalah gizi bulan ini.</td></tr>';

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
          th { background-color: #f1f5f9; color: #475569; font-weight: 800; font-size: 11px; text-transform: uppercase; padding: 12px 15px; text-align: left; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px 15px; font-size: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
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
          .analysis-value { font-size: 18px; font-weight: 800; color: #0d9488; margin: 5px 0; }
          .analysis-desc { font-size: 11px; color: #475569; line-height: 1.4; }

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
          <div class="summary-card" style="border-bottom: 3px solid #0d9488;">
            <div class="summary-label">D (Datang)</div>
            <div class="summary-value">${skdn.d}</div>
            <div class="summary-sub">Partisipasi: ${skdn.s > 0 ? ((skdn.d/skdn.s)*100).toFixed(1) : 0}%</div>
          </div>
          <div class="summary-card" style="border-bottom: 3px solid #22c55e;">
            <div class="summary-label">N (Naik)</div>
            <div class="summary-value">${skdn.n}</div>
            <div class="summary-sub">Tingkat N/D: ${skdn.d > 0 ? ((skdn.n/skdn.d)*100).toFixed(1) : 0}%</div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <div class="section-number">I</div>
            <div class="section-title">Hasil Analisis Indikator</div>
          </div>
          <div class="analysis-row">
            <div class="analysis-item">
              <div class="analysis-label">Partisipasi Masyarakat (D/S)</div>
              <div class="analysis-value">${skdn.s > 0 ? ((skdn.d/skdn.s)*100).toFixed(1) : 0}%</div>
              <div class="analysis-desc">Target minimal 80%. Menggambarkan keaktifan warga datang ke Posyandu.</div>
            </div>
            <div class="analysis-item">
              <div class="analysis-label">Keberhasilan Program (N/D)</div>
              <div class="analysis-value">${skdn.d > 0 ? ((skdn.n/skdn.d)*100).toFixed(1) : 0}%</div>
              <div class="analysis-desc">Indikator kesehatan balita. Menggambarkan persentase balita yang tumbuh baik.</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <div class="section-number">II</div>
            <div class="section-title">Daftar Balita Prioritas (Bermasalah Gizi)</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Nama Balita</th>
                <th>NIK</th>
                <th>Jenis Masalah</th>
                <th>Detail Status Terakhir</th>
              </tr>
            </thead>
            <tbody>
              ${problemsRows}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div>Dicetak oleh sistem pada: ${format(new Date(), 'dd MMMM yyyy HH:mm')}</div>
          <div>Halaman 1 dari 1</div>
        </div>
      </body>
    </html>
  `;
};
