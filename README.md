````markdown
# 📊 SE2026 Monitoring Center

Dashboard Monitoring Progress **SE2026 Kota Dumai** untuk memantau progres pekerjaan **PPL (Pencacah)** dan **PML (Pengawas)** berdasarkan file JSON hasil export aplikasi **FASIH**.

Dashboard mendukung monitoring **real-time**, **snapshot harian**, **perbandingan progres**, **ranking petugas**, serta **ranking kecamatan**.

---

# ✨ Fitur

- Monitoring Progress PPL
- Monitoring Progress PML
- KPI Dashboard
- Ranking Petugas
- Ranking Kecamatan
- Status Distribution
- Progress Distribution
- Top & Bottom Performer
- Daily Comparison
- Snapshot History
- Upload JSON langsung dari Dashboard
- Penyimpanan data menggunakan Supabase Storage

---

# 🛠️ Teknologi

| Teknologi | Keterangan |
|-----------|------------|
| PHP | Backend API |
| JavaScript | Business Logic |
| Bootstrap 5 | UI Framework |
| ApexCharts | Visualisasi Chart |
| Tabulator | Data Grid |
| SweetAlert2 | Dialog |
| Supabase Storage | Penyimpanan JSON |
| JSON | Sumber Data |

---

# 📁 Struktur Project

```
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

```
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
 history/                     history_pengawas/
        │                                 │
        └────────────────┬────────────────┘
                         ▼
                  processor.js
                         │
        ├── Summary
        ├── Progress
        ├── Ranking
        ├── Distribution
        ├── Comparison
        └── Dashboard Object
                         │
                         ▼
                     app.js
                         │
      ┌──────────────┼───────────────┐
      ▼              ▼               ▼
 Charts         Tables         KPI Dashboard
```

---

# ☁️ Supabase Storage

Project menggunakan **Supabase Storage** sebagai media penyimpanan seluruh file JSON.

## Struktur Storage

```
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

---

## Environment

Buat file `.env` atau konfigurasi server.

```env
SUPABASE_URL=https://xxxxx.supabase.co

SUPABASE_SERVICE_KEY=xxxxxxxxxxxxxxxxxxxxx

SUPABASE_BUCKET=data
```

---

# 📥 Upload Data

Upload dilakukan melalui

```
api/history.php
```

Flow upload:

```
Upload JSON
      │
      ▼
history.php
      │
      ▼
Deteksi Role
      │
      ├──────────────┐
      ▼              ▼
 PPL             PML
      │              │
      ▼              ▼
latest.json    latest_pengawas.json
      │              │
      ▼              ▼
history/    history_pengawas/
```

Setiap upload terbaru akan:

- Menimpa latest.json
- Menyimpan snapshot berdasarkan tanggal
- Otomatis tersedia untuk Dashboard

---

# 📈 Perhitungan Progress

Semua perhitungan dilakukan pada:

```
processor.js
```

---

## Status yang dihitung

Dashboard menghitung seluruh status berikut.

| Status | Keterangan |
|---------|------------|
| Assignment | Total assignment |
| Open | Belum dikerjakan |
| Draft | Draft |
| Submitted | Sudah dikirim |
| Approved | Disetujui |
| Edited | Diedit |
| Rejected | Ditolak |
| Revoked | Dicabut |

Status Edited merupakan gabungan:

- EDITED BY Pengawas
- EDITED BY Admin Kabupaten

---

# 👨‍💼 Progress PPL

Menggunakan field

```
progressTotal
```

Rumus

```
(
Submitted
+ Approved
+ Edited
+ Rejected
+ Revoked
)
/ Assignment ×100%
```

Status dianggap selesai apabila:

- Submitted
- Approved
- Edited
- Rejected
- Revoked

---

# 👨‍💼 Progress PML

Menggunakan field

```
progressReview
```

Rumus

```
(
Approved
+ Edited
+ Rejected
+ Revoked
)
/ Assignment ×100%
```

Status Submitted belum dihitung karena masih menjadi backlog review.

---

# 📊 Perhitungan Summary Dashboard

Dilakukan pada

```
processor.js
```

Summary menghasilkan:

- Assignment
- Open
- Draft
- Submitted
- Approved
- Edited
- Rejected
- Revoked

---

## Reviewed

```
Reviewed

=

Approved
+ Edited
+ Rejected
+ Revoked
```

---

## Completed

```
Completed

=

Submitted
+ Reviewed
```

---

## Progress Submit

```
Submitted

/

Assignment
```

---

## Progress Approve

```
Approved

/

Assignment
```

---

## Progress Review

```
Reviewed

/

Assignment
```

---

## Progress Total

```
Completed

/

Assignment
```

---

Nilai tersebut digunakan pada

- KPI
- Summary
- Progress Bar
- Donut Chart

---

# 🏆 Ranking Petugas

File

```
processor.js
charts.js
```

Semua petugas diurutkan berdasarkan progress.

## PPL

Menggunakan

```
progressTotal
```

Menghasilkan

- Top 10 Progress
- Bottom 10 Progress

---

## PML

Menggunakan

```
progressReview
```

Menghasilkan

- Top 10 Progress
- Bottom 10 Progress

---

# 🗺️ Ranking Kecamatan

Perhitungan dilakukan pada

```
charts.js
```

Progress seluruh petugas pada kecamatan dijumlahkan terlebih dahulu.

## PPL

```
progressTotal
```

## PML

```
progressReview
```

Kemudian dilakukan sorting secara descending.

---

# 📊 Distribution

Dashboard menghitung distribusi progress petugas ke dalam bucket berikut.

```
0 - 20%

20 - 40%

40 - 60%

60 - 80%

80 - 100%
```

Visualisasi menggunakan Bar Chart.

---

# 📅 Perbandingan Harian

Perhitungan dilakukan pada

```
comparison.js
```

Dashboard membandingkan

```
Hari Ini

vs

Hari Sebelumnya
```

Snapshot sebelumnya diambil dari

```
history/

history_pengawas/
```

---

## Rumus Progress Harian PPL

```
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

```
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

```
Progress Hari Ini

-

Progress Hari Sebelumnya
```

Dashboard menghasilkan

- Top Progress
- Bottom Progress
- Top Improvement
- Lowest Improvement

---

# 📋 Dashboard

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

Menampilkan

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

Menampilkan

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
| Submitted dihitung | ✅ | ❌ |
| Fokus | Penyelesaian Pencacahan | Penyelesaian Review |
| Ranking | progressTotal | progressReview |
| Daily Comparison | progressTotal | progressReview |
| KPI Progress | Progress Total | Progress Review |

---

# 🚀 Cara Menjalankan

1. Clone repository

```bash
git clone https://github.com/username/se2026-monitoring-center.git
```

2. Masuk ke project

```bash
cd se2026-monitoring-center
```

3. Konfigurasi environment Supabase.

4. Jalankan menggunakan Apache / XAMPP / Railway.

5. Upload file JSON dari halaman Dashboard.

---

# 📌 Catatan

- Dashboard mendukung dua role (**PPL** dan **PML**).
- Seluruh KPI, ranking, tabel, grafik, dan comparison akan berubah otomatis sesuai role.
- Snapshot harian digunakan sebagai dasar perhitungan comparison.
- Penyimpanan data sepenuhnya menggunakan Supabase Storage sehingga tidak memerlukan database relasional.
````
