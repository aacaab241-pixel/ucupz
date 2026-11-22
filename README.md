# Ucupz

Web app tanpa login untuk konversi file, memindai QR Code, dan membuat QR Code. Tema dan riwayat disimpan di browser pengguna.

## Struktur File

```
ucupz/
├── index.html              ← Mengarahkan pengguna ke aplikasi
├── 404.html                ← Halaman error 404
├── manifest.json           ← PWA manifest (bisa di-install)
├── favicon-16.png          ← Favicon kecil
├── favicon.png             ← Favicon 32×32
├── favicon-180.png         ← Ikon Apple Touch
├── favicon-192.png         ← Ikon PWA
├── favicon-512.png         ← Logo dan ikon PWA
├── sw.js                   ← Cache offline dan pembaruan aplikasi
├── pages/
│   ├── converter.html      ← Tools konversi PDF & gambar
│   ├── scan.html           ← Pemindai QR via kamera atau gambar
│   └── qrcode.html         ← Generator QR Code
├── css/
│   ├── style.css           ← Reset, variabel, layout, sidebar, skeleton
│   └── pages.css           ← Komponen halaman
├── js/
│   └── pages/
│       ├── converter.js    ← Bundle converter, UI, riwayat, batch, dan SVG
│       ├── scan.js         ← Bundle UI dan pemindaian QR
│       └── qrcode.js       ← Bundle UI dan generator QR Code
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
Input teks yang memerlukan pembersihan menggunakan helper `sanitizeString(str, maxLen)`, yang menghapus karakter `< > " ' \``.

### localStorage Bersih
Hanya key yang terdaftar di `STORAGE_KEYS` pada bundle halaman yang boleh ada.
Key tidak dikenal dihapus otomatis saat halaman dibuka.

---

## Catatan Penting

> **Password PDF** — `pdf-lib` versi gratis tidak mendukung enkripsi penuh.  
> Untuk enkripsi PDF nyata, diperlukan library premium atau solusi server-side.

> **Skeleton loading** — Konten converter disembunyikan sampai JS selesai dimuat untuk pengalaman yang lebih baik di koneksi lambat.
