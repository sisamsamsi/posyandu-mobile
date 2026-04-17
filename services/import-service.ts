import * as XLSX from 'xlsx';
// Menggunakan sub-module legacy sesuai rekomendasi Expo SDK 52 untuk API fungsional
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';

export class ImportService {
  /**
   * Parses an Excel file from a URI and returns data objects
   */
  static async parseExcel(fileUri: string): Promise<any[]> {
    try {
      // Menggunakan API fungsional dari module legacy
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64',
      });

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
      
      const baseDir = FileSystem.cacheDirectory || '';
      const uri = baseDir.endsWith('/') ? `${baseDir}${filename}` : `${baseDir}/${filename}`;
      
      await FileSystem.writeAsStringAsync(uri, wbout, {
        encoding: 'base64',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
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
   * Core import logic with duplicate skip
   */
  static async importData(type: 'balita' | 'lansia', data: any[], posyanduId: string) {
    const table = type === 'balita' ? 'balitas' : 'lansias';
    const errors: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    for (const item of data) {
      try {
        // 1. Basic validation
        if (!item.nik || String(item.nik).length !== 16) {
          errors.push(`NIK invalid untuk: ${item.nama || 'Tanpa Nama'}`);
          continue;
        }

        // 2. Check for existence (Skip duplicate rule)
        const { data: existing } = await supabase
          .from(table)
          .select('id')
          .eq('nik', String(item.nik))
          .maybeSingle();

        if (existing) {
          skippedCount++;
          continue;
        }

        // 3. Prepare payload
        const payload: any = { 
            ...item, 
            posyandu_id: posyanduId,
            nik: String(item.nik)
        };
        
        // Handle special fields
        if (type === 'lansia' && item.penyakit_bawaan) {
            payload.penyakit_bawaan = String(item.penyakit_bawaan).split(',').map(s => s.trim()).filter(s => s !== '');
        }

        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
        
        importedCount++;
      } catch (err: any) {
        errors.push(`Error pada ${item.nama}: ${err.message}`);
      }
    }

    return { importedCount, skippedCount, errors };
  }
}
