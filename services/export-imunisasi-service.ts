// services/export-imunisasi-service.ts
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Balita } from '../lib/types';
import { format } from 'date-fns';

export class ExportImunisasiService {
  static async exportToExcel(balitas: Balita[], year: number) {
    try {
      const data = balitas.map((b, index) => ({
        'NO': index + 1,
        'NAMA ANAK': b.nama,
        'NAMA ORTU': b.nama_ortu || b.nama_ibu || b.nama_ayah || '-',
        'TGL LAHIR': format(new Date(b.tanggal_lahir), 'dd/MM/yyyy'),
        'NIK': b.nik,
        'RT': b.rt,
        'HB0 (24 jam)': b.imunisasi?.hb0_date ? format(new Date(b.imunisasi.hb0_date), 'dd/MM/yyyy') : '',
        'BCG (<2 bln)': b.imunisasi?.bcg_date ? format(new Date(b.imunisasi.bcg_date), 'dd/MM/yyyy') : '',
        'PENTA 1': b.imunisasi?.penta_1_date ? format(new Date(b.imunisasi.penta_1_date), 'dd/MM/yyyy') : '',
        'PENTA 2': b.imunisasi?.penta_2_date ? format(new Date(b.imunisasi.penta_2_date), 'dd/MM/yyyy') : '',
        'PENTA 3': b.imunisasi?.penta_3_date ? format(new Date(b.imunisasi.penta_3_date), 'dd/MM/yyyy') : '',
        'IPV 1': b.imunisasi?.ipv_1_date ? format(new Date(b.imunisasi.ipv_1_date), 'dd/MM/yyyy') : '',
        'IPV 2': b.imunisasi?.ipv_2_date ? format(new Date(b.imunisasi.ipv_2_date), 'dd/MM/yyyy') : '',
        'IPV 3': b.imunisasi?.ipv_3_date ? format(new Date(b.imunisasi.ipv_3_date), 'dd/MM/yyyy') : '',
        'PCV 1': b.imunisasi?.pcv_1_date ? format(new Date(b.imunisasi.pcv_1_date), 'dd/MM/yyyy') : '',
        'PCV 2': b.imunisasi?.pcv_2_date ? format(new Date(b.imunisasi.pcv_2_date), 'dd/MM/yyyy') : '',
        'ROTAVIRUS 1': b.imunisasi?.rv_1_date ? format(new Date(b.imunisasi.rv_1_date), 'dd/MM/yyyy') : '',
        'ROTAVIRUS 2': b.imunisasi?.rv_2_date ? format(new Date(b.imunisasi.rv_2_date), 'dd/MM/yyyy') : '',
        'ROTAVIRUS 3': b.imunisasi?.rv_3_date ? format(new Date(b.imunisasi.rv_3_date), 'dd/MM/yyyy') : '',
        'MR (9 bln)': b.imunisasi?.mr_date ? format(new Date(b.imunisasi.mr_date), 'dd/MM/yyyy') : '',
        'JE (10 bln)': b.imunisasi?.je_date ? format(new Date(b.imunisasi.je_date), 'dd/MM/yyyy') : '',
        'PCV (1 th)': b.imunisasi?.pcv_3_date ? format(new Date(b.imunisasi.pcv_3_date), 'dd/MM/yyyy') : '',
        'BOOSTER PENTA': b.imunisasi?.booster_penta_date ? format(new Date(b.imunisasi.booster_penta_date), 'dd/MM/yyyy') : '',
        'BOOSTER MR': b.imunisasi?.booster_mr_date ? format(new Date(b.imunisasi.booster_mr_date), 'dd/MM/yyyy') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Lahir ${year}`);

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = `${FileSystem.cacheDirectory}Laporan_Imunisasi_Lahir_${year}.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Ekspor Data Imunisasi Lahir ${year}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (e) {
      console.error('Export Error:', e);
      throw e;
    }
  }
}
