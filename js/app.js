/*
|--------------------------------------------------------------------------
| SE Monitoring Center
| app.js  (FULL FILE - patched)
|--------------------------------------------------------------------------
| PATCH:
|   updateLastUpdate() sekarang mengambil mtime ASLI snapshot dari Supabase
|   (action=snapshot-meta) ketika user memilih tanggal tertentu, sehingga
|   "Last Update" menampilkan jam upload sebenarnya, BUKAN 00:00 lagi.
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", init);

const LATEST_URL = "api/history.php?action=latest-raw";

/* ============================================================
   Helper: format tanggal "DD MMM YYYY HH:mm" (Bahasa Indonesia)
   ============================================================ */
function formatDateID(d) {
  if (!d) return "-";
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return "-";

  const bulan = [
    "Jan","Feb","Mar","Apr","Mei","Jun",
    "Jul","Agu","Sep","Okt","Nov","Des",
  ];
  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${pad(d.getDate())} ${bulan[d.getMonth()]} ${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/* ============================================================
   View by Date
   ============================================================ */
let viewedDate = null;

async function loadByDate(date) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    viewedDate = date;
    await loadDashboard(
      "api/history.php?action=get&date=" + encodeURIComponent(date),
    );
    return;
  }

  viewedDate = null;
  try {
    const head = await fetch(LATEST_URL, { method: "HEAD", cache: "no-store" });
    if (head.ok) {
      await loadDashboard(LATEST_URL);
      return;
    }
  } catch (_) {}

  console.warn(
    "[loadByDate] latest.json belum ada di Supabase → fallback ke snapshot terbaru",
  );
  const res = await fetch("api/history.php?action=latest", { cache: "no-store" });
  if (!res.ok) throw new Error("Belum ada data sama sekali di Supabase");
  const payload = await res.json();
  if (payload.status !== "ok" || !Array.isArray(payload.data)) {
    throw new Error(payload.message || "Format respons tidak valid");
  }
  if (payload.source === "history" && payload.date) {
    viewedDate = payload.date;
    await loadDashboard(
      "api/history.php?action=get&date=" + encodeURIComponent(payload.date),
    );
  } else {
    await loadDashboard(LATEST_URL);
  }
}

/* ============================================================
   PATCH: Update teks "Last Update"
   - mode live          : pakai mtime latest.json
   - mode tanggal       : pakai mtime SNAPSHOT yg sedang dilihat
                          (bukan hardcoded 00:00 lagi)
   ============================================================ */
async function updateLastUpdate() {
  const el = document.getElementById("lastUpdate");
  if (!el) return;

  // ===== Mode snapshot (user memilih tanggal tertentu) =====
  if (viewedDate) {
    try {
      const res = await fetch(
        "api/history.php?action=snapshot-meta&date=" +
          encodeURIComponent(viewedDate),
        { cache: "no-store" },
      );
      if (res.ok) {
        const meta = await res.json();
        if (meta.status === "ok" && meta.mtime) {
          el.textContent =
            formatDateID(new Date(meta.mtime)) + " (snapshot)";
          return;
        }
      }
    } catch (e) {
      console.warn("[lastUpdate] gagal ambil snapshot-meta:", e);
    }

    // Fallback bila mtime tidak tersedia
    el.textContent =
      formatDateID(new Date(viewedDate + "T00:00:00")) +
      " (snapshot, jam tidak tersedia)";
    return;
  }

  // ===== Mode live =====
  try {
    const res = await fetch("api/history.php?action=latest-meta", {
      cache: "no-store",
    });
    if (res.ok) {
      const meta = await res.json();
      if (meta.status === "ok" && meta.mtime) {
        el.textContent = formatDateID(new Date(meta.mtime));
        return;
      }
    }
  } catch (e) {
    console.warn("[lastUpdate] gagal ambil meta:", e);
  }

  const t =
    (Dashboard && Dashboard.meta && Dashboard.meta.loadedAt) || new Date();
  el.textContent = formatDateID(t);
}

/* ============================================================
   Konversi Date -> "YYYY-MM-DD" pada timezone Asia/Jakarta (WIB)
   ============================================================ */
function toYMDinJakarta(d) {
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

async function isLatestUpdatedToday() {
  try {
    const res = await fetch("api/history.php?action=latest-meta", {
      cache: "no-store",
    });
    if (!res.ok) return false;
    const meta = await res.json();
    if (meta.status !== "ok" || !meta.mtime) return false;

    const mtimeYMD = toYMDinJakarta(new Date(meta.mtime));
    const today    = todayYMD();
    const sameDay  = mtimeYMD === today;

    if (!sameDay) {
      console.info(
        `[snapshot-guard] latest.json mtime=${mtimeYMD}, today=${today} -> SKIP auto snapshot`,
      );
    }
    return sameDay;
  } catch (e) {
    console.warn("[snapshot-guard] gagal cek meta:", e);
    return false;
  }
}

async function renderAll() {
  if (!viewedDate && typeof autoSnapshotToday === "function") {
    if (await isLatestUpdatedToday()) {
      await autoSnapshotToday();
    }
  }

  if (typeof loadPreviousDay === "function") {
    const ref = viewedDate || todayYMD();
    await loadPreviousDay(ref);
  }

  renderCards();
  renderProgress();
  await updateLastUpdate();

  if (typeof renderCharts     === "function") renderCharts();
  if (typeof renderTable      === "function") renderTable();
  if (typeof renderComparison === "function") renderComparison();
}

async function init() {
  try {
    showLoading();
    await loadByDate(null);
    await populateViewDateOptions();
    await renderAll();
    bindEvents();
    hideLoading();
  } catch (err) {
    hideLoading();
    console.error(err);
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

async function populateViewDateOptions() {
  const sel = document.getElementById("viewDate");
  if (!sel) return;
  try {
    const res = await fetch("api/history.php?action=list", { cache: "no-store" });
    const j = await res.json();
    const items =
      j && j.status === "ok" && Array.isArray(j.items) ? j.items : [];

    const bln = [
      "Jan","Feb","Mar","Apr","Mei","Jun",
      "Jul","Agu","Sep","Okt","Nov","Des",
    ];

    let html = `<option value="">— Data Terbaru —</option>`;
    items.forEach((it) => {
      const [y, m, d] = it.date.split("-");
      const label = `${d} ${bln[parseInt(m, 10) - 1]} ${y}`;
      html += `<option value="${it.date}">${label}</option>`;
    });
    sel.innerHTML = html;
    if (viewedDate) sel.value = viewedDate;
  } catch (e) {
    console.warn("[viewDate] gagal isi dropdown:", e);
  }
}

function renderCards() {
  const s = Dashboard.summary;
  setText("assignment", formatNumber(s.assignment));
  setText("open", formatNumber(s.open));
  setText("draft", formatNumber(s.draft));
  setText("submitted", formatNumber(s.submitted));
  setText("approved", formatNumber(s.approved));
  setText("rejected", formatNumber(s.rejected));
  setText("revoke", formatNumber(s.revoked));
  setText("progress", s.progressTotal.toFixed(2) + "%");

  const prev =
    typeof Comparison !== "undefined" ? Comparison.previousSummary : null;
  renderChange("assignmentChange", s.assignment, prev ? prev.assignment : null);
  renderChange("openChange",       s.open,       prev ? prev.open       : null);
  renderChange("draftChange",      s.draft,      prev ? prev.draft      : null);
  renderChange("submittedChange",  s.submitted,  prev ? prev.submitted  : null);
  renderChange("approvedChange",   s.approved,   prev ? prev.approved   : null);
  renderChange("rejectedChange",   s.rejected,   prev ? prev.rejected   : null);
  renderChange("revokeChange",     s.revoked,    prev ? prev.revoked    : null);
  renderChange(
    "progressChange",
    s.progressTotal,
    prev ? prev.progressTotal : null,
    true,
  );
}

function renderChange(id, today, yesterday, isPercent = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (yesterday === null || typeof yesterday !== "number") {
    el.className = "kpi-change";
    el.style.color = "#9ca3af";
    el.textContent = "—";
    return;
  }
  const diff = today - yesterday;
  const rounded = isPercent ? Number(diff.toFixed(2)) : Math.round(diff);
  if (rounded === 0) {
    el.className = "kpi-change";
    el.style.color = "#9ca3af";
    el.textContent = isPercent ? "▬ 0%" : "▬ 0";
    return;
  }
  const up = rounded > 0;
  el.className = "kpi-change " + (up ? "up" : "down");
  el.style.color = up ? "#22c55e" : "#ef4444";
  if (up) {
    el.textContent = isPercent
      ? "▲ +" + rounded.toFixed(2) + "%"
      : "▲ +" + formatNumber(rounded);
  } else {
    el.textContent = isPercent
      ? "▼ " + rounded.toFixed(2) + "%"
      : "▼ -" + formatNumber(Math.abs(rounded));
  }
}

function renderProgress() {
  const progress = Dashboard.summary.progressTotal;
  const bar = document.getElementById("overallProgress");
  if (!bar) return;
  bar.style.width = progress + "%";
  bar.innerHTML = progress.toFixed(2) + "%";
  const txt = document.getElementById("progressText");
  if (txt) txt.innerHTML = progress.toFixed(2) + "%";
}

function bindEvents() {
  const viewDateEl = document.getElementById("viewDate");
  if (viewDateEl) {
    viewDateEl.addEventListener("change", async (e) => {
      const d = e.target.value;
      if (!d) return;
      try {
        showLoading();
        await loadByDate(d);
        await renderAll();
        hideLoading();
        toast("info", `Menampilkan data ${d}`);
      } catch (err) {
        hideLoading();
        Swal.fire({
          icon: "error",
          title: "Snapshot tidak ditemukan",
          text: `Tidak ada data untuk tanggal ${d}. Upload dulu file untuk tanggal tersebut.`,
        });
        viewDateEl.value = "";
        viewedDate = null;
      }
    });
  }

  const btnViewLatest = document.getElementById("btnViewLatest");
  if (btnViewLatest) {
    btnViewLatest.addEventListener("click", async () => {
      try {
        showLoading();
        if (viewDateEl) viewDateEl.value = "";
        await loadByDate(null);
        await renderAll();
        hideLoading();
        toast("success", "Kembali ke data terbaru");
      } catch (e) {
        hideLoading();
        Swal.fire({ icon: "error", title: "Gagal", text: e.message });
      }
    });
  }

  const refresh = document.getElementById("btnRefresh");
  if (refresh) {
    refresh.addEventListener("click", async () => {
      try {
        showLoading();
        await loadByDate(viewedDate);
        await renderAll();
        hideLoading();
        toast("success", "Data berhasil dimuat ulang");
      } catch (e) {
        hideLoading();
        Swal.fire({ icon: "error", title: "Gagal Refresh", text: e.message });
      }
    });
  }

  const btnOpen = document.getElementById("btnOpenUpload");
  if (btnOpen) {
    btnOpen.addEventListener("click", async () => {
      const fileInput = document.getElementById("jsonFile");
      const dateInput = document.getElementById("jsonDate");
      if (fileInput) fileInput.value = "";
      if (dateInput) dateInput.value = todayYMD();

      await refreshSnapshotList();

      const modal = new bootstrap.Modal(document.getElementById("uploadModal"));
      modal.show();
    });
  }

  const fileInputChange = document.getElementById("jsonFile");
  if (fileInputChange) {
    fileInputChange.addEventListener("change", () => {
      const f = fileInputChange.files && fileInputChange.files[0];
      if (!f) return;
      const m = f.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) {
        const dateInput = document.getElementById("jsonDate");
        if (dateInput) dateInput.value = m[1];
      }
    });
  }

  const btnUpload = document.getElementById("btnUpload");
  if (btnUpload) {
    btnUpload.addEventListener("click", async () => {
      const fileInput = document.getElementById("jsonFile");
      const dateInput = document.getElementById("jsonDate");
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) {
        Swal.fire({
          icon: "warning",
          title: "File belum dipilih",
          text: "Silakan pilih file .json terlebih dahulu",
        });
        return;
      }
      if (!/\.json$/i.test(file.name)) {
        Swal.fire({
          icon: "warning",
          title: "Format salah",
          text: "File harus berekstensi .json",
        });
        return;
      }
      const pickedDate = (dateInput && dateInput.value) || todayYMD();
      const today      = todayYMD();
      const isToday    = pickedDate === today;
      const isFuture   = pickedDate > today;

      if (isFuture) {
        Swal.fire({
          icon: "warning",
          title: "Tanggal tidak valid",
          text: "Tanggal tidak boleh di masa depan.",
        });
        return;
      }

      try {
        btnUpload.disabled = true;
        btnUpload.innerHTML = `Mengunggah...`;

        let result;
        if (isToday) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("api/history.php?action=upload-latest", {
            method: "POST",
            body: fd,
          });
          result = await res.json();
          if (!res.ok || result.status !== "ok")
            throw new Error(result.message || `HTTP ${res.status}`);
        } else {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("date", pickedDate);
          const res = await fetch("api/history.php?action=upload", {
            method: "POST",
            body: fd,
          });
          result = await res.json();
          if (!res.ok || result.status !== "ok")
            throw new Error(result.message || `HTTP ${res.status}`);
        }

        const modalEl = document.getElementById("uploadModal");
        const modal   = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        showLoading();
        if (isToday) {
          viewedDate = null;
          const viewDateEl = document.getElementById("viewDate");
          if (viewDateEl) viewDateEl.value = "";
        }
        await loadByDate(viewedDate);
        await renderAll();
        hideLoading();

        toast(
          "success",
          isToday
            ? `Upload sukses — data hari ini (${pickedDate})`
            : `Snapshot ${pickedDate} tersimpan sebagai pembanding`,
        );
      } catch (err) {
        Swal.fire({ icon: "error", title: "Upload Gagal", text: err.message });
      } finally {
        btnUpload.disabled  = false;
        btnUpload.innerHTML = "Upload";
      }
    });
  }

  const btnDark = document.getElementById("btnDarkMode");
  if (btnDark) {
    btnDark.addEventListener("click", () => {
      const html = document.documentElement;
      const cur  = html.getAttribute("data-bs-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      html.setAttribute("data-bs-theme", next);
      btnDark.innerHTML =
        next === "dark"
          ? `<i class="bi bi-moon-stars-fill"></i>`
          : `<i class="bi bi-sun-fill"></i>`;
    });
  }

  const btnFs = document.getElementById("btnFullscreen");
  if (btnFs) {
    btnFs.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function toast(icon, title) {
  if (typeof Swal === "undefined") return;
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    timer: 2500,
    showConfirmButton: false,
  });
}

function showLoading() { document.body.style.cursor = "wait"; }
function hideLoading() { document.body.style.cursor = "default"; }

function todayYMD() {
  return toYMDinJakarta(new Date());
}

async function refreshSnapshotList() {
  const el = document.getElementById("snapshotList");
  if (!el) return;
  el.textContent = "memuat...";
  try {
    const res = await fetch("api/history.php?action=list", { cache: "no-store" });
    const j = await res.json();
    if (j.status === "ok" && Array.isArray(j.items) && j.items.length) {
      el.textContent = j.items.map((x) => x.date).join(", ");
    } else {
      el.textContent = "(belum ada snapshot)";
    }
  } catch (e) {
    el.textContent = "(gagal memuat)";
  }
}
