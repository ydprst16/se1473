/*
|--------------------------------------------------------------------------
| SE2026 Monitoring Center — charts.js v2
|--------------------------------------------------------------------------
| Semua visualisasi ApexCharts (ROLE-AWARE)
|
| PERUBAHAN v2:
|   1. Status donut sekarang 7 kategori (menambah "Edited").
|   2. Ranking chart & District chart menggunakan progressReview
|      untuk role Pengawas, progressTotal untuk role Pencacah.
|   3. Tooltip District menampilkan Edited.
|   4. Performer list menampilkan progress sesuai role.
| PERUBAHAN v3:
|   1. + Tombol Export Excel di card Distribusi Progress
|      exportDistributionToExcel() — menghasilkan file .xlsx berisi
|      daftar petugas per bucket (0-20, 20-40, 40-60, 60-80, 80-100).
|   2. Klik bar chart Distribusi juga bisa langsung export bucket
|      yang di-klik saja (1 sheet).
|--------------------------------------------------------------------------
| SE2026 Monitoring Center — charts.js v3 (Theme-Aware)
|--------------------------------------------------------------------------
| - Warna chart ikut CSS variables (--text, --border, --bg, dll)
| - Otomatis re-render saat tema diubah via window.onThemeChanged()
|--------------------------------------------------------------------------
*/

/* ---------- Helper ambil warna dari CSS variable ---------- */
function cssVar(name, fallback = "") {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function getCurrentTheme() {
  return document.documentElement.getAttribute("data-bs-theme") || "dark";
}

/* ---------- Set global Apex sesuai tema ---------- */
function applyChartTheme() {
  const mode = getCurrentTheme();
  const textColor = cssVar("--text", mode === "dark" ? "#cbd5e1" : "#0b1220");
  const borderColor = cssVar(
    "--border",
    mode === "dark" ? "#1f2937" : "#e2e8f0",
  );

  window.Apex = {
    chart: {
      background: "transparent",
      foreColor: textColor,
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
    },
    theme: { mode: mode, palette: "palette1" },
    grid: { borderColor: borderColor, strokeDashArray: 3 },
    tooltip: { theme: mode },
    legend: { labels: { colors: textColor } },
    xaxis: {
      labels: { style: { colors: textColor } },
      axisBorder: { color: borderColor },
      axisTicks: { color: borderColor },
    },
    yaxis: { labels: { style: { colors: textColor } } },
    dataLabels: {
      style: { colors: [mode === "dark" ? "#ffffff" : "#0b1220"] },
    },
  };
}

// terapkan sekali di awal
applyChartTheme();

/* ---------- State chart instances ---------- */
let statusChart = null;
let rankingChart = null;
let districtChart = null;
let distributionChart = null;

const BUCKET_LABELS = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];

function bucketOf(progress) {
  if (progress < 20) return "0-20%";
  if (progress < 40) return "20-40%";
  if (progress < 60) return "40-60%";
  if (progress < 80) return "60-80%";
  return "80-100%";
}

/* ---------- Helper role-aware progress ---------- */
function chartProgressField(item) {
  const role = typeof currentRole !== "undefined" ? currentRole : "pencacah";
  return role === "pengawas"
    ? (item.progressReview ?? 0)
    : (item.progressTotal ?? 0);
}

/* ---------- Render orchestrator ---------- */
function renderCharts() {
  destroyCharts();
  renderStatusChart();
  renderRankingChart();
  renderDistrictChart();
  renderDistributionChart();
  renderTopPerformer();
  renderBottomPerformer();
}

function destroyCharts() {
  if (statusChart) {
    statusChart.destroy();
    statusChart = null;
  }
  if (rankingChart) {
    rankingChart.destroy();
    rankingChart = null;
  }
  if (districtChart) {
    districtChart.destroy();
    districtChart = null;
  }
  if (distributionChart) {
    distributionChart.destroy();
    distributionChart = null;
  }
}

/* ---------- Status Donut (7 kategori) ---------- */
function renderStatusChart() {
  const el = document.querySelector("#statusChart");
  if (!el) return;

  statusChart = new ApexCharts(el, {
    chart: { type: "donut", height: 360, toolbar: { show: false } },
    labels: [
      "Open",
      "Draft",
      "Submitted",
      "Approved",
      "Edited",
      "Rejected",
      "Revoked",
    ],
    series: Dashboard.status,
    colors: [
      "#64748b",
      "#94a3b8",
      "#f59e0b",
      "#22c55e",
      "#8b5cf6",
      "#ef4444",
      "#f97316",
    ],
    legend: { position: "bottom" },
    dataLabels: { enabled: true },
    tooltip: { y: { formatter: (v) => formatNumber(v) } },
  });
  statusChart.render();
}

/* ---------- Ranking user ---------- */
function renderRankingChart() {
  const el = document.querySelector("#rankingChart");
  if (!el) return;

  const data = Dashboard.rankings.topProgress;

  rankingChart = new ApexCharts(el, {
    chart: { type: "bar", height: 430, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 5 } },
    series: [
      { name: "Progress", data: data.map((x) => chartProgressField(x)) },
    ],
    xaxis: { categories: data.map((x) => x.username) },
    dataLabels: { enabled: true, formatter: (v) => v.toFixed(1) + "%" },
    tooltip: { y: { formatter: (v) => v.toFixed(2) + "%" } },
  });
  rankingChart.render();
}

/* ---------- Ranking kecamatan ---------- */
function renderDistrictChart() {
  const el = document.querySelector("#districtChart");
  if (!el) return;

  const data = [...Dashboard.districts].sort(
    (a, b) => chartProgressField(b) - chartProgressField(a),
  );

  districtChart = new ApexCharts(el, {
    chart: { type: "bar", height: 420, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 5 } },
    series: [
      { name: "Progress", data: data.map((item) => chartProgressField(item)) },
    ],
    xaxis: { categories: data.map((item) => item.name) },
    dataLabels: { enabled: true, formatter: (v) => v.toFixed(1) + "%" },
    tooltip: {
      custom: function ({ dataPointIndex }) {
        const d = data[dataPointIndex];
        const prog = chartProgressField(d);
        // pakai CSS variable supaya ikut tema
        return `
          <div style="padding:8px 12px;background:var(--card-solid);color:var(--text);border:1px solid var(--border);border-radius:6px;">
            <b>${d.name}</b><br/>
            Assignment : ${formatNumber(d.assignment)}<br/>
            Approved   : ${formatNumber(d.approved)}<br/>
            Edited     : ${formatNumber(d.edited ?? 0)}<br/>
            Submitted  : ${formatNumber(d.submitted)}<br/>
            Rejected   : ${formatNumber(d.rejected)}<br/>
            Revoked    : ${formatNumber(d.revoked)}<br/>
            <b>Progress : ${prog.toFixed(2)}%</b>
          </div>
        `;
      },
    },
  });
  districtChart.render();
}

/* ---------- Distribusi progress ---------- */
function renderDistributionChart() {
  const el = document.querySelector("#distributionChart");
  if (!el) return;

  const bucket = Dashboard.distribution;
  const roleLabel =
    typeof currentRole !== "undefined" && currentRole === "pengawas"
      ? "Pengawas"
      : "Enumerator";

  distributionChart = new ApexCharts(el, {
    chart: {
      type: "bar",
      height: 350,
      toolbar: { show: false },
      events: {
        dataPointSelection: function (event, chartContext, config) {
          const label = BUCKET_LABELS[config.dataPointIndex];
          if (label) exportDistributionToExcel(label);
        },
      },
    },
    plotOptions: { bar: { borderRadius: 4 } },
    series: [
      {
        name: roleLabel,
        data: [
          bucket["0-20"],
          bucket["20-40"],
          bucket["40-60"],
          bucket["60-80"],
          bucket["80-100"],
        ],
      },
    ],
    colors: ["#3b82f6"],
    xaxis: { categories: BUCKET_LABELS },
    dataLabels: { enabled: true },
    tooltip: {
      y: {
        formatter: (v) => v + " " + roleLabel + "  (klik bar untuk export)",
      },
    },
  });
  distributionChart.render();
}

/* ---------- Performer lists ---------- */
function renderTopPerformer() {
  const c = document.getElementById("topPerformer");
  if (!c) return;
  renderPerformerList(c, Dashboard.rankings.topProgress, "success");
}

function renderBottomPerformer() {
  const c = document.getElementById("bottomPerformer");
  if (!c) return;
  renderPerformerList(c, Dashboard.rankings.bottomProgress, "danger");
}

function renderPerformerList(container, data, color = "primary") {
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-muted text-center p-3">Tidak ada data</div>`;
    return;
  }
  let html = "";
  data.forEach((item, index) => {
    const progress = chartProgressField(item);
    html += `
      <div class="performer-item d-flex justify-content-between align-items-center p-2 border-bottom">
        <div>
          <div class="fw-bold">${index + 1}. ${item.username}</div>
          <small class="text-muted">
            Assignment : <b>${formatNumber(item.assignment)}</b> |
            Submitted : <b>${formatNumber(item.submitted)}</b> |
            Approved : <b>${formatNumber(item.approved)}</b>
          </small>
        </div>
        <span class="badge bg-${color}">${formatPercent(progress)}</span>
      </div>
    `;
  });
  container.innerHTML = html;
}

/* ---------- Refresh / theme change hook ---------- */
function refreshCharts() {
  renderCharts();
}

// Dipanggil dari app.js setiap kali tema berubah
window.onThemeChanged = function () {
  applyChartTheme(); // update global Apex config
  renderCharts(); // re-render semua chart pakai warna baru
};

window.addEventListener("resize", () => {
  if (statusChart) statusChart.updateOptions({});
  if (rankingChart) rankingChart.updateOptions({});
  if (districtChart) districtChart.updateOptions({});
  if (distributionChart) distributionChart.updateOptions({});
});

/* ==========================================================================
 | EXPORT DISTRIBUSI PROGRESS → EXCEL
 |========================================================================== */
function exportDistributionToExcel(bucketFilter) {
  if (typeof XLSX === "undefined") {
    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Library XLSX belum dimuat.",
      });
    }
    return;
  }

  const role = typeof currentRole !== "undefined" ? currentRole : "pencacah";
  const roleLabel = role === "pengawas" ? "Pengawas" : "Pencacah";
  const progressLabel =
    role === "pengawas" ? "Progress Review" : "Progress Total";

  const rows = (Dashboard.enumerators || [])
    .map((e) => {
      const prog = chartProgressField(e);
      return {
        Username: e.username,
        Kecamatan: [
          ...new Set(
            e.regions.map(
              (r) =>
                (typeof REGION_MAP !== "undefined" &&
                  REGION_MAP[r.regionCode]) ||
                r.regionCode,
            ),
          ),
        ].join(", "),
        Assignment: e.assignment || 0,
        Open: e.open || 0,
        Draft: e.draft || 0,
        Submitted: e.submitted || 0,
        Approved: e.approved || 0,
        Edited: e.edited || 0,
        Rejected: e.rejected || 0,
        Revoked: e.revoked || 0,
        [progressLabel + " (%)"]: Number(prog.toFixed(2)),
        Bucket: bucketOf(prog),
      };
    })
    .sort((a, b) => a[progressLabel + " (%)"] - b[progressLabel + " (%)"]);

  const wb = XLSX.utils.book_new();
  const dateStr =
    typeof viewedDate !== "undefined" && viewedDate
      ? viewedDate
      : new Date().toISOString().slice(0, 10);

  const metaSheet = XLSX.utils.aoa_to_sheet([
    ["Monitoring Distribusi Progress"],
    ["Role", roleLabel],
    ["Tanggal", dateStr],
    ["Total " + roleLabel, rows.length],
    [
      "Rumus Progress",
      role === "pengawas"
        ? "(Approved + Edited + Rejected + Revoked) / Assignment × 100%"
        : "(Submitted + Approved + Edited + Rejected + Revoked) / Assignment × 100%",
    ],
    [],
    ["Bucket", "Jumlah"],
    ...BUCKET_LABELS.map((b) => [
      b,
      Dashboard.distribution[b.replace("%", "")],
    ]),
  ]);
  metaSheet["!cols"] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, metaSheet, "Info");

  if (bucketFilter) {
    const filtered = rows.filter((r) => r.Bucket === bucketFilter);
    if (!filtered.length) {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "info",
          title: "Bucket kosong",
          text:
            "Tidak ada " +
            roleLabel.toLowerCase() +
            " di rentang " +
            bucketFilter,
        });
      }
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filtered);
    setColWidths(ws, filtered);
    /* XLSX.utils.book_append_sheet(wb, ws, safeSheet("Bucket " + bucketFilter)); */
    XLSX.utils.book_append_sheet(wb, ws, safeSheet(bucketFilter));
    XLSX.writeFile(
      wb,
      "distribusi-" +
        role +
        "-" +
        dateStr +
        "-" +
        bucketFilter.replace("%", "pct") +
        ".xlsx",
    );
    return;
  }

  if (rows.length) {
    const wsAll = XLSX.utils.json_to_sheet(rows);
    setColWidths(wsAll, rows);
    XLSX.utils.book_append_sheet(wb, wsAll, "Semua Progress");
  }
  BUCKET_LABELS.forEach((b) => {
    const list = rows.filter((r) => r.Bucket === b);
    if (!list.length) return;
    const ws = XLSX.utils.json_to_sheet(list);
    setColWidths(ws, list);
    /* XLSX.utils.book_append_sheet(wb, ws, safeSheet("Bucket " + b)); */
    XLSX.utils.book_append_sheet(wb, ws, safeSheet(b));
  });

  XLSX.writeFile(wb, "distribusi-progress-" + role + "-" + dateStr + ".xlsx");

  if (typeof Swal !== "undefined") {
    Swal.fire({
      toast: true,
      icon: "success",
      position: "top-end",
      title:
        "Export distribusi " +
        roleLabel +
        " berhasil (" +
        rows.length +
        " baris)",
      timer: 2500,
      showConfirmButton: false,
    });
  }
}

function setColWidths(ws, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  ws["!cols"] = keys.map((k) => {
    const maxLen = Math.max(
      k.length,
      ...rows.map((r) => String(r[k] == null ? "" : r[k]).length),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
  });
}

function safeSheet(name) {
  return String(name)
    .replace(/[:\\\/\?\*\[\]]/g, "-")
    .slice(0, 31);
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnExportDistribution");
  if (btn) btn.addEventListener("click", () => exportDistributionToExcel(null));
});
