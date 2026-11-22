# Ucupz

Web app tanpa login untuk konversi file, memindai QR Code, dan membuat QR Code. Tema dan riwayat disimpan di browser pengguna.

## Struktur File

```
ucupzconvert/
├── index.html              ← Mengarahkan pengguna ke aplikasi
├── 404.html                ← Halaman error 404
├── manifest.json           ← PWA manifest (bisa di-install)
├── favicon.png             ← Logo dan favicon aplikasi
├── pages/
│   ├── converter.html      ← Tools konversi PDF & gambar
│   ├── scan.html           ← Pemindai QR via kamera atau gambar
│   └── qrcode.html         ← Generator QR Code
├── css/
│   ├── style.css           ← Reset, variabel, layout, sidebar, skeleton
│   └── pages.css           ← Komponen tiap halaman (dipindah dari inline)
├── js/
│   ├── config.js           ← Konstanta & konfigurasi global
│   ├── utils.js            ← Sanitasi data dan inisialisasi penyimpanan lokal
│   ├── ui.js               ← Sidebar, navbar mobile, toast, transisi halaman
│   ├── batch-processor.js  ← Proses batch gambar di halaman Convert
│   ├── history-converter.js← Riwayat konversi di halaman Convert
│   ├── svg-optimizer.js   ← Fitur SVG Optimizer di halaman Convert
│   ├── sw-register.js     ← Registrasi service worker
│   └── pages/
│       ├── converter.js    ← Logika semua tools converter
│       ├── scan.js         ← Kamera dan pemindaian QR
│       └── qrcode.js       ← Logika generator QR Code
├── vercel.json             ← Deploy config + CSP + routing 404
└── .gitignore
```

---

## Menjalankan Secara Lokal

Tidak perlu konfigurasi akun atau kredensial Google.

```bash
npm install -g serve
serve . -p 3000
```

Buka `http://localhost:3000`.

---

## Deploy ke Vercel

### 1. Push ke GitHub

```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/username/ucupzconvert.git
git push -u origin main
```

### 2. Deploy

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## Fitur

| Fitur | Keterangan |
|-------|-----------|
| 🔄 Convert | Tools PDF, gambar, dan dokumen; file diproses di browser |
| ⌗ Scan QR | Pindai QR melalui kamera atau gambar |
| 📲 QR Code | Buat QR dari URL/teks/WiFi/WA/surel, kustom warna & logo |
| 🌙 Tema | Mode gelap dan terang |
| 📦 PWA | Bisa di-install sebagai aplikasi di HP/desktop |

---

## Privasi & Keamanan

### Content Security Policy
Header CSP ketat dikonfigurasi di `vercel.json` — hanya domain yang diperlukan yang diizinkan.

### Pemrosesan lokal
Tools converter memproses file di browser. Tema dan riwayat disimpan pada `localStorage` browser, bukan pada akun/server. Menghapus data browser akan menghapus data tersebut.

### Input Sanitization
Semua input dari pengguna disanitasi sebelum disimpan:
- `sanitizeString(str, maxLen)` — hapus karakter `< > " ' \``

### localStorage Bersih
Hanya key yang terdaftar di `STORAGE_KEYS` (config.js) yang boleh ada.  
Key tidak dikenal dihapus otomatis saat halaman dibuka.

---

## Catatan Penting

> **Password PDF** — `pdf-lib` versi gratis tidak mendukung enkripsi penuh.  
> Untuk enkripsi PDF nyata, diperlukan library premium atau solusi server-side.

> **Skeleton loading** — Konten converter disembunyikan sampai JS selesai dimuat untuk pengalaman yang lebih baik di koneksi lambat.
