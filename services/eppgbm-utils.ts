export const EPPGBM_HEADERS = {
  // --- IDENTITAS BALITA ---
  nik: ['nik', 'nikbalita', 'nikanak', 'nonik', 'nomorindukkependudukan'],
  nama: ['nama', 'namabalita', 'namaanak', 'namalengkap'],
  tanggal_lahir: ['tanggallahir', 'tgllahir', 'lahir'],
  jenis_kelamin: ['jeniskelamin', 'jk', 'sex', 'lp'],
  nomor_kk: ['nomorkk', 'nokk', 'kk', 'nokartukeluarga'],
  nama_ortu: ['namaortu', 'ortu', 'namaorangtua'],
  nama_ibu: ['namaibu', 'ibu', 'namaibukandung'],
  nama_ayah: ['namaayah', 'ayah'],
  nik_ortu: ['nikortu', 'nikibu', 'nikayah', 'nikorangtua'],
  no_hp_ortu: ['nohp', 'notelepon', 'nohportu', 'notelportu', 'hp', 'hportu', 'noteleponortu'],
  alamat: ['alamat', 'alamatdomisili', 'jalan'],
  rt: ['rt'],
  rw: ['rw'],
  anak_ke: ['anakke', 'anakke-'],
  usia_hamil: ['usiahamil', 'usiakehamilan', 'usiakehamilanlahir', 'usiahamilminggu'],
  bb_lahir: ['bblahir', 'beratlahir', 'bbl', 'beratbadanlahir'],
  tb_lahir: ['tblahir', 'tinggilahir', 'pbl', 'tinggibadanlahir', 'panjanglahir', 'panjangbadanlahir'],
  lingkar_kepala_lahir: ['lingkarkepalalahir', 'lklahir', 'lingkarkepalaawal'],
  kia: ['kia', 'bukukia'],
  kia_bayi_kecil: ['kiabayikecil', 'bukukiabayikecil'],
  imd: ['imd', 'inisiasimenyusudini'],
  hapus: ['hapus'],
  pindah: ['pindah'],

  // --- DATA PENGUKURAN ---
  tanggal_pengukuran: ['tanggalpengukuran', 'tglpengukuran', 'tglukur', 'tanggalukur', 'tglukurkg'],
  berat_badan: ['berat', 'beratbadan', 'bb', 'bbkg', 'beratkg', 'beratbadankg'],
  tinggi_badan: ['tinggi', 'tinggibadan', 'tb', 'tbcm', 'tinggicm', 'tinggibadancm', 'panjangbadan', 'panjangbadancm', 'pbcm'],
  lingkar_lengan: ['lila', 'lilacm', 'lingkarlengan'],
  lingkar_kepala: ['lk', 'lingkarkepala', 'lkcm', 'likacm'],
  pitting_edema: ['pittingedema', 'edema'],
  cara_pengukuran: ['carapengukuran', 'caraukur'],
  vita: ['vita', 'vitamina', 'vit_a'],
  asi_bulan_0: ['asibulan0', 'asi0'],
  asi_bulan_1: ['asibulan1', 'asi1'],
  asi_bulan_2: ['asibulan2', 'asi2'],
  asi_bulan_3: ['asibulan3', 'asi3'],
  asi_bulan_4: ['asibulan4', 'asi4'],
  asi_bulan_5: ['asibulan5', 'asi5'],
  asi_bulan_6: ['asibulan6', 'asi6'],
  kelas_ibu_balita: ['kelasibubalita', 'kelasibu'],
  mbg: ['mbg', 'pmt', 'makanantambahan'],
  catatan: ['catatan', 'keterangan']
};

export function normalizeKey(key: string): string {
  const clean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [mappedKey, synonyms] of Object.entries(EPPGBM_HEADERS)) {
    if (synonyms.includes(clean)) {
      return mappedKey;
    }
  }
  return clean;
}

export function cleanNik(val: any): string | null {
  if (val === undefined || val === null) return null;
  let strVal = String(val).trim();
  if (strVal.includes('e') || strVal.includes('E')) {
    const num = Number(val);
    if (!isNaN(num)) {
      strVal = num.toFixed(0);
    }
  }
  strVal = strVal.replace(/[^a-zA-Z0-9]/g, ''); // Keep alphanumeric
  return strVal.length === 16 ? strVal : null;
}

export function cleanGender(val: any): 'Laki-laki' | 'Perempuan' {
  const str = String(val || '').trim().toLowerCase();
  if (str.startsWith('l') || str === '1' || str === 'laki-laki' || str === 'laki') {
    return 'Laki-laki';
  }
  return 'Perempuan';
}

export function parseExcelDate(val: any): string | null {
  if (!val) return null;
  
  const formatDateLocal = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (val instanceof Date) {
    return formatDateLocal(val);
  }
  
  if (typeof val === 'number') {
    // Excel date serial number starts from 1900-01-01
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return formatDateLocal(date);
    }
  }
  
  let strVal = String(val).trim();
  const parts = strVal.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return formatDateLocal(date);
      }
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY or DD/MM/YYYY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return formatDateLocal(date);
      }
    }
  }
  
  const parsed = Date.parse(strVal);
  if (!isNaN(parsed)) {
    return formatDateLocal(new Date(parsed));
  }
  
  return null;
}
