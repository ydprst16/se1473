<?php
/*
|--------------------------------------------------------------------------
| SE2026 Monitoring Center - api/history.php
|--------------------------------------------------------------------------
| Backend handler menggunakan Supabase Storage (REST API)
| Mengganti penyimpanan filesystem lokal supaya data persisten di Render.
|--------------------------------------------------------------------------
*/

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

// -----------------------------------------------------------------------
// Konfigurasi (dibaca dari Environment Variables Render)
// -----------------------------------------------------------------------
$SUPABASE_URL   = getenv('SUPABASE_URL') ?: '';
$SUPABASE_KEY   = getenv('SUPABASE_SERVICE_KEY') ?: '';
$BUCKET         = getenv('SUPABASE_BUCKET') ?: 'se-monitoring';

if (!$SUPABASE_URL || !$SUPABASE_KEY) {
    http_response_code(500);
    echo json_encode([
        'status'  => 'error',
        'message' => 'Supabase belum dikonfigurasi. Set SUPABASE_URL & SUPABASE_SERVICE_KEY pada Render env.'
    ]);
    exit;
}

// -----------------------------------------------------------------------
// Helper: panggil Supabase Storage REST API
// -----------------------------------------------------------------------
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

// -----------------------------------------------------------------------
// Router
// -----------------------------------------------------------------------
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($action) {

        // -----------------------------------------------------------
        // Upload sebagai data terbaru (latest.json) + snapshot hari ini
        // -----------------------------------------------------------
        case 'upload-latest': {
            if ($method !== 'POST') throw new Exception('Method not allowed', 405);
            if (!isset($_FILES['file'])) throw new Exception('File tidak ditemukan');

            $content = file_get_contents($_FILES['file']['tmp_name']);
            $decoded = json_decode($content, true);
            if (!is_array($decoded)) throw new Exception('JSON tidak valid (harus berupa Array).');

            $r1 = sb_upload('latest.json', $content);
            if ($r1['status_code'] >= 400) throw new Exception('Upload latest gagal: ' . $r1['body']);

            $today = date('Y-m-d');
            $r2 = sb_upload("history/{$today}.json", $content);
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
            // Stream raw JSON content (processor.js mengharap Array)
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
        // Digunakan oleh rewrite "data/latest.json"
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
        // latest: data terbaru + info source (latest atau fallback ke history terbaru)
        // -----------------------------------------------------------
        case 'latest': {
            $r = sb_download('latest.json');
            if ($r['status_code'] === 200) {
                $data = json_decode($r['body'], true);
                echo json_encode(['status' => 'ok', 'source' => 'latest', 'data' => $data]);
                break;
            }
            // Fallback ke snapshot terbaru
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
            $rGet = sb_download("history/{$newest}.json");
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
            $rGet = sb_download("history/{$prevDate}.json");
            if ($rGet['status_code'] >= 400) throw new Exception('Gagal ambil snapshot');
            $data = json_decode($rGet['body'], true);
            echo json_encode(['status' => 'ok', 'date' => $prevDate, 'data' => $data]);
            break;
        }

        // -----------------------------------------------------------
        // Auto snapshot (idempotent): copy latest.json -> history/YYYY-MM-DD.json
        // -----------------------------------------------------------
        case 'snapshot': {
            if ($method !== 'POST') throw new Exception('Method not allowed', 405);
            $today = date('Y-m-d');
            $rCheck = sb_info("history/{$today}.json");
            if ($rCheck['status_code'] === 200) {
                echo json_encode(['status' => 'ok', 'message' => 'sudah ada', 'date' => $today]);
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
