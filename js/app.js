/*
| SE Monitoring Center — app.js v5 (Pencacah + Pengawas)
| PERUBAHAN v5:
|   - Role Pengawas sekarang pakai progressReview
|     (Approved + Edited + Rejected + Revoked) / Assignment
|   - KPI card "Progress Approve" -> "Progress Review"
|   - Comparison (kemarin vs hari ini) ikut pakai progressReview
*/

document.addEventListener("DOMContentLoaded", init);

/* ========= Global state ========= */
let currentRole = "pencacah";
let viewedDate = null;

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

async function init() {
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

/* ========= Dropdown snapshot ========= */
async function populateViewDateOptions() {
  const sel = document.getElementById("viewDate");
  if (!sel) return;
  try {
    const res = await fetch(apiURL("list"), { cache: "no-store" });
    const j = await res.json();
    const items = j && j.status === "ok" && Array.isArray(j.items) ? j.items : [];
    const bln = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    let html = `<option value="">— Data Terbaru —</option>`;
    items.forEach((it) => {
      const [y, m, d] = it.date.split("-");
      html += `<option value="${it.date}">${d} ${bln[parseInt(m, 10) - 1]} ${y}</option>`;
    });
    sel.innerHTML = html;
    if (viewedDate) sel.value = viewedDate;
  } catch (e) { console.warn("[viewDate]:", e); }
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
  const viewDateEl = document.getElementById("viewDate");
  if (viewDateEl) viewDateEl.value = "";

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
  if (viewDateEl) {
    viewDateEl.addEventListener("change", async (e) => {
      const d = e.target.value;
      if (!d) return;
      try {
        showLoading();
        await loadByDate(d);
        await renderAll();
        hideLoading();
        toast("info", `Menampilkan ${currentRole} ${d}`);
      } catch (err) {
        hideLoading();
        Swal.fire({ icon: "error", title: "Snapshot tidak ditemukan",
          text: `Tidak ada data ${currentRole} untuk ${d}.` });
        viewDateEl.value = "";
        viewedDate = null;
      }
    });
  }

  const btnViewLatest = document.getElementById("btnViewLatest");
  if (btnViewLatest)
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
      const fileInput = document.getElementById("jsonFile");
      const dateInput = document.getElementById("jsonDate");
      if (fileInput) fileInput.value = "";
      if (dateInput) dateInput.value = todayYMD();
      await refreshSnapshotList();
      new bootstrap.Modal(document.getElementById("uploadModal")).show();
    });

  const fileInputChange = document.getElementById("jsonFile");
  if (fileInputChange)
    fileInputChange.addEventListener("change", () => {
      const f = fileInputChange.files && fileInputChange.files[0];
      if (!f) return;
      const m = f.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) {
        const dateInput = document.getElementById("jsonDate");
        if (dateInput) dateInput.value = m[1];
      }
    });

  const btnUpload = document.getElementById("btnUpload");
  if (btnUpload)
    btnUpload.addEventListener("click", async () => {
      const fileInput = document.getElementById("jsonFile");
      const dateInput = document.getElementById("jsonDate");
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) {
        Swal.fire({ icon: "warning", title: "File belum dipilih", text: "Pilih file .json dulu" });
        return;
      }
      if (!/\.json$/i.test(file.name)) {
        Swal.fire({ icon: "warning", title: "Format salah", text: "File harus .json" });
        return;
      }

      const pickedDate = (dateInput && dateInput.value) || todayYMD();
      const today = todayYMD();
      const isToday = pickedDate === today;
      if (pickedDate > today) {
        Swal.fire({ icon: "warning", title: "Tanggal tidak valid", text: "Tidak boleh masa depan." });
        return;
      }

      try {
        btnUpload.disabled = true;
        btnUpload.innerHTML = "Mengunggah...";
        let result;
        if (isToday) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("api/history.php?action=upload-latest", { method: "POST", body: fd });
          result = await res.json();
          if (!res.ok || result.status !== "ok") throw new Error(result.message || `HTTP ${res.status}`);
        } else {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("date", pickedDate);
          const res = await fetch("api/history.php?action=upload", { method: "POST", body: fd });
          result = await res.json();
          if (!res.ok || result.status !== "ok") throw new Error(result.message || `HTTP ${res.status}`);
        }

        const detectedRole = result.role || currentRole;
        const modalEl = document.getElementById("uploadModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        showLoading();
        if (detectedRole !== currentRole) currentRole = detectedRole;
        if (isToday) {
          viewedDate = null;
          const vde = document.getElementById("viewDate");
          if (vde) vde.value = "";
        }
        applyRoleUI();
        await loadByDate(viewedDate);
        await populateViewDateOptions();
        await renderAll();
        hideLoading();
        toast("success", isToday
          ? `Upload sukses — ${detectedRole} hari ini (${pickedDate})`
          : `Snapshot ${detectedRole} ${pickedDate} tersimpan`);
      } catch (err) {
        Swal.fire({ icon: "error", title: "Upload Gagal", text: err.message });
      } finally {
        btnUpload.disabled = false;
        btnUpload.innerHTML = "Upload";
      }
    });

  const btnDark = document.getElementById("btnDarkMode");
  if (btnDark)
    btnDark.addEventListener("click", () => {
      const html = document.documentElement;
      const cur = html.getAttribute("data-bs-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      html.setAttribute("data-bs-theme", next);
      btnDark.innerHTML = next === "dark" ? `<i class="fa fa-moon"></i>` : `<i class="fa fa-sun"></i>`;
    });

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
