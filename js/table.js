/*
|--------------------------------------------------------------------------
| table.js (Tabulator)
|--------------------------------------------------------------------------
| Tab 1 : Ringkasan per Petugas (#gridTable)
| Tab 2 : Detail per Kecamatan  (#gridTableDetail)  -- per kdsubsls (16 dig)
|--------------------------------------------------------------------------
*/

let table = null;        // Tab 1 - per petugas
let tableDetail = null;  // Tab 2 - per kdsubsls

/* ============================================================
   Helper: formatter sel "Progress" — vertikal, eye-catching
     - Bar tipis berwarna (signal)
     - Angka putih + dot kecil berwarna (indikator)
   ============================================================ */
function progressCellFormatter(cell) {
  const value = Number(cell.getValue()) || 0;

  let color = "#ef4444"; // <40 merah
  if (value >= 80) color = "#22c55e";        // hijau (≥80)
  else if (value >= 60) color = "#3b82f6";   // biru (60-80)
  else if (value >= 40) color = "#f59e0b";   // jingga (40-60)

  return `
    <div class="tbl-progress-wrap">
      <div class="tbl-progress-track">
        <div class="tbl-progress-fill" style="width:${value}%; background:${color};"></div>
      </div>
      <div class="tbl-progress-label">
        <span class="tbl-progress-dot" style="background:${color};"></span>
        ${value.toFixed(2)}%
      </div>
    </div>
  `;
}

/* ============================================================
   Render Tab 1 — Ringkasan per Petugas (agregat)
   ============================================================ */
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

  if (table) table.destroy();

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
      { title: "No", field: "no", hozAlign: "center", width: 60 },
      { title: "Username", field: "username", width: 240, headerFilter: "input" },
      { title: "Kecamatan", field: "district", width: 220, headerFilter: "input" },
      { title: "Assignment", field: "assignment", hozAlign: "right" },
      { title: "Open", field: "open", hozAlign: "right" },
      { title: "Draft", field: "draft", hozAlign: "right" },
      { title: "Submitted", field: "submitted", hozAlign: "right" },
      { title: "Approved", field: "approved", hozAlign: "right" },
      { title: "Rejected", field: "rejected", hozAlign: "right" },
      { title: "Revoked", field: "revoked", hozAlign: "right" },
      {
        title: "Progress",
        field: "progress",
        width: 130,
        hozAlign: "center",
        formatter: progressCellFormatter,
      },
    ],

    rowClick: function (e, row) {
      console.log("[summary]", row.getData());
    },
  });
}

/* ============================================================
   Render Tab 2 — Detail per Kecamatan
   Setiap baris = 1 (petugas × kdsubsls)
   ============================================================ */
function renderTableDetail() {
  const detailData = [];
  let no = 1;

  Dashboard.enumerators.forEach((e) => {
    e.regions.forEach((r) => {
      const totalDone =
        (r.submitted || 0) +
        (r.approved || 0) +
        (r.rejected || 0) +
        (r.revoked || 0);

      const progress =
        r.assignment > 0
          ? Number(((totalDone / r.assignment) * 100).toFixed(2))
          : 0;

      detailData.push({
        no: no++,
        username: e.username,
        kdsubsls: r.kdsubsls || String(r.regionCode),
        kecamatan: REGION_MAP[r.regionCode] || String(r.regionCode),
        assignment: r.assignment || 0,
        open: r.open || 0,
        draft: r.draft || 0,
        submitted: r.submitted || 0,
        approved: r.approved || 0,
        rejected: r.rejected || 0,
        revoked: r.revoked || 0,
        progress: progress,
      });
    });
  });

  if (tableDetail) tableDetail.destroy();

  tableDetail = new Tabulator("#gridTableDetail", {
    data: detailData,
    layout: "fitColumns",
    responsiveLayout: false,
    height: "650px",
    movableColumns: true,
    resizableColumns: true,
    pagination: true,
    paginationSize: 20,
    placeholder: "Tidak ada data",

    columns: [
      { title: "No", field: "no", hozAlign: "center", width: 60 },
      { title: "Username", field: "username", width: 220, headerFilter: "input" },
      {
        title: "kdsubsls",
        field: "kdsubsls",
        width: 170,
        hozAlign: "center",
        headerFilter: "input",
      },
      {
        title: "Kecamatan",
        field: "kecamatan",
        width: 170,
        headerFilter: "input",
      },
      { title: "Assignment", field: "assignment", hozAlign: "right" },
      { title: "Open", field: "open", hozAlign: "right" },
      { title: "Draft", field: "draft", hozAlign: "right" },
      { title: "Submitted", field: "submitted", hozAlign: "right" },
      { title: "Approved", field: "approved", hozAlign: "right" },
      { title: "Rejected", field: "rejected", hozAlign: "right" },
      { title: "Revoked", field: "revoked", hozAlign: "right" },
      {
        title: "Progress",
        field: "progress",
        width: 130,
        hozAlign: "center",
        formatter: progressCellFormatter,
      },
    ],

    rowClick: function (e, row) {
      console.log("[detail]", row.getData());
    },
  });
}

/* ============================================================
   Hook: setiap kali renderTable() Tab 1 dipanggil (oleh app.js
   renderAll()), kita juga render Tab 2 supaya konsisten.
   ============================================================ */
const _origRenderTable = renderTable;
renderTable = function () {
  _origRenderTable();
  try {
    renderTableDetail();
  } catch (e) {
    console.warn("[renderTableDetail] gagal:", e);
  }
};

/* ============================================================
   Tombol Export — ikuti tab yang sedang aktif
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const btnExport = document.getElementById("btnExport");
  if (!btnExport) return;

  btnExport.addEventListener("click", () => {
    const detailPane = document.getElementById("tab-detail");
    const isDetailActive = detailPane && detailPane.classList.contains("active");

    if (isDetailActive) {
      if (tableDetail) {
        tableDetail.download("xlsx", "monitoring-se-detail-kdsubsls.xlsx", {
          sheetName: "Detail per kdsubsls",
        });
      }
    } else {
      if (table) {
        table.download("xlsx", "monitoring-se-ringkasan.xlsx", {
          sheetName: "Ringkasan per Petugas",
        });
      }
    }
  });

  /* Re-fit kolom saat ganti tab (Tabulator perlu trigger ulang
     karena tabel di dalam tab-pane yang awalnya hidden) */
  const tabBtns = document.querySelectorAll('#tableTabs button[data-bs-toggle="tab"]');
  tabBtns.forEach((btn) => {
    btn.addEventListener("shown.bs.tab", (e) => {
      const target = e.target.getAttribute("data-bs-target");
      if (target === "#tab-summary" && table) table.redraw(true);
      if (target === "#tab-detail" && tableDetail) tableDetail.redraw(true);
    });
  });
});
