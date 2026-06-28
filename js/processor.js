/*
|--------------------------------------------------------------------------
| SE Monitoring Center
| processor.js
|--------------------------------------------------------------------------
| Bertugas mengubah raw JSON menjadi object Dashboard
| yang siap dipakai oleh Cards, Charts dan Grid.
|--------------------------------------------------------------------------
*/

const Dashboard = {
  // Raw JSON hasil fetch
  raw: [],

  // Ringkasan nasional
  summary: {
    assignment: 0,
    open: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    revoked: 0,
    progressSubmit: 0,
    progressApprove: 0,
    progressTotal: 0,
  },

  // Data per pencacah
  enumerators: [],

  // Data agregasi per kecamatan
  districts: [],

  // Ranking
  rankings: {
    topProgress: [],
    bottomProgress: [],
    topSubmit: [],
    topApprove: [],
    topAssignment: [],
  },

  // Distribusi progress
  distribution: {
    "0-20": 0,
    "20-40": 0,
    "40-60": 0,
    "60-80": 0,
    "80-100": 0,
  },

  // Status nasional
  status: [],

  // Filter dropdown
  filters: {
    districts: [],
    usernames: [],
  },

  // Search index
  searchIndex: {},

  // Metadata
  meta: {
    source: null,
    loadedAt: null,
    totalEnumerator: 0,
    totalDistrict: 0,
    version: "1.0.0",
  },
};

const STATUS_MAP = {
  OPEN: "open",
  DRAFT: "draft",
  "SUBMITTED BY Pencacah": "submitted",
  "APPROVED BY Pengawas": "approved",
  "REJECTED BY Pengawas": "rejected",
  "REVOKED BY Pengawas": "revoked",
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

function getStatusCount(statusBreakdown, statusName) {
  const status = statusBreakdown.find((item) => item.status === statusName);

  return status ? Number(status.count) : 0;
}

function percentage(value, total) {
  if (total === 0) return 0;

  return Number(((value / total) * 100).toFixed(2));
}

/*
|--------------------------------------------------------------------------
| Memuat file JSON
|--------------------------------------------------------------------------
*/

async function loadDashboard(jsonFile = "data/latest.json") {
  try {
    Dashboard.meta.source = jsonFile;
    Dashboard.meta.loadedAt = new Date();

    const response = await fetch(jsonFile, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Format JSON harus berupa Array.");
    }

    Dashboard.raw = data;

    processDashboard();
    return Dashboard;

    console.log(
      `Dashboard berhasil dimuat (${Dashboard.raw.length} enumerator)`,
    );
  } catch (err) {
    console.error("Gagal memuat dashboard :", err);

    Dashboard.raw = [];

    resetDashboard();

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "Gagal Memuat Data",
        text: err.message,
      });
    }
  }
}

/*
|--------------------------------------------------------------------------
| Reset seluruh object dashboard
|--------------------------------------------------------------------------
*/

function resetDashboard() {
  Dashboard.summary = {
    assignment: 0,
    open: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    revoked: 0,

    progressSubmit: 0,
    progressApprove: 0,
    progressTotal: 0,
  };

  Dashboard.enumerators = [];

  Dashboard.districts = [];

  Dashboard.rankings = {
    topProgress: [],
    bottomProgress: [],
    topSubmit: [],
    topApprove: [],
    topAssignment: [],
  };

  Dashboard.distribution = {
    "0-20": 0,
    "20-40": 0,
    "40-60": 0,
    "60-80": 0,
    "80-100": 0,
  };

  Dashboard.status = [];

  Dashboard.filters = {
    districts: [],
    usernames: [],
  };

  Dashboard.searchIndex = {};

  Dashboard.meta.totalEnumerator = 0;

  Dashboard.meta.totalDistrict = 0;
}

/*
|--------------------------------------------------------------------------
| Main Processor
|--------------------------------------------------------------------------
| Alur:
| 1. Reset Dashboard
| 2. Proses Enumerator
| 3. Bangun Rekap Kecamatan
| 4. Hitung Summary
| 5. Buat Ranking
| 6. Buat Distribusi
| 7. Buat Status Chart
| 8. Buat Filter
| 9. Buat Search Index
| 10. Validasi Data
| 11. Metadata
|--------------------------------------------------------------------------
*/

function processDashboard() {
  console.clear();
  console.time("Process Dashboard");

  resetDashboard();

  if (!Dashboard.raw || Dashboard.raw.length === 0) {
    console.warn("Dashboard.raw kosong");
    return;
  }

  console.log("Raw Enumerator :", Dashboard.raw.length);

  // ==========================
  // Enumerator
  // ==========================

  Dashboard.raw.forEach((user) => {
    processEnumerator(user);
  });

  console.log("Enumerator :", Dashboard.enumerators.length);
  console.log("Summary setelah processEnumerator :", Dashboard.summary);

  // ==========================
  // District
  // ==========================

  buildDistrict();

  console.log("District :", Dashboard.districts.length);

  // ==========================
  // Summary
  // ==========================

  calculateSummary();

  console.log("Summary setelah calculateSummary :", Dashboard.summary);

  // ==========================
  // Ranking
  // ==========================

  console.log("Sebelum buildRankings :", Dashboard.rankings);

  buildRankings();

  console.log("Sesudah buildRankings :", Dashboard.rankings);

  // ==========================
  // Distribution
  // ==========================

  console.log("Sebelum buildDistribution :", Dashboard.distribution);

  buildDistribution();

  console.log("Sesudah buildDistribution :", Dashboard.distribution);

  // ==========================
  // Status
  // ==========================

  console.log("Sebelum buildStatus :", Dashboard.status);

  buildStatus();

  console.log("Sesudah buildStatus :", Dashboard.status);

  // ==========================
  // Filter
  // ==========================

  buildFilters();

  console.log("Filter :", Dashboard.filters);

  // ==========================
  // Search
  // ==========================

  buildSearchIndex();

  console.log("Search Index :", Object.keys(Dashboard.searchIndex).length);

  // ==========================
  // Meta
  // ==========================

  validateData();

  buildMeta();

  console.log("Meta :", Dashboard.meta);

  console.timeEnd("Process Dashboard");

  console.log("========== FINAL DASHBOARD ==========");
  console.log(Dashboard);
}

/*
|--------------------------------------------------------------------------
| Build Rankings
|--------------------------------------------------------------------------
*/

function buildRankings() {
  const data = [...Dashboard.enumerators];

  Dashboard.rankings.topProgress = [...data]
    .sort((a, b) => b.progressTotal - a.progressTotal)
    .slice(0, 10);

  Dashboard.rankings.bottomProgress = [...data]
    .sort((a, b) => a.progressTotal - b.progressTotal)
    .slice(0, 10);

  Dashboard.rankings.topSubmit = [...data]
    .sort((a, b) => b.submitted - a.submitted)
    .slice(0, 10);

  Dashboard.rankings.topApprove = [...data]
    .sort((a, b) => b.approved - a.approved)
    .slice(0, 10);

  Dashboard.rankings.topAssignment = [...data]
    .sort((a, b) => b.assignment - a.assignment)
    .slice(0, 10);
}

/*
|--------------------------------------------------------------------------
| Build Distribution
|--------------------------------------------------------------------------
*/

function buildDistribution() {
  Dashboard.distribution = {
    "0-20": 0,
    "20-40": 0,
    "40-60": 0,
    "60-80": 0,
    "80-100": 0,
  };

  Dashboard.enumerators.forEach((item) => {
    const p = item.progressTotal;

    if (p < 20) Dashboard.distribution["0-20"]++;
    else if (p < 40) Dashboard.distribution["20-40"]++;
    else if (p < 60) Dashboard.distribution["40-60"]++;
    else if (p < 80) Dashboard.distribution["60-80"]++;
    else Dashboard.distribution["80-100"]++;
  });
}

/*
|--------------------------------------------------------------------------
| Build Status Dataset
|--------------------------------------------------------------------------
*/

function buildStatus() {
  Dashboard.status = [
    Dashboard.summary.open,

    Dashboard.summary.draft,

    Dashboard.summary.submitted,

    Dashboard.summary.approved,

    Dashboard.summary.rejected,

    Dashboard.summary.revoked,
  ];
}

/*
|--------------------------------------------------------------------------
| Build Filters
|--------------------------------------------------------------------------
*/

function buildFilters() {
  Dashboard.filters.usernames = Dashboard.enumerators
    .map((item) => item.username)
    .sort((a, b) => a.localeCompare(b));

  Dashboard.filters.districts = Dashboard.districts
    .map((item) => ({
      value: item.regionCode,
      label: item.name ?? item.regionCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/*
|--------------------------------------------------------------------------
| Build Search Index
|--------------------------------------------------------------------------
*/

function buildSearchIndex() {
  Dashboard.searchIndex = {};

  Dashboard.enumerators.forEach((item, index) => {
    Dashboard.searchIndex[item.username.toLowerCase()] = index;
  });
}

/*
|--------------------------------------------------------------------------
| Validate Dashboard Data
|--------------------------------------------------------------------------
*/

function validateData() {
  Dashboard.enumerators.forEach((item) => {
    if (item.assignment <= 0) {
      console.warn(`[${item.username}] Assignment = 0`);
    }

    if (item.approved > item.assignment) {
      console.warn(`[${item.username}] Approved melebihi Assignment`);
    }

    if (item.submitted > item.assignment) {
      console.warn(`[${item.username}] Submitted melebihi Assignment`);
    }
  });
}

/*
|--------------------------------------------------------------------------
| Build Metadata
|--------------------------------------------------------------------------
*/

function buildMeta() {
  Dashboard.meta.totalEnumerator = Dashboard.enumerators.length;

  Dashboard.meta.totalDistrict = Dashboard.districts.length;

  Dashboard.meta.generatedAt = new Date().toISOString();
}

/*
|--------------------------------------------------------------------------
| Process 1 Enumerator
|--------------------------------------------------------------------------
*/

function processEnumerator(user) {
  const enumerator = {
    username: user.username,

    assignment: safeNumber(user.total),

    open: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    revoked: 0,

    progressSubmit: 0,
    progressApprove: 0,
    progressTotal: 0,

    regions: [],
  };

  // =============================
  // Tambahkan Assignment Nasional
  // =============================

  Dashboard.summary.assignment += enumerator.assignment;

  // =============================
  // Process setiap Kecamatan
  // =============================

  user.regionSummary.forEach((region) => {
    const result = processRegion(region);

    enumerator.open += result.open;
    enumerator.draft += result.draft;
    enumerator.submitted += result.submitted;
    enumerator.approved += result.approved;
    enumerator.rejected += result.rejected;
    enumerator.revoked += result.revoked;

    enumerator.regions.push(result);
  });

  // =============================
  // Summary Nasional
  // =============================

  Dashboard.summary.open += enumerator.open;

  Dashboard.summary.draft += enumerator.draft;

  Dashboard.summary.submitted += enumerator.submitted;

  Dashboard.summary.approved += enumerator.approved;

  Dashboard.summary.rejected += enumerator.rejected;

  Dashboard.summary.revoked += enumerator.revoked;

  // =============================
  // Hitung Progress
  // =============================

  calculateProgress(enumerator);

  Dashboard.enumerators.push(enumerator);
}

/*
|--------------------------------------------------------------------------
| Process 1 Kecamatan
|--------------------------------------------------------------------------
*/

function processRegion(region) {
  return {
    // Full kode subsls (16 digit) — dipakai Tab 2 "Detail per Kecamatan"
    kdsubsls: String(region.regionCode),

    // Truncated 7-digit untuk district mapping (REGION_MAP)
    regionCode: Number(String(region.regionCode).substring(0, 7)),

    assignment: safeNumber(region.total),

    open: getStatusCount(region.statusBreakdown, "OPEN"),

    draft: getStatusCount(region.statusBreakdown, "DRAFT"),

    submitted: getStatusCount(region.statusBreakdown, "SUBMITTED BY Pencacah"),

    approved: getStatusCount(region.statusBreakdown, "APPROVED BY Pengawas"),

    rejected: getStatusCount(region.statusBreakdown, "REJECTED BY Pengawas"),

    revoked: getStatusCount(region.statusBreakdown, "REVOKED BY Pengawas"),
  };
}

/*
|--------------------------------------------------------------------------
| Hitung Progress Enumerator
|--------------------------------------------------------------------------
| Progress Submit   = Submitted / Assignment
| Progress Approve  = Approved / Assignment
| Progress Total    = (Submitted + Approved + Rejected + Revoked)
/ Assignment
|--------------------------------------------------------------------------
*/

function calculateProgress(item) {
  // Hindari pembagian nol
  if (item.assignment <= 0) {
    item.progressSubmit = 0;
    item.progressApprove = 0;
    item.progressTotal = 0;

    return;
  }

  item.progressSubmit = percentage(item.submitted, item.assignment);

  item.progressApprove = percentage(item.approved, item.assignment);

  item.progressTotal = percentage(
    item.submitted + item.approved + item.rejected + item.revoked,

    item.assignment,
  );
}

/*
|--------------------------------------------------------------------------
| Build District Summary
|--------------------------------------------------------------------------
*/

function buildDistrict() {
  const districtMap = new Map();

  Dashboard.enumerators.forEach((enumerator) => {
    enumerator.regions.forEach((region) => {
      if (!districtMap.has(region.regionCode)) {
        districtMap.set(region.regionCode, {
          regionCode: region.regionCode,

          name: REGION_MAP[region.regionCode] ?? region.regionCode,

          assignment: 0,

          open: 0,
          draft: 0,
          submitted: 0,
          approved: 0,
          rejected: 0,
          revoked: 0,

          completed: 0,

          progressSubmit: 0,
          progressApprove: 0,
          progressTotal: 0,

          enumerators: 0,
        });
      }

      const district = districtMap.get(region.regionCode);

      district.assignment += region.assignment;

      district.open += region.open;
      district.draft += region.draft;
      district.submitted += region.submitted;
      district.approved += region.approved;
      district.rejected += region.rejected;
      district.revoked += region.revoked;

      district.completed +=
        region.submitted + region.approved + region.rejected + region.revoked;

      district.enumerators++;
    });
  });

  Dashboard.districts = Array.from(districtMap.values());

  Dashboard.districts.forEach((district) => {
    district.progressSubmit = percentage(
      district.submitted,
      district.assignment,
    );

    district.progressApprove = percentage(
      district.approved,
      district.assignment,
    );

    district.progressTotal = percentage(
      district.completed,
      district.assignment,
    );
  });
}

/*
|--------------------------------------------------------------------------
| Calculate National Summary
|--------------------------------------------------------------------------
*/

function calculateSummary() {
  const summary = Dashboard.summary;

  // Total dokumen yang sudah diproses
  summary.completed =
    summary.submitted + summary.approved + summary.rejected + summary.revoked;

  // Progress
  summary.progressSubmit = percentage(summary.submitted, summary.assignment);

  summary.progressApprove = percentage(summary.approved, summary.assignment);

  summary.progressTotal = percentage(summary.completed, summary.assignment);

  // Sisa assignment yang belum selesai
  summary.remaining = Math.max(0, summary.assignment - summary.completed);
}

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function reloadDashboard() {
  return loadDashboard(Dashboard.meta.source);
}
