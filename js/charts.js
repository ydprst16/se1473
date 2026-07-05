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
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Global ApexCharts default (Dark theme)
|--------------------------------------------------------------------------
*/
window.Apex = {
  chart: {
    background: "transparent",
    foreColor: "#cbd5e1",
    toolbar: { show: false },
    fontFamily: "Inter, sans-serif",
  },
  theme: { mode: "dark", palette: "palette1" },
  grid: { borderColor: "#1f2937", strokeDashArray: 3 },
  tooltip: { theme: "dark" },
  legend: { labels: { colors: "#cbd5e1" } },
  xaxis: {
    labels: { style: { colors: "#cbd5e1" } },
    axisBorder: { color: "#1f2937" },
    axisTicks: { color: "#1f2937" },
  },
  yaxis: { labels: { style: { colors: "#cbd5e1" } } },
  dataLabels: { style: { colors: ["#ffffff"] } },
};

let statusChart = null;
let rankingChart = null;
let districtChart = null;
let distributionChart = null;

/*
|--------------------------------------------------------------------------
| Helper: getter progress sesuai role
|--------------------------------------------------------------------------
*/
function chartProgressField(item) {
  const role = typeof currentRole !== "undefined" ? currentRole : "pencacah";
  return role === "pengawas"
    ? (item.progressReview ?? 0)
    : (item.progressTotal ?? 0);
}

/*
|--------------------------------------------------------------------------
| Render Semua Chart
|--------------------------------------------------------------------------
*/
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
  if (statusChart)       { statusChart.destroy();       statusChart = null; }
  if (rankingChart)      { rankingChart.destroy();      rankingChart = null; }
  if (districtChart)     { districtChart.destroy();     districtChart = null; }
  if (distributionChart) { distributionChart.destroy(); distributionChart = null; }
}

/*
|--------------------------------------------------------------------------
| Status Donut — 7 kategori
|--------------------------------------------------------------------------
| Dashboard.status = [open, draft, submitted, approved, edited, rejected, revoked]
|--------------------------------------------------------------------------
*/
function renderStatusChart() {
  const el = document.querySelector("#statusChart");
  if (!el) return;

  statusChart = new ApexCharts(el, {
    chart: { type: "donut", height: 360, toolbar: { show: false } },
    labels: ["Open", "Draft", "Submitted", "Approved", "Edited", "Rejected", "Revoked"],
    series: Dashboard.status,
    colors: ["#64748b", "#94a3b8", "#f59e0b", "#22c55e", "#8b5cf6", "#ef4444", "#f97316"],
    legend: { position: "bottom" },
    dataLabels: { enabled: true },
    tooltip: {
      y: { formatter: (value) => formatNumber(value) },
    },
  });
  statusChart.render();
}

/*
|--------------------------------------------------------------------------
| Top Progress Enumerator / Pengawas
|--------------------------------------------------------------------------
*/
function renderRankingChart() {
  const el = document.querySelector("#rankingChart");
  if (!el) return;

  const data = Dashboard.rankings.topProgress;

  rankingChart = new ApexCharts(el, {
    chart: { type: "bar", height: 430, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 5 } },
    series: [
      {
        name: "Progress",
        data: data.map((x) => chartProgressField(x)),  // role-aware
      },
    ],
    xaxis: { categories: data.map((x) => x.username) },
    dataLabels: {
      enabled: true,
      formatter: (value) => value.toFixed(1) + "%",
    },
    tooltip: {
      y: { formatter: (value) => value.toFixed(2) + "%" },
    },
  });
  rankingChart.render();
}

/*
|--------------------------------------------------------------------------
| Ranking Kecamatan
|--------------------------------------------------------------------------
*/
function renderDistrictChart() {
  const el = document.querySelector("#districtChart");
  if (!el) return;

  // Sort by field yang sesuai role
  const data = [...Dashboard.districts].sort(
    (a, b) => chartProgressField(b) - chartProgressField(a)
  );

  districtChart = new ApexCharts(el, {
    chart: { type: "bar", height: 420, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 5 } },
    series: [
      {
        name: "Progress",
        data: data.map((item) => chartProgressField(item)),
      },
    ],
    xaxis: { categories: data.map((item) => item.name) },
    dataLabels: {
      enabled: true,
      formatter: (value) => value.toFixed(1) + "%",
    },
    tooltip: {
      custom: function ({ dataPointIndex }) {
        const d = data[dataPointIndex];
        const prog = chartProgressField(d);
        return `
          <div style="padding:8px 12px;">
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

/*
|--------------------------------------------------------------------------
| Distribusi Progress (buckets 0-100%)
|--------------------------------------------------------------------------
| Bucket sudah dihitung role-aware oleh processor.js
|--------------------------------------------------------------------------
*/
function renderDistributionChart() {
  const el = document.querySelector("#distributionChart");
  if (!el) return;

  const bucket = Dashboard.distribution;
  const roleLabel =
    typeof currentRole !== "undefined" && currentRole === "pengawas"
      ? "Pengawas"
      : "Enumerator";

  distributionChart = new ApexCharts(el, {
    chart: { type: "bar", height: 350, toolbar: { show: false } },
    series: [
      {
        name: roleLabel,
        data: [
          bucket["0-20"], bucket["20-40"], bucket["40-60"],
          bucket["60-80"], bucket["80-100"],
        ],
      },
    ],
    xaxis: { categories: ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"] },
    dataLabels: { enabled: true },
    tooltip: {
      y: { formatter: (value) => value + " " + roleLabel },
    },
  });
  distributionChart.render();
}

/*
|--------------------------------------------------------------------------
| Top / Bottom Performer
|--------------------------------------------------------------------------
*/
function renderTopPerformer() {
  const container = document.getElementById("topPerformer");
  if (!container) return;
  renderPerformerList(container, Dashboard.rankings.topProgress, "success");
}

function renderBottomPerformer() {
  const container = document.getElementById("bottomPerformer");
  if (!container) return;
  renderPerformerList(container, Dashboard.rankings.bottomProgress, "danger");
}

function renderPerformerList(container, data, color = "primary") {
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="text-muted text-center p-3">Tidak ada data</div>`;
    return;
  }

  let html = "";
  data.forEach((item, index) => {
    const progress = chartProgressField(item);   // role-aware
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

/*
|--------------------------------------------------------------------------
| Refresh & Resize
|--------------------------------------------------------------------------
*/
function refreshCharts() { renderCharts(); }

window.addEventListener("resize", () => {
  if (statusChart)       statusChart.updateOptions({});
  if (rankingChart)      rankingChart.updateOptions({});
  if (districtChart)     districtChart.updateOptions({});
  if (distributionChart) distributionChart.updateOptions({});
});
