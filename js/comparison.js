/*
|--------------------------------------------------------------------------
| SE2026 Monitoring Center — js/comparison.js  v2 (ROLE-AWARE)
|--------------------------------------------------------------------------
| Membandingkan progress hari ini (Dashboard.enumerators) dengan snapshot
| hari sebelumnya yang tersimpan di data/history/.
|
| Rumus per role:
|   PENCACAH  : progressTotal   = (submitted + approved + edited + rejected + revoked) / assignment
|   PENGAWAS  : progressReview  = (approved + edited + rejected + revoked) / assignment
|
| Menghasilkan 4 kartu ranking:
|   1. Top 5 tertinggi (persentase hari ini terbesar)
|   2. Top 5 terendah  (persentase hari ini terkecil)
|   3. Top peningkatan harian (delta terbesar)
|   4. Top peningkatan terendah (delta terkecil / minus)
|--------------------------------------------------------------------------
*/

const Comparison = {
  previousDate: null,
  previousMap: {},
  previousSummary: null, // ringkasan angka kemarin (sekarang termasuk progressReview)
  items: [],
  available: false,
};

/*
|--------------------------------------------------------------------------
| Helper: role aktif
|--------------------------------------------------------------------------
*/
function comparisonRole() {
  return typeof currentRole !== "undefined" ? currentRole : "pencacah";
}

/*
|--------------------------------------------------------------------------
| Hitung % dari raw enumerator (struktur FASIH / latest.json)
| ROLE-AWARE:
|   Pencacah -> progressTotal
|   Pengawas -> progressReview
|--------------------------------------------------------------------------
*/
function calcProgressFromRaw(user) {
  const assignment = Number(user.total) || 0;
  if (assignment <= 0) return 0;

  let submitted = 0, approved = 0, rejected = 0, revoked = 0, edited = 0;

  (user.regionSummary || []).forEach((region) => {
    (region.statusBreakdown || []).forEach((s) => {
      const c = Number(s.count) || 0;
      if      (s.status === "SUBMITTED BY Pencacah")    submitted += c;
      else if (s.status === "APPROVED BY Pengawas")     approved  += c;
      else if (s.status === "REJECTED BY Pengawas")     rejected  += c;
      else if (s.status === "REVOKED BY Pengawas")      revoked   += c;
      else if (s.status === "EDITED BY Admin Kabupaten") edited   += c;
      else if (s.status === "EDITED BY Pengawas")        edited   += c;
    });
  });

  const numerator =
    comparisonRole() === "pengawas"
      ? approved + edited + rejected + revoked                  // progressReview
      : submitted + approved + edited + rejected + revoked;     // progressTotal

  return Number(((numerator / assignment) * 100).toFixed(2));
}

/*
|--------------------------------------------------------------------------
| Hitung % dari enumerator hasil olahan (Dashboard.enumerators)
|--------------------------------------------------------------------------
*/
function calcProgressFromProcessed(e) {
  if (!e) return 0;
  const val =
    comparisonRole() === "pengawas"
      ? (typeof e.progressReview === "number" ? e.progressReview : 0)
      : (typeof e.progressTotal  === "number" ? e.progressTotal  : 0);
  return Number(val.toFixed(2));
}

/*
|--------------------------------------------------------------------------
| Hitung agregat angka mentah dari array raw user (untuk previous day)
|--------------------------------------------------------------------------
*/
function aggregateRaw(rawArray) {
  const sum = {
    assignment: 0,
    open: 0, draft: 0, submitted: 0,
    approved: 0, edited: 0, rejected: 0, revoked: 0,
    reviewed: 0, completed: 0,
    progressSubmit: 0,
    progressApprove: 0,
    progressReview: 0,
    progressTotal: 0,
  };

  (rawArray || []).forEach((user) => {
    sum.assignment += Number(user.total) || 0;
    (user.regionSummary || []).forEach((r) => {
      (r.statusBreakdown || []).forEach((s) => {
        const c = Number(s.count) || 0;
        if      (s.status === "OPEN")                      sum.open      += c;
        else if (s.status === "DRAFT")                     sum.draft     += c;
        else if (s.status === "SUBMITTED BY Pencacah")     sum.submitted += c;
        else if (s.status === "APPROVED BY Pengawas")      sum.approved  += c;
        else if (s.status === "REJECTED BY Pengawas")      sum.rejected  += c;
        else if (s.status === "REVOKED BY Pengawas")       sum.revoked   += c;
        else if (s.status === "EDITED BY Admin Kabupaten") sum.edited    += c;
        else if (s.status === "EDITED BY Pengawas")        sum.edited    += c;
      });
    });
  });

  sum.reviewed  = sum.approved + sum.edited + sum.rejected + sum.revoked;
  sum.completed = sum.submitted + sum.reviewed;

  const pct = (n) =>
    sum.assignment > 0 ? Number(((n / sum.assignment) * 100).toFixed(2)) : 0;

  sum.progressSubmit  = pct(sum.submitted);
  sum.progressApprove = pct(sum.approved);
  sum.progressReview  = pct(sum.reviewed);
  sum.progressTotal   = pct(sum.completed);

  return sum;
}

/*
|--------------------------------------------------------------------------
| Memuat snapshot hari sebelumnya
|--------------------------------------------------------------------------
*/
async function loadPreviousDay(referenceDate) {
  try {
    const roleParam = comparisonRole();
    let url = "api/history.php?action=previous&role=" + encodeURIComponent(roleParam);
    if (referenceDate && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
      url += "&before=" + encodeURIComponent(referenceDate);
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      Comparison.available = false;
      Comparison.previousDate = null;
      Comparison.previousMap = {};
      return;
    }

    const payload = await res.json();
    if (payload.status !== "ok" || !Array.isArray(payload.data)) {
      Comparison.available = false;
      Comparison.previousDate = null;
      Comparison.previousMap = {};
      return;
    }

    Comparison.previousDate = payload.date;
    Comparison.previousMap = {};
    Comparison.previousSummary = aggregateRaw(payload.data);

    payload.data.forEach((user) => {
      const key = (user.username || "").toLowerCase();
      if (!key) return;
      Comparison.previousMap[key] = calcProgressFromRaw(user);
    });

    Comparison.available = true;
  } catch (err) {
    console.warn("[Comparison] Gagal memuat snapshot sebelumnya:", err);
    Comparison.available = false;
    Comparison.previousDate = null;
    Comparison.previousMap = {};
  }
}

/*
|--------------------------------------------------------------------------
| Bangun array {username, today, yesterday, delta}
|--------------------------------------------------------------------------
*/
function buildComparisonItems() {
  Comparison.items = (Dashboard.enumerators || []).map((e) => {
    const today = calcProgressFromProcessed(e);
    const key = (e.username || "").toLowerCase();
    const yesterday = Comparison.previousMap[key];
    const hasYesterday = typeof yesterday === "number";
    const delta = hasYesterday ? Number((today - yesterday).toFixed(2)) : null;
    return {
      username: e.username,
      today,
      yesterday: hasYesterday ? yesterday : null,
      delta,
    };
  });

  const matched = Comparison.items.filter((x) => x.delta !== null).length;
  console.log(
    `[Comparison] role=${comparisonRole()} today=${Comparison.items.length} | prev(${
      Comparison.previousDate || "-"
    })=${Object.keys(Comparison.previousMap).length} | matched=${matched}`
  );
}

/*
|--------------------------------------------------------------------------
| Render 4 kartu komparasi ke #comparisonCards
|--------------------------------------------------------------------------
*/
function renderComparison() {
  const root = document.getElementById("comparisonCards");
  if (!root) return;

  buildComparisonItems();

  const roleLabel = comparisonRole() === "pengawas" ? "PML" : "PPL";

  const mainTitle = document.getElementById("comparisonMainTitle");
  if (mainTitle) mainTitle.textContent = `Perbandingan Harian ${roleLabel}`;

  const sub = document.getElementById("comparisonSubtitle");
  if (sub) {
    const matched = Comparison.items.filter((x) => x.delta !== null).length;
    if (Comparison.available && Comparison.previousDate) {
      sub.textContent = `Hari ini vs ${Comparison.previousDate} • ${matched} dari ${Comparison.items.length} ${roleLabel} cocok`;
      sub.classList.remove("text-warning");
    } else {
      sub.textContent =
        "Belum ada snapshot hari sebelumnya — perbandingan akan muncul setelah snapshot tersimpan.";
      sub.classList.add("text-warning");
    }
  }

  const items = Comparison.items;

  const topHigh = [...items].sort((a, b) => b.today - a.today).slice(0, 5);
  const topLow  = [...items].sort((a, b) => a.today - b.today).slice(0, 5);

  const withDelta   = items.filter((x) => x.delta !== null);
  const topGain     = [...withDelta].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const topLowGain  = [...withDelta].sort((a, b) => a.delta - b.delta).slice(0, 5);

  root.innerHTML = `
    ${renderRankCard({
      id: "cmpTopHigh",
      icon: "bi-arrow-up-circle-fill",
      iconColor: "#ffffff",
      title: `TOP 5 ${roleLabel} TERTINGGI`,
      list: topHigh,
      mode: "value",
      valueClass: "value-white",
    })}
    ${renderRankCard({
      id: "cmpTopLow",
      icon: "bi-arrow-down-circle-fill",
      iconColor: "#ffffff",
      title: `TOP 5 ${roleLabel} TERENDAH`,
      list: topLow,
      mode: "value",
      valueClass: "value-white",
    })}
    ${renderRankCard({
      id: "cmpTopGain",
      icon: "bi-graph-up-arrow",
      iconColor: "#3b82f6",
      title: "TOP PENINGKATAN HARIAN",
      list: topGain,
      mode: "delta",
      valueClass: "value-green",
      empty: !Comparison.available,
    })}
    ${renderRankCard({
      id: "cmpTopLowGain",
      icon: "bi-graph-down-arrow",
      iconColor: "#ef4444",
      title: "TOP PENINGKATAN TERENDAH",
      list: topLowGain,
      mode: "delta",
      valueClass: "value-green",
      empty: !Comparison.available,
    })}
  `;
}

/*
|--------------------------------------------------------------------------
| Helper: render 1 kartu ranking
|--------------------------------------------------------------------------
*/
function renderRankCard({ id, icon, iconColor, title, list, mode, valueClass, empty }) {
  let body = "";

  if (empty) {
    body = `<div class="cmp-empty">Belum ada data pembanding</div>`;
  } else if (!list.length) {
    body = `<div class="cmp-empty">Tidak ada data</div>`;
  } else {
    body = list
      .map((row) => {
        let valStr = "";
        let valCls = valueClass;
        if (mode === "value") {
          valStr = (row.today ?? 0).toFixed(2) + "%";
        } else {
          if (row.delta === null) {
            valStr = "-";
            valCls = "value-mute";
          } else {
            const sign = row.delta > 0 ? "+" : "";
            valStr = sign + row.delta.toFixed(2) + "%";
            if (row.delta < 0) valCls = "value-red";
            else if (row.delta === 0) valCls = "value-mute";
            else valCls = "value-green";
          }
        }
        return `
          <div class="cmp-row">
            <span class="cmp-user">${escapeHtml(row.username || "-")}</span>
            <span class="cmp-val ${valCls}">${valStr}</span>
          </div>
        `;
      })
      .join("");
  }

  return `
    <div class="col-lg-3 col-md-6">
            <div class="cmp-card" id="${id}">
                <div class="cmp-head">
                    <i class="bi ${icon}" style="color:${iconColor}"></i>
                    <span>${title}</span>
                </div>
                <div class="cmp-body">${body}</div>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/*
|--------------------------------------------------------------------------
| Auto snapshot
|--------------------------------------------------------------------------
*/
async function autoSnapshotToday() {
  try {
    await fetch("api/history.php?action=snapshot", { method: "POST" });
  } catch (e) {
    console.warn("[Comparison] auto snapshot gagal:", e);
  }
}
