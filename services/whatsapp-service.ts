// services/whatsapp-service.ts
import { Linking, Alert } from 'react-native';
import { Balita, Penimbangan, Posyandu } from '../lib/types';
import { SettingsService } from './settings-service';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

/**
 * WhatsApp Deep Link Service
 * Menggunakan wa.me deep links (100% GRATIS)
 * Kader tinggal tekan "Send" di WhatsApp setelah pesan ter-generate
 */
export class WhatsAppService {
  /**
   * 1. HASIL PENIMBANGAN
   * Narasi bijak & edukatif — tidak memvonis stunting/gizi buruk secara langsung
   * Menggunakan bahasa positif dan saran yang membangun
   */
  static generateHasilPenimbangan(
    balita: Balita,
    penimbangan: Penimbangan,
    posyandu?: Posyandu | null
  ): string {
    const tanggal = format(new Date(penimbangan.tanggal), 'd MMMM yyyy', { locale: idLocale });
    const namaPos = posyandu?.nama_posyandu || 'Posyandu';

    // Hitung usia
    const lahir = new Date(balita.tanggal_lahir);
    const tgl = new Date(penimbangan.tanggal);
    const usiaBulan = Math.floor((tgl.getTime() - lahir.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

    // Generate saran berdasarkan status — TANPA memvonis langsung
    const saran = this.generateSaranBijak(penimbangan);

    let pesan = `📊 *Hasil Penimbangan ${namaPos}*\n`;
    pesan += `📅 ${tanggal}\n\n`;
    pesan += `Assalamualaikum Wr. Wb.\n`;
    pesan += `Berikut hasil penimbangan ananda *${balita.nama}*:\n\n`;
    pesan += `👶 Usia: ${usiaBulan} bulan\n`;
    pesan += `⚖️ Berat Badan: ${penimbangan.berat_badan} kg\n`;
    pesan += `📏 Tinggi Badan: ${penimbangan.tinggi_badan} cm\n`;
    if (penimbangan.lingkar_kepala) {
      pesan += `🔵 Lingkar Kepala: ${penimbangan.lingkar_kepala} cm\n`;
    }
    pesan += `\n`;
    pesan += `${saran}\n\n`;
    pesan += `Silakan konsultasikan ke petugas kesehatan jika ada pertanyaan mengenai tumbuh kembang ananda.\n\n`;
    pesan += `Terima kasih telah membawa ananda ke posyandu. 🙏\n`;
    pesan += `_${namaPos}_`;

    return pesan;
  }

  /**
   * Generate saran bijak berdasarkan status penimbangan
   * TIDAK MEMVONIS — menggunakan bahasa edukatif
   */
  private static generateSaranBijak(p: Penimbangan): string {
    const saranList: string[] = [];

    // BB/U - Berat Badan berdasarkan Umur
    if (p.status_bb_u) {
      if (p.status_bb_u.includes('Sangat Kurang') || p.status_bb_u.includes('Kurang')) {
        saranList.push(
          `💡 *Berat badan ananda masih perlu ditingkatkan.*\n` +
          `Pastikan ananda mendapat makanan bergizi seimbang dengan porsi yang cukup. ` +
          `Berikan makanan yang kaya protein seperti telur, ikan, tempe, dan tahu setiap hari.`
        );
      } else if (p.status_bb_u.includes('Lebih')) {
        saranList.push(
          `💡 *Berat badan ananda sudah cukup, perhatikan pola makan seimbang.*\n` +
          `Berikan buah dan sayur lebih banyak, kurangi makanan olahan dan bergula.`
        );
      } else {
        saranList.push(
          `✅ *Berat badan ananda dalam kondisi baik.*\n` +
          `Pertahankan pola makan seimbang dan istirahat yang cukup.`
        );
      }
    }

    // TB/U - Tinggi Badan berdasarkan Umur  
    if (p.status_tb_u) {
      if (p.status_tb_u.includes('Sangat Pendek') || p.status_tb_u.includes('Pendek')) {
        saranList.push(
          `📏 *Pertumbuhan tinggi badan ananda perlu perhatian.*\n` +
          `Pastikan ananda mendapat asupan kalsium (susu, ikan teri) dan protein hewani secara rutin. ` +
          `Ajak ananda bermain aktif di luar rumah untuk merangsang pertumbuhan.`
        );
      }
    }

    // BB/TB - Wasting
    if (p.status_bb_tb) {
      if (p.status_bb_tb.includes('Buruk') || p.status_bb_tb.includes('Kurang')) {
        saranList.push(
          `🍽️ *Berat badan dibanding tinggi badan perlu ditingkatkan.*\n` +
          `Tambahkan frekuensi makan menjadi 3x makan utama dan 2x selingan bergizi per hari.`
        );
      }
    }

    if (saranList.length === 0) {
      return `✅ *Alhamdulillah, kondisi pertumbuhan ananda baik.*\nTerus jaga pola makan seimbang dan rutin datang ke posyandu setiap bulan ya, Bu/Pak.`;
    }

    return saranList.join('\n\n');
  }

  /**
   * 2. PENGINGAT PENIMBANGAN MANDIRI
   * Untuk balita yang belum ditimbang bulan ini
   * Narasi: cukup menyetorkan BB dan TB dengan penimbangan mandiri sebelum tanggal 20
   */
  static generatePengingat(
    balita: Balita,
    posyandu?: Posyandu | null
  ): string {
    const namaPos = posyandu?.nama_posyandu || 'Posyandu';
    const bulanIni = format(new Date(), 'MMMM yyyy', { locale: idLocale });

    let pesan = `🔔 *Pengingat Penimbangan - ${namaPos}*\n\n`;
    pesan += `Assalamualaikum Wr. Wb.\n`;
    pesan += `Ibu/Bapak dari ananda *${balita.nama}*,\n\n`;
    pesan += `Kami informasikan bahwa ananda belum melakukan penimbangan pada bulan *${bulanIni}*.\n\n`;
    pesan += `Mohon untuk menyetorkan data penimbangan mandiri berupa:\n`;
    pesan += `⚖️ *Berat Badan* (kg)\n`;
    pesan += `📏 *Tinggi Badan* (cm)\n\n`;
    pesan += `Penimbangan mandiri dapat dilakukan di rumah dan data dikirimkan ke kader *sebelum tanggal 20* setiap bulannya.\n\n`;
    pesan += `Terima kasih atas kerjasamanya 🙏\n`;
    pesan += `_${namaPos}_`;

    return pesan;
  }

  /**
   * 3. Buka WhatsApp dengan pesan
   * Menggunakan deep link: wa.me/628xxx?text=...
   */
  static async openWhatsApp(phoneNumber: string, message: string): Promise<boolean> {
    const normalized = SettingsService.normalizePhoneNumber(phoneNumber);

    if (!SettingsService.isValidWhatsAppNumber(normalized)) {
      Alert.alert(
        'Nomor Tidak Valid',
        `Nomor "${phoneNumber}" tidak valid.\n\nFormat yang benar:\n• 0812xxxxxxxx\n• 6281xxxxxxxxx`,
      );
      return false;
    }

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${normalized}?text=${encodedMessage}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          'WhatsApp Tidak Tersedia',
          'Pastikan WhatsApp sudah terinstall di perangkat Anda.',
        );
        return false;
      }
      await Linking.openURL(url);
      return true;
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Gagal membuka WhatsApp. Silakan coba lagi.');
      return false;
    }
  }

  /**
   * 4. Salin pesan ke clipboard (alternatif jika tidak punya nomor)
   */
  static getFormattedMessage(type: 'hasil' | 'pengingat', data: any): string {
    if (type === 'hasil') {
      return this.generateHasilPenimbangan(data.balita, data.penimbangan, data.posyandu);
    }
    return this.generatePengingat(data.balita, data.posyandu);
  }
}
