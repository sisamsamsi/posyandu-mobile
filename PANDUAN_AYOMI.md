# PANDUAN PENGGUNAAN APLIKASI POSYANDU B2B: AYOMI 🌱

**AYOMI (Rawat Tumbuhnya, Jaga Tuanya)** adalah sistem cerdas Manajemen Posyandu berbasis *Software-as-a-Service* (SaaS) yang didesain agar sangat mandiri, dapat disebar bebas (distribusi lintas wilayah), dan beroperasi sepenuhnya dengan sistem isolasi data (*Multi-Tenant Workspace*). Aplikasi ini mampu mengakomodasi ribuan Posyandu berbeda di seluruh Indonesia tanpa saling campur-aduk data.

Dokumen ini disusun sebagai cetak biru ( *brief awal* ) untuk bahan presentasi, pemasaran, dan materi dasar penyusunan Buku Panduan bagi pengguna riil di lapangan.

---

## 1. STRUKTUR HIRESS & HAK AKSES SISTEM

Aplikasi ini menggunakan konsep **Ruang Kerja (Workspace)**. Bayangkan satu "Ruang Kerja" adalah satu gedung Posyandu RT/RW Anda sendiri. Untuk masuk ke ruangan tersebut, dibutuhkan kunci yang tepat.

Ada dua aktor utama di dalam aplikasi:
1. **Pionir / Ketua Posyandu:** Orang pertama yang mendeklarasikan / mendaftarkan gedung Posyandu di aplikasi. Ia yang akan memegang "Kunci Master" berupa Kode Invite.
2. **Anggota / Kader:** Tenaga bantuan yang masuk ke gedung Posyandu milik Ketua menggunakan Kode Invite.

> **PENTING [Data Isolation]:** 
> Karena sistem penyekatan data (*Data Isolation*), data balita, lansia, atau ibu hamil dari Posyandu A tidak akan pernah bisa diintip atau bocor ke Kader Posyandu B. Masing-masing terkunci rapat oleh enkripsi *Database* dan identitas Ruang Kerja.

---

## 2. ALUR PENGGUNA BARU (ONBOARDING KADER)

Alur masuk sangat modern dan tidak lagi memerlukan persetujuan manual administrator pusat (Skala Otomatis).

### Skenario A: Sebagai PIONIR / KETUA POSYANDU
Jika wilayah Anda belum pernah membuat posyandu di aplikasi AYOMI, Ketua Posyandu harus melakukan langkah berikut:
1. **Unduh & Buka** aplikasi AYOMI.
2. Ketuk tombol **"Daftar di Sini"** di halaman bawah layar Login.
3. Masukkan **Alamat Email** dan **Password** pendaftaran rintisan.
4. Setelah sukses, Anda akan menemui layar *Onboarding*.
5. Pilih Opsi: 👉 **Buat Posyandu Baru**.
6. Isi kelengkapan data (Nama Posyandu, Alamat, Wilayah). 
7. Sistem akan secara ajaib mengeluarkan **6 Digit Kode Invite (Contoh: AX92BZ)**. Catat dan bagikan kode ini melalui WhatsApp khusus kepada seluruh Kader Anda.

### Skenario B: Sebagai ANGGOTA / KADER POSYANDU
Jika Anda direkrut oleh Ketua, dan Ketua sudah memiliki Kode Invite:
1. **Unduh** mentahan APK/Aplikasi AYOMI dari panduan Ketua.
2. Buka aplikasi, dan ketuk tombol **"Daftar di Sini"**.
3. Daftarkan diri menggunakan **Email & Password Pribadi Anda sendiri**. (Tujuannya sebagai absensi siapa yang mengentri / mengetik data nanti).
4. Layar *Onboarding* akan muncul. 
5. Pilih Opsi: 👉 **Gabung Posyandu**.
6. Masukkan **6 Digit Kode Invite** pemberian Ketua.
7. Selamat! Kini HP Anda sudah sinkron 100% dan terhubung langsung ke satu "Gedung Ruang Kerja" yang sama persis dengan Ketua Posyandu Anda.

---

## 3. FITUR UTAMA & KEUNGGULAN OPERASIONAL

Aplikasi dirancang bukan sekadar sebagai pencatatan (buku KIA digital), namun memiliki mesin cerdas otomasi Rekam Medis (E-MR). Terdiri dari 3 Pila Utama:

### A. Dashboard & Statistik Pintar (Real-Time)
Setiap Ibu/Kader membuka aplikasi, Dashboard langsung menyajikan rangkuman perhitungan akurat bulan berjalan.
- Menghitung Otomatis **SKDN** (Sasaran, KMS, Datang, Naik) tanpa kalkulator manual.
- Mendeteksi balita berisiko (Stunting/Gizi Kurang) dan Lansia dengan Anomali Metabolik sejak halaman depan.

### B. Pencatatan Warga Bertingkat (Balita & Lansia)
Lupakan form lembar pendaftaran berbelit. Aplikasi ini memisahkan layanan menjadi sentra presisi.
- **Layanan Balita:** Rekam penimbangan per-bulan, sistem otomatis akan menghitung tren kurva pertumbuhan, Indeks Massa Tubuh, hingga status WHO (Z-Score Status Tinggi/Berat).
- **Layanan Lansia:** Diadaptasi untuk standar kesehatan rentan lansia. Pencatatan tensi (tekanan darah), riwayat diabetes (kolesterol/gula), disajikan rapi agar mudah dimonitor.

### C. Satu Ketukan Laporan PDF Langsung Cetak (Bebas Stres)
Fitur unggulan di mana Kader Posyandu seringkali stres menangani pembuatan rekap Excel di setiap akhir bulan:
- **Zero-Wait Reporting:** Laporan PDF yang memenuhi standar Kementerian Kesehatan (berisi list nama bermasalah, grafik pergerakan asuhan kesehatan) dirender hanya dalam 1 klik.
- Siap dikirim **Langsung Ke Puskesmas / via WhatsApp** langsung dari aplikasi tanpa perantara komputer.

---

## 4. KEAMANAN & KETAHANAN APLIKASI
- **Device Independence:** Apabila HP seorang Kader rusak, terendam, atau hilang, **TIDAK ADA SATU PUN DATA WARGA YANG HILANG**. Kader cukup *install* aplikasi AYOMI di HP pinjaman, klik **Login** (dengan email yang bersangkutan), dan pekerjanya berlanjut seolah tidak terjadi apa-apa.
- **Keamanan Lintas Sesi:** Sesi login dilindungi token, saat seseorang keluar sistem (*Log Out*), maka layar dan laci data otomatis tergembok sampai ID dimasukkan kembali.

---
Materi di atas merupakan ringkasan sistematis yang ditujukan untuk dipelajari oleh Dinas Kesehatan, Puskesmas, maupun disandingkan saat pendistribusian aplikasi (Sales Deck) kepada sasaran pemangku wilayah RT/RW. Cukup disesuaikan penambahan grafis *screenshot* saat pembuatan bukunya.
