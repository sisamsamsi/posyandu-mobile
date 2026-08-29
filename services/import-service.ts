import * as XLSX from 'xlsx';
// Menggunakan sub-module legacy sesuai rekomendasi Expo SDK 52 untuk API fungsional
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { ZScoreEngine } from './zscore-engine';
import { whoService } from './who-service';
import { calculateAgeMonthsDecimal, calculateAgeMonths } from '../lib/utils';
import { normalizeKey, cleanNik, cleanGender, parseExcelDate } from './eppgbm-utils';

export class ImportService {
  /**
   * Helper to format cell value as text string without prepending single quotes
   */
  private static makeTextCell(value: any) {
    if (value === null || value === undefined || value === '') {
      return { t: 's', v: '' };
    }
    return { t: 's', v: String(value).trim(), z: '@' };
  }

  /**
   * Parses an Excel file from a URI and returns data objects
   */
  static async parseExcel(fileUri: string): Promise<any[]> {
    try {
      const file = new File(fileUri);
      const base64 = await file.base64();

      const workbook = XLSX.read(base64, { type: 'base64' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      throw new Error('Gagal membaca file Excel. Pastikan format file benar.');
    }
  }

  /**
   * Generates and shares template Excel 97-2003 (.xls) files matching official e-PPGBM headers
   */
  static async downloadTemplate(type: 'balita' | 'balita_identitas' | 'balita_ukur' | 'lansia') {
    try {
      const wb = XLSX.utils.book_new();
      let filename = `template_${type}_${Date.now()}.xls`;

      if (type === 'balita_identitas') {
        const headers = [
          'No', 'anak_ke', 'tgl_lahir', 'jenis_kelamin', 'nomor_KK', 'NIK',
          'nama_anak', 'usia_hamil', 'berat_lahir', 'panjang_lahir', 'lingkar_kepala_lahir',
          'kia', 'kia_bayi_kecil', 'imd', 'nama_ortu', 'nik_ortu', 'hp_ortu',
          'alamat', 'nama_posyandu', 'rt', 'rw', 'hapus', 'pindah'
        ];

        const rows: any[][] = [
          headers,
          [
            1,
            1,
            '2023-01-15',
            'Laki-laki',
            this.makeTextCell('3402081234560001'),
            this.makeTextCell('3402081501230001'),
            'Ananda Bagus',
            38,
            3.2,
            50,
            34.0,
            'Ya',
            'Tidak',
            'Ya',
            'Ahmad Muzaki',
            this.makeTextCell('3402081010850001'),
            this.makeTextCell('081234567890'),
            'Jl. Merdeka No. 10',
            'Posyandu Mawar',
            1,
            3,
            '',
            ''
          ],
          [
            2,
            2,
            '2023-05-20',
            'Perempuan',
            this.makeTextCell('3402081234560002'),
            this.makeTextCell('3402086005230002'),
            'Citra Lestari',
            39,
            3.0,
            49,
            33.5,
            'Ya',
            'Tidak',
            'Ya',
            'Siti Rahma',
            this.makeTextCell('3402085505880002'),
            this.makeTextCell('081298765432'),
            'Jl. Kenanga No. 4',
            'Posyandu Mawar',
            2,
            3,
            '',
            ''
          ]
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        filename = `Template_ePPGBM_Identitas_Balita_${Date.now()}.xls`;
      } else if (type === 'balita_ukur') {
        const headers = [
          'No', 'NIK', 'nama_anak', 'alamat', 'nama_posyandu', 'TANGGALUKUR', 'BERAT', 'TINGGI', 'LILA',
          'lingkar_kepala', 'Pitting_edema', 'CARAUKUR', 'vita', 'asi_bulan_0',
          'asi_bulan_1', 'asi_bulan_2', 'asi_bulan_3', 'asi_bulan_4', 'asi_bulan_5',
          'asi_bulan_6', 'kelas_ibu_balita', 'mbg'
        ];

        const rows: any[][] = [
          headers,
          [
            1,
            this.makeTextCell('3402081501230001'),
            'Ananda Bagus',
            '2024-02-15',
            8.5,
            72.0,
            14.2,
            44.5,
            '',
            'terlentang',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
          ],
          [
            2,
            this.makeTextCell('3402086005230002'),
            'Citra Lestari',
            '2024-02-15',
            12.5,
            88.5,
            15.8,
            47.0,
            '',
            'berdiri',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
          ]
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Data Pengukuran');
        filename = `Template_ePPGBM_Pengukuran_Balita_${Date.now()}.xls`;
      } else {
        // Lansia Template
        const headers = ['No', 'NIK', 'Nama', 'Tanggal Lahir', 'Jenis Kelamin', 'Alamat', 'RT', 'Penyakit Bawaan'];
        const rows: any[][] = [
          headers,
          [
            1,
            this.makeTextCell('3402081505600001'),
            'Bapak Ahmad',
            '1960-05-15',
            'Laki-laki',
            'Jl. Mawar No. 5',
            2,
            'Hipertensi, Diabetes'
          ],
          [
            2,
            this.makeTextCell('3402085010550002'),
            'Ibu Sumarni',
            '1955-10-10',
            'Perempuan',
            'Jl. Melati No. 12',
            1,
            'Asam Urat'
          ]
        ];

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Template Lansia');
        filename = `Template_Lansia_${Date.now()}.xls`;
      }

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'biff8' });
      const file = new File(Paths.cache, filename);
      file.write(wbout, { encoding: 'base64' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/vnd.ms-excel',
          dialogTitle: `Unduh Template ${type.toUpperCase()}`,
          UTI: 'com.microsoft.excel.xls'
        });
      } else {
        throw new Error('Fitur berbagi tidak tersedia di perangkat ini');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      throw error;
    }
  }

  /**
   * Core import logic with duplicate skip and e-PPGBM support
   */
  static async importData(type: 'balita' | 'lansia', data: any[], posyanduId: string) {
    const table = type === 'balita' ? 'balitas' : 'lansias';
    const errors: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    // Load standards once for Balita Z-score computation
    let bbL: any[] = [], bbP: any[] = [], tbL: any[] = [], tbP: any[] = [], imtL: any[] = [], imtP: any[] = [], bbtbL: any[] = [], bbtbP: any[] = [];
    if (type === 'balita') {
      try {
        [bbL, bbP, tbL, tbP, imtL, imtP, bbtbL, bbtbP] = await Promise.all([
          whoService.getStandards('bb_u', 'Laki-laki'),
          whoService.getStandards('bb_u', 'Perempuan'),
          whoService.getStandards('tb_u', 'Laki-laki'),
          whoService.getStandards('tb_u', 'Perempuan'),
          whoService.getStandards('imt_u', 'Laki-laki'),
          whoService.getStandards('imt_u', 'Perempuan'),
          whoService.getStandards('bb_tb', 'Laki-laki'),
          whoService.getStandards('bb_tb', 'Perempuan')
        ]);
      } catch (err: any) {
        console.error('Gagal mengambil standar WHO:', err);
        errors.push(`Gagal memuat standar WHO: ${err.message}`);
      }
    }

    for (const item of data) {
      try {
        // Normalize keys of the row to align with EPPGBM synonyms
        const row: any = {};
        for (const [key, val] of Object.entries(item)) {
          row[normalizeKey(key)] = val;
        }

        // 1. Clean NIK
        const nik = cleanNik(row.nik);
        if (!nik) {
          errors.push(`NIK tidak valid (harus 16 digit) untuk: ${row.nama || row.nama_anak || 'Tanpa Nama'}`);
          continue;
        }

        // 2. Clean Gender and Date of Birth
        const gender = cleanGender(row.jenis_kelamin);
        const parsedDob = parseExcelDate(row.tanggal_lahir);

        // 3. Check for profile existence in DB
        const { data: existing } = await supabase
          .from(table)
          .select('id, tanggal_lahir, jenis_kelamin')
          .eq('nik', nik)
          .maybeSingle();

        let targetId = existing?.id || null;
        const targetDob = existing?.tanggal_lahir || parsedDob;
        const targetGender = existing?.jenis_kelamin || gender;

        if (!existing && parsedDob) {
          // Prepare new record payload
          const payload: any = {
            posyandu_id: posyanduId,
            nik,
            nama: String(row.nama || row.nama_anak || '').trim() || 'Tanpa Nama',
            tanggal_lahir: parsedDob,
            jenis_kelamin: gender,
            alamat: row.alamat ? String(row.alamat).trim() : null,
            rt: row.rt ? parseInt(row.rt, 10) || null : null,
            rw: row.rw ? String(row.rw).trim() : null,
          };

          if (type === 'balita') {
            payload.no_kk = row.nomor_kk ? String(row.nomor_kk).trim() : null;
            payload.nama_ortu = row.nama_ortu ? String(row.nama_ortu).trim() : (row.nama_ibu ? String(row.nama_ibu).trim() : '');
            payload.nama_ibu = row.nama_ibu ? String(row.nama_ibu).trim() : null;
            payload.nama_ayah = row.nama_ayah ? String(row.nama_ayah).trim() : null;
            payload.nik_ortu = row.nik_ortu ? cleanNik(row.nik_ortu) : null;
            payload.no_hp_ortu = row.no_hp_ortu ? String(row.no_hp_ortu).trim() : null;
            payload.anak_ke = row.anak_ke ? parseInt(row.anak_ke, 10) || null : null;
            payload.usia_kehamilan_lahir = row.usia_hamil ? parseInt(row.usia_hamil, 10) || null : null;
            payload.bb_lahir = row.bb_lahir ? parseFloat(String(row.bb_lahir).replace(',', '.')) || null : null;
            payload.tb_lahir = row.tb_lahir ? parseFloat(String(row.tb_lahir).replace(',', '.')) || null : null;
            payload.lk_lahir = row.lingkar_kepala_lahir ? parseFloat(String(row.lingkar_kepala_lahir).replace(',', '.')) || null : null;
            payload.buku_kia = row.kia !== undefined ? (String(row.kia).toLowerCase() === 'ya' || row.kia === true || row.kia === 1) : null;
            payload.buku_kia_bayi_kecil = row.kia_bayi_kecil !== undefined ? (String(row.kia_bayi_kecil).toLowerCase() === 'ya' || row.kia_bayi_kecil === true || row.kia_bayi_kecil === 1) : null;
            payload.imd = row.imd !== undefined ? (String(row.imd).toLowerCase() === 'ya' || row.imd === true || row.imd === 1) : null;
          } else {
            if (row.penyakit_bawaan) {
              payload.penyakit_bawaan = String(row.penyakit_bawaan).split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
            } else {
              payload.penyakit_bawaan = [];
            }
          }

          const { data: inserted, error: insertError } = await supabase
            .from(table)
            .insert(payload)
            .select('id')
            .single();

          if (insertError) throw insertError;
          targetId = inserted.id;
          importedCount++;
        } else if (existing) {
          skippedCount++;
        }

        // 4. Handle monthly measurements if available (Balita only)
        if (type === 'balita' && targetId && targetDob) {
          const parsedMeasDate = parseExcelDate(row.tanggal_pengukuran);
          const weightVal = row.berat_badan ? parseFloat(String(row.berat_badan).replace(',', '.')) : null;
          const heightVal = row.tinggi_badan ? parseFloat(String(row.tinggi_badan).replace(',', '.')) : null;

          if (parsedMeasDate && weightVal && heightVal) {
            // Check if measurement already exists on this date
            const { data: existingMeas } = await supabase
              .from('penimbangans')
              .select('id')
              .eq('balita_id', targetId)
              .eq('tanggal', parsedMeasDate)
              .maybeSingle();

            if (!existingMeas) {
              const bbStd = targetGender === 'Laki-laki' ? bbL : bbP;
              const tbStd = targetGender === 'Laki-laki' ? tbL : tbP;
              const imtStd = targetGender === 'Laki-laki' ? imtL : imtP;
              const bbtbStd = targetGender === 'Laki-laki' ? bbtbL : bbtbP;

              const ageMonthsDecimal = calculateAgeMonthsDecimal(targetDob, parsedMeasDate);
              const bmiVal = weightVal / ((heightVal / 100) ** 2);

              const bbResult = ZScoreEngine.calculate(bbStd, targetGender === 'Laki-laki' ? 'L' : 'P', ageMonthsDecimal, weightVal, 'BB/U');
              const tbResult = ZScoreEngine.calculate(tbStd, targetGender === 'Laki-laki' ? 'L' : 'P', ageMonthsDecimal, heightVal, 'TB/U');
              const imtResult = ZScoreEngine.calculate(imtStd, targetGender === 'Laki-laki' ? 'L' : 'P', ageMonthsDecimal, bmiVal, 'IMT/U');
              const bbtbResult = ZScoreEngine.calculate(bbtbStd, targetGender === 'Laki-laki' ? 'L' : 'P', heightVal, weightVal, 'BB/TB', ageMonthsDecimal);

              const measPayload: any = {
                balita_id: targetId,
                tanggal: parsedMeasDate,
                berat_badan: weightVal,
                tinggi_badan: heightVal,
                lingkar_kepala: row.lingkar_kepala ? parseFloat(String(row.lingkar_kepala).replace(',', '.')) || null : null,
                lingkar_lengan: row.lingkar_lengan ? parseFloat(String(row.lingkar_lengan).replace(',', '.')) || null : null,
                bmi: parseFloat(bmiVal.toFixed(2)),
                zscore_bb_u: bbResult.zscore,
                status_bb_u: bbResult.status,
                zscore_tb_u: tbResult.zscore,
                status_tb_u: tbResult.status,
                zscore_imt_u: imtResult.zscore,
                status_imt_u: imtResult.status,
                zscore_bb_tb: bbtbResult.zscore,
                status_bb_tb: bbtbResult.status,
                catatan: row.catatan ? String(row.catatan).trim() : null
              };

              const { error: measError } = await supabase
                .from('penimbangans')
                .insert(measPayload);

              if (measError) throw measError;
            }
          }
        }
      } catch (err: any) {
        errors.push(`Error pada ${item.nama || item.nama_anak || 'Row'}: ${err.message}`);
      }
    }

    return { importedCount, skippedCount, errors };
  }

  /**
   * FILE 1: Ekspor Identitas Balita ke Format Resmi e-PPGBM Kemenkes (.xls 2003)
   * 22 Kolom Exact Case, Sheet1, NIK sebagai Text murni tanpa tanda petik
   */
  static async exportEPPGBMIdentitas(posyanduId: string, posyanduName: string) {
    try {
      const { data: balitas, error: bError } = await supabase
        .from('balitas')
        .select('*')
        .eq('posyandu_id', posyanduId)
        .order('nama', { ascending: true });

      if (bError) throw bError;
      if (!balitas || balitas.length === 0) {
        throw new Error('Tidak ada data Balita untuk Posyandu ini.');
      }

      const headers = [
        'No', 'anak_ke', 'tgl_lahir', 'jenis_kelamin', 'nomor_KK', 'NIK',
        'nama_anak', 'usia_hamil', 'berat_lahir', 'panjang_lahir', 'lingkar_kepala_lahir',
        'kia', 'kia_bayi_kecil', 'imd', 'nama_ortu', 'nik_ortu', 'hp_ortu',
        'alamat', 'nama_posyandu', 'rt', 'rw', 'hapus', 'pindah'
      ];

      const dataRows: any[][] = [headers];

      balitas.forEach((b, index) => {
        dataRows.push([
          index + 1,
          b.anak_ke || 1,
          b.tanggal_lahir || '',
          b.jenis_kelamin || 'Laki-laki',
          this.makeTextCell(b.no_kk || ''),
          this.makeTextCell(b.nik),
          b.nama || '',
          b.usia_kehamilan_lahir || 37,
          b.bb_lahir !== null && b.bb_lahir !== undefined ? b.bb_lahir : '',
          b.tb_lahir !== null && b.tb_lahir !== undefined ? b.tb_lahir : '',
          b.lk_lahir !== null && b.lk_lahir !== undefined ? b.lk_lahir : '',
          b.buku_kia ? 'Ya' : 'Tidak',
          b.buku_kia_bayi_kecil ? 'Ya' : 'Tidak',
          b.imd ? 'Ya' : 'Tidak',
          b.nama_ibu || b.nama_ortu || b.nama_ayah || '',
          this.makeTextCell(b.nik_ortu || ''),
          this.makeTextCell(b.no_hp_ortu || ''),
          b.alamat || '',
          posyanduName || '',
          b.rt !== null && b.rt !== undefined ? b.rt : '',
          b.rw || '1',
          '',
          ''
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'biff8' });
      const cleanName = posyanduName.replace(/\s+/g, '_');
      const filename = `ePPGBM_Identitas_${cleanName}_${Date.now()}.xls`;

      const file = new File(Paths.cache, filename);
      file.write(wbout, { encoding: 'base64' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/vnd.ms-excel',
          dialogTitle: `Ekspor Identitas e-PPGBM - ${posyanduName}`,
          UTI: 'com.microsoft.excel.xls'
        });
      } else {
        throw new Error('Fitur berbagi file tidak tersedia di perangkat ini');
      }
    } catch (error: any) {
      console.error('Identitas export error:', error);
      throw error;
    }
  }

  /**
   * FILE 2: Ekspor Pengukuran Bulanan ke Format Resmi e-PPGBM Kemenkes (.xls 2003)
   * 20 Kolom Exact Case, Data Pengukuran, NIK sebagai Text murni tanpa tanda petik
   */
  static async exportEPPGBMPengukuran(posyanduId: string, month: number, year: number, posyanduName: string) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = new Date(year, month, 0).toISOString().split('T')[0];

      // 1. Fetch balitas
      const { data: balitas, error: bError } = await supabase
        .from('balitas')
        .select('*')
        .eq('posyandu_id', posyanduId)
        .order('nama', { ascending: true });

      if (bError) throw bError;
      if (!balitas || balitas.length === 0) {
        throw new Error('Tidak ada data Balita untuk Posyandu ini pada periode tersebut.');
      }

      // Filter balita aktif (<60 bulan)
      const refDate = new Date(year, month - 1, 1);
      const activeBalitas = balitas.filter(b => calculateAgeMonths(b.tanggal_lahir, refDate) < 60);

      if (activeBalitas.length === 0) {
        throw new Error('Tidak ada data Balita aktif untuk Posyandu ini pada periode tersebut.');
      }

      const balitaIds = activeBalitas.map(b => b.id);

      // 2. Fetch weighings for the month
      const { data: weighings, error: wError } = await supabase
        .from('penimbangans')
        .select('*')
        .in('balita_id', balitaIds)
        .gte('tanggal', startStr)
        .lte('tanggal', endStr);

      if (wError) throw wError;

      const weighMap = new Map<string, any>();
      (weighings || []).forEach(w => {
        if (!weighMap.has(w.balita_id) || w.tanggal > weighMap.get(w.balita_id).tanggal) {
          weighMap.set(w.balita_id, w);
        }
      });

      const headers = [
        'No', 'NIK', 'nama_anak', 'alamat', 'tgl_lahir', 'nama_posyandu', 'TANGGALUKUR', 'BERAT', 'TINGGI', 'LILA',
        'lingkar_kepala', 'Pitting_edema', 'CARAUKUR', 'vita', 'asi_bulan_0',
        'asi_bulan_1', 'asi_bulan_2', 'asi_bulan_3', 'asi_bulan_4', 'asi_bulan_5',
        'asi_bulan_6', 'kelas_ibu_balita', 'mbg'
      ];

      const dataRows: any[][] = [headers];

      activeBalitas.forEach((b, index) => {
        const w = weighMap.get(b.id);
        let caraUkur = '';
        if (w && (w.tinggi_badan || w.berat_badan)) {
          const measDate = w.tanggal ? new Date(w.tanggal) : new Date(year, month - 1, 15);
          const ageInMonths = calculateAgeMonths(b.tanggal_lahir, measDate);
          caraUkur = ageInMonths < 24 ? 'terlentang' : 'berdiri';
        }

        dataRows.push([
          index + 1,
          this.makeTextCell(b.nik),
          b.nama || '',
          b.alamat || '',
          b.tanggal_lahir || '',
          posyanduName || '',
          w ? w.tanggal : '',
          w ? w.berat_badan : '',
          w ? w.tinggi_badan : '',
          w ? (w.lingkar_lengan || '') : '',
          w ? (w.lingkar_kepala || '') : '',
          '', // Pitting_edema kosong
          caraUkur, // Umur < 24 bln: terlentang (PB), Umur >= 24 bln: berdiri (TB)
          '', // vita kosong
          '', // asi_bulan_0 kosong
          '', // asi_bulan_1 kosong
          '', // asi_bulan_2 kosong
          '', // asi_bulan_3 kosong
          '', // asi_bulan_4 kosong
          '', // asi_bulan_5 kosong
          '', // asi_bulan_6 kosong
          '', // kelas_ibu_balita kosong
          ''  // mbg kosong
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Pengukuran');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'biff8' });
      const monthLabel = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ][month - 1];
      const cleanName = posyanduName.replace(/\s+/g, '_');
      const filename = `ePPGBM_Pengukuran_${cleanName}_${monthLabel}_${year}.xls`;

      const file = new File(Paths.cache, filename);
      file.write(wbout, { encoding: 'base64' });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/vnd.ms-excel',
          dialogTitle: `Ekspor Pengukuran e-PPGBM - ${monthLabel} ${year}`,
          UTI: 'com.microsoft.excel.xls'
        });
      } else {
        throw new Error('Fitur berbagi file tidak tersedia di perangkat ini');
      }
    } catch (error: any) {
      console.error('Pengukuran export error:', error);
      throw error;
    }
  }

  /**
   * Compatibility alias for legacy calls
   */
  static async exportToEPPGBM(posyanduId: string, month: number, year: number, posyanduName: string) {
    return this.exportEPPGBMPengukuran(posyanduId, month, year, posyanduName);
  }
}

