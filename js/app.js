/*
|--------------------------------------------------------------------------
| SE Monitoring Center
| api/history.php  (Supabase Storage backend)
|--------------------------------------------------------------------------
| PATCH:
|  1. date_default_timezone_set('Asia/Jakarta')   -> agar $today = WIB
|  2. Tambah action 'snapshot-meta'               -> return mtime asli
|     file history/{date}.json dari Supabase Storage
|--------------------------------------------------------------------------
*/

// ============================================================
// 1) PAKSA timezone WIB. Render default-nya UTC, sehingga
//    date('Y-m-d') pada 00:30 WIB masih "kemarin" (UTC).
// ============================================================
date_default_timezone_set('Asia/Jakarta');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// ============================================================
// Konfigurasi Supabase (dari ENV Render)
// ============================================================
$SUPABASE_URL = getenv('SUPABASE_URL') ?: '';
$SUPABASE_KEY = getenv('SUPABASE_SERVICE_KEY') ?: '';
$BUCKET       = getenv('SUPABASE_BUCKET') ?: 'data';

if (!$SUPABASE_URL || !$SUPABASE_KEY) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Supabase belum dikonfigurasi. Set SUPABASE_URL & SUPABASE_SERVICE_KEY pada Render env.'
    ]);
    exit;
}

// ============================================================
// Helper: panggil Supabase Storage REST API
// ============================================================
function sb_request($method, $path, $extraHeaders = [], $body = null) {
    global $SUPABASE_URL, $SUPABASE_KEY;

    $url = rtrim($SUPABASE_URL, '/') . '/storage/v1' . $path;

    $headers = array_merge([
        'Authorization: Bearer ' . $SUPABASE_KEY,
        'apikey: ' . $SUPABASE_KEY,
    ], $extraHeaders);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $response = curl_exec($ch);
    $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err      = curl_error($ch);
    curl_close($ch);

    return [
        'status_code' => $code,
        'body'        => $response,
        'error'       => $err,
    ];
}

function sb_upload($remotePath, $content) {
    global $BUCKET;
    return sb_request(
        'POST',
        "/object/{$BUCKET}/" . $remotePath,
        ['Content-Type: application/json', 'x-upsert: true'],
        $content
    );
}

function sb_download($remotePath) {
    global $BUCKET;
    return sb_request('GET', "/object/{$BUCKET}/" . $remotePath);
}

function sb_info($remotePath) {
    global $BUCKET;
    return sb_request('GET', "/object/info/{$BUCKET}/" . $remotePath);
}

function sb_list($prefix = '') {
    global $BUCKET;
    $body = json_encode([
        'prefix' => $prefix,
        'limit'  => 1000,
        'offset' => 0,
        'sortBy' => ['column' => 'name', 'order' => 'desc'],
    ]);
    return sb_request(
        'POST',
        "/object/list/{$BUCKET}",
        ['Content-Type: application/json'],
        $body
    );
}

// ============================================================
// Router
// ============================================================
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {

        // -----------------------------------------------------------
        // Upload sebagai data terbaru (latest.json) + snapshot hari ini
        // $today sekarang PASTI WIB karena timezone sudah di-set.
        // -----------------------------------------------------------
        case 'upload-latest': {
            if ($method !== 'POST') throw new Exception('Method not allowed', 405);
            if (!isset($_FILES['file'])) throw new Exception('File tidak ditemukan');

            $content = file_get_contents($_FILES['file']['tmp_name']);
            $decoded = json_decode($content, true);
            if (!is_array($decoded)) throw new Exception('JSON tidak valid (harus berupa Array).');

            $r1 = sb_upload('latest.json', $content);
            if ($r1['status_code'] >= 400) throw new Exception('Upload latest gagal: ' . $r1['body']);

            // PATCH: $today sekarang mengikuti WIB (Asia/Jakarta)
            $today = date('Y-m-d');
            $r2    = sb_upload("history/{$today}.json", $content);
            if ($r2['status_code'] >= 400) throw new Exception('Upload snapshot gagal: ' . $r2['body']);

            echo json_encode(['status' => 'ok', 'date' => $today, 'message' => 'Latest + snapshot tersimpan']);
            break;
        }

        // -----------------------------------------------------------
        // Upload snapshot untuk tanggal tertentu (history saja)
        // -----------------------------------------------------------
        case 'upload': {
            if ($method !== 'POST') throw new Exception('Method not allowed', 405);
            if (!isset($_FILES['file'])) throw new Exception('File tidak ditemukan');

            $date = $_POST['date'] ?? '';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Tanggal tidak valid (format YYYY-MM-DD).');
            }

            $content = file_get_contents($_FILES['file']['tmp_name']);
            $decoded = json_decode($content, true);
            if (!is_array($decoded)) throw new Exception('JSON tidak valid (harus berupa Array).');

            $r = sb_upload("history/{$date}.json", $content);
            if ($r['status_code'] >= 400) throw new Exception('Upload gagal: ' . $r['body']);

            echo json_encode(['status' => 'ok', 'date' => $date]);
            break;
        }

        // -----------------------------------------------------------
        // Ambil snapshot berdasarkan tanggal (raw array)
        // -----------------------------------------------------------
        case 'get': {
            $date = $_GET['date'] ?? '';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Tanggal tidak valid (format YYYY-MM-DD).');
            }
            $r = sb_download("history/{$date}.json");
            if ($r['status_code'] === 404 || $r['status_code'] === 400) {
                throw new Exception("Snapshot {$date} tidak ditemukan", 404);
            }
            if ($r['status_code'] >= 400) {
                throw new Exception('Gagal mengambil snapshot: ' . $r['body']);
            }
            header('Content-Type: application/json; charset=utf-8');
            echo $r['body'];
            break;
        }

        // -----------------------------------------------------------
        // Daftar snapshot yang ada di history/
        // -----------------------------------------------------------
        case 'list': {
            $r = sb_list('history/');
            if ($r['status_code'] >= 400) throw new Exception('Gagal list: ' . $r['body']);
            $files = json_decode($r['body'], true) ?: [];
            $items = [];
            foreach ($files as $f) {
                $name = $f['name'] ?? '';
                if (preg_match('/^(\d{4}-\d{2}-\d{2})\.json$/', $name, $m)) {
                    $items[] = [
                        'date'       => $m[1],
                        'updated_at' => $f['updated_at'] ?? ($f['created_at'] ?? null),
                    ];
                }
            }
            usort($items, fn($a, $b) => strcmp($b['date'], $a['date']));
            echo json_encode(['status' => 'ok', 'items' => $items]);
            break;
        }

        // -----------------------------------------------------------
        // latest-raw: stream isi latest.json apa adanya (Array)
        // -----------------------------------------------------------
        case 'latest-raw': {
            if ($method === 'HEAD') {
                $r = sb_info('latest.json');
                http_response_code($r['status_code'] === 200 ? 200 : 404);
                exit;
            }
            $r = sb_download('latest.json');
            if ($r['status_code'] === 404 || $r['status_code'] === 400) {
                throw new Exception('Belum ada data latest', 404);
            }
            if ($r['status_code'] >= 400) throw new Exception('Gagal: ' . $r['body']);
            header('Content-Type: application/json; charset=utf-8');
            echo $r['body'];
            break;
        }

        // -----------------------------------------------------------
        // latest: data terbaru + info source
        // -----------------------------------------------------------
        case 'latest': {
            $r = sb_download('latest.json');
            if ($r['status_code'] === 200) {
                $data = json_decode($r['body'], true);
                echo json_encode(['status' => 'ok', 'source' => 'latest', 'data' => $data]);
                break;
            }
            $rList = sb_list('history/');
            if ($rList['status_code'] >= 400) throw new Exception('Gagal list snapshot');
            $files = json_decode($rList['body'], true) ?: [];
            $dates = [];
            foreach ($files as $f) {
                $name = $f['name'] ?? '';
                if (preg_match('/^(\d{4}-\d{2}-\d{2})\.json$/', $name, $m)) {
                    $dates[] = $m[1];
                }
            }
            if (!$dates) throw new Exception('Belum ada data sama sekali');
            rsort($dates);
            $newest = $dates[0];
            $rGet   = sb_download("history/{$newest}.json");
            if ($rGet['status_code'] >= 400) throw new Exception('Gagal ambil snapshot terbaru');
            $data = json_decode($rGet['body'], true);
            echo json_encode([
                'status' => 'ok',
                'source' => 'history',
                'date'   => $newest,
                'data'   => $data
            ]);
            break;
        }

        // -----------------------------------------------------------
        // Metadata waktu update latest.json
        // -----------------------------------------------------------
        case 'latest-meta': {
            $r = sb_info('latest.json');
            if ($r['status_code'] >= 400) {
                echo json_encode(['status' => 'error', 'message' => 'latest.json belum ada']);
                break;
            }
            $meta = json_decode($r['body'], true);
            echo json_encode([
                'status' => 'ok',
                'mtime'  => $meta['updated_at'] ?? ($meta['created_at'] ?? null),
            ]);
            break;
        }

        // -----------------------------------------------------------
        // PATCH: NEW ACTION
        // snapshot-meta: ambil mtime asli file history/{date}.json
        // Dipakai dashboard saat user memilih snapshot tertentu
        // supaya "Last Update" menampilkan jam upload asli,
        // bukan 00:00 yang hardcoded.
        // -----------------------------------------------------------
        case 'snapshot-meta': {
            $date = $_GET['date'] ?? '';
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Tanggal tidak valid (format YYYY-MM-DD).');
            }

            // 1) Coba dapatkan dari endpoint object/info (cepat)
            $r = sb_info("history/{$date}.json");
            if ($r['status_code'] === 200) {
                $meta  = json_decode($r['body'], true) ?: [];
                $mtime = $meta['updated_at'] ?? ($meta['created_at'] ?? null);
                if ($mtime) {
                    echo json_encode([
                        'status' => 'ok',
                        'date'   => $date,
                        'mtime'  => $mtime,
                        'source' => 'info',
                    ]);
                    break;
                }
            }

            // 2) Fallback: cari di list (kadang Supabase v1 belum expose /info)
            $rList = sb_list('history/');
            if ($rList['status_code'] >= 400) {
                throw new Exception('Snapshot ' . $date . ' tidak ditemukan', 404);
            }
            $files = json_decode($rList['body'], true) ?: [];
            foreach ($files as $f) {
                if (($f['name'] ?? '') === "{$date}.json") {
                    $mtime = $f['updated_at'] ?? ($f['created_at'] ?? null);
                    echo json_encode([
                        'status' => 'ok',
                        'date'   => $date,
                        'mtime'  => $mtime,
                        'source' => 'list',
                    ]);
                    exit;
                }
            }

            // 3) Tidak ada juga
            http_response_code(404);
            echo json_encode([
                'status'  => 'error',
                'message' => "Snapshot {$date} tidak ditemukan",
            ]);
            break;
        }

        // -----------------------------------------------------------
        // Snapshot sebelumnya (untuk perbandingan)
        // -----------------------------------------------------------
        case 'previous': {
            $before = $_GET['before'] ?? date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $before)) {
                throw new Exception('Parameter "before" tidak valid');
            }
            $rList = sb_list('history/');
            if ($rList['status_code'] >= 400) throw new Exception('Gagal list snapshot');
            $files = json_decode($rList['body'], true) ?: [];
            $candidates = [];
            foreach ($files as $f) {
                $name = $f['name'] ?? '';
                if (preg_match('/^(\d{4}-\d{2}-\d{2})\.json$/', $name, $m)) {
                    if ($m[1] < $before) $candidates[] = $m[1];
                }
            }
            if (!$candidates) {
                http_response_code(404);
                echo json_encode(['status' => 'error', 'message' => 'No previous snapshot']);
                break;
            }
            rsort($candidates);
            $prevDate = $candidates[0];
            $rGet     = sb_download("history/{$prevDate}.json");
            if ($rGet['status_code'] >= 400) throw new Exception('Gagal ambil snapshot');
            $data = json_decode($rGet['body'], true);
            echo json_encode(['status' => 'ok', 'date' => $prevDate, 'data' => $data]);
            break;
        }

        // -----------------------------------------------------------
        // Auto snapshot (idempotent + smart guard)
        // -----------------------------------------------------------
        case 'snapshot': {
            if ($method !== 'POST') throw new Exception('Method not allowed', 405);
            $today = date('Y-m-d'); // WIB

            $rCheck = sb_info("history/{$today}.json");
            if ($rCheck['status_code'] === 200) {
                echo json_encode(['status' => 'ok', 'message' => 'sudah ada', 'date' => $today]);
                break;
            }

            $rInfo = sb_info('latest.json');
            if ($rInfo['status_code'] >= 400) {
                echo json_encode(['status' => 'error', 'message' => 'latest.json belum ada']);
                break;
            }
            $meta      = json_decode($rInfo['body'], true);
            $updatedAt = $meta['updated_at'] ?? ($meta['created_at'] ?? null);
            if (!$updatedAt) {
                echo json_encode(['status' => 'skip', 'message' => 'updated_at tidak diketahui']);
                break;
            }

            try {
                $updatedYMD = (new DateTime($updatedAt))
                    ->setTimezone(new DateTimeZone('Asia/Jakarta'))
                    ->format('Y-m-d');
            } catch (Exception $ex) {
                echo json_encode(['status' => 'skip', 'message' => 'updated_at tidak bisa di-parse']);
                break;
            }

            if ($updatedYMD !== $today) {
                echo json_encode([
                    'status'  => 'skip',
                    'message' => "latest.json bukan data hari ini (mtime={$updatedYMD}, today={$today}) — snapshot dilewati",
                    'date'    => $today,
                ]);
                break;
            }

            $rLatest = sb_download('latest.json');
            if ($rLatest['status_code'] >= 400) {
                echo json_encode(['status' => 'error', 'message' => 'latest.json belum ada']);
                break;
            }
            $rSave = sb_upload("history/{$today}.json", $rLatest['body']);
            if ($rSave['status_code'] >= 400) throw new Exception('Snapshot gagal');
            echo json_encode(['status' => 'ok', 'date' => $today]);
            break;
        }

        default:
            throw new Exception('Action tidak dikenal: ' . htmlspecialchars($action), 400);
    }
} catch (Exception $e) {
    $code = $e->getCode() ?: 500;
    if ($code < 400 || $code > 599) $code = 500;
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
📄 FILE 2: app.js (REPLACE FULL)
/*
|--------------------------------------------------------------------------
| SE Monitoring Center
| app.js  (FULL FILE - patched)
|--------------------------------------------------------------------------
| PATCH:
|   updateLastUpdate() sekarang mengambil mtime ASLI snapshot dari Supabase
|   (action=snapshot-meta) ketika user memilih tanggal tertentu, sehingga
|   "Last Update" menampilkan jam upload sebenarnya, BUKAN 00:00 lagi.
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", init);

const LATEST_URL = "api/history.php?action=latest-raw";

/* ============================================================
   Helper: format tanggal "DD MMM YYYY HH:mm" (Bahasa Indonesia)
   ============================================================ */
function formatDateID(d) {
  if (!d) return "-";
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return "-";

  const bulan = [
    "Jan","Feb","Mar","Apr","Mei","Jun",
    "Jul","Agu","Sep","Okt","Nov","Des",
  ];
  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${pad(d.getDate())} ${bulan[d.getMonth()]} ${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/* ============================================================
   View by Date
   ============================================================ */
let viewedDate = null;

async function loadByDate(date) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    viewedDate = date;
    await loadDashboard(
      "api/history.php?action=get&date=" + encodeURIComponent(date),
    );
    return;
  }

  viewedDate = null;
  try {
    const head = await fetch(LATEST_URL, { method: "HEAD", cache: "no-store" });
    if (head.ok) {
      await loadDashboard(LATEST_URL);
      return;
    }
  } catch (_) {}

  console.warn(
    "[loadByDate] latest.json belum ada di Supabase → fallback ke snapshot terbaru",
  );
  const res = await fetch("api/history.php?action=latest", { cache: "no-store" });
  if (!res.ok) throw new Error("Belum ada data sama sekali di Supabase");
  const payload = await res.json();
  if (payload.status !== "ok" || !Array.isArray(payload.data)) {
    throw new Error(payload.message || "Format respons tidak valid");
  }
  if (payload.source === "history" && payload.date) {
    viewedDate = payload.date;
    await loadDashboard(
      "api/history.php?action=get&date=" + encodeURIComponent(payload.date),
    );
  } else {
    await loadDashboard(LATEST_URL);
  }
}

/* ============================================================
   PATCH: Update teks "Last Update"
   - mode live          : pakai mtime latest.json
   - mode tanggal       : pakai mtime SNAPSHOT yg sedang dilihat
                          (bukan hardcoded 00:00 lagi)
   ============================================================ */
async function updateLastUpdate() {
  const el = document.getElementById("lastUpdate");
  if (!el) return;

  // ===== Mode snapshot (user memilih tanggal tertentu) =====
  if (viewedDate) {
    try {
      const res = await fetch(
        "api/history.php?action=snapshot-meta&date=" +
          encodeURIComponent(viewedDate),
        { cache: "no-store" },
      );
      if (res.ok) {
        const meta = await res.json();
        if (meta.status === "ok" && meta.mtime) {
          el.textContent =
            formatDateID(new Date(meta.mtime)) + " (snapshot)";
          return;
        }
      }
    } catch (e) {
      console.warn("[lastUpdate] gagal ambil snapshot-meta:", e);
    }

    // Fallback bila mtime tidak tersedia
    el.textContent =
      formatDateID(new Date(viewedDate + "T00:00:00")) +
      " (snapshot, jam tidak tersedia)";
    return;
  }

  // ===== Mode live =====
  try {
    const res = await fetch("api/history.php?action=latest-meta", {
      cache: "no-store",
    });
    if (res.ok) {
      const meta = await res.json();
      if (meta.status === "ok" && meta.mtime) {
        el.textContent = formatDateID(new Date(meta.mtime));
        return;
      }
    }
  } catch (e) {
    console.warn("[lastUpdate] gagal ambil meta:", e);
  }

  const t =
    (Dashboard && Dashboard.meta && Dashboard.meta.loadedAt) || new Date();
  el.textContent = formatDateID(t);
}

/* ============================================================
   Konversi Date -> "YYYY-MM-DD" pada timezone Asia/Jakarta (WIB)
   ============================================================ */
function toYMDinJakarta(d) {
  if (!(d instanceof Date)) d = new Date(d);
  if (isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

async function isLatestUpdatedToday() {
  try {
    const res = await fetch("api/history.php?action=latest-meta", {
      cache: "no-store",
    });
    if (!res.ok) return false;
    const meta = await res.json();
    if (meta.status !== "ok" || !meta.mtime) return false;

    const mtimeYMD = toYMDinJakarta(new Date(meta.mtime));
    const today    = todayYMD();
    const sameDay  = mtimeYMD === today;

    if (!sameDay) {
      console.info(
        `[snapshot-guard] latest.json mtime=${mtimeYMD}, today=${today} -> SKIP auto snapshot`,
      );
    }
    return sameDay;
  } catch (e) {
    console.warn("[snapshot-guard] gagal cek meta:", e);
    return false;
  }
}

async function renderAll() {
  if (!viewedDate && typeof autoSnapshotToday === "function") {
    if (await isLatestUpdatedToday()) {
      await autoSnapshotToday();
    }
  }

  if (typeof loadPreviousDay === "function") {
    const ref = viewedDate || todayYMD();
    await loadPreviousDay(ref);
  }

  renderCards();
  renderProgress();
  await updateLastUpdate();

  if (typeof renderCharts     === "function") renderCharts();
  if (typeof renderTable      === "function") renderTable();
  if (typeof renderComparison === "function") renderComparison();
}

async function init() {
  try {
    showLoading();
    await loadByDate(null);
    await populateViewDateOptions();
    await renderAll();
    bindEvents();
    hideLoading();
  } catch (err) {
    hideLoading();
    console.error(err);
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

async function populateViewDateOptions() {
  const sel = document.getElementById("viewDate");
  if (!sel) return;
  try {
    const res = await fetch("api/history.php?action=list", { cache: "no-store" });
    const j = await res.json();
    const items =
      j && j.status === "ok" && Array.isArray(j.items) ? j.items : [];

    const bln = [
      "Jan","Feb","Mar","Apr","Mei","Jun",
      "Jul","Agu","Sep","Okt","Nov","Des",
    ];

    let html = `<option value="">— Data Terbaru (Live) —</option>`;
    items.forEach((it) => {
      const [y, m, d] = it.date.split("-");
      const label = `${d} ${bln[parseInt(m, 10) - 1]} ${y}`;
      html += `<option value="${it.date}">${label}</option>`;
    });
    sel.innerHTML = html;
    if (viewedDate) sel.value = viewedDate;
  } catch (e) {
    console.warn("[viewDate] gagal isi dropdown:", e);
  }
}

function renderCards() {
  const s = Dashboard.summary;
  setText("assignment", formatNumber(s.assignment));
  setText("open", formatNumber(s.open));
  setText("draft", formatNumber(s.draft));
  setText("submitted", formatNumber(s.submitted));
  setText("approved", formatNumber(s.approved));
  setText("rejected", formatNumber(s.rejected));
  setText("revoke", formatNumber(s.revoked));
  setText("progress", s.progressTotal.toFixed(2) + "%");

  const prev =
    typeof Comparison !== "undefined" ? Comparison.previousSummary : null;
  renderChange("assignmentChange", s.assignment, prev ? prev.assignment : null);
  renderChange("openChange",       s.open,       prev ? prev.open       : null);
  renderChange("draftChange",      s.draft,      prev ? prev.draft      : null);
  renderChange("submittedChange",  s.submitted,  prev ? prev.submitted  : null);
  renderChange("approvedChange",   s.approved,   prev ? prev.approved   : null);
  renderChange("rejectedChange",   s.rejected,   prev ? prev.rejected   : null);
  renderChange("revokeChange",     s.revoked,    prev ? prev.revoked    : null);
  renderChange(
    "progressChange",
    s.progressTotal,
    prev ? prev.progressTotal : null,
    true,
  );
}

function renderChange(id, today, yesterday, isPercent = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (yesterday === null || typeof yesterday !== "number") {
    el.className = "kpi-change";
    el.style.color = "#9ca3af";
    el.textContent = "—";
    return;
  }
  const diff = today - yesterday;
  const rounded = isPercent ? Number(diff.toFixed(2)) : Math.round(diff);
  if (rounded === 0) {
    el.className = "kpi-change";
    el.style.color = "#9ca3af";
    el.textContent = isPercent ? "▬ 0%" : "▬ 0";
    return;
  }
  const up = rounded > 0;
  el.className = "kpi-change " + (up ? "up" : "down");
  el.style.color = up ? "#22c55e" : "#ef4444";
  if (up) {
    el.textContent = isPercent
      ? "▲ +" + rounded.toFixed(2) + "%"
      : "▲ +" + formatNumber(rounded);
  } else {
    el.textContent = isPercent
      ? "▼ " + rounded.toFixed(2) + "%"
      : "▼ -" + formatNumber(Math.abs(rounded));
  }
}

function renderProgress() {
  const progress = Dashboard.summary.progressTotal;
  const bar = document.getElementById("overallProgress");
  if (!bar) return;
  bar.style.width = progress + "%";
  bar.innerHTML = progress.toFixed(2) + "%";
  const txt = document.getElementById("progressText");
  if (txt) txt.innerHTML = progress.toFixed(2) + "%";
}

function bindEvents() {
  const viewDateEl = document.getElementById("viewDate");
  if (viewDateEl) {
    viewDateEl.addEventListener("change", async (e) => {
      const d = e.target.value;
      if (!d) return;
      try {
        showLoading();
        await loadByDate(d);
        await renderAll();
        hideLoading();
        toast("info", `Menampilkan data ${d}`);
      } catch (err) {
        hideLoading();
        Swal.fire({
          icon: "error",
          title: "Snapshot tidak ditemukan",
          text: `Tidak ada data untuk tanggal ${d}. Upload dulu file untuk tanggal tersebut.`,
        });
        viewDateEl.value = "";
        viewedDate = null;
      }
    });
  }

  const btnViewLatest = document.getElementById("btnViewLatest");
  if (btnViewLatest) {
    btnViewLatest.addEventListener("click", async () => {
      try {
        showLoading();
        if (viewDateEl) viewDateEl.value = "";
        await loadByDate(null);
        await renderAll();
        hideLoading();
        toast("success", "Kembali ke data terbaru");
      } catch (e) {
        hideLoading();
        Swal.fire({ icon: "error", title: "Gagal", text: e.message });
      }
    });
  }

  const refresh = document.getElementById("btnRefresh");
  if (refresh) {
    refresh.addEventListener("click", async () => {
      try {
        showLoading();
        await loadByDate(viewedDate);
        await renderAll();
        hideLoading();
        toast("success", "Data berhasil dimuat ulang");
      } catch (e) {
        hideLoading();
        Swal.fire({ icon: "error", title: "Gagal Refresh", text: e.message });
      }
    });
  }

  const btnOpen = document.getElementById("btnOpenUpload");
  if (btnOpen) {
    btnOpen.addEventListener("click", async () => {
      const fileInput = document.getElementById("jsonFile");
      const dateInput = document.getElementById("jsonDate");
      if (fileInput) fileInput.value = "";
      if (dateInput) dateInput.value = todayYMD();

      await refreshSnapshotList();

      const modal = new bootstrap.Modal(document.getElementById("uploadModal"));
      modal.show();
    });
  }

  const fileInputChange = document.getElementById("jsonFile");
  if (fileInputChange) {
    fileInputChange.addEventListener("change", () => {
      const f = fileInputChange.files && fileInputChange.files[0];
      if (!f) return;
      const m = f.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) {
        const dateInput = document.getElementById("jsonDate");
        if (dateInput) dateInput.value = m[1];
      }
    });
  }

  const btnUpload = document.getElementById("btnUpload");
  if (btnUpload) {
    btnUpload.addEventListener("click", async () => {
      const fileInput = document.getElementById("jsonFile");
      const dateInput = document.getElementById("jsonDate");
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) {
        Swal.fire({
          icon: "warning",
          title: "File belum dipilih",
          text: "Silakan pilih file .json terlebih dahulu",
        });
        return;
      }
      if (!/\.json$/i.test(file.name)) {
        Swal.fire({
          icon: "warning",
          title: "Format salah",
          text: "File harus berekstensi .json",
        });
        return;
      }
      const pickedDate = (dateInput && dateInput.value) || todayYMD();
      const today      = todayYMD();
      const isToday    = pickedDate === today;
      const isFuture   = pickedDate > today;

      if (isFuture) {
        Swal.fire({
          icon: "warning",
          title: "Tanggal tidak valid",
          text: "Tanggal tidak boleh di masa depan.",
        });
        return;
      }

      try {
        btnUpload.disabled = true;
        btnUpload.innerHTML = `Mengunggah...`;

        let result;
        if (isToday) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("api/history.php?action=upload-latest", {
            method: "POST",
            body: fd,
          });
          result = await res.json();
          if (!res.ok || result.status !== "ok")
            throw new Error(result.message || `HTTP ${res.status}`);
        } else {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("date", pickedDate);
          const res = await fetch("api/history.php?action=upload", {
            method: "POST",
            body: fd,
          });
          result = await res.json();
          if (!res.ok || result.status !== "ok")
            throw new Error(result.message || `HTTP ${res.status}`);
        }

        const modalEl = document.getElementById("uploadModal");
        const modal   = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        showLoading();
        if (isToday) {
          viewedDate = null;
          const viewDateEl = document.getElementById("viewDate");
          if (viewDateEl) viewDateEl.value = "";
        }
        await loadByDate(viewedDate);
        await renderAll();
        hideLoading();

        toast(
          "success",
          isToday
            ? `Upload sukses — data hari ini (${pickedDate})`
            : `Snapshot ${pickedDate} tersimpan sebagai pembanding`,
        );
      } catch (err) {
        Swal.fire({ icon: "error", title: "Upload Gagal", text: err.message });
      } finally {
        btnUpload.disabled  = false;
        btnUpload.innerHTML = "Upload";
      }
    });
  }

  const btnDark = document.getElementById("btnDarkMode");
  if (btnDark) {
    btnDark.addEventListener("click", () => {
      const html = document.documentElement;
      const cur  = html.getAttribute("data-bs-theme") || "dark";
      const next = cur === "dark" ? "light" : "dark";
      html.setAttribute("data-bs-theme", next);
      btnDark.innerHTML =
        next === "dark"
          ? `<i class="bi bi-moon-stars-fill"></i>`
          : `<i class="bi bi-sun-fill"></i>`;
    });
  }

  const btnFs = document.getElementById("btnFullscreen");
  if (btnFs) {
    btnFs.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function toast(icon, title) {
  if (typeof Swal === "undefined") return;
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    timer: 2500,
    showConfirmButton: false,
  });
}

function showLoading() { document.body.style.cursor = "wait"; }
function hideLoading() { document.body.style.cursor = "default"; }

function todayYMD() {
  return toYMDinJakarta(new Date());
}

async function refreshSnapshotList() {
  const el = document.getElementById("snapshotList");
  if (!el) return;
  el.textContent = "memuat...";
  try {
    const res = await fetch("api/history.php?action=list", { cache: "no-store" });
    const j = await res.json();
    if (j.status === "ok" && Array.isArray(j.items) && j.items.length) {
      el.textContent = j.items.map((x) => x.date).join(", ");
    } else {
      el.textContent = "(belum ada snapshot)";
    }
  } catch (e) {
    el.textContent = "(gagal memuat)";
  }
}
