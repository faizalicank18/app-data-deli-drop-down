# DELIVERY.ID — Web App Pengelolaan Data Pengiriman

## 1. Arsitektur singkat

- **Frontend**: 4 file HTML (`Index`, `Style`, `Form`, `Script`) dirender oleh `HtmlService`, digabung lewat `include()` di `Code.gs`. Tidak ada framework — vanilla JS memanggil backend lewat `google.script.run`.
- **Backend**: `Code.gs` (entry point `doGet`), `Database.gs` (semua operasi baca/tulis `SpreadsheetApp`), `Utils.gs` (kalkulasi M3/KG Volume/Chargeable, validasi, generate ID, timezone `Asia/Jakarta`).
- **Database**: 1 spreadsheet (`DELIVERY_ID_DATABASE`) dengan 9 sheet — 1 sheet transaksi, 7 sheet master, 1 sheet setting.
- **Alur data**: form dibuka → `getMasterData()` sekali panggil mengambil 6 master list + status sekaligus (bukan 6+ panggilan terpisah) → dropdown terisi. Simpan/Update/Cari masing-masing satu panggilan `google.script.run` ke `Database.gs`, yang mengunci sheet (`LockService`) sebelum menulis untuk mencegah race condition saat 2 user menyimpan bersamaan.
- **Spreadsheet ID** hanya ada di `Database.gs` (server-side) — tidak pernah dikirim ke browser.

## 2. Struktur Google Sheet

Spreadsheet: **DELIVERY_ID_DATABASE**

### Sheet `TRANSAKSI` (kolom A–AB, jangan diubah urutan/nama)
| Kolom | Header |
|---|---|
| A | ID |
| B | Tanggal |
| C | No STTB |
| D | No Manifest |
| E | Nama Customer |
| F | Tujuan |
| G | Jumlah Barang |
| H | Berat KG |
| I | Panjang CM |
| J | Lebar CM |
| K | Tinggi CM |
| L | M3 |
| M | KG Volume |
| N | Chargeable KG |
| O | Nama Kapal |
| P | Closing |
| Q | ETD |
| R | ETA |
| S | Serah Terima |
| T | Bukti Sukses |
| U | Dokumen POD |
| V | Pengiriman |
| W | Admin |
| X | Vendor |
| Y | Invoice |
| Z | Keterangan |
| AA | Created At |
| AB | Updated At |

### Sheet master (baris 1 = header, data mulai baris 2)
- `MASTER_CUSTOMER` → `ID | CUSTOMER | AKTIF`
- `MASTER_TUJUAN` → `ID | TUJUAN | AKTIF`
- `MASTER_KAPAL` → `ID | NAMA KAPAL | AKTIF`
- `MASTER_VENDOR` → `ID | VENDOR | AKTIF`
- `MASTER_ADMIN` → `ID | ADMIN | AKTIF`
- `MASTER_PENGIRIMAN` → `ID | JENIS PENGIRIMAN | AKTIF`
- `MASTER_STATUS` → `JENIS | STATUS`
- `MASTER_SETTING` → `KEY | VALUE` (disiapkan untuk konfigurasi masa depan, belum dipakai fungsi manapun saat ini)

Isi kolom **AKTIF** dengan `YA` atau `TIDAK` — hanya baris `YA` yang muncul di dropdown.

## 3. Cara setup

### A. Buat Spreadsheet
1. Buka Google Sheets → buat spreadsheet baru → beri nama `DELIVERY_ID_DATABASE`.
2. Buat 9 sheet sesuai nama di atas (klik `+` di kiri bawah, rename tiap sheet).
3. Isi baris header persis seperti tabel di atas pada tiap sheet.
4. Isi beberapa baris data master (misalnya 3–5 customer, 3–5 tujuan) dengan kolom AKTIF = `YA`, supaya dropdown tidak kosong saat pertama kali dites.
5. Salin **Spreadsheet ID** dari URL: `https://docs.google.com/spreadsheets/d/`**`INI_ID_NYA`**`/edit`.

### B. Buat Apps Script project
1. Di spreadsheet: menu **Extensions → Apps Script**.
2. Hapus isi `Code.gs` default, lalu buat 7 file dengan nama **persis**: `Code.gs`, `Database.gs`, `Utils.gs`, `Index.html`, `Style.html`, `Form.html`, `Script.html` (gunakan tombol `+` → Script untuk `.gs`, `+` → HTML untuk `.html`).
3. Salin isi tiap file dari prototipe ini ke file yang sesuai.
4. Di `Database.gs`, ganti:
   ```js
   var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
   ```
   dengan ID spreadsheet Anda dari langkah A.5.

### C. Deploy sebagai Web App
1. Klik **Deploy → New deployment**.
2. Pilih tipe **Web app**.
3. Isi:
   - **Execute as**: Me (akun Anda)
   - **Who has access**: sesuaikan — `Anyone within [organisasi]` untuk internal perusahaan, atau `Anyone` jika perlu diakses publik.
4. Klik **Deploy** → izinkan permission yang diminta (akses ke Google Sheets atas nama Anda).
5. Salin **Web app URL** yang muncul — itu adalah alamat aplikasi DELIVERY.ID Anda.
6. Setiap kali Anda mengubah kode, buat **New deployment** lagi (atau **Manage deployments → Edit → version New**) supaya perubahan ter-publish.

### D. Permission yang akan diminta
- Melihat dan mengelola spreadsheet Anda (untuk baca/tulis data).
- Menjalankan aplikasi web sebagai Anda sendiri.
Ini normal karena backend memakai `SpreadsheetApp` atas nama akun yang men-deploy.

## 4. Cara testing

1. Buka Web App URL → form harus tampil dengan dropdown Customer, Tujuan, Kapal, Vendor, Admin, Jenis Pengiriman terisi dari Master Sheet.
2. **Test Simpan**: isi No STTB baru (misal `08321`), Nama Customer, Tujuan, isi Panjang/Lebar/Tinggi/Berat → lihat M3/KG Volume/Chargeable KG berubah realtime → klik **Simpan** → toast "Data berhasil disimpan" → cek baris baru muncul di sheet `TRANSAKSI` dengan ID format `DEL-YYYYMMDD-0001`.
3. **Test Duplicate**: ulangi Simpan dengan No STTB yang sama → harus muncul "No STTB sudah terdaftar. Gunakan UPDATE DATA." dan **tidak** membuat baris baru.
4. **Test Cari**: masukkan No STTB yang sudah ada → klik **Cari** → form terisi otomatis dari data tersimpan.
5. **Test Update**: setelah Cari berhasil, ubah salah satu field (misal Status Invoice) → klik **Update** → toast "Data berhasil diperbarui" → cek `Updated At` berubah, `Created At` tetap, dan jumlah baris **tidak bertambah**.
6. **Test Cari — tidak ditemukan**: masukkan No STTB acak yang belum ada → klik Cari → muncul "No STTB tidak ditemukan."
7. **Test validasi**: kosongkan No STTB / Customer / Tujuan → klik Simpan → muncul pesan validasi, tidak ada penyimpanan.
8. **Test Reset**: klik Reset → semua field kembali kosong/default.
9. **Test master kosong**: kosongkan sementara isi `MASTER_CUSTOMER` → reload form → muncul pesan "Master data belum tersedia."
10. **Test responsif**: buka Web App URL di HP → layout harus 1 kolom, header sticky, tombol aksi menempel di bawah layar.

## 5. Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
|---|---|---|
| Form kosong / dropdown tidak terisi | `SPREADSHEET_ID` belum diganti, atau nama sheet salah ketik | Cek `Database.gs`, pastikan ID benar dan nama 9 sheet persis sama |
| "Gagal memuat data master" | Akun deploy tidak punya akses ke spreadsheet, atau spreadsheet dihapus/dipindah | Pastikan Execute as = akun yang punya akses edit ke spreadsheet |
| Dropdown Customer/Tujuan kosong padahal sheet ada isinya | Kolom AKTIF bukan `YA` persis (spasi/typo) | Bersihkan isi kolom AKTIF, gunakan `YA` huruf besar tanpa spasi |
| Simpan selalu bilang duplicate | Ada baris dengan No STTB sama tapi berbeda spasi/kapital | Pencarian sudah case-insensitive & trim, tapi cek manual jika ada karakter tersembunyi |
| Perubahan kode tidak muncul di Web App | Lupa membuat deployment baru | Deploy → Manage deployments → Edit → pilih "New version" |
| Error izin saat pertama deploy | Permission belum di-approve | Ikuti prompt "Review permissions" → pilih akun → Allow |
| ID transaksi loncat / tidak urut sempurna saat banyak user bersamaan | Wajar — sistem mengunci sheet (`LockService`) saat simpan sehingga aman dari duplikat ID, tapi timing antar klik tetap bisa membuat urutan angka tidak 100% berurutan jika ada baris yang dihapus manual | Hindari menghapus baris transaksi secara manual dari luar aplikasi |

## 6. Yang saya extend duluan kalau jadi Anda

1. **Halaman daftar/list transaksi** (bukan cuma cari 1-per-1) — tabel dengan filter status, customer, tanggal, supaya tim ops bisa lihat semua pengiriman aktif sekaligus.
2. **Role-based access** — bedakan Admin (bisa edit semua) vs Vendor (hanya lihat/update status miliknya), pakai `Session.getActiveUser().getEmail()` dicocokkan ke `MASTER_ADMIN`/`MASTER_VENDOR`.
3. **Upload foto Bukti Sukses & Dokumen POD** langsung dari form ke Google Drive (pakai `DriveApp`), bukan cuma status teks.
4. **Notifikasi otomatis** (email/WhatsApp API) saat status berubah jadi "SUDAH DI TERIMA" atau ETA mendekat.
5. **Export/cetak STTB** sebagai PDF langsung dari data transaksi (pakai layanan `pdf` generator).
6. **Audit log** sederhana — sheet baru yang mencatat siapa mengubah apa dan kapan, karena `Updated At` saja tidak menyimpan histori sebelumnya.

## 7. File tambahan

Tidak ada file di luar 7 yang diminta (`Code.gs`, `Database.gs`, `Utils.gs`, `Index.html`, `Style.html`, `Form.html`, `Script.html`) — semuanya cukup untuk menjalankan aplikasi ini secara utuh.
