# 📊 SE2026 Monitoring Center

Dashboard Monitoring Progress **SE2026 Kota Dumai** untuk memantau progres pekerjaan **PPL (Pencacah)** dan **PML (Pengawas)** berdasarkan file JSON hasil export aplikasi **FASIH**.

Dashboard mendukung monitoring **real-time**, **snapshot harian**, **perbandingan progres**, **ranking petugas**, **ranking kecamatan**, serta analisis perkembangan pekerjaan dari hari ke hari.

---

# ✨ Fitur

- 📈 Monitoring Progress PPL
- 👨‍💼 Monitoring Progress PML
- 📊 KPI Dashboard
- 🏆 Ranking Progress Petugas
- 🗺️ Ranking Progress Kecamatan
- 🥧 Status Distribution
- 📉 Progress Distribution
- ⭐ Top Performer
- 📉 Bottom Performer
- 📅 Daily Comparison
- 💾 Snapshot History
- 📤 Upload JSON langsung melalui Dashboard
- ☁️ Penyimpanan data menggunakan Supabase Storage
- 🔄 Role-aware Dashboard (PPL & PML)

---

# 🛠️ Teknologi

| Teknologi | Fungsi |
|-----------|--------|
| PHP | Backend API |
| JavaScript | Business Logic |
| Bootstrap 5 | User Interface |
| ApexCharts | Visualisasi Grafik |
| Tabulator | Data Grid |
| SweetAlert2 | Dialog & Notification |
| Supabase Storage | Penyimpanan File JSON |
| JSON | Sumber Data |

---

# 📁 Struktur Project

```text
project/
│
├── api/
│   └── history.php
│
├── js/
│   ├── app.js
│   ├── processor.js
│   ├── charts.js
│   ├── comparison.js
│   ├── helper.js
│   └── table.js
│
├── assets/
│
├── index.php
│
└── README.md
```

---

# 🏗️ Arsitektur Sistem

```text
                JSON Export FASIH
                       │
                       ▼
                Upload Dashboard
                 (history.php)
                       │
                       ▼
              Supabase Storage
                       │
      ┌────────────────┴────────────────┐
      ▼                                 ▼
 latest.json                 latest_pengawas.json
      │                                 │
 history/                    history_pengawas/
      │                                 │
      └────────────────┬────────────────┘
                       ▼
                 processor.js
                       │
      ├── Process Enumerator
      ├── Calculate Summary
      ├── Build District
      ├── Build Ranking
      ├── Build Distribution
      ├── Build Comparison
      └── Dashboard Object
                       │
                       ▼
                    app.js
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
   KPI Dashboard    Charts          Tables
```

---

# ☁️ Supabase Storage

Dashboard menggunakan **Supabase Storage** sebagai media penyimpanan seluruh file JSON.

## Struktur Bucket

```text
Bucket : data

latest.json
latest_pengawas.json

history/
    2026-07-01.json
    2026-07-02.json
    ...

history_pengawas/
    2026-07-01.json
    2026-07-02.json
    ...
```

## Keterangan

| File | Fungsi |
|------|--------|
| latest.json | Data terbaru PPL |
| latest_pengawas.json | Data terbaru PML |
| history/*.json | Snapshot harian PPL |
| history_pengawas/*.json | Snapshot harian PML |

---

# ⚙️ Environment

Konfigurasikan environment berikut.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_BUCKET=data
```

---

# 📥 Upload Data

Upload dilakukan melalui

```text
api/history.php
```

Flow upload

```text
Upload JSON
      │
      ▼
history.php
      │
      ▼
Deteksi Role
      │
      ├─────────────┐
      ▼             ▼
    PPL            PML
      │             │
      ▼             ▼
 latest.json   latest_pengawas.json
      │             │
      ▼             ▼
 history/    history_pengawas/
```

Setiap upload akan:

- Mengidentifikasi role otomatis
- Menyimpan file terbaru
- Membuat snapshot harian
- Menyediakan data untuk Dashboard

---

# ⚙️ Alur Pengolahan Data

```text
Raw JSON
    │
    ▼
processor.js
    │
    ├── Process Enumerator
    ├── Process Region
    ├── Calculate Summary
    ├── Calculate Progress
    ├── Ranking
    ├── Distribution
    ├── Search Index
    └── Dashboard Object
              │
              ▼
app.js
              │
      ├── KPI
      ├── Charts
      ├── Tables
      └── Comparison
```

---

# 📈 Perhitungan Progress

Seluruh perhitungan utama dilakukan pada

```text
processor.js
```

---

## Status yang dihitung

Dashboard menghitung seluruh status berikut.

| Status | Keterangan |
|---------|------------|
| Assignment | Total Assignment |
| Open | Belum dikerjakan |
| Draft | Draft |
| Submitted | Sudah dikirim |
| Approved | Disetujui |
| Edited | Diedit |
| Rejected | Ditolak |
| Revoked | Dicabut |

Status **Edited** merupakan gabungan dari:

- EDITED BY Pengawas
- EDITED BY Admin Kabupaten

---

# 👨‍💼 Progress PPL (Pencacah)

Menggunakan field

```text
progressTotal
```

### Rumus

```text
Progress =
(
Submitted
+ Approved
+ Edited
+ Rejected
+ Revoked
)
/ Assignment × 100%
```

Status dianggap selesai apabila dokumen telah:

- Submitted
- Approved
- Edited
- Rejected
- Revoked

---

# 👨‍💼 Progress PML (Pengawas)

Menggunakan field

```text
progressReview
```

### Rumus

```text
Progress =
(
Approved
+ Edited
+ Rejected
+ Revoked
)
/ Assignment × 100%
```

Status **Submitted** belum dihitung karena masih menjadi backlog review.

---

# 📊 Perhitungan Summary Dashboard

Dilakukan pada

```text
processor.js
```

Summary Dashboard menghasilkan:

- Assignment
- Open
- Draft
- Submitted
- Approved
- Edited
- Rejected
- Revoked

Kemudian dihitung:

## Reviewed

```text
Reviewed =
Approved
+ Edited
+ Rejected
+ Revoked
```

## Completed

```text
Completed =
Submitted
+ Reviewed
```

## Progress Submit

```text
Submitted
÷ Assignment ×100%
```

## Progress Approve

```text
Approved
÷ Assignment ×100%
```

## Progress Review

```text
Reviewed
÷ Assignment ×100%
```

## Progress Total

```text
Completed
÷ Assignment ×100%
```

Summary tersebut digunakan pada:

- KPI Dashboard
- Progress Bar
- Status Donut
- Summary Cards

---

# 🏆 Ranking Progress Petugas

Perhitungan dilakukan pada

```text
processor.js
charts.js
```

## PPL

Menggunakan

```text
progressTotal
```

Menghasilkan:

- Top 10 Progress
- Bottom 10 Progress

---

## PML

Menggunakan

```text
progressReview
```

Menghasilkan:

- Top 10 Progress
- Bottom 10 Progress

---

# 🗺️ Ranking Kecamatan

Perhitungan dilakukan pada

```text
charts.js
```

Progress seluruh petugas dalam satu kecamatan dijumlahkan terlebih dahulu.

Kemudian dihitung:

### PPL

```text
progressTotal
```

### PML

```text
progressReview
```

Lalu dilakukan sorting dari progress tertinggi ke terendah.

Visualisasi menggunakan Horizontal Bar Chart.

---

# 📊 Distribution

Dashboard mengelompokkan progress petugas menjadi beberapa kategori.

```text
0 – 20%

20 – 40%

40 – 60%

60 – 80%

80 – 100%
```

Digunakan untuk:

- Progress Distribution Chart

---

# 📅 Perbandingan Harian

Perhitungan dilakukan pada

```text
comparison.js
```

Dashboard membandingkan

```text
Hari Ini

vs

Hari Sebelumnya
```

Snapshot diambil dari

```text
history/

history_pengawas/
```

---

## Rumus Progress Harian PPL

```text
(
Submitted
+ Approved
+ Edited
+ Rejected
+ Revoked
)
/ Assignment ×100%
```

---

## Rumus Progress Harian PML

```text
(
Approved
+ Edited
+ Rejected
+ Revoked
)
/ Assignment ×100%
```

---

## Delta Progress

```text
Progress Hari Ini
-
Progress Hari Sebelumnya
```

Dashboard menghasilkan:

- 🚀 Top Improvement
- 📉 Lowest Improvement
- 🏆 Top Progress
- ⚠️ Bottom Progress

---

# 📊 Dashboard Components

## KPI

- Assignment
- Open
- Draft
- Submitted / Backlog Approval
- Approved
- Rejected
- Revoked
- Progress

---

## Charts

- Status Distribution
- Ranking Progress
- Ranking Kecamatan
- Progress Distribution
- Top Performer
- Bottom Performer

---

## Comparison

- Top Progress
- Bottom Progress
- Top Improvement
- Lowest Improvement

---

## Tables

### Ringkasan Petugas

Menampilkan:

- Username
- Kecamatan
- Assignment
- Open
- Draft
- Submitted
- Approved
- Rejected
- Revoked
- Progress

---

### Detail Kecamatan

Menampilkan:

- Username
- Kecamatan
- kdsubsls
- Assignment
- Open
- Draft
- Submitted
- Approved
- Rejected
- Revoked
- Progress

---

# 🔄 Perbedaan PPL dan PML

| Komponen | PPL | PML |
|-----------|-----|------|
| Progress | progressTotal | progressReview |
| Submitted dihitung | ✅ Ya | ❌ Tidak |
| Fokus | Penyelesaian Pencacahan | Penyelesaian Review |
| Ranking | progressTotal | progressReview |
| Daily Comparison | progressTotal | progressReview |
| KPI Progress | Progress Total | Progress Review |

---

# 🚀 Cara Menjalankan

## 1. Clone Repository

```bash
git clone https://github.com/username/se2026-monitoring-center.git
```

## 2. Masuk ke Folder

```bash
cd se2026-monitoring-center
```

## 3. Konfigurasi Environment

Tambahkan konfigurasi Supabase.

## 4. Jalankan Server

Contoh:

- Apache
- XAMPP
- Laragon
- Railway

## 5. Upload JSON

Buka Dashboard kemudian upload file JSON hasil export FASIH.

---

# 📌 Catatan

- Dashboard mendukung dua role (**PPL** dan **PML**).
- Seluruh KPI, grafik, ranking, tabel, dan comparison akan berubah otomatis sesuai role yang dipilih.
- Snapshot harian digunakan sebagai dasar perhitungan comparison.
- Data disimpan di **Supabase Storage**, sehingga tidak memerlukan database relasional.
- Dashboard menggunakan file JSON sebagai sumber data utama.