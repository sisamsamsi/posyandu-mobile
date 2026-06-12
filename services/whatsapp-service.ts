// services/whatsapp-service.ts
import { Linking, Alert } from 'react-native';
import { Balita, Penimbangan, Posyandu } from '../lib/types';
import { SettingsService } from './settings-service';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { calculateAgeMonths } from '../lib/utils';

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
   */  static generateHasilPenimbangan(
    balita: Balita,
    penimbangan: Penimbangan,
    posyandu?: Posyandu | null
  ): string {
    const tanggal = format(new Date(penimbangan.tanggal), 'd MMMM yyyy', { locale: idLocale });
    const namaPos = posyandu?.nama_posyandu_balita || posyandu?.nama_posyandu || 'Posyandu';

    // Hitung usia
    const usiaBulan = calculateAgeMonths(balita.tanggal_lahir, penimbangan.tanggal);

    // Generate saran berdasarkan status — TANPA memvonis langsung
    const saran = this.generateSaranBijak(penimbangan, usiaBulan);

    let pesan = `📊 *LAPORAN HASIL PENIMBANGAN POSYANDU* 🏥\n`;
    pesan += `_${namaPos}_\n`;
    pesan += `📅 ${tanggal}\n\n`;
    pesan += `Assalamualaikum Wr. Wb. Ibu/Bapak dari ananda *${balita.nama}*.\n`;
    pesan += `Berikut adalah hasil pencatatan tumbuh kembang ananda hari ini:\n\n`;
    pesan += `📌 *DATA ANANDA:*\n`;
    pesan += `• Usia: ${usiaBulan} bulan\n`;
    pesan += `• Berat Badan: ${penimbangan.berat_badan} kg\n`;
    pesan += `• Tinggi Badan: ${penimbangan.tinggi_badan} cm\n`;
    if (penimbangan.lingkar_kepala) {
      pesan += `• Lingkar Kepala: ${penimbangan.lingkar_kepala} cm\n`;
    }
    if (penimbangan.lingkar_lengan) {
      pesan += `• Lingkar Lengan (LiLA): ${penimbangan.lingkar_lengan} cm\n`;
    }
    pesan += `\n`;

    pesan += `📊 *ANALISIS STATUS GIZI (WHO Z-Score):*\n`;
    pesan += `• BB berdasarkan Umur (BB/U): *${this.formatStatusForParent(penimbangan.status_bb_u, 'bb_u')}*\n`;
    pesan += `• TB berdasarkan Umur (TB/U): *${this.formatStatusForParent(penimbangan.status_tb_u, 'tb_u')}*\n`;
    pesan += `• BB berdasarkan TB (BB/TB): *${this.formatStatusForParent(penimbangan.status_bb_tb, 'bb_tb')}*\n\n`;

    pesan += `💡 *SARAN PERTUMBUHAN & GIZI:*\n`;
    pesan += `${saran}\n\n`;

    pesan += `Tetap rutin membawa ananda ke Posyandu setiap bulan untuk memantau tumbuh kembang optimalnya. Terima kasih. 🙏\n`;
    pesan += `_Layanan Posyandu Digital - SIMPUL SEHAT_`;

    return pesan;
  }

  /**
   * Generate saran bijak berdasarkan status penimbangan dan usia
   * Mengikuti pedoman Kemenkes secara dinamis sesuai kelompok umur
   */
  private static generateSaranBijak(p: Penimbangan, usiaBulan: number): string {
    const isUnderweight = (p.status_bb_u || '').includes('Kurang') || (p.status_bb_u || '').includes('Sangat Kurang');
    const isStunted = (p.status_tb_u || '').includes('Pendek') || (p.status_tb_u || '').includes('Sangat Pendek');
    const isWasted = (p.status_bb_tb || '').includes('Kurang') || (p.status_bb_tb || '').includes('Buruk') || (p.status_bb_tb || '').includes('Wasted');
    const needsIntervention = isUnderweight || isStunted || isWasted;

    if (usiaBulan < 6) {
      if (needsIntervention) {
        return `• Susui bayi sesering mungkin (on-demand), minimal 8-12 kali sehari secara eksklusif (hanya ASI).\n` +
               `• Ibu menyusui disarankan mengonsumsi makanan bergizi seimbang tinggi kalori dan protein hewani (telur, ikan, daging) untuk meningkatkan kualitas ASI.\n` +
               `• Lakukan kontak kulit ke kulit (skin-to-skin contact) untuk merangsang nafsu menyusu bayi.`;
      } else {
        return `• Teruskan pemberian ASI Eksklusif secara on-demand (hanya ASI hingga usia 6 bulan).\n` +
               `• Ibu menyusui tetap menjaga pola makan bergizi seimbang agar produksi ASI optimal.\n` +
               `• Pantau kenaikan berat badan secara rutin di posyandu bulan depan.`;
      }
    } else if (usiaBulan >= 6 && usiaBulan <= 8) {
      if (needsIntervention) {
        return `• Lanjutkan ASI. Berikan MPASI tekstur bubur lumat/kental saring halus 2-3 kali sehari sebanyak 2-3 sendok makan bertahap hingga setengah mangkuk (125ml).\n` +
               `• Berikan protein hewani (telur saring, hati ayam lumat, ikan giling) sejak awal MPASI.\n` +
               `• Tambahkan 1 sendok teh lemak tambahan (minyak kelapa, mentega, atau santan) pada MPASI untuk mendongkrak kalori anak.`;
      } else {
        return `• Lanjutkan ASI. Berikan MPASI tekstur bubur lumat/kental saring halus 2-3 kali sehari, porsi setengah mangkuk ukuran 250ml secara bertahap.\n` +
               `• Kenalkan variasi rasa makanan secara bertahap dengan menu lengkap (karbohidrat, protein hewani, dan lemak).\n` +
               `• Pastikan ananda makan dalam suasana menyenangkan dan tidak dipaksa.`;
      }
    } else if (usiaBulan >= 9 && usiaBulan <= 11) {
      if (needsIntervention) {
        return `• Lanjutkan ASI. Berikan MPASI tekstur bubur kasar atau nasi tim cincang halus 3 kali makan utama ditambah 1-2 kali selingan sehat.\n` +
               `• Tingkatkan porsi protein hewani secara bervariasi di setiap jam makan utama (min. 1/3 mangkuk berisi protein).\n` +
               `• Tambahkan sedikit minyak atau margarin pada makanan anak. Berikan finger food bergizi (misal: potongan buah lunak atau telur rebus) untuk stimulasi motorik.`;
      } else {
        return `• Lanjutkan ASI. Berikan MPASI nasi tim cincang halus atau bubur kasar 3 kali sehari ditambah 1-2 kali makanan selingan bergizi.\n` +
               `• Berikan makanan dengan porsi 1/2 hingga 3/4 mangkuk ukuran 250ml.\n` +
               `• Latih anak makan mandiri menggunakan tangan (finger food) atau sendok.`;
      }
    } else if (usiaBulan >= 12 && usiaBulan <= 23) {
      if (needsIntervention) {
        return `• ASI tetap diberikan bila memungkinkan. Berikan makanan keluarga (nasi, lauk pauk yang dicincang kasar/halus sesuai kemampuan kunyah anak) 3-4 kali sehari.\n` +
               `• Berikan porsi padat gizi minimal setengah mangkuk ukuran 250ml sekali makan.\n` +
               `• Prioritaskan protein hewani (1 butir telur penuh, ikan, ayam, atau daging merah) di setiap makan utama. Hindari memberikan jajanan manis/camilan sebelum jam makan agar anak tetap lapar.`;
      } else {
        return `• ASI dapat diteruskan hingga usia 2 tahun. Berikan makanan keluarga yang bervariasi 3-4 kali sehari ditambah 1-2 kali makanan selingan.\n` +
               `• Porsi makanan utama sekitar 1/2 sampai 3/4 mangkuk ukuran 250ml.\n` +
               `• Biasakan ananda ikut makan bersama keluarga di meja makan untuk melatih sosialisasinya.`;
      }
    } else {
      // 24-59 months
      if (needsIntervention) {
        return `• Berikan makanan keluarga bergizi seimbang 3 kali sehari piring makan anak ditambah 2 kali selingan padat gizi.\n` +
               `• Pastikan piring makan anak selalu memiliki porsi protein hewani yang cukup (misalnya telur, daging ayam, ikan).\n` +
               `• Batasi konsumsi susu formula berlebihan yang dapat mengurangi nafsu makan makanan padatnya, serta batasi es krim, permen, dan cokelat.`;
      } else {
        return `• Berikan makanan keluarga 3 kali sehari ditambah 2 kali makanan selingan bergizi secara teratur.\n` +
               `• Pastikan menu makanan harian bervariasi mencakup makanan pokok, lauk pauk (terutama lauk hewani), sayuran, dan buah-buahan.\n` +
               `• Libatkan anak dalam aktivitas fisik/bermain aktif minimal 1 jam sehari untuk mendukung pertumbuhan tulang dan ototnya.`;
      }
    }
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
    const namaPos = posyandu?.nama_posyandu_balita || posyandu?.nama_posyandu || 'Posyandu';
    const bulanIni = format(new Date(), 'MMMM yyyy', { locale: idLocale });

    let pesan = `🔔 *Pengingat Penimbangan - ${namaPos}*\n\n`;
    pesan += `Assalamualaikum Wr. Wb.\n`;
    pesan += `Ibu/Bapak dari ananda *${balita.nama}*,\n\n`;
    pesan += `Kami informasikan bahwa ananda belum melakukan penimbangan pada bulan *${bulanIni}*.\n\n`;
    pesan += `Mohon untuk menyetorkan data penimbangan mandiri berupa:\n`;
    pesan += `⚖️ *Berat Badan* (kg)\n`;
    pesan += `📏 *Tinggi Badan* (cm)\n\n`;
    pesan += `Penimbangan mandiri dapat dilakukan di rumah dan data dikirimkan ke kader *sebelum tanggal 20* setiap bulannya.\n\n`;
    pesan += `Teria kasih atas kerjasamanya 🙏\n`;
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
   * 5. LAPORAN UNIFIED (TIMBANGAN + PENYULUHAN AI)
   * Menggabungkan metrik fisik, status WHO Z-Score, dan rekomendasi AI Meja 4/5
   */
  static generateHasilUnified(
    balita: Balita,
    penimbangan: Penimbangan,
    rekomendasiAI: string,
    posyandu?: Posyandu | null
  ): string {
    const tanggal = format(new Date(penimbangan.tanggal), 'd MMMM yyyy', { locale: idLocale });
    const namaPos = posyandu?.nama_posyandu_balita || posyandu?.nama_posyandu || 'Posyandu';

    // Hitung usia
    const usiaBulan = calculateAgeMonths(balita.tanggal_lahir, penimbangan.tanggal);

    let pesan = `📊 *LAPORAN TERPADU POSYANDU & PENYULUHAN AI* 🏥\n`;
    pesan += `_${namaPos}_\n`;
    pesan += `📅 ${tanggal}\n\n`;
    pesan += `Assalamualaikum Wr. Wb. Ibu/Bapak dari ananda *${balita.nama}*.\n`;
    pesan += `Berikut adalah hasil pencatatan tumbuh kembang dan penyuluhan gizi ananda hari ini:\n\n`;
    pesan += `📌 *DATA ANANDA:*\n`;
    pesan += `• Usia: ${usiaBulan} bulan\n`;
    pesan += `• Berat Badan: ${penimbangan.berat_badan} kg\n`;
    pesan += `• Tinggi Badan: ${penimbangan.tinggi_badan} cm\n`;
    if (penimbangan.lingkar_kepala) {
      pesan += `• Lingkar Kepala: ${penimbangan.lingkar_kepala} cm\n`;
    }
    if (penimbangan.lingkar_lengan) {
      pesan += `• Lingkar Lengan (LiLA): ${penimbangan.lingkar_lengan} cm\n`;
    }
    pesan += `\n`;

    pesan += `📊 *ANALISIS STATUS GIZI (WHO Z-Score):*\n`;
    pesan += `• BB berdasarkan Umur (BB/U): *${this.formatStatusForParent(penimbangan.status_bb_u, 'bb_u')}*\n`;
    pesan += `• TB berdasarkan Umur (TB/U): *${this.formatStatusForParent(penimbangan.status_tb_u, 'tb_u')}*\n`;
    pesan += `• BB berdasarkan TB (BB/TB): *${this.formatStatusForParent(penimbangan.status_bb_tb, 'bb_tb')}*\n\n`;

    pesan += `💡 *PANDUAN GIZI & STIMULASI AI (Meja 4/5):*\n`;
    pesan += `${rekomendasiAI}\n\n`;

    pesan += `Tetap rutin membawa ananda ke Posyandu setiap bulan untuk memantau tumbuh kembang optimalnya. Terima kasih. 🙏\n`;
    pesan += `_Layanan Posyandu Digital - SIMPUL SEHAT_`;

    return pesan;
  }

  /**
   * Helper untuk mereduksi istilah diagnosa medis WHO kasar menjadi bahasa suportif untuk orang tua
   */
  private static formatStatusForParent(status: string | null, indicator: 'bb_u' | 'tb_u' | 'bb_tb'): string {
    if (!status || status === 'Tidak dapat ditentukan') return 'Sesuai standar tumbuh kembang (pertahankan!)';
    const s = status.toLowerCase();
    
    if (indicator === 'bb_u') {
      if (s.includes('sangat kurang') || s.includes('sk')) {
        return 'Berat badan masih perlu perhatian khusus & asupan gizi ekstra';
      }
      if (s.includes('kurang') || s.includes('k')) {
        return 'Berat badan perlu tambahan asupan gizi seimbang';
      }
      if (s.includes('normal') || s.includes('n')) {
        return 'Berat badan baik (sesuai standar)';
      }
      if (s.includes('lebih') || s.includes('rl')) {
        return 'Berat badan cukup (jaga pola makan & aktivitas)';
      }
    }
    
    if (indicator === 'tb_u') {
      if (s.includes('sangat pendek') || s.includes('sp')) {
        return 'Tinggi badan memerlukan perhatian khusus & stimulasi tumbuh kembang';
      }
      if (s.includes('pendek') || s.includes('p')) {
        return 'Tinggi badan perlu dukungan asupan protein hewani & kalsium';
      }
      if (s.includes('normal') || s.includes('n')) {
        return 'Tinggi badan baik (sesuai standar)';
      }
      if (s.includes('tinggi') || s.includes('t')) {
        return 'Tinggi badan optimal (sangat baik)';
      }
    }
    
    if (indicator === 'bb_tb') {
      if (s.includes('buruk') || s.includes('severely wasted') || s.includes('wasting')) {
        return 'Proporsi berat dibanding tinggi badan perlu asupan gizi & perhatian intensif';
      }
      if (s.includes('kurang') || s.includes('wasted')) {
        return 'Proporsi berat dibanding tinggi badan perlu tambahan porsi gizi seimbang';
      }
      if (s.includes('baik') || s.includes('normal') || s.includes('gizi baik')) {
        return 'Proporsi berat dibanding tinggi badan ideal & gizi baik';
      }
      if (s.includes('lebih') || s.includes('overweight') || s.includes('obesitas')) {
        return 'Proporsi berat dibanding tinggi badan cukup (imbangi dengan sayur & buah)';
      }
    }
    
    return 'Sesuai standar tumbuh kembang (pertahankan!)';
  }
}

