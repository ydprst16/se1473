/*
|--------------------------------------------------------------------------
| SE2026 Monitoring Center
| helper.js
|--------------------------------------------------------------------------
*/

/**
 * Format angka menjadi format Indonesia
 * 1234567 -> 1.234.567
 */
function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

/**
 * Format persen
 * 75.2345 -> 75.23%
 */
function formatPercent(value, digit = 2) {
  return Number(value || 0).toFixed(digit) + "%";
}

/**
 * Set Text
 */
function setText(id, value) {
  const el = document.getElementById(id);

  if (!el) return;

  el.textContent = value;
}

/**
 * Set HTML
 */
function setHTML(id, html) {
  const el = document.getElementById(id);

  if (!el) return;

  el.innerHTML = html;
}

/**
 * Show Element
 */
function show(id) {
  const el = document.getElementById(id);

  if (el) el.classList.remove("d-none");
}

/**
 * Hide Element
 */
function hide(id) {
  const el = document.getElementById(id);

  if (el) el.classList.add("d-none");
}

/**
 * Loading Cursor
 */
function showLoading() {
  document.body.style.cursor = "wait";
}

/**
 * Reset Cursor
 */
function hideLoading() {
  document.body.style.cursor = "default";
}

/**
 * Timestamp Indonesia
 */
function now() {
  return new Date().toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

/**
 * Download JSON
 */
function downloadJSON(data, filename = "export.json") {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],

    { type: "application/json" },
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = filename;

  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Export HTML Table ke Excel
 * (untuk Grid.js nanti lebih baik memakai SheetJS)
 */
function downloadTable(tableId, filename = "export.xls") {
  const table = document.getElementById(tableId);

  if (!table) return;

  const html = table.outerHTML;

  const blob = new Blob([html], {
    type: "application/vnd.ms-excel",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = filename;

  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Debounce
 */
function debounce(func, delay = 300) {
  let timer;

  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Throttle
 */
function throttle(func, delay = 300) {
  let waiting = false;

  return (...args) => {
    if (waiting) return;

    func(...args);

    waiting = true;

    setTimeout(() => {
      waiting = false;
    }, delay);
  };
}

/**
 * Salin ke Clipboard
 */
async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

/**
 * Random Color
 */
function randomColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}
