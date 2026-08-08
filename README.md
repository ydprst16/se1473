## 1️⃣ Kenapa Progress Nasional PPL ≠ PML?

Karena **tugas** mereka berbeda, jadi **rumus** progress-nya beda:

| | **PPL (Pencacah)** | **PML (Pengawas)** |
|---|---|---|
| Tugasnya apa? | Kirim dokumen (submit) | Approve dokumen |
| Progress dihitung dari | Dokumen yang sudah **diproses** | Dokumen yang sudah **di-approve** |
| Rumus | `(submitted + approved + rejected + revoked) / assignment × 100` | `approved / assignment × 100` |
| Nama internal | `progressTotal` | `progressApprove` |

**Contoh** kalau assignment = 100:
- 30 submitted + 50 approved + 5 rejected + 5 revoked = 90
- PPL progress = 90/100 = **90%** (90 dari 100 sudah selesai dari sisi pencacah)
- PML progress = 50/100 = **50%** (baru 50 yang di-approve, 30 masih backlog)

Jadi walaupun angkanya sama, PML pasti ≤ PPL karena approve terjadi SETELAH submit.

**File pengaturan:** `js/processor.js` fungsi `calculateProgress()` dan `calculateSummary()`.

---

## 2️⃣ Card "Perbandingan Harian PPL" — Fix Judul

Ada 3 tempat yang perlu diubah agar dinamis per role:

### A. `index.php` — cari:
```html
<div class="chart-title">Perbandingan Harian PPL</div>
```
**Ganti dengan:**
```html
<div class="chart-title" id="comparisonMainTitle">Perbandingan Harian PPL</div>
```

### B. `js/comparison.js` — cari fungsi `renderComparison()`, di dalamnya ada bagian:
```js
  // Sub-judul tanggal
  const sub = document.getElementById("comparisonSubtitle");
```
**TEPAT SEBELUM baris itu, sisipkan:**
```js
  // Update judul utama & label sub sesuai role aktif
  const roleLabel = (typeof currentRole !== "undefined" && currentRole === "pengawas") ? "PML" : "PPL";
  const mainTitle = document.getElementById("comparisonMainTitle");
  if (mainTitle) mainTitle.textContent = `Perbandingan Harian ${roleLabel}`;
```

### C. `js/comparison.js` — ubah 4 title card. Cari dan ganti:

| CARI | GANTI |
|------|-------|
| `title: "TOP 5 PPL TERTINGGI",` | ``title: `TOP 5 ${roleLabel} TERTINGGI`,`` |
| `title: "TOP 5 PPL TERENDAH",` | ``title: `TOP 5 ${roleLabel} TERENDAH`,`` |

Dan cari:
```js
sub.textContent = `Hari ini vs ${Comparison.previousDate} • ${matched} dari ${Comparison.items.length} PPL cocok`;
```
**Ganti dengan:**
```js
sub.textContent = `Hari ini vs ${Comparison.previousDate} • ${matched} dari ${Comparison.items.length} ${roleLabel} cocok`;
```

*(pastikan `roleLabel` sudah dideklarasikan di atas seperti patch B)*

---

## 3️⃣ Apa itu "Backlog Approval"?

**Backlog Approval** = jumlah dokumen yang **sudah dikirim pencacah**, tapi **belum diproses pengawas** (masih menunggu di-approve/reject).

Statusnya di JSON: `"SUBMITTED BY Pencacah"` (dari sudut pandang pengawas, ini adalah **antrian kerja**).

**Kenapa penting?** 
- Kalau backlog 🟢 <10 → pengawas rajin, review cepat
- Kalau 🟡 10–50 → mulai numpuk, perlu perhatian
- Kalau 🔴 >50 → pengawas kewalahan / tidak aktif → butuh pendampingan

Jadi card ini berfungsi sebagai **KPI early-warning** untuk pengawas.

---

## 4️⃣ Detail Perhitungan Semua KPI Card

### 📋 Tabel Rumus KPI (untuk kedua role)

Semua angka dihitung **agregat nasional** = jumlah dari semua enumerator/pengawas × semua kecamatan.

| # | Card | Field JSON yang dihitung | Rumus | File |
|---|------|-------------------------|-------|------|
| 1 | **Assignment** | `user.total` per user | Σ user.total | `processor.js` `processEnumerator()` line ~517 |
| 2 | **Open** | statusBreakdown = `"OPEN"` | Σ count status OPEN | `processor.js` `processRegion()` line 571 |
| 3 | **Draft** | statusBreakdown = `"DRAFT"` | Σ count status DRAFT | `processor.js` line 573 |
| 4 | **Submitted** | statusBreakdown = `"SUBMITTED BY Pencacah"` | Σ count | `processor.js` line 575 |
| 5 | **Approved** | statusBreakdown = `"APPROVED BY Pengawas"` | Σ count | `processor.js` line 577 |
| 6 | **Rejected** | statusBreakdown = `"REJECTED BY Pengawas"` | Σ count | `processor.js` line 579 |
| 7 | **Revoke** | statusBreakdown = `"REVOKED BY Pengawas"` | Σ count | `processor.js` line 581 |
| 8 | **Progress** | Beda per role (lihat #1 di atas) | PPL: 4+5+6+7/1 × 100<br>PML: 5/1 × 100 | `processor.js` `calculateSummary()` |

### 🎨 Perbedaan Card #4 & #8 Antar Role

Yang **berubah label dan/atau warna** per role:

| Card | PPL (Pencacah) | PML (Pengawas) |
|------|----------------|----------------|
| **Submitted** (index #4) | Label: **"Submitted"** — dokumen yang sudah dikirim oleh pencacah. Warna normal. | Label: **"Backlog Approval"** — dokumen SUBMITTED yang **menunggu di-approve pengawas**. Warna 🟢🟡🔴 sesuai jumlah. |
| **Progress** (index #8) | Label: **"Progress"** — % dokumen yang sudah masuk pipeline (submitted+approved+rejected+revoked). | Label: **"Progress Approve"** — % dokumen yang sudah **di-approve** (nilai lebih ketat). |

### 📁 Lokasi Semua Pengaturan

| Yang mau diubah | File | Fungsi / Baris |
|-----------------|------|----------------|
| Label card + backlog color rules | `js/app.js` | `KPI_CONFIG` (baris ~22-52) & `applyBacklogColor()` (~325) |
| Threshold warna backlog (10/50) | `js/app.js` | `applyBacklogColor()` — ubah angka 10, 50 |
| Rumus progress per role | `js/processor.js` | `calculateProgress()` & `calculateSummary()` |
| Status yang dihitung ke Approved/Submitted | `js/processor.js` | `processRegion()` line 561-583 |
| Card ikon + warna ikon | `index.php` | Array `$cards` line ~961-969 |
| Threshold `roleName` deteksi upload | `api/history.php` | `detect_role_from_json()` line ~68 |
| Judul ranking / tabel per role | `js/app.js` | `KPI_CONFIG.pencacah.rankingTitle` dsb. |
| Path Supabase per role | `api/history.php` | `paths_for_role()` line ~51 |
| Comparison card titles (Top 5 dll) | `js/comparison.js` | `renderComparison()` — patch di atas |
| Judul "Perbandingan Harian" | `index.php` + `comparison.js` | Patch di atas |

---
