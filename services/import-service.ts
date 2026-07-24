import * as XLSX from 'xlsx';
// Menggunakan sub-module legacy sesuai rekomendasi Expo SDK 52 untuk API fungsional
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { ZScoreEngine } from './zscore-engine';
import { whoService } from './who-service';
import { calculateAgeMonthsDecimal } from '../lib/utils';
import { normalizeKey, cleanNik, cleanGender, parseExcelDate } from './eppgbm-utils';

export class ImportService {
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
   * Generates and shares a template Excel file
   */
  static async downloadTemplate(type: 'balita' | 'lansia') {
    try {
      // Data template yang sudah disesuaikan dengan field tabel database (lib/types.ts)
      const data = type === 'balita' ? [
        {
          nik: '1234567890123456',
          nama: 'Ananda Bagus',
          tempat_lahir: 'Bantul',
          tanggal_lahir: '2023-01-01',
          jenis_kelamin: 'Laki-laki',
          nama_ortu: 'Siti Aminah',
          nama_ibu: 'Siti Aminah',
          nama_ayah: 'Ahmad Muzaki',
          no_hp_ortu: '6281234567890',
          alamat: 'Jl. Merdeka No. 10',
          rt: 1,
          bb_lahir: 3.2,
          tb_lahir: 50,
          anak_ke: 1
        },
        {
          nik: '1234567890123457',
          nama: 'Citra Lestari',
          tempat_lahir: 'Yogyakarta',
          tanggal_lahir: '2023-05-20',
          jenis_kelamin: 'Perempuan',
          nama_ortu: 'Budi Santoso',
          nama_ibu: 'Lestari',
          nama_ayah: 'Budi Santoso',
          no_hp_ortu: '6289876543210',
          alamat: 'Jl. Mawar No. 5',
          rt: 2,
          bb_lahir: 2.8,
          tb_lahir: 48,
          anak_ke: 2
        }
      ] : [
        {
          nik: '1234567890123456',
          nama: 'Bapak Ahmad',
          tanggal_lahir: '1960-05-15',
          jenis_kelamin: 'Laki-laki',
          alamat: 'Jl. Mawar No. 5',
          rt: 2,
          penyakit_bawaan: 'Hipertensi, Diabetes'
        },
        {
          nik: '1234567890123458',
          nama: 'Ibu Sumarni',
          tanggal_lahir: '1955-10-10',
          jenis_kelamin: 'Perempuan',
          alamat: 'Jl. Melati No. 12',
          rt: 1,
          penyakit_bawaan: 'Asam Urat'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const filename = `template_${type}_${Date.now()}.xlsx`;
      
      const file = new File(Paths.cache, filename);
      file.write(wbout, {
        encoding: 'base64',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Unduh Template ${type.toUpperCase()}`,
          UTI: 'com.microsoft.excel.xlsx'
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
          errors.push(`NIK tidak valid (harus 16 digit) untuk: ${row.nama || 'Tanpa Nama'}`);
          continue;
        }

        // 2. Clean Gender and Date of Birth
        const gender = cleanGender(row.jenis_kelamin);
        const parsedDob = parseExcelDate(row.tanggal_lahir);
        if (!parsedDob) {
          errors.push(`Tanggal lahir tidak valid untuk: ${row.nama || 'Tanpa Nama'}`);
          continue;
        }

        // 3. Check for child profile existence in DB
        const { data: existing } = await supabase
          .from(table)
          .select('id')
          .eq('nik', nik)
          .maybeSingle();

        let targetId = existing?.id || null;

        if (!existing) {
          // Prepare new record payload
          const payload: any = {
            posyandu_id: posyanduId,
            nik,
            nama: String(row.nama || '').trim() || 'Tanpa Nama',
            tanggal_lahir: parsedDob,
            jenis_kelamin: gender,
            alamat: row.alamat ? String(row.alamat).trim() : null,
            rt: row.rt ? parseInt(row.rt, 10) || null : null,
          };

          if (type === 'balita') {
            payload.nama_ortu = row.nama_ortu ? String(row.nama_ortu).trim() : (row.nama_ibu ? String(row.nama_ibu).trim() : '');
            payload.nama_ibu = row.nama_ibu ? String(row.nama_ibu).trim() : null;
            payload.nama_ayah = row.nama_ayah ? String(row.nama_ayah).trim() : null;
            payload.bb_lahir = row.bb_lahir ? parseFloat(String(row.bb_lahir).replace(',', '.')) || null : null;
            payload.tb_lahir = row.tb_lahir ? parseFloat(String(row.tb_lahir).replace(',', '.')) || null : null;
            payload.no_hp_ortu = row.no_hp_ortu ? String(row.no_hp_ortu).trim() : null;
            payload.anak_ke = row.anak_ke ? parseInt(row.anak_ke, 10) || null : null;
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
        } else {
          skippedCount++;
        }

        // 4. Handle monthly measurements if available (Balita only)
        if (type === 'balita' && targetId) {
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
              const bbStd = gender === 'Laki-laki' ? bbL : bbP;
              const tbStd = gender === 'Laki-laki' ? tbL : tbP;
              const imtStd = gender === 'Laki-laki' ? imtL : imtP;
              const bbtbStd = gender === 'Laki-laki' ? bbtbL : bbtbP;

              const ageMonthsDecimal = calculateAgeMonthsDecimal(parsedDob, parsedMeasDate);
              const bmiVal = weightVal / ((heightVal / 100) ** 2);

              const bbResult = ZScoreEngine.calculate(bbStd, gender === 'Laki-laki' ? 'L' : 'P', ageMonthsDecimal, weightVal, 'BB/U');
              const tbResult = ZScoreEngine.calculate(tbStd, gender === 'Laki-laki' ? 'L' : 'P', ageMonthsDecimal, heightVal, 'TB/U');
              const imtResult = ZScoreEngine.calculate(imtStd, gender === 'Laki-laki' ? 'L' : 'P', ageMonthsDecimal, bmiVal, 'IMT/U');
              const bbtbResult = ZScoreEngine.calculate(bbtbStd, gender === 'Laki-laki' ? 'L' : 'P', heightVal, weightVal, 'BB/TB', ageMonthsDecimal);

              const measPayload = {
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
        errors.push(`Error pada ${item.nama || 'Row'}: ${err.message}`);
      }
    }

    return { importedCount, skippedCount, errors };
  }

  /**
   * Generates and exports Balita measurements data in e-PPGBM Excel format
   */
  static async exportToEPPGBM(posyanduId: string, month: number, year: number, posyanduName: string) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = new Date(year, month, 0).toISOString().split('T')[0];

      // 1. Fetch all balitas under the Posyandu
      const { data: balitas, error: bError } = await supabase
        .from('balitas')
        .select('*')
        .eq('posyandu_id', posyanduId)
        .order('nama', { ascending: true });

      if (bError) throw bError;

      if (!balitas || balitas.length === 0) {
        throw new Error('Tidak ada data Balita untuk Posyandu ini pada periode tersebut.');
      }

      const balitaIds = balitas.map(b => b.id);

      // 2. Fetch all weighings for this month
      const { data: weighings, error: wError } = await supabase
        .from('penimbangans')
        .select('*')
        .in('balita_id', balitaIds)
        .gte('tanggal', startStr)
        .lte('tanggal', endStr);

      if (wError) throw wError;

      const weighMap = new Map<string, any>();
      (weighings || []).forEach(w => {
        // Keep the latest measurement if multiple exist in the same month
        if (!weighMap.has(w.balita_id) || w.tanggal > weighMap.get(w.balita_id).tanggal) {
          weighMap.set(w.balita_id, w);
        }
      });

      // 3. Map to Excel structure (standard draft)
      const exportData = balitas.map((b, index) => {
        const w = weighMap.get(b.id);
        return {
          'No': index + 1,
          'NIK Balita': b.nik,
          'Nama Balita': b.nama,
          'Tanggal Lahir': b.tanggal_lahir,
          'Jenis Kelamin': b.jenis_kelamin === 'Laki-laki' ? 'L' : 'P',
          'Anak Ke': b.anak_ke || 1,
          'No KK': b.no_kk || '',
          'NIK Orang Tua': b.nik_ortu || '',
          'Usia Kehamilan Lahir (minggu)': b.usia_kehamilan_lahir || '',
          'Berat Lahir (kg)': b.bb_lahir || '',
          'Tinggi Lahir (cm)': b.tb_lahir || '',
          'Lingkar Kepala Lahir (cm)': b.lk_lahir || '',
          'Buku KIA': b.buku_kia ? 'Ya' : 'Tidak',
          'Buku KIA Bayi Kecil': b.buku_kia_bayi_kecil ? 'Ya' : 'Tidak',
          'Mendapat Tatalaksana BBLR': b.tatalaksana_bblr ? 'Ya' : 'Tidak',
          'IMD': b.imd ? 'Ya' : 'Tidak',
          'Nama Ibu': b.nama_ibu || b.nama_ortu || '',
          'Nama Ayah': b.nama_ayah || '',
          'No HP Orang Tua': b.no_hp_ortu || '',
          'Alamat': b.alamat || '',
          'RT': b.rt || '',
          'RW': b.rw || '1',
          'Tanggal Pengukuran': w ? w.tanggal : '',
          'Berat Badan (kg)': w ? w.berat_badan : '',
          'Tinggi Badan (cm)': w ? w.tinggi_badan : '',
          'Cara Pengukuran': w ? (w.tinggi_badan < 85 ? 'Telentang' : 'Berdiri') : '',
          'LILA (cm)': w ? w.lingkar_lengan || '' : '',
          'Lingkar Kepala (cm)': w ? w.lingkar_kepala || '' : '',
          'Z-Score BB/U': w ? w.zscore_bb_u || '' : '',
          'Status BB/U': w ? w.status_bb_u || '' : '',
          'Z-Score TB/U': w ? w.zscore_tb_u || '' : '',
          'Status TB/U': w ? w.status_tb_u || '' : '',
          'Z-Score BB/TB': w ? w.zscore_bb_tb || '' : '',
          'Status BB/TB': w ? w.status_bb_tb || '' : '',
          'Catatan': w ? w.catatan || '' : ''
        };
      });

      // 4. Create worksheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-fit column widths
      const maxLens = Object.keys(exportData[0]).map(key => {
        return Math.max(
          key.length,
          ...exportData.map(row => String((row as any)[key] || '').length)
        );
      });
      worksheet['!cols'] = maxLens.map(len => ({ wch: len + 3 }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data e-PPGBM');

      // 5. Write file
      const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
      const monthLabel = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ][month - 1];
      const filename = `Laporan_ePPGBM_${posyanduName.replace(/\s+/g, '_')}_${monthLabel}_${year}.xlsx`;

      const file = new File(Paths.cache, filename);
      file.write(wbout, { encoding: 'base64' });

      // 6. Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Ekspor Excel e-PPGBM - ${monthLabel} ${year}`,
          UTI: 'com.microsoft.excel.xlsx'
        });
      } else {
        throw new Error('Fitur berbagi file tidak tersedia di perangkat ini');
      }
    } catch (error: any) {
      console.error('Excel export error:', error);
      throw error;
    }
  }
}
