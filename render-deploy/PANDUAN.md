# Panduan Deploy SE2026 Monitoring Center ke Render + Supabase Storage

Panduan ini akan memandu Anda dari nol sampai aplikasi PHP Anda **online di Render** dengan data JSON tersimpan **aman di Supabase Storage** (tidak hilang saat redeploy/restart).

**Estimasi waktu: 20–30 menit**  
**Biaya: GRATIS** (Render Free + Supabase Free Tier)

---

## 📦 Struktur Folder Final

Project Anda di GitHub harus seperti ini:

```
your-repo/
├── Dockerfile                ← dari sini (BARU)
├── render.yaml               ← dari sini (BARU)
├── .htaccess                 ← dari sini (BARU)
├── .gitignore                ← dari sini (BARU)
├── .env.example              ← dari sini (BARU)
├── index.php                 ← punya Anda (TIDAK BERUBAH)
├── app.js                    ← punya Anda (TIDAK BERUBAH)
├── charts.js                 ← punya Anda (TIDAK BERUBAH)
├── comparison.js             ← punya Anda (TIDAK BERUBAH)
├── processor.js              ← punya Anda (TIDAK BERUBAH)
├── api/
│   └── history.php           ← dari sini (BARU – versi Supabase)
└── data/
    └── history/
        └── .gitkeep          ← folder kosong (untuk kompatibilitas)
```

> ✅ **Bagusnya:** file frontend Anda (`app.js`, `charts.js`, dll) **tidak perlu diubah sama sekali**. Hanya backend (`api/history.php`) yang diganti dengan versi Supabase. URL `data/latest.json` otomatis di-rewrite oleh `.htaccess` ke Supabase.

---

## 🚀 LANGKAH 1: Buat Akun & Project Supabase

### 1.1 Daftar Supabase
1. Buka https://supabase.com → klik **Start your project**
2. Login pakai **GitHub** (gratis, tanpa kartu kredit)

### 1.2 Buat Project Baru
1. Klik **New Project**
2. Isi:
   - **Name**: `se2026-monitoring` (bebas)
   - **Database Password**: buat password kuat (simpan baik-baik, walau tidak akan dipakai untuk Storage)
   - **Region**: pilih `Southeast Asia (Singapore)` (paling dekat dari Indonesia)
   - **Pricing Plan**: **Free**
3. Klik **Create new project** → tunggu 1–2 menit sampai project siap

### 1.3 Buat Storage Bucket
1. Di sidebar kiri, klik ikon **Storage** (folder)
2. Klik **New bucket**
3. Isi:
   - **Name**: `se-monitoring`  ⚠️ (HARUS persis sama dengan ini, atau samakan dengan `SUPABASE_BUCKET` di Render)
   - **Public bucket**: **JANGAN dicentang** (biarkan private — akses lewat service key saja)
4. Klik **Create bucket**

### 1.4 Ambil API Keys
1. Di sidebar kiri, klik ikon **Settings** (gerigi) → **API**
2. Catat 2 nilai ini:
   - **Project URL** → contoh: `https://abcdefghijklmn.supabase.co`
   - **service_role secret** → klik **Reveal** → copy nilai `eyJhbGc...` yang panjang
   
   ⚠️ **PENTING**: Gunakan **service_role** (bukan `anon`), karena service_role bisa bypass RLS dan punya akses penuh ke bucket dari backend. **JANGAN PERNAH** taruh service_role key di frontend / JavaScript / commit ke git.

---

## 🐙 LANGKAH 2: Siapkan Repository GitHub

### 2.1 Buat Repository Baru
1. Buka https://github.com → klik **New repository**
2. Nama: `se2026-monitoring` (bebas)
3. Pilih **Private** (rekomendasi)
4. Klik **Create repository**

### 2.2 Upload Semua File
Ada 2 cara:

#### Cara A: Pakai GitHub Web (paling gampang)
1. Di repo baru, klik **uploading an existing file**
2. Drag & drop **semua file** dari folder `render-deploy/` ini, plus file `index.php`, `app.js`, `charts.js`, `comparison.js`, `processor.js` punya Anda
3. Pastikan struktur folder benar (api/history.php harus di dalam folder `api/`)
4. Commit message: "Initial deploy setup"
5. Klik **Commit changes**

#### Cara B: Pakai Git CLI
```bash
git clone https://github.com/USERNAME/se2026-monitoring.git
cd se2026-monitoring

# Copy file-file dari folder render-deploy ke sini
# Lalu copy file frontend Anda (index.php, app.js, dll) ke sini juga

git add .
git commit -m "Initial deploy setup"
git push origin main
```

---

## 🎨 LANGKAH 3: Deploy ke Render

### 3.1 Daftar Render
1. Buka https://render.com → **Get Started for Free**
2. Login pakai **GitHub** (autorize akses repo)

### 3.2 Buat Web Service Baru
1. Klik **New +** (pojok kanan atas) → **Web Service**
2. Pilih **Build and deploy from a Git repository** → **Next**
3. Connect ke GitHub, pilih repo `se2026-monitoring`
4. Klik **Connect**

### 3.3 Konfigurasi Service
Render akan auto-detect `render.yaml` dan mengisi banyak hal otomatis. Pastikan:

| Field | Nilai |
|---|---|
| **Name** | `se2026-monitoring` (atau bebas) |
| **Region** | Singapore |
| **Branch** | `main` |
| **Runtime** | `Docker` |
| **Dockerfile Path** | `./Dockerfile` |
| **Instance Type** | **Free** |

### 3.4 Set Environment Variables (PENTING!)
Scroll ke bagian **Environment Variables** → klik **Add Environment Variable**:

| Key | Value |
|---|---|
| `SUPABASE_URL` | `https://abcdefghijklmn.supabase.co` *(dari langkah 1.4)* |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` (service_role key dari langkah 1.4) |
| `SUPABASE_BUCKET` | `se-monitoring` |
| `PORT` | `10000` |

> ⚠️ Pastikan `SUPABASE_SERVICE_KEY` ditandai sebagai **secret** (biasanya otomatis di Render). Jangan typo!

### 3.5 Deploy
1. Klik **Create Web Service**
2. Render akan mulai build Docker image (3–7 menit pertama kali)
3. Tunggu sampai status **Live** 🟢
4. URL aplikasi: `https://se2026-monitoring.onrender.com` (atau yang Render kasih)

---

## ✅ LANGKAH 4: Tes Aplikasi

### 4.1 Buka URL Render
Klik link URL di dashboard Render. Anda akan lihat dashboard SE2026.

Pertama kali, akan ada warning "Belum ada data" — wajar, karena Supabase Storage masih kosong.

### 4.2 Upload File JSON Pertama
1. Klik tombol **Upload** di dashboard
2. Pilih file JSON Anda
3. Pilih tanggal (default hari ini)
4. Klik **Upload**
5. Dashboard akan refresh otomatis menampilkan data

### 4.3 Verifikasi di Supabase
1. Buka Supabase → Storage → bucket `se-monitoring`
2. Anda akan lihat:
   - `latest.json` (file paling baru)
   - `history/2025-01-XX.json` (snapshot harian)

### 4.4 Tes Data Tetap Ada Setelah Restart
1. Di Render dashboard → **Manual Deploy** → **Clear build cache & deploy**
2. Tunggu deploy selesai
3. Buka URL aplikasi lagi → **data masih ada** ✅

---

## ⚙️ LANGKAH 5: Tips & Catatan Penting

### Free Tier Render: Cold Start
- Aplikasi akan "tidur" setelah **15 menit tidak ada traffic**
- Akses pertama setelah tidur: lambat ~30–60 detik (bukan error, tunggu saja)
- Setelah aktif, akses berikutnya normal

**Solusi gratis (opsional):** pakai https://uptimerobot.com untuk ping aplikasi setiap 5 menit (gratis 50 monitor). Tapi hati-hati — Render Free terbatas **750 jam/bulan** per akun, jadi kalau hanya 1 service ini, tidak masalah.

### Supabase Free Tier Limits
| Resource | Limit Free Tier |
|---|---|
| Storage | 1 GB |
| Bandwidth | 5 GB/bulan |
| Project pause | Setelah 7 hari tidak ada aktivitas |

**Project pause:** kalau project tidak diakses 7 hari, Supabase akan pause. **Data TIDAK hilang**, cukup login ke Supabase dashboard dan klik **Restore** → langsung aktif lagi dalam beberapa detik. Selama ada traffic ke aplikasi (request ke bucket), project tidak akan pause.

### Estimasi Kapasitas
- File JSON SE2026 ~50–200 KB per snapshot
- 1 GB / 100 KB = **~10.000 snapshot harian** (cukup untuk **27+ tahun** data harian!)

### Update Kode di Production
Setiap kali Anda push commit ke GitHub branch `main`, Render akan **otomatis re-deploy**. Tidak perlu klik apa-apa di Render. Data di Supabase tetap aman (terpisah dari deployment).

---

## 🐛 Troubleshooting

### Error: "Supabase belum dikonfigurasi"
→ Cek environment variables di Render dashboard. Pastikan `SUPABASE_URL` dan `SUPABASE_SERVICE_KEY` terisi. Setelah edit env var, Render akan auto-restart service.

### Error: "Upload gagal: bucket not found"
→ Cek nama bucket di Supabase **sama persis** dengan `SUPABASE_BUCKET` env var (case-sensitive!). Default: `se-monitoring`.

### Dashboard kosong / "Belum ada data"
→ Wajar saat pertama kali. Upload file JSON via tombol Upload di dashboard.

### "data/latest.json 404 Not Found"
→ Cek file `.htaccess` ada di root project dan `mod_rewrite` aktif (sudah otomatis di Dockerfile).

### Build Docker gagal
→ Cek log build di Render dashboard tab **Logs**. Biasanya error karena syntax di Dockerfile atau permissions.

### Build sukses tapi 500 Internal Server Error
→ Cek **Runtime Logs** di Render. Kalau error PHP, biasanya extension curl belum ke-install. Sudah ditangani di Dockerfile ini, tapi kalau bermasalah:
```bash
# Tambahkan ke Dockerfile sebelum baris CMD:
RUN docker-php-ext-install curl
```

### File JSON terupload tapi tidak muncul di dashboard
→ Cek browser console (F12 → Console). Biasanya CORS atau format JSON salah. File harus berupa **Array of objects** (lihat `processor.js`).

---

## 🎁 Bonus: Custom Domain

Render Free mendukung custom domain dengan SSL gratis:
1. Di service dashboard → **Settings** → **Custom Domains**
2. Klik **Add Custom Domain** → masukkan domain Anda (mis: `monitoring.example.com`)
3. Render akan kasih CNAME record → tambahkan di DNS provider Anda
4. Tunggu 5–30 menit → SSL auto-aktif

---

## 📞 Butuh Bantuan?

Kalau ada error spesifik, copy pesan error dari **Logs** Render atau **Console** browser dan share kembali — saya akan bantu fix.

Selamat deploy! 🚀
