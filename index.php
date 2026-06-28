<!DOCTYPE html>
<html lang="id" data-bs-theme="dark">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>SE2026 Monitoring Center</title>

    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

    <!-- Google Font -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <link href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator_midnight.min.css" rel="stylesheet">

    <!-- ApexCharts -->
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>

    <!-- SweetAlert -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <style>
        :root {
            --bg: #070b14;
            --bg-2: #0b1220;
            --card: linear-gradient(180deg, #101827 0%, #0b1220 100%);
            --card-solid: #101827;
            --text: #f3f4f6;
            --text-mute: #9ca3af;
            --border: #1f2937;
            --primary: #3b82f6;
            --success: #22c55e;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
            --purple: #8b5cf6;
            --shadow: 0 10px 30px rgba(0, 0, 0, .35);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Inter, sans-serif;
        }

        body {
            background: var(--bg);
            color: var(--text);
        }

        .header {
            background: var(--card-solid);
            border-bottom: 1px solid var(--border);
            box-shadow: var(--shadow);
            padding: 18px 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 999;
        }

        .logo {
            font-size: 26px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--text);
        }

        .logo i {
            font-size: 32px;
            color: var(--primary);
        }

        .sub-title {
            font-size: 13px;
            color: var(--text-mute);
        }

        .header-right {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .header-right .text-secondary {
            color: var(--text-mute) !important;
        }

        .header-right strong {
            color: var(--text);
        }

        .btn-action {
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 10px 16px;
            background: var(--card-solid);
            color: var(--text);
            box-shadow: var(--shadow);
            transition: .2s;
        }

        .btn-action:hover {
            transform: translateY(-2px);
            border-color: var(--primary);
            color: var(--primary);
        }

        .container-dashboard {
            padding: 25px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 15px;
            color: var(--text);
        }

        .kpi-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 22px;
            box-shadow: var(--shadow);
            transition: .25s;
            height: 150px;
            position: relative;
            overflow: hidden;
            color: var(--text);
        }

        .kpi-card:hover {
            transform: translateY(-4px);
            border-color: var(--primary);
        }

        .kpi-card i {
            position: absolute;
            right: 20px;
            top: 20px;
            font-size: 40px;
            opacity: .18;
        }

        .kpi-title {
            font-size: 14px;
            color: var(--text-mute);
            margin-bottom: 10px;
        }

        .kpi-value {
            font-size: 34px;
            font-weight: 700;
            color: var(--text);
        }

        .kpi-change {
            margin-top: 8px;
            font-size: 13px;
            font-weight: 600;
        }

        .up {
            color: var(--success);
        }

        .down {
            color: var(--danger);
        }

        .chart-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            box-shadow: var(--shadow);
            padding: 20px;
            margin-top: 25px;
            color: var(--text);
        }

        .chart-card.equal-height {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .chart-body {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .chart-box {
            width: 100%;
            height: 400px;
        }

        .performer-list {
            max-height: 430px;
            overflow-y: auto;
            color: var(--text);
        }

        .performer-list::-webkit-scrollbar {
            width: 6px;
        }

        .performer-list::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 3px;
        }

        .chart-title {
            font-weight: 600;
            margin-bottom: 15px;
            color: var(--text);
        }

        .progress {
            height: 22px;
            border-radius: 30px;
            overflow: hidden;
            margin-top: 15px;
            background: var(--bg-2);
            border: 1px solid var(--border);
        }

        .progress-bar {
            font-weight: bold;
        }

        /* Tabulator dark (override midnight theme) */
        .tabulator {
            border: none !important;
            border-radius: 15px;
            background: transparent !important;
            color: var(--text) !important;
        }

        .tabulator,
        .tabulator-header,
        .tabulator .tabulator-header,
        .tabulator .tabulator-header .tabulator-col,
        .tabulator .tabulator-tableholder,
        .tabulator .tabulator-footer {
            background-color: var(--bg-2) !important;
            color: var(--text) !important;
            border-color: var(--border) !important;
        }

        .tabulator .tabulator-header .tabulator-col,
        .tabulator .tabulator-header .tabulator-col .tabulator-col-content,
        .tabulator .tabulator-header .tabulator-col-title,
        .tabulator-col-title {
            color: var(--text) !important;
        }

        .tabulator .tabulator-header .tabulator-col .tabulator-header-filter input {
            background: var(--card-solid) !important;
            color: var(--text) !important;
            border: 1px solid var(--border) !important;
            border-radius: 6px;
            padding: 4px 8px;
        }

        .tabulator-row,
        .tabulator .tabulator-row {
            min-height: 42px;
            background-color: transparent !important;
            color: var(--text) !important;
            border-bottom: 1px solid var(--border) !important;
        }

        .tabulator-row.tabulator-row-even,
        .tabulator .tabulator-row.tabulator-row-even {
            background-color: rgba(255, 255, 255, .025) !important;
        }

        .tabulator-row:hover,
        .tabulator .tabulator-row:hover {
            background-color: rgba(59, 130, 246, .10) !important;
        }

        .tabulator-row .tabulator-cell,
        .tabulator-cell {
            white-space: nowrap;
            border-right: 1px solid var(--border) !important;
            color: var(--text) !important;
            background: transparent !important;
        }

        .tabulator-paginator,
        .tabulator-page,
        .tabulator-page-size {
            color: var(--text) !important;
            background: var(--card-solid) !important;
            border: 1px solid var(--border) !important;
        }

        .tabulator-page.active {
            background: var(--primary) !important;
            color: #fff !important;
            border-color: var(--primary) !important;
        }

        .tabulator-placeholder span {
            color: var(--text-mute) !important;
        }

        /* Performer List (Top Performer / Perlu Pendampingan) */
        .performer-list .border-bottom {
            border-color: var(--border) !important;
        }

        .performer-list .fw-semibold {
            color: var(--text);
        }

        .performer-list .text-secondary,
        .performer-list small.text-secondary {
            color: var(--text-mute) !important;
        }

        .performer-list strong {
            color: var(--text);
        }

        .performer-list .text-primary {
            color: #60a5fa !important;
        }

        .performer-list .text-success {
            color: #4ade80 !important;
        }

        /* Modal dark */
        .modal-content {
            background: var(--card-solid);
            color: var(--text);
            border: 1px solid var(--border);
        }

        .modal-header,
        .modal-footer {
            border-color: var(--border);
        }

        .modal-content .form-control {
            background: var(--bg-2);
            color: var(--text);
            border: 1px solid var(--border);
        }

        .modal-content .form-control::file-selector-button {
            background: var(--card-solid);
            color: var(--text);
            border: none;
        }

        .modal-content .text-secondary {
            color: var(--text-mute) !important;
        }

        /* === Comparison Cards === */
        .cmp-section {
            margin-top: 24px;
        }

        .cmp-card {
            background: linear-gradient(180deg, #101827 0%, #0b1220 100%);
            border: 1px solid #1f2937;
            border-radius: 18px;
            padding: 18px 16px;
            color: #fff;
            height: 100%;
            box-shadow: 0 8px 24px rgba(0, 0, 0, .25);
        }

        .cmp-head {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 13px;
            letter-spacing: .5px;
            text-transform: uppercase;
            color: #e5e7eb;
            padding-bottom: 12px;
            border-bottom: 1px solid #1f2937;
            margin-bottom: 10px;
        }

        .cmp-head i {
            font-size: 18px;
        }

        .cmp-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 4px;
            border-bottom: 1px dashed #1f2937;
            font-size: 14px;
        }

        .cmp-row:last-child {
            border-bottom: none;
        }

        .cmp-name {
            color: #f3f4f6;
            font-weight: 500;
        }

        .cmp-val {
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }

        .value-white {
            color: #ffffff;
        }

        .value-green {
            color: #22c55e;
        }

        .value-red {
            color: #ef4444;
        }

        .value-mute {
            color: #9ca3af;
        }

        .cmp-empty {
            color: #9ca3af;
            text-align: center;
            padding: 24px 0;
            font-size: 13px;
        }

        .cmp-subtitle {
            color: #6b7280;
            font-size: 13px;
            margin-top: 4px;
        }

        .cmp-subtitle.text-warning {
            color: #f59e0b !important;
        }

        /* ============================= */
        /* MOBILE — COMPACT MODE         */
        /* ============================= */
        @media (max-width: 768px) {

            /* Hilangkan horizontal scroll body */
            body { overflow-x: hidden; }

            /* Header: stack vertikal, padat */
            .header {
                padding: 10px 12px;
                flex-direction: column;
                align-items: stretch;
                gap: 8px;
            }
            .logo { font-size: 15px; gap: 8px; }
            .logo i { font-size: 22px; }
            .sub-title { font-size: 10.5px; }

            .header-right {
                flex-wrap: wrap;
                gap: 6px;
                justify-content: flex-start;
            }
            .header-right > span {
                font-size: 11px;
                width: 100%;
                order: -1;
            }
            .header-right > .d-flex {
                flex: 1 1 100%;
                padding: 4px 8px !important;
            }
            .header-right > .d-flex select#viewDate {
                width: auto !important;
                flex: 1;
                font-size: 12px;
            }
            .header-right > .d-flex label { font-size: 11px; }

            .btn-action {
                padding: 6px 10px;
                font-size: 12px;
                border-radius: 8px;
                line-height: 1.2;
            }
            .btn-action i { font-size: 13px; }

            /* Container padding lebih kecil */
            .container-dashboard { padding: 12px; }

            /* Tighter gutter */
            .row.g-4 { --bs-gutter-x: .6rem; --bs-gutter-y: .6rem; }
            .row.mt-4 { margin-top: .75rem !important; }

            /* KPI cards compact */
            .kpi-card {
                height: auto;
                min-height: 88px;
                padding: 12px 14px;
                border-radius: 14px;
            }
            .kpi-card i {
                font-size: 26px;
                right: 12px;
                top: 12px;
            }
            .kpi-title { font-size: 11px; margin-bottom: 4px; }
            .kpi-value { font-size: 20px; }
            .kpi-change { font-size: 10.5px; margin-top: 2px; }

            /* Chart cards */
            .chart-card {
                padding: 14px;
                border-radius: 14px;
                margin-top: 14px;
            }
            .chart-title { font-size: 14px; margin-bottom: 8px; }
            .section-title { font-size: 15px; }

            /* Chart boxes — pendekkan supaya muat layar */
            .chart-box { height: 280px; }

            /* Performer list compact */
            .performer-list { max-height: 320px; }
            .performer-list .fw-semibold { font-size: 12.5px; }
            .performer-list small { font-size: 10.5px; }
            .performer-list .py-2 { padding-top: .35rem !important; padding-bottom: .35rem !important; }

            /* Progress bar */
            .progress { height: 16px; margin-top: 8px; }
            .progress-bar { font-size: 11px; }

            /* Comparison cards */
            .cmp-section { margin-top: 14px; }
            .cmp-card { padding: 12px; border-radius: 14px; }
            .cmp-head { font-size: 11px; padding-bottom: 8px; margin-bottom: 6px; }
            .cmp-head i { font-size: 14px; }
            .cmp-row { font-size: 12px; padding: 8px 2px; }
            .cmp-subtitle { font-size: 11px; }

            /* Tabulator: compact + scroll horizontal sendiri */
            .tabulator { border-radius: 10px; font-size: 11px; }
            .tabulator .tabulator-header .tabulator-col,
            .tabulator .tabulator-header .tabulator-col .tabulator-col-content {
                padding: 4px 6px !important;
            }
            .tabulator-col-title { font-size: 11px !important; }
            .tabulator-row .tabulator-cell,
            .tabulator-cell {
                padding: 4px 6px !important;
                font-size: 11px !important;
            }
            .tabulator-row,
            .tabulator .tabulator-row { min-height: 32px; }
            .tabulator .tabulator-header .tabulator-col .tabulator-header-filter input {
                padding: 2px 6px;
                font-size: 11px;
            }
            .tabulator-paginator,
            .tabulator-page,
            .tabulator-page-size { font-size: 11px !important; padding: 2px 6px !important; }

            /* Modal */
            .modal-dialog { margin: .5rem; }
            .modal-title { font-size: 15px; }

            /* Footer */
            footer small { font-size: 10.5px; }
        }

        /* Extra compact untuk HP sangat kecil */
        @media (max-width: 420px) {
            .kpi-value { font-size: 18px; }
            .kpi-card i { font-size: 22px; }
            .chart-box { height: 240px; }
            .btn-action { padding: 5px 8px; font-size: 11.5px; }
            .logo { font-size: 14px; }
            .logo i { font-size: 20px; }
        }

    </style>

</head>

<body>

    <header class="header">

        <div>
            <div class="logo">
                <i class="bi bi-bar-chart-fill"></i>
                <div>
                    SE2026 Monitoring Center
                    <div class="sub-title">
                        Monitoring Pencacah • Kota Dumai
                    </div>
                </div>
            </div>
        </div>

        <div class="header-right">

            <span class="text-secondary">
                <i class="bi bi-clock-history"></i>
                Last Update
                <strong id="lastUpdate">-</strong>
            </span>

            <div class="d-flex align-items-center gap-2"
                style="background: var(--card-solid); border:1px solid var(--border); border-radius:10px; padding:6px 10px;">
                <i class="bi bi-calendar3"></i>
                <label for="viewDate" class="m-0 small text-secondary">Lihat:</label>
                <select id="viewDate" class="form-select form-select-sm"
                    style="width: 200px; background: var(--bg-2); color: var(--text); border:1px solid var(--border);">
                    <option value="">— Data Terbaru (Live) —</option>
                </select>
                <button class="btn btn-sm btn-outline-light" id="btnViewLatest" title="Kembali ke data terbaru">
                    <i class="bi bi-house-door"></i>
                </button>
            </div>

            <button class="btn-action" id="btnOpenUpload">
                <i class="bi bi-upload"></i>
                Upload
            </button>

            <button class="btn-action" id="btnRefresh">
                <i class="bi bi-arrow-clockwise"></i>
                Refresh
            </button>

            <button class="btn-action" id="btnDarkMode">
                <i class="bi bi-moon"></i>
            </button>

            <button class="btn-action" id="btnFullscreen">
                <i class="bi bi-arrows-fullscreen"></i>
            </button>

        </div>

    </header>

    <div class="container-dashboard">

        <div class="row g-4">

            <?php

            $cards = [
                ["Assignment", "assignment", "bi-folder2-open", "#2563eb"],
                ["Open", "open", "bi-folder", "#0ea5e9"],
                ["Draft", "draft", "bi-pencil-square", "#f59e0b"],
                ["Submitted", "submitted", "bi-send-check", "#22c55e"],
                ["Approved", "approved", "bi-patch-check", "#8b5cf6"],
                ["Rejected", "rejected", "bi-x-circle", "#ef4444"],
                ["Revoke", "revoke", "bi-arrow-counterclockwise", "#374151"],
                ["Progress", "progress", "bi-speedometer2", "#10b981"]
            ];

            foreach ($cards as $c) {
                ?>
                <div class="col-6 col-md-6 col-lg-4 col-xl-3">
                    <div class="kpi-card">
                        <i class="bi <?= $c[2] ?>" style="color:<?= $c[3] ?>"></i>
                        <div class="kpi-title"><?= $c[0] ?></div>
                        <div id="<?= $c[1] ?>" class="kpi-value">0</div>
                        <div id="<?= $c[1] ?>Change" class="kpi-change up">▲ 0</div>
                    </div>
                </div>
            <?php } ?>

        </div>

        <!-- ============================= -->
        <!-- PROGRESS KESELURUHAN -->
        <!-- ============================= -->

        <div class="chart-card">

            <div class="d-flex justify-content-between align-items-center">
                <div class="chart-title">Progress Keseluruhan</div>
                <strong id="progressText">0%</strong>
            </div>

            <div class="progress">
                <div id="overallProgress" class="progress-bar bg-success progress-bar-striped progress-bar-animated"
                    style="width:0%">
                    0%
                </div>
            </div>

        </div>

        <!-- ============================= -->
        <!-- COMPARISON: HARI INI vs KEMARIN -->
        <!-- ============================= -->

        <div class="cmp-section">

            <div class="d-flex justify-content-between align-items-end mb-2">
                <div>
                    <div class="chart-title">Perbandingan Harian PPL</div>
                    <div id="comparisonSubtitle" class="cmp-subtitle">Memuat...</div>
                </div>
            </div>

            <div class="row g-3" id="comparisonCards">
                <!-- diisi javascript -->
            </div>

        </div>

        <!-- ============================= -->
        <!-- ROW 1 : STATUS & RANKING -->
        <!-- ============================= -->

        <div class="row mt-4 g-4">

            <div class="col-xl-4 d-flex">
                <div class="chart-card equal-height w-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="chart-title">
                            <i class="bi bi-pie-chart-fill text-primary"></i>
                            Status Dokumen
                        </div>
                        <span class="badge bg-primary">Live</span>
                    </div>
                    <div class="chart-body">
                        <div id="statusChart" class="chart-box"></div>
                    </div>
                </div>
            </div>

            <div class="col-xl-8 d-flex">
                <div class="chart-card equal-height w-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="chart-title">
                            <i class="bi bi-bar-chart-line-fill text-success"></i>
                            Top Progress Pencacah
                        </div>
                        <span class="text-secondary small">Top 20</span>
                    </div>
                    <div class="chart-body">
                        <div id="rankingChart" class="chart-box"></div>
                    </div>
                </div>
            </div>

        </div>

        <!-- ============================= -->
        <!-- ROW 2 -->
        <!-- ============================= -->

        <div class="row mt-4 g-4">

            <div class="col-xl-6 d-flex">
                <div class="chart-card equal-height w-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="chart-title">
                            <i class="bi bi-geo-alt-fill text-danger"></i>
                            Ranking Kecamatan
                        </div>
                        <span class="badge bg-danger">Progress</span>
                    </div>
                    <div class="chart-body">
                        <div id="districtChart" class="chart-box"></div>
                    </div>
                </div>
            </div>

            <div class="col-xl-6 d-flex">
                <div class="chart-card equal-height w-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="chart-title">
                            <i class="bi bi-graph-up-arrow text-warning"></i>
                            Distribusi Progress
                        </div>
                        <span class="badge bg-warning text-dark">Histogram</span>
                    </div>
                    <div class="chart-body">
                        <div id="distributionChart" class="chart-box"></div>
                    </div>
                </div>
            </div>

            <!-- ============================= -->
            <!-- TOP & BOTTOM -->
            <!-- ============================= -->

            <div class="row mt-4 g-4">

                <div class="col-lg-6">
                    <div class="chart-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="chart-title">🏆 Top Performer</div>
                            <span class="badge bg-success">Top 10</span>
                        </div>
                        <div id="topPerformer" class="performer-list">
                            <!-- diisi javascript -->
                        </div>
                    </div>
                </div>

                <div class="col-lg-6">
                    <div class="chart-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="chart-title">⚠️ Perlu Pendampingan</div>
                            <span class="badge bg-danger">Bottom 10</span>
                        </div>
                        <div id="bottomPerformer" class="performer-list">
                            <!-- diisi javascript -->
                        </div>
                    </div>
                </div>

            </div>

            <!-- ============================= -->
            <!-- DATA GRID -->
            <!-- ============================= -->

            <div class="chart-card mt-4">

                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="chart-title">
                        <i class="bi bi-table"></i>
                        Data Enumerator
                    </div>
                    <div>
                        <button class="btn btn-success btn-sm" id="btnExport">
                            <i class="bi bi-file-earmark-excel"></i>
                            Export Excel
                        </button>
                    </div>
                </div>

                <div id="gridTable"></div>

            </div>

            <!-- ============================= -->
            <!-- UPLOAD MODAL -->
            <!-- ============================= -->

            <div class="modal fade" id="uploadModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">

                        <div class="modal-header">
                            <h5 class="modal-title">Upload JSON</h5>
                            <button class="btn-close" data-bs-dismiss="modal"></button>
                        </div>

                        <div class="modal-body">
                            <input type="file" id="jsonFile" accept=".json" class="form-control">
                            <div class="mt-3">
                                <small class="text-secondary">
                                    Pilih latest.json hasil export FASIH.
                                </small>
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                            <button id="btnUpload" class="btn btn-primary">Upload</button>
                        </div>

                    </div>
                </div>
            </div>

            <!-- ============================= -->
            <!-- FOOTER -->
            <!-- ============================= -->

            <footer class="text-center mt-5 mb-4 text-secondary">
                <small>
                    SE2026 Monitoring Center
                    <br>
                    Powered by Bootstrap 5 • ApexCharts • Grid.js
                </small>
            </footer>

        </div>

        <!-- Bootstrap -->
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

        <!-- SheetJS -->
        <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>

        <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>

        <!-- JS -->
        <script src="js/helper.js"></script>
        <script src="js/processor.js"></script>
        <script src="js/charts.js"></script>
        <script src="js/table.js"></script>
        <script src="js/comparison.js"></script>
        <script src="js/app.js"></script>

</body>

</html>
