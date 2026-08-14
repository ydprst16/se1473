/*
|--------------------------------------------------------------------------
| table.js (Tabulator)
|--------------------------------------------------------------------------
| Tab 1 : Ringkasan per Petugas (#gridTable)
| Tab 2 : Detail per Kecamatan  (#gridTableDetail)  -- per idsubsls (16 dig)
| PERUBAHAN v5:
| - Kolom No, Assignment, dan Progress menggunakan "width" absolut agar
|   Ukurannya terkunci, tidak melebar, dan tidak menyusut.
| - Judul "Assignment" dikembalikan menjadi 1 baris agar tidak terpotong.
| - Menambahkan kolom Kelurahan dan Nama SLS dari referensi SUBSLS_MAP.
|--------------------------------------------------------------------------
*/

let table = null;        // Tab 1 - per petugas
let tableDetail = null;  // Tab 2 - per idsubsls

/* Inject CSS: izinkan judul header wrap ke bawah (tidak terpotong) */
(function injectHeaderWrapCSS() {
  if (document.getElementById("tabulatorHeaderWrapCSS")) return;
  const style = document.createElement("style");
  style.id = "tabulatorHeaderWrapCSS";
  style.textContent = `
    .tabulator .tabulator-col .tabulator-col-title{
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
      line-height: 1.15;
    }
    .tabulator .tabulator-col{
      vertical-align: middle;
    }
  `;
  document.head.appendChild(style);
})();

/* Helper: ambil progress sesuai role aktif */
function tableProgressForRole(item) {
  const role = typeof currentRole !== "undefined" ? currentRole : "pencacah";
  return role === "pengawas"
    ? Number(item.progressReview ?? 0)
    : Number(item.progressTotal ?? 0);
}

/* Helper: hitung progress 1 region */
function regionProgress(r) {
  const assignment = r.assignment || 0;
  if (assignment <= 0) return 0;

  const reviewed =
    (r.approved || 0) + (r.edited || 0) + (r.rejected || 0) + (r.revoked || 0);
  const completed =
    (r.submitted || 0) + (r.submittedRespondent || 0) + reviewed;

  const role = typeof currentRole !== "undefined" ? currentRole : "pencacah";
  const done = role === "pengawas" ? reviewed : completed;

  return Number(((done / assignment) * 100).toFixed(2));
}

/* Formatter sel "Progress" */
function progressCellFormatter(cell) {
  const value = Number(cell.getValue()) || 0;

  let color = "#ef4444";            // <40 merah
  if (value >= 80) color = "#22c55e";       // hijau (≥80)
  else if (value >= 60) color = "#3b82f6";  // biru (60-80)
  else if (value >= 40) color = "#f59e0b";  // jingga (40-60)

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;">
      <div style="width:100%;height:6px;background:rgba(148,163,184,.25);border-radius:999px;overflow:hidden;">
        <div style="width:${Math.min(value, 100)}%;height:100%;background:${color};border-radius:999px;"></div>
      </div>
      <span style="font-size:12px;font-weight:600;line-height:1;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle;"></span>
        ${value.toFixed(2)}%
      </span>
    </div>`;
}

/* Kolom status */
function statusColumns() {
  return [
    { title: "Open", field: "open", hozAlign: "right", headerHozAlign: "center", minWidth: 70 },
    { title: "Draft", field: "draft", hozAlign: "right", headerHozAlign: "center", minWidth: 70 },
    { title: "Submitted", field: "submitted", hozAlign: "right", headerHozAlign: "center", minWidth: 90 },
    {
      title: "Submitted<br>Resp.",
      field: "submittedRespondent",
      titleFormatter: "html",
      hozAlign: "right",
      headerHozAlign: "center",
      minWidth: 90,
      headerTooltip: "SUBMITTED RESPONDENT",
    },
    { title: "Approved", field: "approved", hozAlign: "right", headerHozAlign: "center", minWidth: 90 },
    {
      title: "Edited<br>Admin Kab",
      field: "editedAdmin",
      titleFormatter: "html",
      hozAlign: "right",
      headerHozAlign: "center",
      minWidth: 95,
      headerTooltip: "EDITED BY Admin Kabupaten",
    },
    {
      title: "Edited<br>Pengawas",
      field: "editedPengawas",
      titleFormatter: "html",
      hozAlign: "right",
      headerHozAlign: "center",
      minWidth: 90,
      headerTooltip: "EDITED BY Pengawas",
    },
    { title: "Rejected", field: "rejected", hozAlign: "right", headerHozAlign: "center", minWidth: 80 },
    { title: "Revoked", field: "revoked", hozAlign: "right", headerHozAlign: "center", minWidth: 80 },
  ];
}

/* ============================================================
   Render Tab 1 — Ringkasan per Petugas
   ============================================================ */
function renderTable() {
  const data = Dashboard.enumerators.map((e, index) => ({
    no: index + 1,
    username: e.username,
    district: [
      ...new Set(
        e.regions.map((r) => REGION_MAP[r.regionCode] || r.regionCode)
      ),
    ].join(", "),
    assignment: e.assignment,
    open: e.open,
    draft: e.draft,
    submitted: e.submitted,
    submittedRespondent: e.submittedRespondent || 0,
    approved: e.approved,
    editedAdmin: e.editedAdmin || 0,
    editedPengawas: e.editedPengawas || 0,
    rejected: e.rejected,
    revoked: e.revoked,
    progress: Number(tableProgressForRole(e).toFixed(2)),
  }));

  if (table) table.destroy();

  table = new Tabulator("#gridTable", {
    data: data,
    layout: "fitColumns", // Semua kolom dipaksa pas dengan layar SAMA RATA
    responsiveLayout: false,
    height: "650px",
    movableColumns: true,
    resizableColumns: true,
    pagination: true,
    paginationSize: 20,
    placeholder: "Tidak ada data",

    columns: [
      { title: "No", field: "no", hozAlign: "center", width: 50 }, // Dikunci 50px
      { title: "Username", field: "username", minWidth: 150, widthGrow: 2, headerFilter: "input" },
      { title: "Kecamatan", field: "district", minWidth: 150, widthGrow: 2, headerFilter: "input" },
      { title: "Assignment", field: "assignment", hozAlign: "right", headerHozAlign: "center", width: 100 }, // Dikunci 100px, satu baris
      ...statusColumns(),
      {
        title: "Progress",
        field: "progress",
        width: 120, // Dikunci 120px
        hozAlign: "center",
        headerHozAlign: "center",
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
   ============================================================ */
function renderTableDetail() {
  const detailData = [];
  let no = 1;

  Dashboard.enumerators.forEach((e) => {
    e.regions.forEach((r) => {
      const currentId = r.idsubsls || String(r.regionCode);
      
      // Mengambil nama kelurahan & SLS dari SUBSLS_MAP berdasarkan IDSubSLS 16-digit
      // Fallback ke string "-" jika idsubsls tidak ditemukan di master
      const ref = SUBSLS_MAP[currentId] || { nmdesa: "-", nmsls: "-" };

      detailData.push({
        no: no++,
        username: e.username,
        idsubsls: currentId,
        kecamatan: REGION_MAP[r.regionCode] || String(r.regionCode),
        
        // --- Kolom Baru ---
        kelurahan: ref.nmdesa,
        nmsls: ref.nmsls,
        // ------------------

        assignment: r.assignment || 0,
        open: r.open || 0,
        draft: r.draft || 0,
        submitted: r.submitted || 0,
        submittedRespondent: r.submittedRespondent || 0,
        approved: r.approved || 0,
        editedAdmin: r.editedAdmin || 0,
        editedPengawas: r.editedPengawas || 0,
        rejected: r.rejected || 0,
        revoked: r.revoked || 0,
        progress: regionProgress(r),
      });
    });
  });

  if (tableDetail) tableDetail.destroy();

  tableDetail = new Tabulator("#gridTableDetail", {
    data: detailData,
    layout: "fitColumns", // Kolom menyesuaikan lebar sisa tabel
    responsiveLayout: false,
    height: "650px",
    movableColumns: true,
    resizableColumns: true,
    pagination: true,
    paginationSize: 20,
    placeholder: "Tidak ada data",

    columns: [
      { title: "No", field: "no", hozAlign: "center", width: 50 },
      { title: "Username", field: "username", minWidth: 140, widthGrow: 2, headerFilter: "input" },
      { title: "IDSubSLS", field: "idsubsls", minWidth: 150, widthGrow: 1, hozAlign: "center", headerFilter: "input" },
      { title: "Kecamatan", field: "kecamatan", minWidth: 130, widthGrow: 2, headerFilter: "input" },
      
      // --- Definisi Kolom Baru di Tabulator ---
      { 
        title: "Kelurahan", 
        field: "kelurahan", 
        minWidth: 180, 
        widthGrow: 3, 
        headerFilter: "input",
        formatter: "textarea" // Teks akan dibungkus (wrap) ke bawah jika kepanjangan
      },
      { 
        title: "Nama SLS", 
        field: "nmsls", 
        minWidth: 90, 
        widthGrow: 1, 
        headerFilter: "input" 
      },
      // ----------------------------------------

      { title: "Assignment", field: "assignment", hozAlign: "right", headerHozAlign: "center", width: 100 },
      ...statusColumns(),
      {
        title: "Progress",
        field: "progress",
        width: 120,
        hozAlign: "center",
        headerHozAlign: "center",
        formatter: progressCellFormatter,
      },
    ],

    rowClick: function (e, row) {
      console.log("[detail]", row.getData());
    },
  });
}

/* ============================================================
   Hook Render
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
   Tombol Export
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const btnExport = document.getElementById("btnExport");
  if (!btnExport) return;

  btnExport.addEventListener("click", () => {
    const detailPane = document.getElementById("tab-detail");
    const isDetailActive = detailPane && detailPane.classList.contains("active");

    if (isDetailActive) {
      if (tableDetail) {
        tableDetail.download("xlsx", "monitoring-se-detail-idsubsls.xlsx", {
          sheetName: "Detail per idsubsls",
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

  /* Re-fit kolom saat ganti tab */
  const tabBtns = document.querySelectorAll('#tableTabs button[data-bs-toggle="tab"]');
  tabBtns.forEach((btn) => {
    btn.addEventListener("shown.bs.tab", (e) => {
      const target = e.target.getAttribute("data-bs-target");
      if (target === "#tab-summary" && table) table.redraw(true);
      if (target === "#tab-detail" && tableDetail) tableDetail.redraw(true);
    });
  });
});
