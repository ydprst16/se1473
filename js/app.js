/*
| SE Monitoring Center — app.js v5 (Pencacah + Pengawas)
| PERUBAHAN v5:
|    - Role Pengawas sekarang pakai progressReview
|      (Approved + Edited + Rejected + Revoked) / Assignment
|    - KPI card "Progress Approve" -> "Progress Review"
|    - Comparison (kemarin vs hari ini) ikut pakai progressReview
*/

document.addEventListener("DOMContentLoaded", init);

/* ========= Global state ========= */
let currentRole = "pencacah";
let viewedDate = null;
let viewDateFp = null;
let viewDateEnabled = new Set();

function apiURL(action, extra = {}) {
  const params = new URLSearchParams({ action, role: currentRole, ...extra });
  return "api/history.php?" + params.toString();
}
const LATEST_URL = () => apiURL("latest-raw");

/* ========= KPI config per role ========= */
const KPI_CONFIG = {
  pencacah: {
    subtitle: "Monitoring Pencacah • Kota Dumai",
    cards: [
      { id: "assignment", title: "Assignment" },
      { id: "open", title: "Open" },
      { id: "draft", title: "Draft" },
      { id: "submitted", title: "Submitted" },
      { id: "approved", title: "Approved" },
      { id: "rejected", title: "Rejected" },
      { id: "revoke", title: "Revoke" },
      { id: "progress", title: "Progress" },
    ],
    rankingTitle: "Top Progress Pencacah",
    tableTitle: "Data Enumerator",
  },
  pengawas: {
    subtitle: "Monitoring Pengawas • Kota Dumai",
    cards: [
      { id: "assignment", title: "Assignment" },
      { id: "open", title: "Open" },
      { id: "draft", title: "Draft" },
      { id: "submitted", title: "Backlog Approval", backlogColor: true },
      { id: "approved", title: "Approved" },
      { id: "rejected", title: "Rejected" },
      { id: "revoke", title: "Revoke" },
      { id: "progress", title: "Progress Review" },   // ← ganti label
    ],
    rankingTitle: "Top Progress Pengawas",
    tableTitle: "Data Pengawas",
  },
};

/* ========= Helpers ========= */
function formatDateID(d) {
  if (!d) return "-";
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return "-";
  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())} ${bulan[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toYMDinJakarta(d) {
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}
function todayYMD() { return toYMDinJakarta(new Date()); }

/* ========= Helper: ambil field progress sesuai role ========= */
function progressForRole(obj) {
  if (!obj) return 0;
  return currentRole === "pengawas"
    ? (obj.progressReview ?? 0)   // ← ganti dari progressApprove
    : (obj.progressTotal  ?? 0);
}

/* ========= Load data ========= */
async function loadByDate(date) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    viewedDate = date;
    await loadDashboard(apiURL("get", { date }));
    return;
  }
  viewedDate = null;
  try {
    const head = await fetch(LATEST_URL(), { method: "HEAD", cache: "no-store" });
    if (head.ok) { await loadDashboard(LATEST_URL()); return; }
  } catch (_) { /* fallthrough */ }
  const res = await fetch(apiURL("latest"), { cache: "no-store" });
  if (!res.ok) throw new Error(`Belum ada data ${currentRole}`);
  const p = await res.json();
  if (p.status !== "ok" || !Array.isArray(p.data))
    throw new Error(p.message || "Format tidak valid");
  if (p.source === "history" && p.date) {
    viewedDate = p.date;
    await loadDashboard(apiURL("get", { date: p.date }));
  } else {
    await loadDashboard(LATEST_URL());
  }
}

/* ========= Last Update ========= */
async function updateLastUpdate() {
  const el = document.getElementById("lastUpdate");
  if (!el) return;

  if (viewedDate) {
    try {
      const res = await fetch(apiURL("snapshot-meta", { date: viewedDate }), { cache: "no-store" });
      if (res.ok) {
        const meta = await res.json();
        if (meta.status === "ok" && meta.mtime) {
          el.textContent = formatDateID(new Date(meta.mtime)) + " (snapshot)";
          return;
        }
      }
    } catch (e) { console.warn("[lastUpdate] snapshot-meta:", e); }
    el.textContent = formatDateID(new Date(viewedDate + "T00:00:00")) + " (snapshot)";
    return;
  }

  try {
    const res = await fetch(apiURL("latest-meta"), { cache: "no-store" });
    if (res.ok) {
      const meta = await res.json();
      if (meta.status === "ok" && meta.mtime) {
        el.textContent = formatDateID(new Date(meta.mtime));
        return;
      }
    }
  } catch (e) { console.warn("[lastUpdate]:", e); }
  const t = (Dashboard && Dashboard.meta && Dashboard.meta.loadedAt) || new Date();
  el.textContent = formatDateID(t);
}

async function isLatestUpdatedToday() {
  try {
    const res = await fetch(apiURL("latest-meta"), { cache: "no-store" });
    if (!res.ok) return false;
    const meta = await res.json();
    if (meta.status !== "ok" || !meta.mtime) return false;
    return toYMDinJakarta(new Date(meta.mtime)) === todayYMD();
  } catch { return false; }
}

/* ========= Render All ========= */
async function renderAll() {
  if (!viewedDate && typeof autoSnapshotToday === "function") {
    if (await isLatestUpdatedToday()) await autoSnapshotToday();
  }
  if (typeof loadPreviousDay === "function") {
    await loadPreviousDay(viewedDate || todayYMD());
  }
  applyRoleUI();
  renderCards();
  renderProgress();
  await updateLastUpdate();
  if (typeof renderCharts === "function") renderCharts();
  if (typeof renderTable === "function") renderTable();
  if (typeof renderComparison === "function") renderComparison();
}

function applySavedTheme() {
  const html = document.documentElement;
  let theme = localStorage.getItem("theme");
  if (!theme) {
    const prefersDark = window.matchMedia
      && window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
  }
  html.setAttribute("data-bs-theme", theme);

  const btn = document.getElementById("btnDarkMode");
  if (btn) {
    btn.innerHTML = theme === "dark"
      ? `<i class="bi bi-moon"></i>`
      : `<i class="bi bi-sun"></i>`;
  }
}

async function init() {
  applySavedTheme();
  bindEvents();
  applyRoleUI();
  try {
    showLoading();
    await loadByDate(null);
    await populateViewDateOptions();
    await renderAll();
    hideLoading();
  } catch (err) {
    hideLoading();
    console.warn("[init] Data awal gagal di-load:", err);
    Swal.fire({
      icon: "info", title: "Belum ada data",
      text: "Silakan upload file JSON untuk memulai.",
      timer: 3500, showConfirmButton: false,
    });
  }
}

/* ========= Datepicker snapshot ========= */
async function populateViewDateOptions() {
  const el = document.getElementById("viewDate");
  if (!el) return;

  let dates = [];
  try {
    const res = await fetch(apiURL("list"), { cache: "no-store" });
    const j = await res.json();
    if (j && j.status === "ok" && Array.isArray(j.items)) {
      dates = j.items.map((it) => it.date);
    }
  } catch (e) {
    console.warn("[viewDate]:", e);
  }

  viewDateEnabled = new Set(dates);

  if (typeof flatpickr === "undefined") {
    console.warn("[viewDate] flatpickr belum tersedia");
    return;
  }

  if (viewDateFp) {
    viewDateFp.set("enable", dates.length ? dates : [() => false]);
    if (viewedDate) viewDateFp.setDate(viewedDate, false);
    else viewDateFp.clear(false);
    viewDateFp.redraw();
    return;
  }

  viewDateFp = flatpickr(el, {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d M Y",
    locale: (flatpickr.l10ns && flatpickr.l10ns.id) || "default",
    disableMobile: true,
    allowInput: false,
    enable: dates.length ? dates : [() => false],
    defaultDate: viewedDate || null,
    onDayCreate: function (_dObj, _dStr, _fp, dayElem) {
      if (!dayElem || !dayElem.dateObj) return;
      const d = dayElem.dateObj;
      const ymd =
        d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
      if (viewDateEnabled.has(ymd)) {
        dayElem.classList.add("has-data");
      }
    },
    onReady: function (_sd, _ds, fp) {
      if (!fp.calendarContainer.querySelector(".fp-legend")) {
        const legend = document.createElement("div");
        legend.className = "fp-legend";
        legend.innerHTML =
          '<span class="fp-dot"></span><span>Tanggal dengan data snapshot</span>';
        fp.calendarContainer.appendChild(legend);
      }
    },
    onChange: async function (selectedDates, dateStr) {
      if (!dateStr) return;
      try {
        showLoading();
        await loadByDate(dateStr);
        await renderAll();
        hideLoading();
        toast("info", `Menampilkan ${currentRole} ${dateStr}`);
      } catch (err) {
        hideLoading();
        Swal.fire({
          icon: "error",
          title: "Snapshot tidak ditemukan",
          text: `Tidak ada data ${currentRole} untuk ${dateStr}.`,
        });
        if (viewDateFp) viewDateFp.clear();
        viewedDate = null;
      }
    },
  });
}

/* ========= Apply role UI ========= */
function applyRoleUI() {
  const cfg = KPI_CONFIG[currentRole];
  const sub = document.querySelector(".logo .sub-title");
  if (sub) sub.textContent = cfg.subtitle;

  cfg.cards.forEach((c) => {
    const valueEl = document.getElementById(c.id);
    if (!valueEl) return;
    const card = valueEl.closest(".kpi-card");
    if (!card) return;
    const titleEl = card.querySelector(".kpi-title");
    if (titleEl) titleEl.textContent = c.title;
    card.dataset.backlogColor = c.backlogColor ? "1" : "0";
  });

  const rank = document.getElementById("rankingTitle");
  if (rank) rank.textContent = cfg.rankingTitle;
  const tbl = document.getElementById("tableTitle");
  if (tbl) tbl.textContent = cfg.tableTitle;

  document.querySelectorAll("[data-role-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.roleTab === currentRole);
  });
}

/* ========= KPI cards ========= */
function renderCards() {
  const s = Dashboard.summary;
  setText("assignment", formatNumber(s.assignment));
  setText("open", formatNumber(s.open));
  setText("draft", formatNumber(s.draft));
  setText("submitted", formatNumber(s.submitted));
  setText("approved", formatNumber(s.approved));
  setText("rejected", formatNumber(s.rejected));
  setText("revoke", formatNumber(s.revoked));

  const prog = progressForRole(s);      // ← role-aware
  setText("progress", prog.toFixed(2) + "%");

  applyBacklogColor(s.submitted);

  const prev = typeof Comparison !== "undefined" ? Comparison.previousSummary : null;
  renderChange("assignmentChange", s.assignment, prev ? prev.assignment : null);
  renderChange("openChange",       s.open,       prev ? prev.open : null);
  renderChange("draftChange",      s.draft,      prev ? prev.draft : null);
  renderChange("submittedChange",  s.submitted,  prev ? prev.submitted : null);
  renderChange("approvedChange",   s.approved,   prev ? prev.approved : null);
  renderChange("rejectedChange",   s.rejected,   prev ? prev.rejected : null);
  renderChange("revokeChange",     s.revoked,    prev ? prev.revoked : null);

  const prevProg = prev ? progressForRole(prev) : null;
  renderChange("progressChange", prog, prevProg, true);
}

function applyBacklogColor(count) {
  const el = document.getElementById("submitted");
  if (!el) return;
  const card = el.closest(".kpi-card");
  if (!card) return;
  el.style.color = "";
  card.classList.remove("backlog-green", "backlog-yellow", "backlog-red");
  if (card.dataset.backlogColor !== "1") return;
  let cls, color;
  if (count < 10)      { cls = "backlog-green";  color = "#22c55e"; }
  else if (count < 50) { cls = "backlog-yellow"; color = "#f59e0b"; }
  else                 { cls = "backlog-red";    color = "#ef4444"; }
  card.classList.add(cls);
  el.style.color = color;
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
  el.textContent = up
    ? isPercent ? "▲ +" + rounded.toFixed(2) + "%" : "▲ +" + formatNumber(rounded)
    : isPercent ? "▼ " + rounded.toFixed(2) + "%"  : "▼ -" + formatNumber(Math.abs(rounded));
}

function renderProgress() {
  const s = Dashboard.summary;
  const progress = progressForRole(s);       // ← role-aware
  const bar = document.getElementById("overallProgress");
  if (!bar) return;
  bar.style.width = progress + "%";
  bar.innerHTML = progress.toFixed(2) + "%";
  const txt = document.getElementById("progressText");
  if (txt) txt.innerHTML = progress.toFixed(2) + "%";
}

/* ========= Switch Role ========= */
async function switchRole(newRole) {
  if (newRole === currentRole) return;
  currentRole = newRole;
  viewedDate = null;

  applyRoleUI();
  if (viewDateFp) viewDateFp.clear(false);

  try {
    showLoading();
    await loadByDate(null);
    await populateViewDateOptions();
    await renderAll();
    hideLoading();
    toast("info", `Menampilkan data ${newRole === "pengawas" ? "Pengawas" : "Pencacah"}`);
  } catch (err) {
    hideLoading();
    if (typeof Dashboard !== "undefined") {
      Dashboard.summary = {
        assignment: 0, open: 0, draft: 0, submitted: 0,
        approved: 0, edited: 0, rejected: 0, revoked: 0,
        reviewed: 0, completed: 0, remaining: 0,
        progressTotal: 0, progressApprove: 0, progressReview: 0, progressSubmit: 0,
      };
      Dashboard.enumerators = [];
    }
    renderCards();
    renderProgress();
    if (typeof Comparison !== "undefined") {
      Comparison.previousMap = {};
      Comparison.previousSummary = null;
      Comparison.available = false;
    }
    if (typeof renderComparison === "function") renderComparison();
    if (typeof renderTable === "function") renderTable();
    if (typeof renderCharts === "function") renderCharts();
    await updateLastUpdate();
    await populateViewDateOptions();

    Swal.fire({
      icon: "info",
      title: `Belum ada data ${newRole === "pengawas" ? "Pengawas" : "Pencacah"}`,
      text: `Upload file JSON ${newRole} untuk mulai.`,
      timer: 3000, showConfirmButton: false,
    });
  }
}

/* ========= Events ========= */
function bindEvents() {
  document.querySelectorAll("[data-role-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchRole(btn.dataset.roleTab));
  });

  const viewDateEl = document.getElementById("viewDate");

  const btnViewLatest = document.getElementById("btnViewLatest");
  if (btnViewLatest)
    btnViewLatest.addEventListener("click", async () => {
      try {
        showLoading();
        if (viewDateFp) viewDateFp.clear(false);
        else if (viewDateEl) viewDateEl.value = "";
        viewedDate = null;
        await loadByDate(null);
        await renderAll();
        hideLoading();
        toast("success", "Kembali ke data terbaru");
      } catch (e) {
        hideLoading();
        Swal.fire({ icon: "error", title: "Gagal", text: e.message });
      }
    });

  const refresh = document.getElementById("btnRefresh");
  if (refresh)
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

  const btnOpen = document.getElementById("btnOpenUpload");
  if (btnOpen)
    btnOpen.addEventListener("click", async () => {
      resetUploadModal();
      new bootstrap.Modal(document.getElementById("uploadModal")).show();
    });

  bindMultiUpload();

  const btnDark = document.getElementById("btnDarkMode");
  if (btnDark) {
    btnDark.addEventListener("click", () => {
      const html = document.documentElement;
      const cur  = html.getAttribute("data-bs-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";

      html.setAttribute("data-bs-theme", next);
      localStorage.setItem("theme", next);

      btnDark.innerHTML = next === "dark"
        ? `<i class="bi bi-moon"></i>`
        : `<i class="bi bi-sun"></i>`;

      // >>> Sync semua chart ApexCharts ikut tema
      if (typeof window.onThemeChanged === "function") {
        window.onThemeChanged();
      }

      // >>> Sync Tabulator theme (opsional, kalau kamu simpan instance-nya)
      if (typeof gridTable !== "undefined" && gridTable && gridTable.redraw)      gridTable.redraw(true);
      if (typeof gridDetail !== "undefined" && gridDetail && gridDetail.redraw)   gridDetail.redraw(true);
    });
  }

  const btnFs = document.getElementById("btnFullscreen");
  if (btnFs)
    btnFs.addEventListener("click", () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
}

/* ========= Utils ========= */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function toast(icon, title) {
  if (typeof Swal === "undefined") return;
  Swal.fire({ toast: true, position: "top-end", icon, title, timer: 2500, showConfirmButton: false });
}
function showLoading() { document.body.style.cursor = "wait"; }
function hideLoading() { document.body.style.cursor = "default"; }

async function refreshSnapshotList() {
  const el = document.getElementById("snapshotList");
  if (!el) return;
  el.textContent = "memuat...";
  try {
    const res = await fetch(apiURL("list"), { cache: "no-store" });
    const j = await res.json();
    if (j.status === "ok" && Array.isArray(j.items) && j.items.length) {
      el.textContent = j.items.map((x) => x.date).join(", ");
    } else {
      el.textContent = "(belum ada snapshot)";
    }
  } catch { el.textContent = "(gagal memuat)"; }
}

/* =========================================================================
 * MULTI-FILE UPLOAD (v6)
 * - Drag & drop, multiple files
 * - Client-side JSON parse untuk preview role & tanggal
 * - Queue paralel (max 3 concurrent), progress per item
 * - Password upload divalidasi backend (bcrypt + rate limit)
 * ========================================================================= */

const MAX_BATCH = 20;
const MAX_FILE_MB = 10;
const CONCURRENCY = 3;

/** state uploader */
const uploader = {
  items: [], // {id, file, name, size, role, date, isToday, status, progress, error, response}
  running: 0,
};

function detectRoleFromDecoded(decoded) {
  if (!Array.isArray(decoded) || !decoded.length) return null;
  const first = decoded[0];
  if (!first || typeof first !== "object") return null;
  if ("isPencacah" in first) return first.isPencacah === true ? "pencacah" : "pengawas";
  if (first.roleName) {
    const rn = String(first.roleName).toLowerCase();
    if (rn.includes("pengawas")) return "pengawas";
    if (rn.includes("pencacah")) return "pencacah";
  }
  return null;
}

function extractDateFromName(name) {
  const m = String(name || "").match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function bytesFmt(b) {
  if (b == null) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024/1024).toFixed(2)} MB`;
}

function resetUploadModal() {
  uploader.items = [];
  uploader.running = 0;
  const list = document.getElementById("fileList");
  if (list) list.innerHTML = "";
  const cnt = document.getElementById("uploadCount");
  if (cnt) cnt.textContent = "0";
  const pw = document.getElementById("uploadPassword");
  if (pw) pw.value = "";
  const fi = document.getElementById("jsonFile");
  if (fi) fi.value = "";
  const btn = document.getElementById("btnUpload");
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Upload Semua'; }
  const dz = document.getElementById("dropZone");
  if (dz) dz.classList.remove("is-dragover");
}

function renderFileItem(it) {
  const badges = [];
  if (it.role === "pencacah") badges.push('<span class="fi-badge fi-badge-pencacah">pencacah</span>');
  else if (it.role === "pengawas") badges.push('<span class="fi-badge fi-badge-pengawas">pengawas</span>');
  else badges.push('<span class="fi-badge fi-badge-unknown">unknown</span>');
  if (it.date) badges.push(`<span class="fi-badge fi-badge-date">${it.date}${it.isToday ? " · hari ini" : ""}</span>`);
  if (it.error && it.status === "invalid") badges.push(`<span class="fi-badge fi-badge-error">${escHtml(it.error)}</span>`);
  badges.push(`<span class="text-secondary">${bytesFmt(it.size)}</span>`);

  const statusIcon = {
    queued:    '<i class="bi bi-hourglass-split text-secondary" title="queued"></i>',
    uploading: '<span class="spinner-border spinner-border-sm text-primary" role="status" title="uploading"></span>',
    success:   '<i class="bi bi-check-circle-fill text-success" title="success"></i>',
    failed:    '<i class="bi bi-x-circle-fill text-danger" title="failed"></i>',
    invalid:   '<i class="bi bi-exclamation-triangle-fill text-warning" title="invalid"></i>',
  }[it.status] || "";

  const removeBtn = (it.status === "queued" || it.status === "invalid")
    ? `<button type="button" class="fi-remove" data-remove="${it.id}" title="Hapus" data-testid="upload-remove-${it.id}">
         <i class="bi bi-x-lg"></i>
       </button>` : "";

  const progWidth = it.status === "success" ? 100 : (it.progress || 0);
  const progColor = it.status === "failed" ? "background: linear-gradient(90deg,#ef4444,#f97316);" : "";
  const errRow = (it.error && (it.status === "failed" || it.status === "invalid"))
    ? `<div class="fi-error-msg"><i class="bi bi-exclamation-circle"></i> ${escHtml(it.error)}</div>` : "";

  return `
    <div class="file-item" data-fileitem="${it.id}">
      <div class="fi-status">${statusIcon}</div>
      <div class="fi-name" title="${escHtml(it.name)}">${escHtml(it.name)}</div>
      <div class="fi-actions">${removeBtn}</div>
      <div class="fi-meta">${badges.join("")}</div>
      <div class="fi-progress"><div class="fi-progress-bar" style="width:${progWidth}%;${progColor}"></div></div>
      ${errRow}
    </div>`;
}

function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function refreshFileList() {
  const list = document.getElementById("fileList");
  if (!list) return;
  list.innerHTML = uploader.items.map(renderFileItem).join("");
  list.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => removeItem(btn.dataset.remove));
  });
  const cnt = document.getElementById("uploadCount");
  if (cnt) cnt.textContent = String(uploader.items.length);
}

function removeItem(id) {
  const idx = uploader.items.findIndex(x => x.id === id);
  if (idx < 0) return;
  const it = uploader.items[idx];
  if (it.status === "uploading") return;
  uploader.items.splice(idx, 1);
  refreshFileList();
}

async function readAndAnalyseFile(file) {
  return new Promise((resolve) => {
    const item = {
      id: "f" + Math.random().toString(36).slice(2, 9),
      file, name: file.name, size: file.size,
      role: null, date: null, isToday: false,
      status: "queued", progress: 0, error: null, response: null,
    };
    if (!/\.json$/i.test(file.name)) {
      item.status = "invalid"; item.error = "Ekstensi harus .json"; return resolve(item);
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      item.status = "invalid"; item.error = `Melebihi ${MAX_FILE_MB} MB`; return resolve(item);
    }
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const text = String(fr.result || "");
        if (!text.trim()) { item.status = "invalid"; item.error = "File kosong."; return resolve(item); }
        const j = JSON.parse(text);
        if (!Array.isArray(j)) { item.status = "invalid"; item.error = "JSON harus Array."; return resolve(item); }
        item.role = detectRoleFromDecoded(j);
        if (!item.role) { item.status = "invalid"; item.error = "Role tidak terdeteksi."; return resolve(item); }
        item.date = extractDateFromName(file.name) || todayYMD();
        const today = todayYMD();
        if (item.date > today) { item.status = "invalid"; item.error = "Tanggal masa depan."; return resolve(item); }
        item.isToday = (item.date === today);
        resolve(item);
      } catch (e) {
        item.status = "invalid"; item.error = "JSON tidak valid: " + (e.message || e);
        resolve(item);
      }
    };
    fr.onerror = () => { item.status = "invalid"; item.error = "Gagal baca file."; resolve(item); };
    fr.readAsText(file);
  });
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const remainingSlot = MAX_BATCH - uploader.items.length;
  if (remainingSlot <= 0) {
    Swal.fire({ icon: "warning", title: `Batas ${MAX_BATCH} file`, text: `Antrian penuh. Hapus beberapa file dulu.` });
    return;
  }
  const toAdd = files.slice(0, remainingSlot);
  if (files.length > remainingSlot) {
    Swal.fire({ icon: "info", title: "Sebagian file di-skip", text: `Hanya ${remainingSlot} dari ${files.length} yang ditambahkan (max ${MAX_BATCH}/batch).` });
  }
  const analysed = await Promise.all(toAdd.map(readAndAnalyseFile));
  uploader.items.push(...analysed);
  refreshFileList();
}

function uploadSingle(item, password) {
  return new Promise((resolve) => {
    item.status = "uploading"; item.progress = 0; item.error = null;
    refreshFileList();
    const fd = new FormData();
    fd.append("file", item.file);
    fd.append("password", password);
    const action = item.isToday ? "upload-latest" : "upload";
    if (!item.isToday) fd.append("date", item.date);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "api/history.php?action=" + action);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        item.progress = Math.round((ev.loaded / ev.total) * 95); // 95% saat upload, sisanya proses server
        refreshFileList();
      }
    };
    xhr.onload = () => {
      let j = null;
      try { j = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && j && j.status === "ok") {
        item.status = "success"; item.progress = 100; item.response = j;
        if (j.role && j.role !== item.role) item.role = j.role;
        refreshFileList();
        resolve({ ok: true });
      } else {
        item.status = "failed";
        item.error = (j && j.message) ? j.message : `HTTP ${xhr.status}`;
        refreshFileList();
        resolve({ ok: false, code: xhr.status, error: item.error });
      }
    };
    xhr.onerror = () => {
      item.status = "failed"; item.error = "Network error.";
      refreshFileList();
      resolve({ ok: false, error: item.error });
    };
    xhr.send(fd);
  });
}

async function processQueue(password) {
  const queue = uploader.items.filter(it => it.status === "queued");
  let idx = 0;
  const workers = new Array(Math.min(CONCURRENCY, queue.length)).fill(0).map(async () => {
    while (idx < queue.length) {
      const my = queue[idx++];
      await uploadSingle(my, password);
    }
  });
  await Promise.all(workers);
}

function bindMultiUpload() {
  const dz = document.getElementById("dropZone");
  const fi = document.getElementById("jsonFile");
  const pickBtn = document.getElementById("btnPickFiles");
  const pwToggle = document.getElementById("btnTogglePw");
  const btnUpload = document.getElementById("btnUpload");
  if (!dz || !fi) return;

  // Klik area drop → buka file dialog (kecuali klik tombol pilih file)
  dz.addEventListener("click", (e) => {
    if (e.target.closest("#btnPickFiles")) return;
    fi.click();
  });
  if (pickBtn) pickBtn.addEventListener("click", (e) => { e.stopPropagation(); fi.click(); });

  fi.addEventListener("change", (e) => { addFiles(e.target.files); fi.value = ""; });

  ["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    dz.classList.add("is-dragover");
  }));
  ["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, (e) => {
    e.preventDefault(); e.stopPropagation();
    if (ev === "dragleave" && dz.contains(e.relatedTarget)) return;
    dz.classList.remove("is-dragover");
  }));
  dz.addEventListener("drop", (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) addFiles(files);
  });

  if (pwToggle) pwToggle.addEventListener("click", () => {
    const inp = document.getElementById("uploadPassword");
    if (!inp) return;
    inp.type = inp.type === "password" ? "text" : "password";
    const ic = pwToggle.querySelector("i");
    if (ic) ic.className = inp.type === "password" ? "bi bi-eye" : "bi bi-eye-slash";
  });

  if (btnUpload) btnUpload.addEventListener("click", handleUploadAll);
}

async function handleUploadAll() {
  const btn = document.getElementById("btnUpload");
  const pwEl = document.getElementById("uploadPassword");
  const password = pwEl ? pwEl.value : "";
  const uploadable = uploader.items.filter(it => it.status === "queued");

  if (!uploadable.length) {
    Swal.fire({ icon: "warning", title: "Tidak ada file valid", text: "Pilih file .json dulu." });
    return;
  }
  if (!password) {
    Swal.fire({ icon: "warning", title: "Password kosong", text: "Masukkan password upload." });
    pwEl && pwEl.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengunggah...';

  await processQueue(password);

  const done = uploader.items.filter(it => it.status === "success");
  const fail = uploader.items.filter(it => it.status === "failed");
  const skipped = uploader.items.filter(it => it.status === "invalid");

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Upload Semua';

  // Deteksi rate limit / password salah
  const wrongPw = fail.find(x => (x.error || "").toLowerCase().includes("password"));
  const rateLim = fail.find(x => (x.error || "").toLowerCase().includes("percobaan") || (x.error || "").toLowerCase().includes("rate"));

  if (wrongPw && done.length === 0) {
    Swal.fire({ icon: "error", title: "Password salah", text: wrongPw.error });
    pwEl && pwEl.focus();
    return;
  }
  if (rateLim && done.length === 0) {
    Swal.fire({ icon: "error", title: "Terlalu banyak percobaan", text: rateLim.error });
    return;
  }

  // Refresh dashboard jika ada yang sukses
  if (done.length) {
    // Pilih role paling sering muncul di batch sukses untuk switch tampilan
    const roleCount = {};
    done.forEach(x => { const r = (x.response && x.response.role) || x.role; if (r) roleCount[r] = (roleCount[r]||0)+1; });
    const dominantRole = Object.keys(roleCount).sort((a,b) => roleCount[b]-roleCount[a])[0] || currentRole;
    const hasTodayUpload = done.some(x => x.isToday);

    if (dominantRole !== currentRole) currentRole = dominantRole;
    if (hasTodayUpload) {
      viewedDate = null;
      if (viewDateFp) viewDateFp.clear(false);
      else {
        const vde = document.getElementById("viewDate");
        if (vde) vde.value = "";
      }
    }

    try {
      showLoading();
      applyRoleUI();
      await loadByDate(viewedDate);
      await populateViewDateOptions();
      await renderAll();
      hideLoading();
    } catch (e) {
      hideLoading();
    }
  }

  // Summary alert
  const html = `
    <div class="text-start" style="font-size:0.9rem">
      <div><i class="bi bi-check-circle-fill text-success"></i> Sukses: <b>${done.length}</b></div>
      <div><i class="bi bi-x-circle-fill text-danger"></i> Gagal: <b>${fail.length}</b></div>
      ${skipped.length ? `<div><i class="bi bi-exclamation-triangle-fill text-warning"></i> Invalid (skip): <b>${skipped.length}</b></div>` : ""}
    </div>`;
  Swal.fire({
    icon: fail.length && !done.length ? "error" : (fail.length ? "warning" : "success"),
    title: fail.length && !done.length ? "Semua upload gagal"
          : fail.length ? "Upload sebagian sukses"
          : "Upload berhasil",
    html,
    confirmButtonText: "OK",
  }).then(() => {
    if (done.length && !fail.length && !skipped.length) {
      const modalEl = document.getElementById("uploadModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      resetUploadModal();
    }
  });
}