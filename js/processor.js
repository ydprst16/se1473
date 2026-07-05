/*
|--------------------------------------------------------------------------
| SE Monitoring Center
| processor.js  (v2 — Pengawas Progress Review support)
|--------------------------------------------------------------------------
| Bertugas mengubah raw JSON menjadi object Dashboard
| yang siap dipakai oleh Cards, Charts dan Grid.
|
| PERUBAHAN v2:
|   1. Menambah bucket "edited" (gabungan "EDITED BY Admin Kabupaten"
|      dan "EDITED BY Pengawas").
|   2. Progress Pengawas baru: progressReview
|      = (approved + edited + rejected + revoked) / assignment.
|   3. progressTotal (Pencacah) sekarang juga memperhitungkan edited.
|   4. buildRankings & buildDistribution sekarang role-aware
|      (memakai currentRole global dari app.js).
|--------------------------------------------------------------------------
*/

const Dashboard = {
  raw: [],

  summary: {
    assignment: 0,
    open: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    edited: 0,          // NEW
    rejected: 0,
    revoked: 0,
    reviewed: 0,        // NEW  = approved + edited + rejected + revoked
    completed: 0,       // = submitted + reviewed
    remaining: 0,
    progressSubmit: 0,
    progressApprove: 0,
    progressReview: 0,  // NEW — dipakai role Pengawas
    progressTotal: 0,   // dipakai role Pencacah
  },

  enumerators: [],
  districts: [],

  rankings: {
    topProgress: [],
    bottomProgress: [],
    topSubmit: [],
    topApprove: [],
    topReview: [],       // NEW — ranking Pengawas
    topAssignment: [],
  },

  distribution: {
    "0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0,
  },

  status: [],
  filters: { districts: [], usernames: [] },
  searchIndex: {},

  meta: {
    source: null,
    loadedAt: null,
    totalEnumerator: 0,
    totalDistrict: 0,
    version: "2.0.0",
  },
};

const STATUS_MAP = {
  OPEN: "open",
  DRAFT: "draft",
  "SUBMITTED BY Pencacah": "submitted",
  "APPROVED BY Pengawas": "approved",
  "REJECTED BY Pengawas": "rejected",
  "REVOKED BY Pengawas": "revoked",
  "EDITED BY Admin Kabupaten": "edited", // NEW
  "EDITED BY Pengawas": "edited",        // NEW
};

const PROGRESS_BUCKETS = ["0-20", "20-40", "40-60", "60-80", "80-100"];

const REGION_MAP = {
  1473010: "BUKIT KAPUR",
  1473011: "MEDANG KAMPAI",
  1473012: "SUNGAI SEMBILAN",
  1473020: "DUMAI BARAT",
  1473021: "DUMAI SELATAN",
  1473030: "DUMAI TIMUR",
  1473031: "DUMAI KOTA",
};

/* Helper: role saat ini (dari app.js) */
function getRole() {
  return typeof currentRole !== "undefined" ? currentRole : "pencacah";
}

/* Helper: pilih field progress sesuai role */
function pickProgress(item) {
  return getRole() === "pengawas"
    ? (item.progressReview ?? 0)
    : (item.progressTotal ?? 0);
}

function getStatusCount(statusBreakdown, statusName) {
  const status = statusBreakdown.find((item) => item.status === statusName);
  return status ? Number(status.count) : 0;
}

function percentage(value, total) {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

/* ==========================================================================
 | Memuat file JSON
 |========================================================================== */
async function loadDashboard(jsonFile = "data/latest.json") {
  try {
    Dashboard.meta.source = jsonFile;
    Dashboard.meta.loadedAt = new Date();

    const response = await fetch(jsonFile, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Format JSON harus berupa Array.");

    Dashboard.raw = data;
    processDashboard();
    return Dashboard;
  } catch (err) {
    console.error("Gagal memuat dashboard :", err);
    Dashboard.raw = [];
    resetDashboard();
    if (typeof Swal !== "undefined") {
      Swal.fire({ icon: "error", title: "Gagal Memuat Data", text: err.message });
    }
  }
}

/* ==========================================================================
 | Reset seluruh object dashboard
 |========================================================================== */
function resetDashboard() {
  Dashboard.summary = {
    assignment: 0, open: 0, draft: 0, submitted: 0,
    approved: 0, edited: 0, rejected: 0, revoked: 0,
    reviewed: 0, completed: 0, remaining: 0,
    progressSubmit: 0, progressApprove: 0, progressReview: 0, progressTotal: 0,
  };

  Dashboard.enumerators = [];
  Dashboard.districts = [];

  Dashboard.rankings = {
    topProgress: [], bottomProgress: [],
    topSubmit: [], topApprove: [], topReview: [], topAssignment: [],
  };

  Dashboard.distribution = { "0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0 };
  Dashboard.status = [];
  Dashboard.filters = { districts: [], usernames: [] };
  Dashboard.searchIndex = {};
  Dashboard.meta.totalEnumerator = 0;
  Dashboard.meta.totalDistrict = 0;
}

/* ==========================================================================
 | Main Processor
 |========================================================================== */
function processDashboard() {
  console.clear();
  console.time("Process Dashboard");
  resetDashboard();

  if (!Dashboard.raw || Dashboard.raw.length === 0) {
    console.warn("Dashboard.raw kosong");
    return;
  }

  Dashboard.raw.forEach((user) => processEnumerator(user));
  buildDistrict();
  calculateSummary();
  buildRankings();
  buildDistribution();
  buildStatus();
  buildFilters();
  buildSearchIndex();
  validateData();
  buildMeta();

  console.timeEnd("Process Dashboard");
  console.log("========== FINAL DASHBOARD ==========", Dashboard);
}

/* ==========================================================================
 | Build Rankings (ROLE-AWARE)
 |========================================================================== */
function buildRankings() {
  const data = [...Dashboard.enumerators];
  const role = getRole();

  const progressGetter = (x) =>
    role === "pengawas" ? (x.progressReview ?? 0) : (x.progressTotal ?? 0);

  Dashboard.rankings.topProgress = [...data]
    .sort((a, b) => progressGetter(b) - progressGetter(a))
    .slice(0, 10);

  Dashboard.rankings.bottomProgress = [...data]
    .sort((a, b) => progressGetter(a) - progressGetter(b))
    .slice(0, 10);

  Dashboard.rankings.topSubmit = [...data]
    .sort((a, b) => b.submitted - a.submitted).slice(0, 10);

  Dashboard.rankings.topApprove = [...data]
    .sort((a, b) => b.approved - a.approved).slice(0, 10);

  Dashboard.rankings.topReview = [...data]
    .sort((a, b) => b.reviewed - a.reviewed).slice(0, 10);

  Dashboard.rankings.topAssignment = [...data]
    .sort((a, b) => b.assignment - a.assignment).slice(0, 10);
}

/* ==========================================================================
 | Build Distribution (ROLE-AWARE)
 |========================================================================== */
function buildDistribution() {
  Dashboard.distribution = { "0-20": 0, "20-40": 0, "40-60": 0, "60-80": 0, "80-100": 0 };

  Dashboard.enumerators.forEach((item) => {
    const p = pickProgress(item);
    if (p < 20)      Dashboard.distribution["0-20"]++;
    else if (p < 40) Dashboard.distribution["20-40"]++;
    else if (p < 60) Dashboard.distribution["40-60"]++;
    else if (p < 80) Dashboard.distribution["60-80"]++;
    else             Dashboard.distribution["80-100"]++;
  });
}

/* ==========================================================================
 | Build Status Dataset (7 kolom)
 | Urutan: open, draft, submitted, approved, edited, rejected, revoked
 |========================================================================== */
function buildStatus() {
  const s = Dashboard.summary;
  Dashboard.status = [
    s.open, s.draft, s.submitted,
    s.approved, s.edited, s.rejected, s.revoked,
  ];
}

/* ==========================================================================
 | Build Filters
 |========================================================================== */
function buildFilters() {
  Dashboard.filters.usernames = Dashboard.enumerators
    .map((item) => item.username)
    .sort((a, b) => a.localeCompare(b));

  Dashboard.filters.districts = Dashboard.districts
    .map((item) => ({ value: item.regionCode, label: item.name ?? item.regionCode }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/* ==========================================================================
 | Build Search Index
 |========================================================================== */
function buildSearchIndex() {
  Dashboard.searchIndex = {};
  Dashboard.enumerators.forEach((item, index) => {
    Dashboard.searchIndex[item.username.toLowerCase()] = index;
  });
}

/* ==========================================================================
 | Validate
 |========================================================================== */
function validateData() {
  Dashboard.enumerators.forEach((item) => {
    if (item.assignment <= 0)             console.warn(`[${item.username}] Assignment = 0`);
    if (item.approved  > item.assignment) console.warn(`[${item.username}] Approved melebihi Assignment`);
    if (item.submitted > item.assignment) console.warn(`[${item.username}] Submitted melebihi Assignment`);
    if (item.edited    > item.assignment) console.warn(`[${item.username}] Edited melebihi Assignment`);
    if (item.reviewed  > item.assignment) console.warn(`[${item.username}] Reviewed melebihi Assignment`);
  });
}

/* ==========================================================================
 | Build Metadata
 |========================================================================== */
function buildMeta() {
  Dashboard.meta.totalEnumerator = Dashboard.enumerators.length;
  Dashboard.meta.totalDistrict   = Dashboard.districts.length;
  Dashboard.meta.generatedAt     = new Date().toISOString();
}

/* ==========================================================================
 | Process 1 User
 |========================================================================== */
function processEnumerator(user) {
  const enumerator = {
    username: user.username,
    assignment: safeNumber(user.total),

    open: 0, draft: 0, submitted: 0,
    approved: 0, edited: 0, rejected: 0, revoked: 0,
    reviewed: 0, completed: 0,

    progressSubmit: 0, progressApprove: 0,
    progressReview: 0, progressTotal: 0,

    regions: [],
  };

  Dashboard.summary.assignment += enumerator.assignment;

  user.regionSummary.forEach((region) => {
    const result = processRegion(region);
    enumerator.open       += result.open;
    enumerator.draft      += result.draft;
    enumerator.submitted  += result.submitted;
    enumerator.approved   += result.approved;
    enumerator.edited     += result.edited;
    enumerator.rejected   += result.rejected;
    enumerator.revoked    += result.revoked;
    enumerator.regions.push(result);
  });

  Dashboard.summary.open       += enumerator.open;
  Dashboard.summary.draft      += enumerator.draft;
  Dashboard.summary.submitted  += enumerator.submitted;
  Dashboard.summary.approved   += enumerator.approved;
  Dashboard.summary.edited     += enumerator.edited;
  Dashboard.summary.rejected   += enumerator.rejected;
  Dashboard.summary.revoked    += enumerator.revoked;

  calculateProgress(enumerator);
  Dashboard.enumerators.push(enumerator);
}

/* ==========================================================================
 | Process 1 Kecamatan
 |========================================================================== */
function processRegion(region) {
  return {
    kdsubsls: String(region.regionCode),
    regionCode: Number(String(region.regionCode).substring(0, 7)),
    assignment: safeNumber(region.total),
    open:      getStatusCount(region.statusBreakdown, "OPEN"),
    draft:     getStatusCount(region.statusBreakdown, "DRAFT"),
    submitted: getStatusCount(region.statusBreakdown, "SUBMITTED BY Pencacah"),
    approved:  getStatusCount(region.statusBreakdown, "APPROVED BY Pengawas"),
    rejected:  getStatusCount(region.statusBreakdown, "REJECTED BY Pengawas"),
    revoked:   getStatusCount(region.statusBreakdown, "REVOKED BY Pengawas"),
    edited:
      getStatusCount(region.statusBreakdown, "EDITED BY Admin Kabupaten") +
      getStatusCount(region.statusBreakdown, "EDITED BY Pengawas"),
  };
}

/* ==========================================================================
 | Hitung Progress Enumerator / Pengawas
 |
 | Progress Submit  = Submitted / Assignment
 | Progress Approve = Approved  / Assignment
 | Progress Review  = (Approved + Edited + Rejected + Revoked) / Assignment
 |                    → Dashboard Pengawas
 | Progress Total   = (Submitted + Approved + Edited + Rejected + Revoked)
 |                    / Assignment
 |                    → Dashboard Pencacah
 |========================================================================== */
function calculateProgress(item) {
  if (item.assignment <= 0) {
    item.progressSubmit = 0;
    item.progressApprove = 0;
    item.progressReview = 0;
    item.progressTotal = 0;
    item.reviewed = 0;
    item.completed = 0;
    return;
  }

  item.reviewed  = item.approved + item.edited + item.rejected + item.revoked;
  item.completed = item.submitted + item.reviewed;

  item.progressSubmit  = percentage(item.submitted, item.assignment);
  item.progressApprove = percentage(item.approved,  item.assignment);
  item.progressReview  = percentage(item.reviewed,  item.assignment);
  item.progressTotal   = percentage(item.completed, item.assignment);
}

/* ==========================================================================
 | Build District Summary
 |========================================================================== */
function buildDistrict() {
  const districtMap = new Map();

  Dashboard.enumerators.forEach((enumerator) => {
    enumerator.regions.forEach((region) => {
      if (!districtMap.has(region.regionCode)) {
        districtMap.set(region.regionCode, {
          regionCode: region.regionCode,
          name: REGION_MAP[region.regionCode] ?? region.regionCode,
          assignment: 0,
          open: 0, draft: 0, submitted: 0,
          approved: 0, edited: 0, rejected: 0, revoked: 0,
          reviewed: 0, completed: 0,
          progressSubmit: 0, progressApprove: 0,
          progressReview: 0, progressTotal: 0,
          enumerators: 0,
        });
      }

      const d = districtMap.get(region.regionCode);
      d.assignment += region.assignment;
      d.open       += region.open;
      d.draft      += region.draft;
      d.submitted  += region.submitted;
      d.approved   += region.approved;
      d.edited     += region.edited;
      d.rejected   += region.rejected;
      d.revoked    += region.revoked;
      d.reviewed   += region.approved + region.edited + region.rejected + region.revoked;
      d.completed  += region.submitted + region.approved + region.edited + region.rejected + region.revoked;
      d.enumerators++;
    });
  });

  Dashboard.districts = Array.from(districtMap.values());

  Dashboard.districts.forEach((d) => {
    d.progressSubmit  = percentage(d.submitted, d.assignment);
    d.progressApprove = percentage(d.approved,  d.assignment);
    d.progressReview  = percentage(d.reviewed,  d.assignment);
    d.progressTotal   = percentage(d.completed, d.assignment);
  });
}

/* ==========================================================================
 | Calculate National Summary
 |
 | PENCACAH  : progressTotal   = completed / assignment
 |             completed       = submitted + approved + edited + rejected + revoked
 |
 | PENGAWAS  : progressReview  = reviewed  / assignment
 |             reviewed        = approved + edited + rejected + revoked
 |========================================================================== */
function calculateSummary() {
  const s = Dashboard.summary;
  s.reviewed  = s.approved + s.edited + s.rejected + s.revoked;
  s.completed = s.submitted + s.reviewed;

  s.progressSubmit  = percentage(s.submitted, s.assignment);
  s.progressApprove = percentage(s.approved,  s.assignment);
  s.progressReview  = percentage(s.reviewed,  s.assignment); // dashboard Pengawas
  s.progressTotal   = percentage(s.completed, s.assignment); // dashboard Pencacah

  s.remaining = Math.max(0, s.assignment - s.completed);
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function reloadDashboard() {
  return loadDashboard(Dashboard.meta.source);
}
