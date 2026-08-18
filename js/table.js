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
  const slsNolProgress = []; // <-- Array untuk menampung data progress 0%
  let no = 1;

  Dashboard.enumerators.forEach((e) => {
    e.regions.forEach((r) => {
      const currentId = r.idsubsls || String(r.regionCode);
      const ref = SUBSLS_MAP[currentId] || { nmdesa: "-", nmsls: "-" };
      const namaSlsBersih = (ref.nmsls || "-").replace(/\s+/g, ' ').trim();
      const progressVal = regionProgress(r);

      const itemDetail = {
        no: no++,
        username: e.username,
        idsubsls: currentId,
        kecamatan: REGION_MAP[r.regionCode] || String(r.regionCode),
        kelurahan: ref.nmdesa,
        nmsls: namaSlsBersih,
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
        progress: progressVal,
      };

      detailData.push(itemDetail);

      // --- CEK JIKA PROGRESS 0% ---
      if (progressVal === 0) {
        slsNolProgress.push(itemDetail);
      }
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
      { title: "No", field: "no", hozAlign: "center", width: 50 },
      { title: "Username", field: "username", minWidth: 140, widthGrow: 2, headerFilter: "input" },
      { title: "IDSubSLS", field: "idsubsls", minWidth: 150, widthGrow: 1, hozAlign: "center", headerFilter: "input" },
      { title: "Kecamatan", field: "kecamatan", minWidth: 130, widthGrow: 2, headerFilter: "input" },
      { 
        title: "Kelurahan", 
        field: "kelurahan", 
        minWidth: 180, 
        widthGrow: 3, 
        headerFilter: "input",
        formatter: "textarea" 
      },
      { 
        title: "Nama SLS", 
        field: "nmsls", 
        minWidth: 100, 
        widthGrow: 1, 
        headerFilter: "input",
        titleFormatter: function(cell) {
            return `<div style="white-space: nowrap;">Nama SLS</div>`;
        },
        formatter: function(cell) {
          return `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${cell.getValue()}</div>`;
        }
      },
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

  // --- TRIGER POPUP WARNING JIKA ADA DATA PROGRESS 0% ---
  if (slsNolProgress.length > 0) {
    tampilkanWarningModal(slsNolProgress);
  }
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

/* ============================================================
   Fungsi Pembuat & Penampil Popup Warning (Bootstrap 5)
   ============================================================ */
function tampilkanWarningModal(dataNol) {
  // Hapus modal lama jika sudah ada di DOM agar tidak duplikat
  const modalLama = document.getElementById("modalWarningProgress");
  if (modalLama) modalLama.remove();

  // --- CEK ROLE SAAT INI UNTUK MENYESUAIKAN TEKS NOTIFIKASI ---
  const role = typeof currentRole !== "undefined" ? currentRole : "pencacah";
  let deskripsiNotif = "Berikut adalah daftar SLS wilayah tugas yang belum memiliki progress submit atau pengisian sama sekali:";
  
  if (role === "pengawas") {
    deskripsiNotif = "Berikut adalah daftar SLS wilayah tugas yang belum diperiksa sama sekali atau progressnya masih 0%:";
  }

  // Buat baris tabel dari data yang progress-nya 0%
  const tabelRows = dataNol.map((item, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><strong>${item.username}</strong></td>
      <td class="text-center"><code>${item.idsubsls}</code></td>
      <td>${item.kecamatan}</td>
      <td>${item.kelurahan}</td>
      <td>${item.nmsls}</td>
    </tr>
  `).join("");

  // Struktur HTML Modal Bootstrap 5 (Tema Merah / Danger)
  const modalHtml = `
    <div class="modal fade" id="modalWarningProgress" tabindex="-1" aria-labelledby="modalWarningLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-scrollable">
        <!-- Menggunakan border-danger -->
        <div class="modal-content border-start border-danger border-5">
          <!-- Menggunakan bg-danger-subtle dan text-danger-emphasis -->
          <div class="modal-header bg-danger-subtle text-danger-emphasis">
            <h5 class="modal-title d-flex align-items-center" id="modalWarningLabel">
              <!-- Icon seru warna merah (text-danger) -->
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-octagon-fill me-2 text-danger" viewBox="0 0 16 16">
                <path d="M11.46.146A.5.5 0 0 0 11.107 0H4.893a.5.5 0 0 0-.353.146L.146 4.54A.5.5 0 0 0 0 4.893v6.214a.5.5 0 0 0 .146.353l4.394 4.394a.5.5 0 0 0 .353.146h6.214a.5.5 0 0 0 .353-.146l4.394-4.394a.5.5 0 0 0 .146-.353V4.893a.5.5 0 0 0-.146-.353L11.46.146zM8 4c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>
              Perhatian: Terdapat ${dataNol.length} SLS/SUB SLS dengan Progress 0%
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <!-- Teks Notifikasi Dinamis berdasarkan Role -->
            <p class="text-muted mb-3">${deskripsiNotif}</p>
            <div class="table-responsive" style="max-height: 400px;">
              <table class="table table-sm table-hover table-bordered align-middle" style="font-size: 13px;">
                <thead class="table-light sticky-top">
                  <tr>
                    <th class="text-center" width="40">No</th>
                    <th>Username</th>
                    <th class="text-center">IDSubSLS</th>
                    <th>Kecamatan</th>
                    <th>Kelurahan</th>
                    <th>Nama SLS</th>
                  </tr>
                </thead>
                <tbody>
                  ${tabelRows}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer bg-light">
            <!-- Tombol warna merah -->
            <button type="button" class="btn btn-danger px-4 fw-semibold" data-bs-dismiss="modal">Saya Mengerti & Tutup</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inject modal ke dalam body dokumen
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Inisialisasi dan tampilkan modal menggunakan class Bootstrap 5 instansiasi instan
  if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
    const warningModal = new bootstrap.Modal(document.getElementById("modalWarningProgress"));
    warningModal.show();
  } else {
    // Fallback jika library Bootstrap JS belum ter-load sempurna secara global
    console.warn("Bootstrap JS tidak terdeteksi. Menampilkan fallback modal.");
    const modalEl = document.getElementById("modalWarningProgress");
    modalEl.classList.add("show");
    modalEl.style.display = "block";
    modalEl.style.backgroundColor = "rgba(0,0,0,0.5)";
    
    // Handler penutup untuk fallback modal
    const closeButtons = modalEl.querySelectorAll('[data-bs-dismiss="modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        modalEl.style.display = "none";
        modalEl.remove();
      });
    });
  }
}