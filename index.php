<!DOCTYPE html>
<html lang="id" data-bs-theme="dark">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>SE2026 Monitoring Center</title>
    <link rel="icon" type="image/png" href="assets/img/favicon.png">

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

    <!-- Flatpickr (datepicker) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/themes/dark.css">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/l10n/id.js"></script>

    <style>
        /* ================================================================
           THEME TOKENS — DARK (default) & LIGHT
           ================================================================ */
        :root,
        [data-bs-theme="dark"] {
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

            /* alias yang tadinya di-hardcode */
            --cmp-card-bg: linear-gradient(180deg, #101827 0%, #0b1220 100%);
            --cmp-card-text: #ffffff;
            --cmp-head-text: #e5e7eb;
            --cmp-name-text: #f3f4f6;
            --value-white: #ffffff;
            --tbl-track-bg: rgba(255, 255, 255, .08);
            --tbl-label-text: #f1f5f9;
            --row-even-bg: rgba(255, 255, 255, .025);
            --row-hover-bg: rgba(59, 130, 246, .10);
        }

        [data-bs-theme="light"] {
            --bg: #f6f8fb;
            --bg-2: #ffffff;
            --card: linear-gradient(180deg, #ffffff 0%, #f3f5f9 100%);
            --card-solid: #ffffff;
            --text: #0f172a;
            --text-mute: #64748b;
            --border: #e2e8f0;
            --primary: #2563eb;
            --success: #16a34a;
            --warning: #d97706;
            --danger: #dc2626;
            --info: #0891b2;
            --purple: #7c3aed;
            --shadow: 0 8px 24px rgba(15, 23, 42, .08);

            --cmp-card-bg: linear-gradient(180deg, #ffffff 0%, #f3f5f9 100%);
            --cmp-card-text: #0f172a;
            --cmp-head-text: #0f172a;
            --cmp-name-text: #0f172a;
            --value-white: #0f172a;
            --tbl-track-bg: rgba(15, 23, 42, .08);
            --tbl-label-text: #0f172a;
            --row-even-bg: rgba(15, 23, 42, .03);
            --row-hover-bg: rgba(37, 99, 235, .08);
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
            transition: background .25s ease, color .25s ease;
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
            cursor: default;
        }

        .kpi-card:hover {
            transform: translateY(-4px);
            border-color: var(--primary);
        }

        .kpi-card:active {
            transform: translateY(-2px) scale(.98);
            transition-duration: .08s;
        }

        .chart-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 20px;
            box-shadow: var(--shadow);
            padding: 20px;
            margin-top: 25px;
            color: var(--text);
            transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease, background .25s ease;
            cursor: default;
        }

        .chart-card:hover {
            transform: translateY(-3px);
            border-color: var(--primary);
            box-shadow: 0 14px 36px rgba(59, 130, 246, .18);
        }

        .chart-card:active {
            transform: translateY(-1px) scale(.995);
            transition-duration: .08s;
        }

        .chart-card.equal-height {
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .cmp-card {
            background: var(--cmp-card-bg);
            border: 1px solid var(--border);
            border-radius: 18px;
            padding: 18px 16px;
            color: var(--cmp-card-text);
            height: 100%;
            box-shadow: var(--shadow);
            transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease, background .25s ease;
            cursor: default;
        }

        .cmp-card:hover {
            transform: translateY(-3px);
            border-color: var(--primary);
            box-shadow: 0 14px 36px rgba(59, 130, 246, .22);
        }

        .cmp-card:active {
            transform: translateY(-1px) scale(.995);
            transition-duration: .08s;
        }

        .cmp-row {
            transition: background-color .2s ease, padding-left .2s ease;
        }

        .cmp-row:hover {
            background: rgba(59, 130, 246, .06);
            padding-left: 10px;
            border-radius: 8px;
        }

        .performer-list .border-bottom {
            transition: background-color .2s ease, padding-left .2s ease;
            border-radius: 8px;
        }

        .performer-list .border-bottom:hover {
            background: rgba(59, 130, 246, .06);
            padding-left: 12px !important;
        }

        .kpi-card,
        .chart-card,
        .cmp-card {
            -webkit-tap-highlight-color: rgba(59, 130, 246, .15);
        }

        @media (hover: none) {

            .kpi-card:active,
            .chart-card:active,
            .cmp-card:active {
                border-color: var(--primary);
                transform: translateY(-3px);
            }
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

        /* Tabulator theme-aware */
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
            background-color: var(--row-even-bg) !important;
        }

        .tabulator-row:hover,
        .tabulator .tabulator-row:hover {
            background-color: var(--row-hover-bg) !important;
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
            color: var(--primary) !important;
        }

        .performer-list .text-success {
            color: var(--success) !important;
        }

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

        /* Upload modal */
        .drop-zone {
            border: 2px dashed var(--border);
            border-radius: 12px;
            padding: 22px 18px;
            text-align: center;
            transition: background-color .15s, border-color .15s;
            cursor: pointer;
            background: rgba(59, 130, 246, 0.03);
        }

        .drop-zone:hover,
        .drop-zone.is-dragover {
            border-color: var(--primary);
            background: rgba(59, 130, 246, 0.10);
        }

        .drop-zone-icon {
            font-size: 2rem;
            color: var(--primary);
            display: block;
            margin-bottom: 6px;
        }

        .drop-zone-title {
            font-weight: 600;
            font-size: 0.95rem;
            color: var(--text);
        }

        .drop-zone-sub {
            font-size: 0.82rem;
            color: var(--text-mute);
            margin-top: 4px;
        }

        .drop-zone code {
            background: rgba(127, 127, 127, 0.12);
            padding: 1px 6px;
            border-radius: 4px;
            color: var(--info);
        }

        .file-list {
            max-height: 300px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .file-list:empty::before {
            content: "Belum ada file dipilih.";
            color: var(--text-mute);
            font-size: 0.8rem;
            font-style: italic;
        }

        .file-item {
            background: var(--row-even-bg);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 8px 12px;
            display: grid;
            grid-template-columns: auto 1fr auto;
            grid-template-rows: auto auto;
            column-gap: 10px;
            row-gap: 4px;
            align-items: center;
        }

        .file-item .fi-status {
            width: 22px;
            text-align: center;
            font-size: 1rem;
            grid-row: 1 / span 2;
        }

        .file-item .fi-name {
            font-size: 0.88rem;
            font-weight: 600;
            color: var(--text);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .file-item .fi-meta {
            grid-column: 2;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
            font-size: 0.72rem;
            color: var(--text-mute);
        }

        .file-item .fi-actions {
            grid-column: 3;
            grid-row: 1 / span 2;
            display: flex;
            gap: 4px;
        }

        .file-item .fi-remove {
            background: transparent;
            border: 0;
            color: var(--text-mute);
            padding: 4px 8px;
            border-radius: 6px;
            cursor: pointer;
        }

        .file-item .fi-remove:hover {
            color: var(--danger);
            background: rgba(239, 68, 68, 0.1);
        }

        .file-item .fi-progress {
            grid-column: 1 / -1;
            height: 4px;
            background: var(--tbl-track-bg);
            border-radius: 3px;
            overflow: hidden;
            margin-top: 4px;
        }

        .file-item .fi-progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--primary), #6366f1);
            transition: width .2s ease;
        }

        .fi-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 0.68rem;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .fi-badge-pencacah {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
        }

        .fi-badge-pengawas {
            background: rgba(59, 130, 246, 0.18);
            color: #60a5fa;
        }

        .fi-badge-unknown {
            background: rgba(148, 163, 184, 0.15);
            color: #64748b;
        }

        .fi-badge-date {
            background: rgba(6, 182, 212, 0.15);
            color: #0891b2;
        }

        .fi-badge-error {
            background: rgba(239, 68, 68, 0.15);
            color: #dc2626;
        }

        .fi-error-msg {
            grid-column: 1 / -1;
            font-size: 0.72rem;
            color: var(--danger);
            margin-top: 2px;
        }

        .pw-input-wrap {
            position: relative;
        }

        .pw-input-wrap .form-control {
            padding-right: 44px;
        }

        .pw-input-toggle {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: 0;
            color: var(--text-mute);
            padding: 6px 8px;
            border-radius: 6px;
            cursor: pointer;
        }

        .pw-input-toggle:hover {
            color: var(--primary);
        }

        /* Comparison cards */
        .cmp-section {
            margin-top: 24px;
        }

        .cmp-head {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 13px;
            letter-spacing: .5px;
            text-transform: uppercase;
            color: var(--cmp-head-text);
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
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
            border-bottom: 1px dashed var(--border);
            font-size: 14px;
        }

        .cmp-row:last-child {
            border-bottom: none;
        }

        .cmp-name {
            color: var(--cmp-name-text);
            font-weight: 500;
        }

        .cmp-val {
            font-weight: 700;
            font-variant-numeric: tabular-nums;
        }

        .value-white {
            color: var(--value-white);
        }

        .value-green {
            color: var(--success);
        }

        .value-red {
            color: var(--danger);
        }

        .value-mute {
            color: var(--text-mute);
        }

        .cmp-empty {
            color: var(--text-mute);
            text-align: center;
            padding: 24px 0;
            font-size: 13px;
        }

        .cmp-subtitle {
            color: var(--text-mute);
            font-size: 13px;
            margin-top: 4px;
        }

        .cmp-subtitle.text-warning {
            color: var(--warning) !important;
        }

        /* Mobile compact */
        @media (max-width: 768px) {
            body {
                overflow-x: hidden;
            }

            .header {
                padding: 10px 12px;
                flex-direction: column;
                align-items: stretch;
                gap: 8px;
            }

            .logo {
                font-size: 15px;
                gap: 8px;
            }

            .logo i {
                font-size: 22px;
            }

            .sub-title {
                font-size: 10.5px;
            }

            .header-right {
                flex-wrap: wrap;
                gap: 6px;
                justify-content: flex-start;
            }

            .header-right>span {
                font-size: 11px;
                width: 100%;
                order: -1;
            }

            .header-right>.d-flex {
                flex: 1 1 100%;
                padding: 4px 8px !important;
            }

            .header-right>.d-flex select#viewDate,
            .header-right>.d-flex input#viewDate {
                width: auto !important;
                flex: 1;
                font-size: 12px;
            }

            .header-right>.d-flex label {
                font-size: 11px;
            }

            .btn-action {
                padding: 6px 10px;
                font-size: 12px;
                border-radius: 8px;
                line-height: 1.2;
            }

            .btn-action i {
                font-size: 13px;
            }

            .container-dashboard {
                padding: 12px;
            }

            .row.g-4 {
                --bs-gutter-x: .6rem;
                --bs-gutter-y: .6rem;
            }

            .row.mt-4 {
                margin-top: .75rem !important;
            }

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

            .kpi-title {
                font-size: 11px;
                margin-bottom: 4px;
            }

            .kpi-value {
                font-size: 20px;
            }

            .kpi-change {
                font-size: 10.5px;
                margin-top: 2px;
            }

            .chart-card {
                padding: 14px;
                border-radius: 14px;
                margin-top: 14px;
            }

            .chart-title {
                font-size: 14px;
                margin-bottom: 8px;
            }

            .section-title {
                font-size: 15px;
            }

            .chart-box {
                height: 280px;
            }

            .performer-list {
                max-height: 320px;
            }

            .performer-list .fw-semibold {
                font-size: 12.5px;
            }

            .performer-list small {
                font-size: 10.5px;
            }

            .performer-list .py-2 {
                padding-top: .35rem !important;
                padding-bottom: .35rem !important;
            }

            .progress {
                height: 16px;
                margin-top: 8px;
            }

            .progress-bar {
                font-size: 11px;
            }

            .cmp-section {
                margin-top: 14px;
            }

            .cmp-card {
                padding: 12px;
                border-radius: 14px;
            }

            .cmp-head {
                font-size: 11px;
                padding-bottom: 8px;
                margin-bottom: 6px;
            }

            .cmp-head i {
                font-size: 14px;
            }

            .cmp-row {
                font-size: 12px;
                padding: 8px 2px;
            }

            .cmp-subtitle {
                font-size: 11px;
            }

            .tabulator {
                border-radius: 10px;
                font-size: 11px;
            }

            .tabulator .tabulator-header .tabulator-col,
            .tabulator .tabulator-header .tabulator-col .tabulator-col-content {
                padding: 4px 6px !important;
            }

            .tabulator-col-title {
                font-size: 11px !important;
            }

            .tabulator-row .tabulator-cell,
            .tabulator-cell {
                padding: 4px 6px !important;
                font-size: 11px !important;
            }

            .tabulator-row,
            .tabulator .tabulator-row {
                min-height: 32px;
            }

            .tabulator .tabulator-header .tabulator-col .tabulator-header-filter input {
                padding: 2px 6px;
                font-size: 11px;
            }

            .tabulator-paginator,
            .tabulator-page,
            .tabulator-page-size {
                font-size: 11px !important;
                padding: 2px 6px !important;
            }

            .modal-dialog {
                margin: .5rem;
            }

            .modal-title {
                font-size: 15px;
            }

            footer small {
                font-size: 10.5px;
            }
        }

        @media (max-width: 420px) {
            .kpi-value {
                font-size: 18px;
            }

            .kpi-card i {
                font-size: 22px;
            }

            .chart-box {
                height: 240px;
            }

            .btn-action {
                padding: 5px 8px;
                font-size: 11.5px;
            }

            .logo {
                font-size: 14px;
            }

            .logo i {
                font-size: 20px;
            }
        }

        /* Tabs dark/light aware */
        .nav-tabs.nav-tabs-dark {
            border-bottom: 1px solid var(--border);
        }

        .nav-tabs.nav-tabs-dark .nav-link {
            color: var(--text-mute);
            background: transparent;
            border: 1px solid transparent;
            border-radius: 10px 10px 0 0;
            padding: 8px 16px;
            font-weight: 500;
            font-size: 14px;
            transition: .2s;
        }

        .nav-tabs.nav-tabs-dark .nav-link:hover {
            color: var(--text);
            border-color: var(--border) var(--border) transparent;
            background: rgba(59, 130, 246, .06);
        }

        .nav-tabs.nav-tabs-dark .nav-link.active {
            color: var(--primary);
            background: var(--bg-2);
            border-color: var(--border) var(--border) var(--bg-2);
            font-weight: 600;
        }

        .nav-tabs.nav-tabs-dark .nav-link i {
            font-size: 14px;
        }

        /* Progress cell in tabulator */
        .tbl-progress-wrap {
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 6px 4px 4px;
            width: 100%;
        }

        .tbl-progress-track {
            width: 100%;
            height: 7px;
            background: var(--tbl-track-bg);
            border-radius: 999px;
            overflow: hidden;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, .35);
        }

        .tbl-progress-fill {
            height: 100%;
            border-radius: 999px;
            transition: width .35s ease;
        }

        .tbl-progress-label {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-weight: 700;
            font-size: 11.5px;
            color: var(--tbl-label-text);
            font-variant-numeric: tabular-nums;
            letter-spacing: .2px;
            line-height: 1;
        }

        .tbl-progress-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            flex-shrink: 0;
            box-shadow: 0 0 0 2px rgba(127, 127, 127, .12);
        }

        @media (max-width: 768px) {
            .tbl-progress-label {
                font-size: 10.5px;
                gap: 4px;
            }

            .tbl-progress-dot {
                width: 6px;
                height: 6px;
            }
        }

        /* Role tabs */
        .role-tabs {
            display: inline-flex;
            background: var(--bg-2);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 4px;
            gap: 4px;
        }

        .role-tab {
            border: none;
            background: transparent;
            color: var(--text-mute);
            padding: 8px 18px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all .2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .role-tab:hover {
            color: var(--text);
        }

        .role-tab.active {
            background: var(--primary);
            color: #fff;
            box-shadow: 0 4px 12px rgba(59, 130, 246, .35);
        }

        .kpi-card.backlog-red {
            border-color: rgba(239, 68, 68, .5);
        }

        .kpi-card.backlog-yellow {
            border-color: rgba(245, 158, 11, .5);
        }

        .kpi-card.backlog-green {
            border-color: rgba(34, 197, 94, .35);
        }

        /* Flatpickr */
        .flatpickr-calendar {
            font-family: 'Inter', sans-serif;
            border: 1px solid var(--border);
            box-shadow: 0 12px 32px rgba(0, 0, 0, .45);
        }

        .flatpickr-day.has-data {
            font-weight: 600;
            color: var(--success) !important;
            position: relative;
        }

        .flatpickr-day.has-data::after {
            content: "";
            position: absolute;
            bottom: 4px;
            left: 50%;
            transform: translateX(-50%);
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--success);
            box-shadow: 0 0 6px rgba(34, 197, 94, .8);
        }

        .flatpickr-day.selected.has-data,
        .flatpickr-day.selected.has-data::after {
            color: #fff !important;
        }

        .flatpickr-day.selected.has-data::after {
            background: #fff;
            box-shadow: 0 0 6px rgba(255, 255, 255, .6);
        }

        .flatpickr-calendar .fp-legend {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 11px;
            color: var(--text);
            opacity: .75;
            padding: 6px 8px 8px;
            border-top: 1px solid var(--border);
        }

        .flatpickr-calendar .fp-legend .fp-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--success);
            box-shadow: 0 0 6px rgba(34, 197, 94, .8);
        }

        [data-bs-theme="light"] .flatpickr-calendar {
            background: #ffffff;
            color: #1f2937;
            border-color: #e5e7eb;
        }

        [data-bs-theme="light"] .flatpickr-months .flatpickr-month,
        [data-bs-theme="light"] .flatpickr-weekdays,
        [data-bs-theme="light"] .flatpickr-weekday {
            background: #ffffff;
            color: #1f2937;
            fill: #1f2937;
        }

        [data-bs-theme="light"] .flatpickr-day {
            color: #1f2937;
        }

        [data-bs-theme="light"] .flatpickr-day.flatpickr-disabled,
        [data-bs-theme="light"] .flatpickr-day.prevMonthDay,
        [data-bs-theme="light"] .flatpickr-day.nextMonthDay {
            color: #9ca3af;
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
                    <div class="sub-title">Monitoring Pencacah • Kota Dumai</div>
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
                <input id="viewDate" type="text" class="form-control form-control-sm" autocomplete="off"
                    placeholder="— Data Snapshot —" readonly
                    style="width: 170px; background: var(--bg-2); color: var(--text); border:1px solid var(--border); text-align:center; cursor:pointer;" />
                <button class="btn btn-sm btn-outline-light" id="btnViewLatest" title="Kembali ke data terbaru">
                    <i class="bi bi-house-door"></i>
                </button>
            </div>

            <button class="btn-action" id="btnOpenUpload"><i class="bi bi-upload"></i> Upload</button>
            <button class="btn-action" id="btnRefresh"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
            <button class="btn-action" id="btnDarkMode"><i class="bi bi-moon"></i></button>
            <button class="btn-action" id="btnFullscreen"><i class="bi bi-arrows-fullscreen"></i></button>
        </div>
    </header>

    <div class="container-dashboard">

        <div class="mb-4 d-flex justify-content-center">
            <div class="role-tabs">
                <button class="role-tab active" data-role-tab="pencacah">
                    <i class="bi bi-people-fill"></i> Pencacah
                </button>
                <button class="role-tab" data-role-tab="pengawas">
                    <i class="bi bi-shield-check"></i> Pengawas
                </button>
            </div>
        </div>

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
            foreach ($cards as $c) { ?>
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

        <div class="chart-card">
            <div class="d-flex justify-content-between align-items-center">
                <div class="chart-title">Progress Keseluruhan</div>
                <strong id="progressText">0%</strong>
            </div>
            <div class="progress">
                <div id="overallProgress" class="progress-bar bg-success progress-bar-striped progress-bar-animated"
                    style="width:0%">0%</div>
            </div>
        </div>

        <div class="cmp-section">
            <div class="d-flex justify-content-between align-items-end mb-2">
                <div>
                    <div class="chart-title" id="comparisonMainTitle">Perbandingan Harian PPL</div>
                    <div id="comparisonSubtitle" class="cmp-subtitle">Memuat...</div>
                </div>
            </div>
            <div class="row g-3" id="comparisonCards"></div>
        </div>

        <div class="row mt-4 g-4">
            <div class="col-xl-4 d-flex">
                <div class="chart-card equal-height w-100">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="chart-title">
                            <i class="bi bi-pie-chart-fill text-primary"></i> Status Dokumen
                        </div>
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
                            <span id="rankingTitle">Top Progress Pencacah</span>
                        </div>
                        <span class="text-secondary small">Top 10</span>
                    </div>
                    <div class="chart-body">
                        <div id="rankingChart" class="chart-box"></div>
                    </div>
                </div>
            </div>

            <div class="row mt-4 g-4">
                <div class="col-xl-6 d-flex">
                    <div class="chart-card equal-height w-100">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <div class="chart-title">
                                <i class="bi bi-geo-alt-fill text-danger"></i> Ranking Kecamatan
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
                            <div class="chart-title m-0">
                                <i class="bi bi-graph-up-arrow text-warning"></i> Distribusi Progress
                            </div>
                            <div class="d-inline-flex align-items-center gap-2">
                                <span
                                    class="badge bg-warning-subtle text-warning border border-warning-subtle fw-normal">
                                    Histogram
                                </span>
                                <button id="btnExportDistribution" type="button"
                                    class="btn btn-sm btn-success-subtle text-success border border-success-subtle"
                                    data-bs-toggle="tooltip" title="Export daftar petugas per bucket ke Excel">
                                    <i class="bi bi-file-earmark-excel me-1"></i> Export
                                </button>
                            </div>
                        </div>
                        <div class="chart-body">
                            <div id="distributionChart" class="chart-box"></div>
                        </div>
                    </div>
                </div>

                <div class="row mt-4 g-4">
                    <div class="col-lg-6">
                        <div class="chart-card">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="chart-title">🏆 Top Performer</div>
                                <span class="badge bg-success">Top 10</span>
                            </div>
                            <div id="topPerformer" class="performer-list"></div>
                        </div>
                    </div>
                    <div class="col-lg-6">
                        <div class="chart-card">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="chart-title">⚠️ Perlu Pendampingan</div>
                                <span class="badge bg-danger">Bottom 10</span>
                            </div>
                            <div id="bottomPerformer" class="performer-list"></div>
                        </div>
                    </div>
                </div>

                <div class="chart-card mt-4">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                        <div class="chart-title m-0">
                            <i class="bi bi-table"></i> <span id="tableTitle">Data Enumerator</span>
                        </div>
                        <div>
                            <button class="btn btn-success btn-sm" id="btnExport" data-testid="btn-export-excel">
                                <i class="bi bi-file-earmark-excel"></i> Export Excel
                            </button>
                        </div>
                    </div>

                    <ul class="nav nav-tabs nav-tabs-dark mb-3" id="tableTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="tab-summary-btn" data-bs-toggle="tab"
                                data-bs-target="#tab-summary" type="button" role="tab" data-testid="tab-summary">
                                <i class="bi bi-person-lines-fill me-1"></i> Ringkasan per Petugas
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="tab-detail-btn" data-bs-toggle="tab"
                                data-bs-target="#tab-detail" type="button" role="tab" data-testid="tab-detail">
                                <i class="bi bi-geo-alt me-1"></i> Detail per Kecamatan
                            </button>
                        </li>
                    </ul>

                    <div class="tab-content" id="tableTabsContent">
                        <div class="tab-pane fade show active" id="tab-summary" role="tabpanel"
                            data-testid="panel-summary">
                            <div id="gridTable"></div>
                        </div>
                        <div class="tab-pane fade" id="tab-detail" role="tabpanel" data-testid="panel-detail">
                            <div id="gridTableDetail"></div>
                        </div>
                    </div>
                </div>

                <div class="modal fade" id="uploadModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="bi bi-cloud-upload"></i>
                                    Upload JSON <span class="badge bg-secondary ms-1" id="uploadCount">0</span>
                                </h5>
                                <button class="btn-close" data-bs-dismiss="modal"
                                    data-testid="upload-modal-close"></button>
                            </div>

                            <div class="modal-body">
                                <div id="dropZone" class="drop-zone" data-testid="upload-dropzone">
                                    <i class="bi bi-cloud-upload drop-zone-icon"></i>
                                    <div class="drop-zone-title">Drag &amp; drop file <code>.json</code> di sini</div>
                                    <div class="drop-zone-sub">
                                        atau
                                        <button type="button" id="btnPickFiles"
                                            class="btn btn-sm btn-outline-primary ms-1" data-testid="upload-pick-files">
                                            Pilih file
                                        </button>
                                        &nbsp;·&nbsp; max <span id="maxBatchLbl">20</span> file, 10 MB per file
                                    </div>
                                    <input type="file" id="jsonFile" accept=".json,application/json" class="d-none"
                                        multiple data-testid="upload-file-input">
                                </div>

                                <div id="fileList" class="file-list mt-3" data-testid="upload-file-list"></div>

                                <div class="mt-3">
                                    <label for="uploadPassword" class="form-label small text-secondary mb-1">
                                        <i class="bi bi-shield-lock"></i> Password Upload
                                    </label>
                                    <div class="pw-input-wrap">
                                        <input type="password" id="uploadPassword" class="form-control"
                                            placeholder="Masukkan password upload" autocomplete="current-password"
                                            data-testid="upload-password">
                                        <button type="button" class="pw-input-toggle" id="btnTogglePw"
                                            data-testid="upload-toggle-pw">
                                            <i class="bi bi-eye"></i>
                                        </button>
                                    </div>
                                </div>

                                <div class="mt-3">
                                    <small class="text-secondary d-block">
                                        <i class="bi bi-info-circle"></i>
                                        Role &amp; tanggal dideteksi otomatis dari isi &amp; nama file. Tanggal <b>hari
                                            ini</b> menjadi data live + snapshot; tanggal lampau hanya snapshot.
                                    </small>
                                </div>
                            </div>

                            <div class="modal-footer">
                                <a href="audit.php" class="btn btn-outline-secondary me-auto" target="_blank"
                                    data-testid="upload-audit-link">
                                    <i class="bi bi-clipboard-data"></i> Audit Log
                                </a>
                                <button class="btn btn-secondary" data-bs-dismiss="modal"
                                    data-testid="upload-cancel">Batal</button>
                                <button id="btnUpload" class="btn btn-primary" data-testid="upload-submit">
                                    <i class="bi bi-cloud-arrow-up"></i> Upload Semua
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <footer class="text-center mt-5 mb-4 text-secondary">
                    <small>
                        SE2026 Monitoring Center<br>
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
            <script src="js/master_subsls.js"></script>
            <script src="js/table.js"></script>
            <script src="js/comparison.js"></script>
            <script src="js/app.js"></script>

</body>

</html>
