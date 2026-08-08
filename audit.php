<!DOCTYPE html>
<html lang="id" data-bs-theme="dark">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Audit Log — SE2026 Monitoring Center</title>
    <link rel="icon" type="image/png" href="assets/img/favicon.png">

    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">

    <!-- Google Font (konsisten dengan index.php) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Tabulator -->
    <link href="https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator_midnight.min.css" rel="stylesheet" id="tab-css">
    <script src="https://unpkg.com/tabulator-tables@6.3.0/dist/js/tabulator.min.js"></script>

    <!-- Flatpickr -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/themes/dark.css" id="fp-theme">
    <script src="https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js"></script>

    <!-- SweetAlert -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- SheetJS (Export Excel) -->
    <script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>

    <style>
        :root {
            --bg: #070b14;
            --bg-2: #0b1220;
            --card: #101827;
            --text: #f3f4f6;
            --text-mute: #9ca3af;
            --border: #1f2937;
            --primary: #3b82f6;
            --success: #22c55e;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #06b6d4;
        }
        [data-bs-theme="light"] {
            --bg: #f8fafc;
            --bg-2: #eef2f7;
            --card: #ffffff;
            --text: #111827;
            --text-mute: #6b7280;
            --border: #e5e7eb;
        }
        html, body {
            background: var(--bg);
            color: var(--text);
            font-family: 'Inter', system-ui, sans-serif;
        }
        .page-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 20px 80px; }
        .brand {
            display: flex; align-items: center; gap: 14px; margin-bottom: 6px;
        }
        .brand h1 { font-size: 1.35rem; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
        .brand .sub { color: var(--text-mute); font-size: 0.85rem; margin-top: 2px; }
        .brand .badge-audit {
            background: linear-gradient(135deg, #0ea5e9, #6366f1);
            color: #fff; padding: 4px 10px; border-radius: 999px; font-size: 0.7rem; font-weight: 600;
            letter-spacing: 0.04em;
        }
        .toolbar {
            background: var(--card); border: 1px solid var(--border); border-radius: 14px;
            padding: 14px 16px; margin-bottom: 16px;
            display: flex; flex-wrap: wrap; gap: 10px; align-items: end;
        }
        .toolbar .field { display: flex; flex-direction: column; gap: 4px; }
        .toolbar label { font-size: 0.72rem; color: var(--text-mute); text-transform: uppercase; letter-spacing: 0.05em; }
        .toolbar input, .toolbar select {
            background: var(--bg-2); border: 1px solid var(--border); color: var(--text);
            border-radius: 8px; padding: 6px 10px; min-width: 140px; font-size: 0.88rem;
        }
        .toolbar input:focus, .toolbar select:focus { outline: none; border-color: var(--primary); }
        .toolbar .spacer { flex: 1; }
        .btn-ghost {
            background: transparent; border: 1px solid var(--border); color: var(--text);
            padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;
        }
        .btn-ghost:hover { border-color: var(--primary); color: var(--primary); }
        .btn-primary-cst {
            background: linear-gradient(135deg, #3b82f6, #6366f1);
            border: 0; color: #fff; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem;
            font-weight: 600; cursor: pointer;
        }
        .btn-primary-cst:hover { filter: brightness(1.08); }
        .btn-success-cst {
            background: linear-gradient(135deg, #16a34a, #22c55e);
            border: 0; color: #fff; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem;
            font-weight: 600; cursor: pointer;
        }
        .btn-success-cst:hover { filter: brightness(1.08); }
        .btn-danger-cst {
            background: transparent; border: 1px solid var(--danger); color: var(--danger);
            padding: 6px 12px; border-radius: 8px; font-size: 0.85rem; cursor: pointer;
        }
        .card-wrap {
            background: var(--card); border: 1px solid var(--border); border-radius: 14px;
            padding: 4px; overflow: hidden;
        }
        .stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
        .stat {
            background: var(--card); border: 1px solid var(--border); border-radius: 12px;
            padding: 10px 14px; min-width: 140px;
        }
        .stat .lbl { font-size: 0.72rem; color: var(--text-mute); text-transform: uppercase; letter-spacing: 0.06em; }
        .stat .val { font-size: 1.35rem; font-weight: 700; margin-top: 2px; }
        .stat.success .val { color: var(--success); }
        .stat.danger  .val { color: var(--danger); }
        .stat.warning .val { color: var(--warning); }
        .badge-status {
            display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 0.7rem;
            font-weight: 600; letter-spacing: 0.02em;
        }
        .badge-success { background: rgba(34,197,94,0.15); color: #22c55e; }
        .badge-failed  { background: rgba(239,68,68,0.15); color: #ef4444; }
        .badge-role-pencacah { background: rgba(34,197,94,0.15); color: #22c55e; }
        .badge-role-pengawas { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .badge-action {
            background: rgba(148,163,184,0.15); color: #cbd5e1; padding: 2px 8px;
            border-radius: 6px; font-size: 0.72rem; font-family: 'JetBrains Mono', monospace;
        }
        /* Tabulator overrides */
        .tabulator { background: transparent; border: 0; }
        .tabulator .tabulator-header { border-bottom: 1px solid var(--border); }
        .tabulator .tabulator-row { border-bottom: 1px solid var(--border); }
        /* Login card */
        .login-wrap {
            min-height: 70vh; display: flex; align-items: center; justify-content: center;
        }
        .login-card {
            background: var(--card); border: 1px solid var(--border); border-radius: 16px;
            padding: 32px 28px; width: 100%; max-width: 380px;
        }
        .login-card h2 { font-size: 1.15rem; font-weight: 700; margin-bottom: 6px; }
        .login-card p { color: var(--text-mute); font-size: 0.85rem; margin-bottom: 20px; }
        .pw-wrap { position: relative; }
        .pw-wrap input {
            width: 100%; background: var(--bg-2); border: 1px solid var(--border); color: var(--text);
            border-radius: 10px; padding: 10px 40px 10px 12px; font-size: 0.92rem;
        }
        .pw-toggle {
            position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
            background: transparent; border: 0; color: var(--text-mute); cursor: pointer;
        }
        .hint { font-size: 0.72rem; color: var(--text-mute); margin-top: 10px; }
        [data-bs-theme="light"] .tabulator-midnight { display: none; }
    </style>
</head>

<body>
<div class="page-wrap">

    <div class="d-flex justify-content-between align-items-start mb-3">
        <div class="brand">
            <div>
                <div class="d-flex align-items-center gap-2">
                    <h1>Audit Log</h1>
                    <span class="badge-audit">ADMIN</span>
                </div>
                <div class="sub">SE2026 Monitoring Center · retensi <span id="retention">90</span> hari</div>
            </div>
        </div>
        <div class="d-flex gap-2">
            <a href="index.php" class="btn-ghost text-decoration-none">
                <i class="bi bi-arrow-left"></i> Dashboard
            </a>
            <button id="btnDarkMode" class="btn-ghost" title="Toggle theme">
                <i class="bi bi-moon-stars"></i>
            </button>
            <button id="btnLogout" class="btn-danger-cst" style="display:none">
                <i class="bi bi-box-arrow-right"></i> Logout
            </button>
        </div>
    </div>

    <!-- LOGIN -->
    <div id="loginView" class="login-wrap" style="display:none">
        <form id="loginForm" class="login-card" autocomplete="off">
            <h2><i class="bi bi-shield-lock"></i> Password Admin</h2>
            <p>Masukkan password admin untuk melihat audit log.</p>
            <div class="pw-wrap">
                <input type="password" id="adminPassword" data-testid="audit-admin-password" placeholder="Password admin" autocomplete="current-password" required>
                <button type="button" class="pw-toggle" id="togglePw" data-testid="audit-toggle-pw">
                    <i class="bi bi-eye"></i>
                </button>
            </div>
            <button type="submit" class="btn-primary-cst w-100 mt-3" data-testid="audit-login-btn">
                <i class="bi bi-unlock"></i> Masuk
            </button>
            <div class="hint">Sesi akan aktif hingga Anda logout atau menutup browser.</div>
        </form>
    </div>

    <!-- MAIN -->
    <div id="mainView" style="display:none">
        <div class="stats" id="stats"></div>

        <div class="toolbar">
            <div class="field">
                <label>Tanggal Mulai</label>
                <input type="text" id="fltFrom" placeholder="dari" data-testid="filter-from">
            </div>
            <div class="field">
                <label>Tanggal Selesai</label>
                <input type="text" id="fltTo" placeholder="sampai" data-testid="filter-to">
            </div>
            <div class="field">
                <label>Action</label>
                <select id="fltAction" data-testid="filter-action">
                    <option value="">Semua</option>
                    <option value="upload_success">upload_success</option>
                    <option value="upload_failed">upload_failed</option>
                    <option value="login_failed">login_failed</option>
                    <option value="admin_login_success">admin_login_success</option>
                    <option value="admin_login_failed">admin_login_failed</option>
                </select>
            </div>
            <div class="field">
                <label>Status</label>
                <select id="fltStatus" data-testid="filter-status">
                    <option value="">Semua</option>
                    <option value="success">success</option>
                    <option value="failed">failed</option>
                </select>
            </div>
            <div class="field">
                <label>Role</label>
                <select id="fltRole" data-testid="filter-role">
                    <option value="">Semua</option>
                    <option value="pencacah">pencacah</option>
                    <option value="pengawas">pengawas</option>
                </select>
            </div>
            <div class="field" style="flex:1; min-width:200px">
                <label>Keyword (filename / IP / error)</label>
                <input type="text" id="fltKeyword" placeholder="cari…" data-testid="filter-keyword">
            </div>
            <div class="spacer"></div>
            <button id="btnReset" class="btn-ghost" data-testid="btn-reset">Reset</button>
            <button id="btnReload" class="btn-ghost" data-testid="btn-reload"><i class="bi bi-arrow-clockwise"></i> Reload</button>
            <button id="btnExport" class="btn-success-cst" data-testid="btn-export"><i class="bi bi-file-earmark-excel"></i> Export Excel</button>
        </div>

        <div class="card-wrap">
            <div id="auditTable"></div>
        </div>
    </div>

</div>

<script>
/* =============================================================
 * Audit viewer — vanilla JS
 * ============================================================= */

const API = 'api/audit.php';
let table = null;
let allEntries = [];
let fpFrom = null, fpTo = null;

const $ = (id) => document.getElementById(id);

function toastErr(msg) {
    Swal.fire({ icon: 'error', title: 'Error', text: msg });
}

async function apiCall(action, method = 'GET', body = null) {
    const opts = { method, credentials: 'same-origin', cache: 'no-store' };
    let url = `${API}?action=${encodeURIComponent(action)}`;
    if (method === 'POST') {
        const fd = new FormData();
        if (body) for (const [k, v] of Object.entries(body)) fd.append(k, v);
        opts.body = fd;
    }
    const res = await fetch(url, opts);
    let j;
    try { j = await res.json(); } catch { j = { status: 'error', message: `HTTP ${res.status}` }; }
    return { ok: res.ok, code: res.status, data: j };
}

async function checkStatus() {
    const r = await apiCall('status');
    if (r.ok && r.data.status === 'ok' && r.data.logged_in) {
        showMain();
    } else {
        showLogin();
    }
}

function showLogin() {
    $('loginView').style.display = 'flex';
    $('mainView').style.display = 'none';
    $('btnLogout').style.display = 'none';
    setTimeout(() => $('adminPassword')?.focus(), 100);
}

function showMain() {
    $('loginView').style.display = 'none';
    $('mainView').style.display = 'block';
    $('btnLogout').style.display = 'inline-block';
    initFilters();
    reload();
}

function fmtTs(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d)) return ts;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function badgeStatus(v) {
    if (!v) return '';
    const cls = v === 'success' ? 'badge-success' : 'badge-failed';
    return `<span class="badge-status ${cls}">${v}</span>`;
}
function badgeRole(v) {
    if (!v) return '<span class="text-secondary">—</span>';
    const cls = v === 'pengawas' ? 'badge-role-pengawas' : v === 'pencacah' ? 'badge-role-pencacah' : '';
    return `<span class="badge-status ${cls}">${v}</span>`;
}
function badgeAction(v) {
    if (!v) return '';
    return `<span class="badge-action">${v}</span>`;
}

function initTable() {
    if (table) return;
    table = new Tabulator('#auditTable', {
        layout: 'fitDataStretch',
        height: '68vh',
        placeholder: 'Belum ada data audit.',
        data: [],
        columns: [
            { title: 'Waktu (Lokal)', field: 'ts', width: 180, formatter: (c) => fmtTs(c.getValue()), sorter: 'string' },
            { title: 'Action', field: 'action', width: 180, formatter: (c) => badgeAction(c.getValue()) },
            { title: 'Status', field: 'status', width: 110, formatter: (c) => badgeStatus(c.getValue()) },
            { title: 'Role', field: 'role', width: 110, formatter: (c) => badgeRole(c.getValue()) },
            { title: 'Filename', field: 'filename', width: 260, formatter: (c) => c.getValue() || '<span class="text-secondary">—</span>' },
            { title: 'Date Snapshot', field: 'date', width: 130 },
            { title: 'Size (byte)', field: 'size', width: 110, hozAlign: 'right',
              formatter: (c) => c.getValue() != null ? Number(c.getValue()).toLocaleString('id-ID') : '' },
            { title: 'IP', field: 'ip', width: 130 },
            { title: 'Error', field: 'error', minWidth: 240,
              formatter: (c) => c.getValue() ? `<span style="color:#f87171">${escapeHtml(c.getValue())}</span>` : '<span class="text-secondary">—</span>' },
            { title: 'User-Agent', field: 'ua', width: 260,
              formatter: (c) => `<span class="text-secondary" title="${escapeHtml(c.getValue()||'')}">${escapeHtml((c.getValue()||'').slice(0,60))}${(c.getValue()||'').length>60?'…':''}</span>` },
        ],
    });
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initFilters() {
    if (!fpFrom) {
        fpFrom = flatpickr('#fltFrom', { dateFormat: 'Y-m-d', locale: (flatpickr.l10ns && flatpickr.l10ns.id) || 'default', onChange: applyFilters });
    }
    if (!fpTo) {
        fpTo = flatpickr('#fltTo', { dateFormat: 'Y-m-d', locale: (flatpickr.l10ns && flatpickr.l10ns.id) || 'default', onChange: applyFilters });
    }
    ['fltAction','fltStatus','fltRole'].forEach(id => $(id).addEventListener('change', applyFilters));
    let tmr = null;
    $('fltKeyword').addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(applyFilters, 200); });
    $('btnReset').addEventListener('click', () => {
        fpFrom?.clear(); fpTo?.clear();
        ['fltAction','fltStatus','fltRole','fltKeyword'].forEach(id => { $(id).value=''; });
        applyFilters();
    });
    $('btnReload').addEventListener('click', reload);
    $('btnExport').addEventListener('click', exportExcel);
    $('btnLogout').addEventListener('click', doLogout);
}

function applyFilters() {
    if (!table) return;
    const f = {
        from: $('fltFrom').value,
        to: $('fltTo').value,
        action: $('fltAction').value,
        status: $('fltStatus').value,
        role: $('fltRole').value,
        kw: $('fltKeyword').value.trim().toLowerCase(),
    };
    const filtered = allEntries.filter((e) => {
        if (f.action && e.action !== f.action) return false;
        if (f.status && e.status !== f.status) return false;
        if (f.role && e.role !== f.role) return false;
        if (f.from) { const d = (e.ts || '').slice(0,10); if (d && d < f.from) return false; }
        if (f.to)   { const d = (e.ts || '').slice(0,10); if (d && d > f.to) return false; }
        if (f.kw) {
            const hay = [e.filename, e.ip, e.error, e.ua].filter(Boolean).join(' ').toLowerCase();
            if (!hay.includes(f.kw)) return false;
        }
        return true;
    });
    table.setData(filtered);
    updateStats(filtered);
}

function updateStats(list) {
    const total   = list.length;
    const ok      = list.filter(e => e.status === 'success').length;
    const fail    = list.filter(e => e.status === 'failed').length;
    const uploads = list.filter(e => e.action === 'upload_success').length;
    $('stats').innerHTML = `
      <div class="stat"><div class="lbl">Total Event</div><div class="val" data-testid="stat-total">${total.toLocaleString('id-ID')}</div></div>
      <div class="stat success"><div class="lbl">Sukses</div><div class="val" data-testid="stat-success">${ok.toLocaleString('id-ID')}</div></div>
      <div class="stat danger"><div class="lbl">Gagal</div><div class="val" data-testid="stat-failed">${fail.toLocaleString('id-ID')}</div></div>
      <div class="stat warning"><div class="lbl">Upload Sukses</div><div class="val" data-testid="stat-uploads">${uploads.toLocaleString('id-ID')}</div></div>
    `;
}

async function reload() {
    initTable();
    const r = await apiCall('list');
    if (r.code === 401) { showLogin(); return; }
    if (!r.ok || r.data.status !== 'ok') { toastErr(r.data.message || 'Gagal load audit'); return; }
    allEntries = r.data.entries || [];
    applyFilters();
}

function exportExcel() {
    if (!table) return;
    const rows = table.getData();
    if (!rows.length) { Swal.fire({icon:'info', title:'Kosong', text:'Tidak ada data untuk diexport.'}); return; }
    const flat = rows.map(r => ({
        ts: r.ts || '',
        action: r.action || '',
        status: r.status || '',
        role: r.role || '',
        filename: r.filename || '',
        date: r.date || '',
        size: r.size ?? '',
        ip: r.ip || '',
        error: r.error || '',
        ua: r.ua || '',
    }));
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit');
    const now = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    const name = `audit_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;
    XLSX.writeFile(wb, name);
}

async function doLogout() {
    await apiCall('logout', 'POST');
    allEntries = [];
    if (table) table.setData([]);
    showLogin();
}

async function submitLogin(ev) {
    ev.preventDefault();
    const pw = $('adminPassword').value;
    if (!pw) return;
    const r = await apiCall('login', 'POST', { password: pw });
    if (r.ok && r.data.status === 'ok') {
        $('adminPassword').value = '';
        showMain();
    } else {
        Swal.fire({ icon: 'error', title: 'Gagal Login', text: r.data.message || 'Password salah' });
    }
}

/* Theme + PW toggle */
document.getElementById('btnDarkMode').addEventListener('click', () => {
    const html = document.documentElement;
    const next = (html.getAttribute('data-bs-theme') || 'dark') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-bs-theme', next);
    // switch tabulator theme
    const link = document.getElementById('tab-css');
    link.href = next === 'dark'
        ? 'https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator_midnight.min.css'
        : 'https://unpkg.com/tabulator-tables@6.3.0/dist/css/tabulator.min.css';
    const fp = document.getElementById('fp-theme');
    fp.href = next === 'dark'
        ? 'https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/themes/dark.css'
        : 'https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/themes/light.css';
});
document.getElementById('togglePw').addEventListener('click', () => {
    const inp = $('adminPassword');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    document.querySelector('#togglePw i').className = inp.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
});
document.getElementById('loginForm').addEventListener('submit', submitLogin);

/* Boot */
checkStatus();
</script>
</body>
</html>

