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
          <td>${i + 1}</td>
          <td>${p.nama}</td>
          <td>${p.nik}</td>
          <td>${p.jenis_masalah.join(', ')}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="text-align:center;">Tidak ada balita dengan masalah gizi bulan ini.</td></tr>';

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; text-transform: uppercase; }
          .sub-title { font-size: 16px; margin-top: 5px; }
          .section { margin-top: 30px; }
          .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; background: #f0f0f0; padding: 5px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; }
          .center { text-align: center; }
          
          .skdn-grid { display: flex; justify-content: space-between; margin-top: 15px; }
          .skdn-box { border: 1px solid #000; padding: 10px; width: 22%; text-align: center; }
          .skdn-value { font-size: 18px; font-weight: bold; }
          
          .footer { margin-top: 50px; display: flex; justify-content: flex-end; }
          .signature { text-align: center; width: 200px; }
          .sig-space { height: 60px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Laporan Bulanan Posyandu Balita</div>
          <div class="sub-title">Posyandu: ${posyanduName}</div>
          <div class="sub-title">Periode: ${monthName} ${year}</div>
        </div>

        <div class="section">
          <div class="section-title">I. Indikator SKDN</div>
          <div class="skdn-grid">
            <div class="skdn-box">
              <div>S (Semua)</div>
              <div class="skdn-value">${skdn.s}</div>
            </div>
            <div class="skdn-box">
              <div>K (KMS)</div>
              <div class="skdn-value">${skdn.k}</div>
            </div>
            <div class="skdn-box">
              <div>D (Datang)</div>
              <div class="skdn-value">${skdn.d}</div>
            </div>
            <div class="skdn-box">
              <div>N (Naik)</div>
              <div class="skdn-value">${skdn.n}</div>
            </div>
          </div>
          
          <table style="margin-top:20px;">
            <tr>
              <th>Indikator</th>
              <th>Persentase</th>
              <th>Analisis</th>
            </tr>
            <tr>
              <td>Partisipasi (D/S)</td>
              <td>${skdn.s > 0 ? ((skdn.d/skdn.s)*100).toFixed(1) : 0}%</td>
              <td>Target Puskesmas > 80%</td>
            </tr>
            <tr>
              <td>Keberhasilan (N/D)</td>
              <td>${skdn.d > 0 ? ((skdn.n/skdn.d)*100).toFixed(1) : 0}%</td>
              <td>Menggambarkan tingkat kenaikan berat badan</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">II. Daftar Balita Bermasalah (Malnutrisi & 2T)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">No</th>
                <th>Nama Balita</th>
                <th>NIK</th>
                <th>Jenis Masalah</th>
              </tr>
            </thead>
            <tbody>
              ${problemsRows}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <div class="signature">
            <div>Dicetak pada: ${format(new Date(), 'dd/MM/yyyy')}</div>
            <div style="margin-top: 5px;">Mengetahui,</div>
            <div>Kader Posyandu ${posyanduName}</div>
            <div class="sig-space"></div>
            <div>( ____________________ )</div>
          </div>
        </div>
      </body>
    </html>
  `;
};
