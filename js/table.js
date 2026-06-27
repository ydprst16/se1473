/*
|--------------------------------------------------------------------------
| table.js (Tabulator)
|--------------------------------------------------------------------------
*/

let table = null;

function renderTable() {
  const data = Dashboard.enumerators.map((e, index) => ({
    no: index + 1,

    username: e.username,

    district: [
      ...new Set(
        e.regions.map((r) => REGION_MAP[r.regionCode] || r.regionCode),
      ),
    ].join(", "),

    assignment: e.assignment,

    open: e.open,

    draft: e.draft,

    submitted: e.submitted,

    approved: e.approved,

    rejected: e.rejected,

    revoked: e.revoked,

    progress: Number(e.progressTotal.toFixed(2)),
  }));

  if (table) {
    table.destroy();
  }

  table = new Tabulator("#gridTable", {
    data: data,

    layout: "fitColumns",

    responsiveLayout: false,

    height: "650px",

    movableColumns: true,

    resizableColumns: true,

    pagination: true,

    paginationSize: 20,

    placeholder: "Tidak ada data",

    columns: [
      {
        title: "No",
        field: "no",
        hozAlign: "center",
        width: 70,
      },

      {
        title: "Username",
        field: "username",
        width: 260,
        headerFilter: "input",
      },

      {
        title: "Kecamatan",
        field: "district",
        width: 220,
        headerFilter: "input",
      },

      {
        title: "Assignment",
        field: "assignment",
        hozAlign: "right",
      },

      {
        title: "Open",
        field: "open",
        hozAlign: "right",
      },

      {
        title: "Draft",
        field: "draft",
        hozAlign: "right",
      },

      {
        title: "Submitted",
        field: "submitted",
        hozAlign: "right",
      },

      {
        title: "Approved",
        field: "approved",
        hozAlign: "right",
      },

      {
        title: "Rejected",
        field: "rejected",
        hozAlign: "right",
      },

      {
        title: "Revoked",
        field: "revoked",
        hozAlign: "right",
      },

      {
        title: "Progress",
        field: "progress",
        width: 170,
        formatter: function (cell) {
          const value = Number(cell.getValue());

          let color = "#dc3545";

          if (value >= 80) {
            color = "#198754";
          } else if (value >= 60) {
            color = "#0d6efd";
          } else if (value >= 40) {
            color = "#ffc107";
          }

          return `
        <div class="d-flex align-items-center gap-2">

            <div class="progress flex-grow-1" style="height:10px; margin:0;">
                <div class="progress-bar"
                     style="width:${value}%; background:${color};">
                </div>
            </div>

            <span style="
                width:58px;
                text-align:right;
                font-weight:600;
                font-size:12px;
            ">
                ${value.toFixed(2)}%
            </span>

        </div>
    `;
        },
      },
    ],

    rowClick: function (e, row) {
      console.log(row.getData());
    },
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnExport").addEventListener("click", () => {
    if (table) {
      table.download("xlsx", "monitoring-se.xlsx", {
        sheetName: "Enumerator",
      });
    }
  });
});
