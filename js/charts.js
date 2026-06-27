/*
|--------------------------------------------------------------------------
| SE2026 Monitoring Center
| charts.js
|--------------------------------------------------------------------------
| Semua visualisasi ApexCharts
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
  theme: {
    mode: "dark",
    palette: "palette1",
  },
  grid: {
    borderColor: "#1f2937",
    strokeDashArray: 3,
  },
  tooltip: {
    theme: "dark",
  },
  legend: {
    labels: { colors: "#cbd5e1" },
  },
  xaxis: {
    labels: { style: { colors: "#cbd5e1" } },
    axisBorder: { color: "#1f2937" },
    axisTicks: { color: "#1f2937" },
  },
  yaxis: {
    labels: { style: { colors: "#cbd5e1" } },
  },
  dataLabels: {
    style: { colors: ["#ffffff"] },
  },
};

let statusChart = null;
let rankingChart = null;
let districtChart = null;
let distributionChart = null;

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

/*
|--------------------------------------------------------------------------
| Destroy Chart
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Status Donut
|--------------------------------------------------------------------------
*/

function renderStatusChart() {
  const el = document.querySelector("#statusChart");

  if (!el) return;

  statusChart = new ApexCharts(el, {
    chart: {
      type: "donut",
      height: 360,
      toolbar: {
        show: false,
      },
    },

    labels: ["Open", "Draft", "Submitted", "Approved", "Rejected", "Revoked"],

    series: Dashboard.status,

    legend: {
      position: "bottom",
    },

    dataLabels: {
      enabled: true,
    },

    tooltip: {
      y: {
        formatter: function (value) {
          return formatNumber(value);
        },
      },
    },
  });

  statusChart.render();
}

/*
|--------------------------------------------------------------------------
| Top Progress Enumerator
|--------------------------------------------------------------------------
*/

function renderRankingChart() {
  const el = document.querySelector("#rankingChart");

  if (!el) return;

  const data = Dashboard.rankings.topProgress;

  rankingChart = new ApexCharts(el, {
    chart: {
      type: "bar",

      height: 430,

      toolbar: {
        show: false,
      },
    },

    plotOptions: {
      bar: {
        horizontal: true,

        borderRadius: 5,
      },
    },

    series: [
      {
        name: "Progress",

        data: data.map((x) => x.progressTotal),
      },
    ],

    xaxis: {
      categories: data.map((x) => x.username),
    },

    dataLabels: {
      enabled: true,

      formatter: function (value) {
        return value.toFixed(1) + "%";
      },
    },

    tooltip: {
      y: {
        formatter: function (value) {
          return value.toFixed(2) + "%";
        },
      },
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

  const data = [...Dashboard.districts].sort(
    (a, b) => b.progressTotal - a.progressTotal,
  );

  districtChart = new ApexCharts(el, {
    chart: {
      type: "bar",
      height: 420,
      toolbar: {
        show: false,
      },
    },

    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 5,
      },
    },

    series: [
      {
        name: "Progress",
        data: data.map((item) => item.progressTotal),
      },
    ],

    xaxis: {
      categories: data.map((item) => item.name),
    },

    dataLabels: {
      enabled: true,
      formatter: function (value) {
        return value.toFixed(1) + "%";
      },
    },

    tooltip: {
      custom: function ({ dataPointIndex }) {
        const d = data[dataPointIndex];

        return `
                <div style="padding:10px; background:#101827; color:#f3f4f6; border:1px solid #1f2937; border-radius:8px;">
                    <strong>${d.name}</strong><br>
                    Assignment : ${formatNumber(d.assignment)}<br>
                    Approved : ${formatNumber(d.approved)}<br>
                    Submitted : ${formatNumber(d.submitted)}<br>
                    Progress : ${d.progressTotal.toFixed(2)}%
                </div>
                `;
      },
    },
  });

  districtChart.render();
}

/*
|--------------------------------------------------------------------------
| Distribusi Progress
|--------------------------------------------------------------------------
*/

function renderDistributionChart() {
  const el = document.querySelector("#distributionChart");

  if (!el) return;

  const bucket = Dashboard.distribution;

  distributionChart = new ApexCharts(el, {
    chart: {
      type: "bar",

      height: 350,

      toolbar: {
        show: false,
      },
    },

    series: [
      {
        name: "Enumerator",

        data: [
          bucket["0-20"],

          bucket["20-40"],

          bucket["40-60"],

          bucket["60-80"],

          bucket["80-100"],
        ],
      },
    ],

    xaxis: {
      categories: ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"],
    },

    dataLabels: {
      enabled: true,
    },

    tooltip: {
      y: {
        formatter: function (value) {
          return value + " Enumerator";
        },
      },
    },
  });

  distributionChart.render();
}

/*
|--------------------------------------------------------------------------
| Top Performer
|--------------------------------------------------------------------------
*/

function renderTopPerformer() {
  const container = document.getElementById("topPerformer");

  if (!container) return;

  renderPerformerList(container, Dashboard.rankings.topProgress, "success");
}

/*
|--------------------------------------------------------------------------
| Bottom Performer
|--------------------------------------------------------------------------
*/

function renderBottomPerformer() {
  const container = document.getElementById("bottomPerformer");

  if (!container) return;

  renderPerformerList(container, Dashboard.rankings.bottomProgress, "danger");
}

/*
|--------------------------------------------------------------------------
| Render Performer List
|--------------------------------------------------------------------------
*/

function renderPerformerList(container, data, color = "primary") {
  if (!data || data.length === 0) {
    container.innerHTML = `
            <div class="text-center text-secondary py-4">
                Tidak ada data
            </div>
        `;
    return;
  }

  let html = "";

  data.forEach((item, index) => {
    html += `
        <div class="d-flex justify-content-between align-items-center border-bottom py-2">

            <div class="flex-grow-1">

                <div class="fw-semibold">
                    ${index + 1}. ${item.username}
                </div>

                <small class="text-secondary">
                    Assignment :
                    <strong>${formatNumber(item.assignment)}</strong>

                    &nbsp;|&nbsp;

                    Submitted :
                    <strong class="text-primary">${formatNumber(item.submitted)}</strong>

                    &nbsp;|&nbsp;

                    Approved :
                    <strong class="text-success">${formatNumber(item.approved)}</strong>
                </small>

            </div>

            <div class="ms-3">

                <span class="badge bg-${color} fs-6">
                    ${formatPercent(item.progressTotal)}
                </span>

            </div>

        </div>
        `;
  });

  container.innerHTML = html;
}

/*
|--------------------------------------------------------------------------
| Refresh Chart
|--------------------------------------------------------------------------
*/

function refreshCharts() {
  renderCharts();
}

/*
|--------------------------------------------------------------------------
| Resize
|--------------------------------------------------------------------------
*/

window.addEventListener("resize", () => {
  if (statusChart) statusChart.updateOptions({});

  if (rankingChart) rankingChart.updateOptions({});

  if (districtChart) districtChart.updateOptions({});

  if (distributionChart) distributionChart.updateOptions({});
});
