import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { Balita, Lansia } from '../lib/types';

// Bypass missing type definitions for some expo-file-system versions
const { cacheDirectory, readAsStringAsync, writeAsStringAsync } = FileSystem as any;

export class ImportService {
  /**
   * Parses an Excel file from a URI and returns data objects
   */
  static async parseExcel(fileUri: string): Promise<any[]> {
    try {
      const base64 = await readAsStringAsync(fileUri, {
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
    const data = type === 'balita' ? [
      {
        nik: '1234567890123456',
        nama: 'Nama Balita',
        tanggal_lahir: '2023-01-01',
        jenis_kelamin: 'Laki-laki',
        nama_ortu: 'Nama Ibu/Ayah',
        alamat: 'Nama Jalan/Dusun',
        rt: 1,
        bb_lahir: 3.2,
        tb_lahir: 50,
        anak_ke: 1
      }
    ] : [
      {
        nik: '1234567890123456',
        nama: 'Nama Lansia',
        tanggal_lahir: '1960-01-01',
        jenis_kelamin: 'Perempuan',
        alamat: 'Nama Jalan/Dusun',
        rt: 1,
        penyakit_bawaan: 'Hipertensi, Diabetes'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    const uri = (cacheDirectory || '') + `template_${type}.xlsx`;
    
    await writeAsStringAsync(uri, wbout, {
      encoding: 'base64',
    });

    await Sharing.shareAsync(uri);
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
        const payload: any = { ...item, posyandu_id: posyanduId };
        
        // Handle special fields
        if (type === 'lansia' && item.penyakit_bawaan) {
            payload.penyakit_bawaan = String(item.penyakit_bawaan).split(',').map(s => s.trim());
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
