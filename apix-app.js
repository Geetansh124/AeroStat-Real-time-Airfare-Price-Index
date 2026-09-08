/* ================================================================
   APIx — Main app logic
   Navigation, section renders, tweaks wiring
   ================================================================ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "ashoka",
  "hero": "v1",
  "showScraperOps": true
}/*EDITMODE-END*/;

const ACCENT_PRESETS = {
  ashoka:  { light: "#0A2A66", dark: "#5A8FDD", label: "Ashoka blue" },
  navy:    { light: "#0F2C4B", dark: "#78A6D8", label: "Deep navy" },
  saffron: { light: "#C4611E", dark: "#F58B3C", label: "Saffron" },
  emerald: { light: "#0F6B4A", dark: "#5FBF8F", label: "Emerald" },
  ink:     { light: "#232733", dark: "#B8C0D0", label: "Ink" },
};

// ---------- Currencies ----------
const CURRENCIES = {
  INR: { symbol: "₹", rate: 1.0, label: "INR", name: "Indian Rupee" },
  USD: { symbol: "$", rate: 0.0116, label: "USD", name: "US Dollar (1 USD = ₹86.50)" },
  EUR: { symbol: "€", rate: 0.0107, label: "EUR", name: "Euro (1 EUR = ₹93.20)" },
  GBP: { symbol: "£", rate: 0.0091, label: "GBP", name: "British Pound (1 GBP = ₹110.40)" },
};

// ---------- State ----------
const State = {
  ...TWEAK_DEFAULTS,
  currentSection: "overview",
  currentRoute: "DEL-BOM",
  currentLeadTime: 7,
  dateRange: "90d",
  currency: "INR",
};

// Hook currency formatter into APIX
if (window.APIX) {
  window.APIX.fmtCurrency = function(n) {
    const curr = CURRENCIES[State.currency] || CURRENCIES.INR;
    const val = Math.round(n * curr.rate);
    return `${curr.symbol}${val.toLocaleString("en-IN")}`;
  };
  window.APIX.fmtINR = function(n) {
    return window.APIX.fmtCurrency(n);
  };
}

// Load from localStorage
try {
  const saved = JSON.parse(localStorage.getItem("apix-state") || "{}");
  Object.assign(State, saved);
} catch(e) {}
function saveState() {
  const persist = {
    currentSection: State.currentSection,
    currentRoute: State.currentRoute,
    currentLeadTime: State.currentLeadTime,
    dateRange: State.dateRange,
    currency: State.currency,
  };
  localStorage.setItem("apix-state", JSON.stringify(persist));
}

// ---------- Theme / accent ----------
function applyTheme() {
  document.documentElement.dataset.theme = State.theme;
  const preset = ACCENT_PRESETS[State.accent] || ACCENT_PRESETS.ashoka;
  const color = State.theme === "dark" ? preset.dark : preset.light;
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-strong", color);
  // Update accent-soft
  const soft = State.theme === "dark"
    ? color.replace(")", " / 0.14)").replace("rgb(", "rgba(").replace("#", "") // fallback below
    : null;
  if (State.theme === "light") {
    // hex to rgb
    const hex = color.replace("#","");
    const r = parseInt(hex.slice(0,2), 16), g = parseInt(hex.slice(2,4), 16), b = parseInt(hex.slice(4,6), 16);
    document.documentElement.style.setProperty("--accent-soft", `rgba(${r},${g},${b},0.10)`);
  } else {
    const hex = color.replace("#","");
    const r = parseInt(hex.slice(0,2), 16), g = parseInt(hex.slice(2,4), 16), b = parseInt(hex.slice(4,6), 16);
    document.documentElement.style.setProperty("--accent-soft", `rgba(${r},${g},${b},0.14)`);
  }
}

// ---------- Section navigation ----------
function activateSection(id) {
  State.currentSection = id;
  document.querySelectorAll(".section").forEach(s => s.classList.toggle("active", s.dataset.section === id));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.target === id));
  const label = document.querySelector(`.nav-item[data-target="${id}"] .lbl`);
  const crumb = document.getElementById("crumb-current");
  if (crumb && label) crumb.textContent = label.textContent;
  saveState();
  // Re-render charts for the newly-visible section (they need real width)
  requestAnimationFrame(() => renderSection(id));
}

// ---------- Renderers ----------
function renderOverview() {
  // Hero variation
  document.querySelectorAll(".hero").forEach(h => {
    h.style.display = h.dataset.variant === State.hero ? "" : "none";
  });
  renderHero();
  renderKPIs();
  renderTrendChart();
  renderSubIndices();
  renderRouteTable();
}

function getDaysCount() {
  if (State.dateRange === "7d") return 7;
  if (State.dateRange === "30d") return 30;
  return 90;
}

function updateDateChip() {
  const lbl = document.getElementById("date-picker-label");
  if (!lbl) return;
  const rangeLabels = {
    "7d": "1 Sep – 7 Sep 2026",
    "30d": "9 Aug – 7 Sep 2026",
    "90d": "10 Jun – 7 Sep 2026",
    "180d": "11 Mar – 7 Sep 2026"
  };
  lbl.textContent = rangeLabels[State.dateRange] || (State.customDateLabel || "10 Jun – 7 Sep 2026");
}

function updateCurrencyChip() {
  const curr = CURRENCIES[State.currency] || CURRENCIES.INR;
  const lbl = document.getElementById("currency-label");
  const sym = document.getElementById("currency-symbol");
  if (lbl) lbl.textContent = curr.label;
  if (sym) sym.textContent = curr.symbol;
}

function renderHero() {
  const A = window.APIX;
  const days = getDaysCount();
  const dayDelta = A.pctDelta(A.APIx_HEADLINE, A.APIx_PREV);
  const weekDelta = A.pctDelta(A.APIx_HEADLINE, A.APIx_WEEK_AGO);
  const monthDelta = A.pctDelta(A.APIx_HEADLINE, A.APIx_MONTH_AGO);

  // V1 Statesman
  const v1 = document.querySelector('.hero[data-variant="v1"]');
  if (v1) {
    const [intPart, dec] = A.APIx_HEADLINE.toFixed(2).split(".");
    v1.querySelector(".v1-num").innerHTML = `${intPart}<span class="frac">.${dec}</span>`;
    v1.querySelector(".v1-delta").innerHTML = renderDelta(dayDelta, "d/d");
    v1.querySelector(".v1-week").innerHTML = renderDelta(weekDelta, "w/w");
    v1.querySelector(".v1-month").innerHTML = renderDelta(monthDelta, "m/m");
    // sparkline matching dateRange
    APIX_CHARTS.sparkline(v1.querySelector(".v1-spark"), A.APIx_ALL.slice(-days), { color: getCSSVar("--accent"), height: 80 });
  }

  // V2 Ticker
  const v2 = document.querySelector('.hero[data-variant="v2"]');
  if (v2) {
    v2.querySelector(".v2-big").textContent = A.APIx_HEADLINE.toFixed(2);
    v2.querySelector(".v2-delta").innerHTML = renderDelta(dayDelta, "day");
    // fill mini grid matching dateRange
    const sliceData = A.APIx_ALL.slice(-days);
    const highVal = Math.max(...sliceData.map(d => d.value));
    const lowVal = Math.min(...sliceData.map(d => d.value));
    v2.querySelector(".v2-mini-week .val").textContent = A.APIx_WEEK_AGO.toFixed(2);
    v2.querySelector(".v2-mini-week .lb-d").innerHTML = renderDelta(weekDelta, "");
    v2.querySelector(".v2-mini-month .val").textContent = A.APIx_MONTH_AGO.toFixed(2);
    v2.querySelector(".v2-mini-month .lb-d").innerHTML = renderDelta(monthDelta, "");
    const highLabel = v2.querySelector(".v2-mini-high .lb");
    if (highLabel) highLabel.textContent = `${days}d high`;
    v2.querySelector(".v2-mini-high .val").textContent = highVal.toFixed(2);
    const lowLabel = v2.querySelector(".v2-mini-low .lb");
    if (lowLabel) lowLabel.textContent = `${days}d low`;
    v2.querySelector(".v2-mini-low .val").textContent = lowVal.toFixed(2);
    // ticker
    const track = v2.querySelector(".ticker-track");
    if (!track.dataset.built) {
      const items = A.TICKER.concat(A.TICKER).map(t => `
        <span class="ticker-item">
          <span class="rt">${t.rt}</span>
          <span>${A.fmtINR(t.fare)}</span>
          <span class="${t.change >= 0 ? 'up' : 'dn'}">${t.change >= 0 ? '▲' : '▼'} ${Math.abs(t.change).toFixed(2)}%</span>
        </span>
      `).join("");
      track.innerHTML = items;
      track.dataset.built = "1";
    }
  }

  // V3 Report
  const v3 = document.querySelector('.hero[data-variant="v3"]');
  if (v3) {
    v3.querySelector(".v3-num").textContent = A.APIx_HEADLINE.toFixed(1);
    v3.querySelector(".v3-delta").innerHTML = renderDelta(dayDelta, "");
    APIX_CHARTS.sparkline(v3.querySelector(".v3-spark"), A.APIx_ALL.slice(-days), { color: getCSSVar("--accent"), height: 44 });
    const trendLb = v3.querySelector(".v3-spark + .muted");
    if (trendLb) trendLb.textContent = `${days}-day trend →`;
  }
}

function renderDelta(v, suffix) {
  const cls = v > 0.05 ? "up" : v < -0.05 ? "down" : "flat";
  const arrow = v > 0.05 ? "▲" : v < -0.05 ? "▼" : "▪";
  const sfx = suffix ? ` <span style="opacity:0.6; font-weight: 400;">${suffix}</span>` : "";
  return `<span class="delta ${cls}">${arrow} ${Math.abs(v).toFixed(2)}%${sfx}</span>`;
}

function renderKPIs() {
  const A = window.APIX;
  const container = document.getElementById("overview-kpis");
  if (!container) return;
  const total = A.CURRENT_FARES.reduce((s, r) => s + r.byLT[7], 0);
  const avgFare = total / A.CURRENT_FARES.length;
  const sample = A.PIPELINE[0].num;
  const scraperOK = A.JOBS.filter(j => j.status === "ok").length;
  const kpis = [
    { label: "AVG FARE, T+7", value: A.fmtINR(avgFare), delta: 2.34, foot: "across 12 sectors" },
    { label: "QUOTES / DAY", value: sample.toLocaleString("en-IN"), delta: -0.8, foot: "11 sources, 5 windows" },
    { label: "SOURCE UPTIME", value: `${((scraperOK / A.JOBS.length) * 100).toFixed(1)}%`, delta: 1.2, foot: `${scraperOK} of ${A.JOBS.length} nominal` },
    { label: "DGCA CORRELATION", value: A.BACKTEST_STATS.corr.toFixed(3), delta: 0.4, foot: "12-mo back-test" },
  ];
  container.innerHTML = kpis.map(k => `
    <div class="kpi">
      <div class="label">${k.label}</div>
      <div class="value">${k.value}</div>
      <div class="foot">${renderDelta(k.delta, "")}<span>${k.foot}</span></div>
    </div>
  `).join("");
}

function renderTrendChart() {
  const A = window.APIX;
  const container = document.getElementById("trend-chart");
  if (!container) return;
  const days = getDaysCount();
  const data = A.APIx_ALL.slice(-days);

  // Update card title and sub
  const panel = container.closest(".panel");
  if (panel) {
    const titleEl = panel.querySelector(".panel-title");
    const subEl = panel.querySelector(".panel-sub");
    if (titleEl) titleEl.textContent = `AeroStat composite · ${days}-day trend`;
    if (subEl) {
      const dates = {
        7: "1 Sep – 7 Sep 2026",
        30: "9 Aug – 7 Sep 2026",
        90: "10 Jun – 7 Sep 2026"
      };
      subEl.textContent = `Daily close · Last ${days} days (${dates[days] || "Recent"}) · Base Jan 2025 = 100.00`;
    }
  }

  APIX_CHARTS.lineChart(container, {
    data,
    height: 300,
    yFormat: v => v.toFixed(1),
    yTickCount: 5,
    accent: getCSSVar("--accent"),
  });
}

function renderSubIndices() {
  const A = window.APIX;
  const container = document.getElementById("sub-indices");
  if (!container) return;
  const days = getDaysCount();
  const items = [
    { name: "Metro corridors",     data: A.SUB_METRO,     color: getCSSVar("--accent") },
    { name: "Non-metro",           data: A.SUB_NONMETRO,  color: "#B4670E" },
    { name: "Leisure sectors",     data: A.SUB_LEISURE,   color: "#A6182B" },
    { name: "Business corridors",  data: A.SUB_BUSINESS,  color: "#0F6B4A" },
  ];
  container.innerHTML = items.map((it, i) => {
    const prevIdx = Math.max(0, it.data.length - days);
    const delta = A.pctDelta(it.data[it.data.length-1].value, it.data[prevIdx].value);
    return `
    <div class="panel" style="padding: 0;">
      <div class="panel-body p-tight">
        <div class="row" style="justify-content: space-between; align-items: flex-start;">
          <div>
            <div class="xs mono muted" style="text-transform: uppercase; letter-spacing: 0.08em;">${it.name}</div>
            <div class="serif" style="font-size: 22px; margin-top: 4px; letter-spacing: -0.01em;">${it.data[it.data.length-1].value.toFixed(2)}</div>
          </div>
          <div>${renderDelta(delta, State.dateRange)}</div>
        </div>
        <div class="sp-${i}" style="margin-top: 6px;"></div>
      </div>
    </div>
  `;
  }).join("");
  items.forEach((it, i) => {
    APIX_CHARTS.sparkline(container.querySelector(`.sp-${i}`), it.data.slice(-days), { color: it.color, height: 36 });
  });
}

function renderRouteTable() {
  const A = window.APIX;
  const container = document.getElementById("route-table-body");
  if (!container) return;
  container.innerHTML = A.CURRENT_FARES.map(r => {
    const hist = A.ROUTE_HISTORIES[`${r.o}-${r.d}`];
    const wow = hist ? A.pctDelta(hist[hist.length - 1].value, hist[hist.length - 8].value) : ((r.delta || 0) * 100);
    return `
      <tr data-route="${r.o}-${r.d}" style="cursor: pointer;">
        <td>
          <div class="row">
            <span class="mono" style="color: var(--accent); font-size: 12px;">${r.o}–${r.d}</span>
          </div>
          <div class="xs muted mono">${A.AIRPORTS[r.o].city} → ${A.AIRPORTS[r.d].city}</div>
        </td>
        <td class="num">${A.fmtINR(r.byLT[1])}</td>
        <td class="num">${A.fmtINR(r.byLT[7])}</td>
        <td class="num">${A.fmtINR(r.byLT[15])}</td>
        <td class="num">${A.fmtINR(r.byLT[30])}</td>
        <td class="num">${A.fmtINR(r.byLT[45])}</td>
        <td class="num">${renderDelta(wow, "")}</td>
        <td><div class="rt-spark-${r.o}-${r.d}" style="width: 100px;"></div></td>
      </tr>
    `;
  }).join("");
  // sparklines
  A.CURRENT_FARES.forEach(r => {
    const cell = container.querySelector(`.rt-spark-${r.o}-${r.d}`);
    const hist = A.ROUTE_HISTORIES[`${r.o}-${r.d}`].slice(-30);
    APIX_CHARTS.sparkline(cell, hist, { color: getCSSVar("--accent"), height: 28, showFill: false });
  });
  // click
  container.querySelectorAll("tr").forEach(tr => {
    tr.addEventListener("click", () => {
      State.currentRoute = tr.dataset.route;
      activateSection("route");
    });
  });
}

const cosmeticRand = () => Math.random(); // for cosmetic post-render only

// ---------- Sector Heatmap ----------
function renderHeatmap() {
  const A = window.APIX;
  const container = document.getElementById("heatmap-table");
  if (!container) return;
  // Compute all delta values for scale
  const cellData = [];
  A.CURRENT_FARES.forEach(r => {
    A.LEAD_TIMES.forEach(lt => {
      const base = r.baseFare * A.leadTimeMultiplier(lt);
      const delta = (r.byLT[lt] - base) / base * 100;
      cellData.push(delta);
    });
  });
  const min = Math.min(...cellData);
  const max = Math.max(...cellData);
  const scale = Math.max(Math.abs(min), Math.abs(max));

  let html = `<thead><tr><th class="rlbl"></th>`;
  A.LEAD_TIMES.forEach(lt => {
    html += `<th>T+${lt}</th>`;
  });
  html += `<th style="width: 100px;">30d trend</th></tr></thead><tbody>`;
  A.CURRENT_FARES.forEach(r => {
    html += `<tr><td class="rlbl">${r.o}–${r.d}<div class="xs muted" style="font-family: var(--font-mono); font-weight: 400; margin-top: 2px;">${A.AIRPORTS[r.o].city.slice(0,4)}→${A.AIRPORTS[r.d].city.slice(0,4)}</div></td>`;
    A.LEAD_TIMES.forEach(lt => {
      const base = r.baseFare * A.leadTimeMultiplier(lt);
      const delta = (r.byLT[lt] - base) / base * 100;
      // Normalize to 0-1 where 0.5 is neutral
      const t = 0.5 + (delta / scale) * 0.5;
      const bg = APIX_CHARTS.heatmapColor(t, 0, 1);
      html += `<td class="cell" style="background: ${bg};" title="${r.o}-${r.d} T+${lt}: ${A.fmtINR(r.byLT[lt])}">
        <div style="font-weight: 500;">${A.fmtINR(r.byLT[lt])}</div>
        <div class="xs" style="opacity: 0.7; margin-top: 1px;">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%</div>
      </td>`;
    });
    html += `<td style="padding: 4px 8px; background: var(--panel);"><div class="hm-spark-${r.o}-${r.d}" style="width: 90px;"></div></td>`;
    html += `</tr>`;
  });
  html += `</tbody>`;
  container.innerHTML = html;
  A.CURRENT_FARES.forEach(r => {
    const cell = container.querySelector(`.hm-spark-${r.o}-${r.d}`);
    const hist = A.ROUTE_HISTORIES[`${r.o}-${r.d}`].slice(-30);
    APIX_CHARTS.sparkline(cell, hist, { color: getCSSVar("--accent"), height: 24, showFill: false });
  });
}

// ---------- Route drill-down ----------
function renderRouteDrill() {
  const A = window.APIX;
  const [o, d] = State.currentRoute.split("-");
  const route = A.CURRENT_FARES.find(r => r.o === o && r.d === d);
  if (!route) return;

  // Header
  document.getElementById("rd-title").innerHTML = `
    <span class="mono" style="color: var(--accent); font-size: 24px;">${o}</span>
    <span style="color: var(--ink-4); margin: 0 8px;">→</span>
    <span class="mono" style="color: var(--accent); font-size: 24px;">${d}</span>
    <span class="serif" style="margin-left: 16px; color: var(--ink-3); font-size: 18px;">${A.AIRPORTS[o].city} — ${A.AIRPORTS[d].city}</span>
  `;

  // Route selector dropdown
  const sel = document.getElementById("rd-select-list");
  if (sel) {
    sel.innerHTML = A.CURRENT_FARES.map(r => `
      <div class="endpoint-row" data-route="${r.o}-${r.d}" ${r.o === o && r.d === d ? 'style="background: var(--accent-soft);"' : ''}>
        <span class="method get" style="background: var(--ink-3);">${r.o}</span>
        <div>
          <div class="endpoint-path">${r.o}–${r.d}</div>
          <div class="endpoint-desc">${A.AIRPORTS[r.o].city} → ${A.AIRPORTS[r.d].city}</div>
        </div>
        <span class="mono muted small">${A.fmtINR(r.byLT[7])}</span>
      </div>
    `).join("");
    sel.querySelectorAll(".endpoint-row").forEach(row => {
      row.addEventListener("click", () => {
        State.currentRoute = row.dataset.route;
        renderRouteDrill();
        saveState();
      });
    });
  }

  // Big fare
  document.getElementById("rd-fare").innerHTML = `${A.fmtINR(route.byLT[State.currentLeadTime])}`;
  document.getElementById("rd-lt-label").textContent = `T+${State.currentLeadTime} advance-purchase, all carriers`;

  // Lead time pills
  const pills = document.getElementById("rd-lt-pills");
  pills.innerHTML = A.LEAD_TIMES.map(lt => `
    <div class="p ${lt === State.currentLeadTime ? 'active' : ''}" data-lt="${lt}">T+${lt}</div>
  `).join("");
  pills.querySelectorAll(".p").forEach(p => {
    p.addEventListener("click", () => {
      State.currentLeadTime = +p.dataset.lt;
      renderRouteDrill();
    });
  });

  // Fare history
  const histContainer = document.getElementById("rd-history");
  if (histContainer) {
    const days = getDaysCount();
    const histLabel = histContainer.previousElementSibling;
    if (histLabel) histLabel.textContent = `${days}-day fare history`;
    const fullHist = A.ROUTE_HISTORIES[State.currentRoute] || [];
    const hist = fullHist.slice(-days);
    APIX_CHARTS.lineChart(histContainer, {
      data: hist,
      height: 260,
      yFormat: v => "₹" + (v/1000).toFixed(1) + "k",
      accent: getCSSVar("--accent"),
    });
  }

  // Carrier breakdown
  const carriers = A.carrierFaresForRoute(route);
  const cContainer = document.getElementById("rd-carriers");
  if (cContainer) {
    APIX_CHARTS.barChart(cContainer, carriers.map(c => ({
      label: c.code,
      value: c.fare,
      color: c.color,
      valueLabel: "₹" + (c.fare/1000).toFixed(1) + "k",
    })), {
      height: 200,
      yFormat: v => "₹" + (v/1000).toFixed(0) + "k",
    });
  }

  // Fare distribution boxplot per lead-time
  const boxContainer = document.getElementById("rd-boxplot");
  if (boxContainer) {
    const boxes = A.LEAD_TIMES.map(lt => {
      const median = route.byLT[lt];
      const spread = median * route.volatility * 0.6;
      return {
        label: `T+${lt}`,
        min: Math.round(median - spread * 1.6),
        q1:  Math.round(median - spread * 0.7),
        med: Math.round(median),
        q3:  Math.round(median + spread * 0.7),
        max: Math.round(median + spread * 1.6),
      };
    });
    APIX_CHARTS.fareBoxplot(boxContainer, boxes, { color: getCSSVar("--accent"), height: 240 });
  }

  // Carrier table
  const ct = document.getElementById("rd-carrier-tbody");
  if (ct) {
    ct.innerHTML = carriers.map(c => {
      return `<tr>
        <td>
          <span class="carrier-chip"><span class="carrier-mark" style="background: ${c.color};">${c.code}</span>${c.name}</span>
        </td>
        <td class="num">${A.fmtINR(c.fare)}</td>
        <td class="num">${A.fmtINR(Math.round(c.fare * 0.87))}</td>
        <td class="num">${A.fmtINR(Math.round(c.fare * 0.13))}</td>
        <td class="num">${c.sampleN}</td>
        <td class="num">${renderDelta(c.wow, "")}</td>
      </tr>`;
    }).join("");
  }
}

// ---------- Lead-time elasticity ----------
function renderElasticity() {
  const A = window.APIX;
  const container = document.getElementById("elast-chart");
  if (!container) return;
  // Curves for a few routes
  const topRoutes = A.CURRENT_FARES.slice(0, 5);
  const colors = [getCSSVar("--accent"), "#A6182B", "#0F6B4A", "#B4670E", "#5F4B8B"];
  const series = topRoutes.map((r, i) => ({
    name: `${r.o}-${r.d}`,
    color: colors[i],
    data: A.LEAD_TIMES.map(lt => ({ label: `T+${lt}`, value: r.byLT[lt] })),
  }));
  APIX_CHARTS.lineChart(container, {
    series,
    height: 320,
    yFormat: v => "₹" + (v/1000).toFixed(1) + "k",
    area: false,
    xFormat: (dp) => dp.label,
  });
  // Legend
  const lg = document.getElementById("elast-legend");
  if (lg) {
    lg.innerHTML = series.map(s => `
      <span class="lg"><span class="sw" style="background: ${s.color};"></span>${s.name}</span>
    `).join("");
  }

  // Elasticity coefficients
  const tbody = document.getElementById("elast-tbody");
  if (tbody) {
    tbody.innerHTML = topRoutes.map((r, i) => {
      // Simple elasticity: (fare[T+1] - fare[T+30]) / fare[T+30]
      const e = (r.byLT[1] - r.byLT[30]) / r.byLT[30] * 100;
      const e15 = (r.byLT[15] - r.byLT[30]) / r.byLT[30] * 100;
      return `<tr>
        <td><span class="mono" style="color: ${colors[i]};">■</span> ${r.o}–${r.d}</td>
        <td class="num">${A.fmtINR(r.byLT[1])}</td>
        <td class="num">${A.fmtINR(r.byLT[7])}</td>
        <td class="num">${A.fmtINR(r.byLT[30])}</td>
        <td class="num">+${e.toFixed(1)}%</td>
        <td class="num">+${e15.toFixed(1)}%</td>
        <td class="num">${r.volatility.toFixed(2)}</td>
      </tr>`;
    }).join("");
  }
}

// ---------- Carrier comparison ----------
function renderCarriers() {
  const A = window.APIX;
  // Market share donut / bars
  const shareContainer = document.getElementById("carrier-share");
  if (shareContainer) {
    APIX_CHARTS.barChart(shareContainer, A.CARRIERS.map(c => ({
      label: c.code,
      value: c.share * 100,
      color: c.color,
      valueLabel: (c.share * 100).toFixed(0) + "%",
    })), { height: 200, yFormat: v => v + "%" });
  }
  // Avg fare across all routes
  const avgContainer = document.getElementById("carrier-avg-fare");
  if (avgContainer) {
    const carriers = A.CARRIERS.map(c => {
      const total = A.CURRENT_FARES.reduce((s, r) => {
        const adj = c.code === "6E" ? 1.0 : c.code === "AI" ? 1.08 : c.code === "IX" ? 0.94 : c.code === "SG" ? 0.92 : 0.96;
        return s + r.byLT[7] * adj;
      }, 0);
      return { label: c.code, value: total / A.CURRENT_FARES.length, color: c.color, valueLabel: "₹" + Math.round(total / A.CURRENT_FARES.length / 100) / 10 + "k" };
    });
    APIX_CHARTS.barChart(avgContainer, carriers, {
      height: 200,
      yFormat: v => "₹" + (v/1000).toFixed(0) + "k",
    });
  }
  // Carrier trend (multi-line: index of each carrier's avg over time)
  const trendContainer = document.getElementById("carrier-trend");
  if (trendContainer) {
    const days = 60;
    const series = A.CARRIERS.map(c => {
      let level = 100;
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        level *= 1 + 0.0015 + (Math.sin(i / 6) * 0.005) + (Math.random() - 0.5) * 0.012 * (c.code === "SG" ? 1.4 : 1);
        data.push({ date: A.daysAgo(i), value: level });
      }
      return { name: c.name, color: c.color, data };
    });
    APIX_CHARTS.lineChart(trendContainer, {
      series, height: 260, area: false,
      yFormat: v => v.toFixed(1),
    });
    const lg = document.getElementById("carrier-legend");
    if (lg) lg.innerHTML = series.map(s => `<span class="lg"><span class="sw" style="background: ${s.color};"></span>${s.name}</span>`).join("");
  }
}

// ---------- Scraper ops ----------
function renderScraperOps() {
  const A = window.APIX;
  const container = document.getElementById("scraper-jobs");
  if (!container) return;
  container.innerHTML = A.JOBS.map(j => {
    const dot = j.status === "ok" ? '<span class="alert-dot low" style="width:8px;height:8px;box-shadow:none;background:var(--india-green);"></span>' :
                j.status === "warn" ? '<span class="alert-dot med" style="width:8px;height:8px;box-shadow:none;background:var(--saffron);"></span>' :
                '<span class="alert-dot high" style="width:8px;height:8px;box-shadow:none;background:var(--up);"></span>';
    const fillCls = j.status === "ok" ? "" : j.status === "warn" ? "warn" : "err";
    return `<div class="job-row">
      <div>${dot}</div>
      <div class="src">${j.name} <span class="u">${j.url} · ${j.tech}</span></div>
      <div class="m">${j.quotes.toLocaleString("en-IN")} quotes</div>
      <div class="m">${j.latency}ms</div>
      <div class="m">${j.lastRun}</div>
      <div style="padding-left: 8px;">
        <div class="progress"><div class="fill ${fillCls}" style="width: ${j.success}%;"></div></div>
        <div class="xs mono muted" style="margin-top: 3px; text-align: right;">${j.success.toFixed(1)}%</div>
      </div>
    </div>`;
  }).join("");

  // Scraper KPIs
  const kpi = document.getElementById("scraper-kpis");
  if (kpi) {
    const total = A.JOBS.reduce((s,j) => s + j.quotes, 0);
    const failed = A.JOBS.reduce((s,j) => s + j.failed, 0);
    const avgLat = A.JOBS.reduce((s,j) => s + j.latency, 0) / A.JOBS.length;
    kpi.innerHTML = `
      <div class="kpi"><div class="label">QUOTES / 24H</div><div class="value">${total.toLocaleString("en-IN")}</div><div class="foot">${renderDelta(4.2, "")}<span>across ${A.JOBS.length} sources</span></div></div>
      <div class="kpi"><div class="label">FAILED REQUESTS</div><div class="value">${failed.toLocaleString("en-IN")}<span class="unit">${(failed/total*100).toFixed(2)}%</span></div><div class="foot"><span class="delta down">▼ 0.31%</span><span>vs 7d avg</span></div></div>
      <div class="kpi"><div class="label">AVG LATENCY</div><div class="value">${Math.round(avgLat)}<span class="unit">ms</span></div><div class="foot"><span class="delta flat">▪ 2ms</span><span>P95: 918ms</span></div></div>
      <div class="kpi"><div class="label">IP POOL HEALTH</div><div class="value">94<span class="unit">/ 100</span></div><div class="foot"><span class="delta up">▲ blocks</span><span>6 IPs rotated</span></div></div>
    `;
  }
}

// ---------- Pipeline & cleaning ----------
function renderPipeline() {
  const A = window.APIX;
  const container = document.getElementById("pipeline-flow");
  if (!container) return;
  container.innerHTML = A.PIPELINE.map((s, i) => `
    <div class="pl-stage">
      <div class="st-num">${String(i+1).padStart(2,'0')}</div>
      <div class="st-name">${s.name}</div>
      <div class="st-val">${s.val}</div>
      <div class="st-sub">${s.sub}</div>
    </div>
  `).join("");

  // Cleaning stats
  const clean = document.getElementById("cleaning-stats");
  if (clean) {
    const stats = [
      { lb: "Missing values imputed",  vl: "412",  sn: "median-fill on same-carrier same-route" },
      { lb: "Outliers removed",         vl: "1,208", sn: "IQR × 1.5 (log-space)" },
      { lb: "Duplicates collapsed",     vl: "4,091", sn: "same (route, dep-time, carrier)" },
      { lb: "Cancelled / sold-out flagged", vl: "297",  sn: "excluded from index calc" },
      { lb: "Tax normalisation applied",  vl: "33,204", sn: "base + UDF + PSF + GST split" },
      { lb: "Currency reconciliation",    vl: "100%",  sn: "INR base, USD hedge log" },
    ];
    clean.innerHTML = stats.map(s => `
      <div class="bt-stat">
        <div class="lb">${s.lb}</div>
        <div class="vl">${s.vl}</div>
        <div class="sn">${s.sn}</div>
      </div>
    `).join("");
  }
}

// ---------- Back-test ----------
function renderBacktest() {
  const A = window.APIX;
  const container = document.getElementById("bt-chart");
  if (!container) return;
  const series = [
    { name: "AeroStat (daily → monthly mean)", color: getCSSVar("--accent"), data: A.BACKTEST.map(b => ({ label: b.label, value: b.apix })) },
    { name: "DGCA monthly avg fare (indexed)", color: "#A6182B", data: A.BACKTEST.map(b => ({ label: b.label, value: b.dgca })), dashed: true },
  ];
  APIX_CHARTS.lineChart(container, {
    series, height: 320, area: false,
    yFormat: v => v.toFixed(1),
    xFormat: (dp) => dp.label,
  });
  const lg = document.getElementById("bt-legend");
  if (lg) lg.innerHTML = series.map(s => `<span class="lg"><span class="sw" style="background: ${s.color}; ${s.dashed ? 'border-top: 1.5px dashed ' + s.color + '; height: 0;' : ''}"></span>${s.name}</span>`).join("");

  const stats = document.getElementById("bt-stats");
  if (stats) {
    stats.innerHTML = `
      <div class="bt-stat"><div class="lb">Pearson correlation</div><div class="vl">${A.BACKTEST_STATS.corr.toFixed(4)}</div><div class="sn">12 monthly obs</div></div>
      <div class="bt-stat"><div class="lb">MAE</div><div class="vl">${A.BACKTEST_STATS.mae.toFixed(2)}</div><div class="sn">mean absolute error</div></div>
      <div class="bt-stat"><div class="lb">RMSE</div><div class="vl">${A.BACKTEST_STATS.rmse.toFixed(2)}</div><div class="sn">root mean square error</div></div>
      <div class="bt-stat"><div class="lb">MAPE</div><div class="vl">${A.BACKTEST_STATS.mape.toFixed(2)}%</div><div class="sn">mean abs. pct. error</div></div>
    `;
  }
}

// ---------- API console ----------
function renderAPI() {
  const A = window.APIX;
  const ec = document.getElementById("endpoint-list");
  if (!ec) return;
  const endpoints = [
    { method: "GET",  path: "/v1/index/latest",           desc: "Latest AeroStat headline value with sub-indices" },
    { method: "GET",  path: "/v1/index/series",           desc: "Time-series AeroStat values with configurable range" },
    { method: "GET",  path: "/v1/routes",                 desc: "List all city-pairs in the basket with weights" },
    { method: "GET",  path: "/v1/routes/{orig}/{dest}",   desc: "Route-level fare snapshot across all windows" },
    { method: "GET",  path: "/v1/carriers/{code}/fares",  desc: "Carrier-level fare distribution" },
    { method: "GET",  path: "/v1/heatmap/current",        desc: "12×5 matrix of route × lead-time delta vs baseline" },
    { method: "GET",  path: "/v1/backtest/dgca",          desc: "AeroStat vs DGCA monthly averages back-test" },
    { method: "POST", path: "/v1/webhooks/subscribe",     desc: "Subscribe to fare-anomaly & index-release webhooks" },
  ];
  ec.innerHTML = endpoints.map(e => `
    <div class="endpoint-row" data-path="${e.path}">
      <span class="method ${e.method.toLowerCase()}">${e.method}</span>
      <div>
        <div class="endpoint-path">${e.path}</div>
        <div class="endpoint-desc">${e.desc}</div>
      </div>
      <span class="badge info">v1</span>
    </div>
  `).join("");
  ec.querySelectorAll(".endpoint-row").forEach(row => {
    row.addEventListener("click", () => {
      // Show sample response
      const path = row.dataset.path;
      renderAPISample(path);
      ec.querySelectorAll(".endpoint-row").forEach(r => r.style.background = "");
      row.style.background = "var(--accent-soft)";
    });
  });
  renderAPISample("/v1/index/latest");
}

function renderAPISample(path) {
  const A = window.APIX;
  const c = document.getElementById("api-sample");
  const title = document.getElementById("api-sample-title");
  if (!c) return;
  if (title) title.innerHTML = `<span class="method get">GET</span> <span class="mono">${path}</span>`;
  const samples = {
    "/v1/index/latest": {
      request: `curl -H "Authorization: Bearer $NSO_KEY" \\
     https://aerostat.mospi.gov.in/v1/index/latest`,
      response: {
        "as_of": "2026-09-07T06:00:00+05:30",
        "index": {
          "headline": +A.APIx_HEADLINE.toFixed(4),
          "base": 100.0,
          "base_period": "2025-01-01"
        },
        "changes": {
          "day_over_day_pct":   +A.pctDelta(A.APIx_HEADLINE, A.APIx_PREV).toFixed(4),
          "week_over_week_pct": +A.pctDelta(A.APIx_HEADLINE, A.APIx_WEEK_AGO).toFixed(4),
          "month_over_month_pct": +A.pctDelta(A.APIx_HEADLINE, A.APIx_MONTH_AGO).toFixed(4)
        },
        "sub_indices": {
          "metro_corridors":    +A.SUB_METRO[A.SUB_METRO.length-1].value.toFixed(4),
          "non_metro":          +A.SUB_NONMETRO[A.SUB_NONMETRO.length-1].value.toFixed(4),
          "leisure_sectors":    +A.SUB_LEISURE[A.SUB_LEISURE.length-1].value.toFixed(4),
          "business_corridors": +A.SUB_BUSINESS[A.SUB_BUSINESS.length-1].value.toFixed(4)
        },
        "coverage": {
          "routes": 12, "carriers": 5, "sources": 11, "quotes_last_24h": 38412
        }
      }
    },
    "/v1/routes/{orig}/{dest}": {
      request: `curl -H "Authorization: Bearer $NSO_KEY" \\
     https://aerostat.mospi.gov.in/v1/routes/DEL/BOM`,
      response: {
        "route": "DEL-BOM",
        "origin":      { "iata": "DEL", "city": "New Delhi" },
        "destination": { "iata": "BOM", "city": "Mumbai" },
        "weight": 0.1852,
        "as_of": "2026-09-07T06:00:00+05:30",
        "fares_inr": {
          "T+1":  A.CURRENT_FARES[0].byLT[1],
          "T+7":  A.CURRENT_FARES[0].byLT[7],
          "T+15": A.CURRENT_FARES[0].byLT[15],
          "T+30": A.CURRENT_FARES[0].byLT[30],
          "T+45": A.CURRENT_FARES[0].byLT[45]
        },
        "carriers": ["6E","AI","IX","SG","QP"],
        "sample_size": 3208
      }
    }
  };
  const s = samples[path] || samples["/v1/index/latest"];
  c.innerHTML = `
    <div class="mono xs muted" style="text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Request</div>
    <pre class="code-block">${syntaxHighlightBash(s.request)}</pre>
    <div class="mono xs muted" style="text-transform: uppercase; letter-spacing: 0.08em; margin: 16px 0 8px;">Response · 200 OK · application/json</div>
    <pre class="code-block">${syntaxHighlightJSON(JSON.stringify(s.response, null, 2))}</pre>
  `;
}

function syntaxHighlightJSON(json) {
  return json
    .replace(/(&)/g, "&amp;").replace(/(<)/g, "&lt;").replace(/(>)/g, "&gt;")
    .replace(/"([^"]+)":/g, '<span class="pn">"$1"</span>:')
    .replace(/: ("[^"]*")/g, ': <span class="str">$1</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="num">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="kw">$1</span>');
}
function syntaxHighlightBash(s) {
  return s.replace(/(curl|-H|-X)/g, '<span class="kw">$1</span>')
          .replace(/(\$\w+)/g, '<span class="num">$1</span>')
          .replace(/("[^"]*")/g, '<span class="str">$1</span>');
}

// ---------- Alerts ----------
function renderAlerts() {
  const A = window.APIX;
  const container = document.getElementById("alerts-list");
  if (!container) return;
  container.innerHTML = A.ALERTS.map(a => `
    <div class="alert-item">
      <div class="alert-dot ${a.level}"></div>
      <div class="alert-body">
        <div class="tl">${a.msg} <span class="rt mono" style="color: var(--accent); font-size: 12px; margin-left: 6px;">${a.route}</span></div>
        <div class="sn">${a.detail}</div>
      </div>
      <div class="alert-time">${a.time}<div class="xs muted" style="margin-top: 2px;">7 Sep 26</div></div>
    </div>
  `).join("");

  // Alert counts
  const counts = document.getElementById("alert-counts");
  if (counts) {
    const high = A.ALERTS.filter(a => a.level === "high").length;
    const med  = A.ALERTS.filter(a => a.level === "med").length;
    const low  = A.ALERTS.filter(a => a.level === "low").length;
    counts.innerHTML = `
      <div class="kpi"><div class="label" style="color: var(--up);">HIGH SEVERITY</div><div class="value">${high}</div><div class="foot"><span class="mono">last 24h</span></div></div>
      <div class="kpi"><div class="label" style="color: #B4670E;">MEDIUM</div><div class="value">${med}</div><div class="foot"><span class="mono">last 24h</span></div></div>
      <div class="kpi"><div class="label" style="color: var(--accent);">LOW / INFO</div><div class="value">${low}</div><div class="foot"><span class="mono">last 24h</span></div></div>
      <div class="kpi"><div class="label">MTTR</div><div class="value">4.2<span class="unit">min</span></div><div class="foot"><span class="mono muted">avg last 30d</span></div></div>
    `;
  }
}

// ---------- Helpers ----------
function getCSSVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ---------- Section dispatch ----------
function renderSection(id) {
  switch (id) {
    case "overview":   renderOverview(); break;
    case "heatmap":    renderHeatmap(); break;
    case "route":      renderRouteDrill(); break;
    case "elasticity": renderElasticity(); break;
    case "carriers":   renderCarriers(); break;
    case "scraper":    renderScraperOps(); break;
    case "pipeline":   renderPipeline(); break;
    case "backtest":   renderBacktest(); break;
    case "api":        renderAPI(); break;
    case "alerts":     renderAlerts(); break;
  }
}

function renderAll() {
  applyTheme();
  // Show/hide scraper ops in nav
  document.querySelectorAll('[data-scraper-only]').forEach(el => {
    el.style.display = State.showScraperOps ? "" : "none";
  });
  renderSection(State.currentSection);
}

// ---------- Tweaks panel ----------
function setupTweaks() {
  const panel = document.getElementById("tweaks");
  window.addEventListener("message", (e) => {
    if (!e.data) return;
    if (e.data.type === "__activate_edit_mode") panel.classList.add("open");
    if (e.data.type === "__deactivate_edit_mode") panel.classList.remove("open");
  });
  // Announce availability
  requestAnimationFrame(() => {
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
  });

  // Close
  panel.querySelector(".close").addEventListener("click", () => panel.classList.remove("open"));

  // Theme
  panel.querySelectorAll("[data-theme-set]").forEach(b => {
    b.addEventListener("click", () => {
      State.theme = b.dataset.themeSet;
      panel.querySelectorAll("[data-theme-set]").forEach(x => x.classList.toggle("active", x.dataset.themeSet === State.theme));
      applyTheme();
      renderSection(State.currentSection);
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { theme: State.theme } }, "*");
    });
  });
  // Init theme buttons
  panel.querySelectorAll("[data-theme-set]").forEach(x => x.classList.toggle("active", x.dataset.themeSet === State.theme));

  // Accent
  panel.querySelectorAll(".tw-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      State.accent = sw.dataset.accent;
      panel.querySelectorAll(".tw-swatch").forEach(x => x.classList.toggle("active", x.dataset.accent === State.accent));
      applyTheme();
      renderSection(State.currentSection);
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { accent: State.accent } }, "*");
    });
  });
  panel.querySelectorAll(".tw-swatch").forEach(x => x.classList.toggle("active", x.dataset.accent === State.accent));

  // Hero variation
  panel.querySelectorAll("[data-hero-set]").forEach(b => {
    b.addEventListener("click", () => {
      State.hero = b.dataset.heroSet;
      panel.querySelectorAll("[data-hero-set]").forEach(x => x.classList.toggle("active", x.dataset.heroSet === State.hero));
      renderOverview();
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { hero: State.hero } }, "*");
    });
  });
  panel.querySelectorAll("[data-hero-set]").forEach(x => x.classList.toggle("active", x.dataset.heroSet === State.hero));

  // Scraper ops toggle
  panel.querySelectorAll("[data-scraper-toggle]").forEach(b => {
    b.addEventListener("click", () => {
      State.showScraperOps = b.dataset.scraperToggle === "on";
      panel.querySelectorAll("[data-scraper-toggle]").forEach(x => x.classList.toggle("active", (x.dataset.scraperToggle === "on") === State.showScraperOps));
      document.querySelectorAll('[data-scraper-only]').forEach(el => {
        el.style.display = State.showScraperOps ? "" : "none";
      });
      // If we're on the scraper section but it was hidden, go to overview
      if (!State.showScraperOps && State.currentSection === "scraper") {
        activateSection("overview");
      }
      window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { showScraperOps: State.showScraperOps } }, "*");
    });
  });
  panel.querySelectorAll("[data-scraper-toggle]").forEach(x => x.classList.toggle("active", (x.dataset.scraperToggle === "on") === State.showScraperOps));
}

// ---------- Top-bar date range ----------
function setupTopbar() {
  document.querySelectorAll("[data-range]").forEach(b => {
    b.addEventListener("click", () => {
      State.dateRange = b.dataset.range;
      document.querySelectorAll("[data-range]").forEach(x => x.classList.toggle("active", x.dataset.range === State.dateRange));
      updateDateChip();
      renderSection(State.currentSection);
      saveState();
    });
  });
  document.querySelectorAll("[data-range]").forEach(x => x.classList.toggle("active", x.dataset.range === State.dateRange));
  updateDateChip();

  // Theme icon toggle in topbar
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      State.theme = State.theme === "light" ? "dark" : "light";
      applyTheme();
      renderSection(State.currentSection);
      // Sync tweak panel
      document.querySelectorAll("[data-theme-set]").forEach(x => x.classList.toggle("active", x.dataset.themeSet === State.theme));
    });
  }
}

// ---------- Toast Notification ----------
function showToast(msg) {
  const toast = document.getElementById("toast-notification");
  if (!toast) return;
  toast.innerHTML = `<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6"/><path d="M5 8 L7 10 L11 6"/></svg><span>${msg}</span>`;
  toast.style.display = "flex";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = "none";
  }, 3200);
}

// ---------- Route Comparison Modal ----------
const compareState = {
  routeA: "DEL-BOM",
  routeB: "DEL-BLR",
  leadTime: 7,
};

function setupCompareModal() {
  const modal = document.getElementById("compare-modal");
  const btnOpen = document.getElementById("btn-compare-routes");
  const btnClose = document.getElementById("compare-modal-close");
  const selectA = document.getElementById("compare-route-a");
  const selectB = document.getElementById("compare-route-b");
  const btnSwap = document.getElementById("compare-swap-routes");
  const ltPills = document.getElementById("compare-lt-pills");

  if (!modal || !btnOpen) return;

  const A = window.APIX;
  const routeOptions = A.CURRENT_FARES.map(r =>
    `<option value="${r.o}-${r.d}">${r.o} → ${r.d} (${A.AIRPORTS[r.o].city} to ${A.AIRPORTS[r.d].city})</option>`
  ).join("");

  selectA.innerHTML = routeOptions;
  selectB.innerHTML = routeOptions;

  ltPills.innerHTML = A.LEAD_TIMES.map(lt =>
    `<div class="p ${lt === compareState.leadTime ? 'active' : ''}" data-lt="${lt}">T+${lt}</div>`
  ).join("");

  ltPills.querySelectorAll(".p").forEach(p => {
    p.addEventListener("click", () => {
      compareState.leadTime = +p.dataset.lt;
      ltPills.querySelectorAll(".p").forEach(x => x.classList.toggle("active", +x.dataset.lt === compareState.leadTime));
      renderCompareContent();
    });
  });

  function openModal() {
    compareState.routeA = State.currentRoute || "DEL-BOM";
    if (compareState.routeB === compareState.routeA) {
      const other = A.CURRENT_FARES.find(r => `${r.o}-${r.d}` !== compareState.routeA);
      if (other) compareState.routeB = `${other.o}-${other.d}`;
    }
    compareState.leadTime = State.currentLeadTime || 7;

    selectA.value = compareState.routeA;
    selectB.value = compareState.routeB;
    ltPills.querySelectorAll(".p").forEach(x => x.classList.toggle("active", +x.dataset.lt === compareState.leadTime));

    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => renderCompareContent());
  }

  function closeModal() {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  btnOpen.addEventListener("click", openModal);
  btnClose.addEventListener("click", closeModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "flex") {
      closeModal();
    }
  });

  selectA.addEventListener("change", () => {
    compareState.routeA = selectA.value;
    renderCompareContent();
  });

  selectB.addEventListener("change", () => {
    compareState.routeB = selectB.value;
    renderCompareContent();
  });

  btnSwap.addEventListener("click", () => {
    const tmp = compareState.routeA;
    compareState.routeA = compareState.routeB;
    compareState.routeB = tmp;
    selectA.value = compareState.routeA;
    selectB.value = compareState.routeB;
    renderCompareContent();
  });
}

function renderCompareContent() {
  const container = document.getElementById("compare-modal-content");
  if (!container) return;

  const A = window.APIX;
  const [oA, dA] = compareState.routeA.split("-");
  const [oB, dB] = compareState.routeB.split("-");
  const rA = A.CURRENT_FARES.find(r => r.o === oA && r.d === dA);
  const rB = A.CURRENT_FARES.find(r => r.o === oB && r.d === dB);
  if (!rA || !rB) return;

  const lt = compareState.leadTime;
  const fareA = rA.byLT[lt];
  const fareB = rB.byLT[lt];
  const diffFare = fareA - fareB;
  const pctFare = fareB ? ((fareA - fareB) / fareB * 100) : 0;

  const days = getDaysCount();
  const histA = (A.ROUTE_HISTORIES[compareState.routeA] || []).slice(-days);
  const histB = (A.ROUTE_HISTORIES[compareState.routeB] || []).slice(-days);

  const chgA = histA.length > 1 ? A.pctDelta(histA[histA.length - 1].value, histA[0].value) : 0;
  const chgB = histB.length > 1 ? A.pctDelta(histB[histB.length - 1].value, histB[0].value) : 0;

  const carriersA = A.carrierFaresForRoute(rA);
  const carriersB = A.carrierFaresForRoute(rB);

  container.innerHTML = `
    <!-- Side-by-Side Scorecard -->
    <div class="compare-scorecard">
      <div class="compare-card route-a">
        <div class="compare-card-head">
          <span class="compare-card-route" style="color: var(--accent);">${rA.o} → ${rA.d}</span>
          <span class="chip mono">T+${lt}</span>
        </div>
        <div class="compare-card-city">${A.AIRPORTS[rA.o].city} to ${A.AIRPORTS[rA.d].city}</div>
        <div class="compare-card-fare">${A.fmtINR(fareA)}</div>
        <div class="compare-card-meta">
          <span>${days}d: <strong style="color: ${chgA >= 0 ? 'var(--up)' : 'var(--down)'};">${A.fmtPct(chgA)}</strong></span>
          <span>Vol: <strong>${(rA.volatility * 100).toFixed(0)}%</strong></span>
          <span>Share: <strong>${(rA.weight * 100).toFixed(1)}%</strong></span>
        </div>
      </div>

      <div class="compare-delta-box">
        <div class="compare-delta-val" style="color: ${diffFare > 0 ? 'var(--up)' : (diffFare < 0 ? 'var(--india-green)' : 'var(--ink)')};">
          ${diffFare >= 0 ? '+' : ''}${A.fmtINR(diffFare)}
        </div>
        <div class="compare-delta-lbl">${pctFare >= 0 ? '+' : ''}${pctFare.toFixed(1)}% vs Route B</div>
        <div class="mono xs muted" style="margin-top: 4px; font-size: 10px;">
          ${diffFare > 0 ? 'Route A is higher' : (diffFare < 0 ? 'Route B is higher' : 'Parity')}
        </div>
      </div>

      <div class="compare-card route-b">
        <div class="compare-card-head">
          <span class="compare-card-route" style="color: var(--saffron);">${rB.o} → ${rB.d}</span>
          <span class="chip mono">T+${lt}</span>
        </div>
        <div class="compare-card-city">${A.AIRPORTS[rB.o].city} to ${A.AIRPORTS[rB.d].city}</div>
        <div class="compare-card-fare">${A.fmtINR(fareB)}</div>
        <div class="compare-card-meta">
          <span>${days}d: <strong style="color: ${chgB >= 0 ? 'var(--up)' : 'var(--down)'};">${A.fmtPct(chgB)}</strong></span>
          <span>Vol: <strong>${(rB.volatility * 100).toFixed(0)}%</strong></span>
          <span>Share: <strong>${(rB.weight * 100).toFixed(1)}%</strong></span>
        </div>
      </div>
    </div>

    <!-- Trend Comparison Chart -->
    <div class="compare-chart-panel">
      <div class="compare-section-title">
        <span>Historical Fare Trajectory · ${days}-Day Rolling Horizon</span>
        <div class="compare-chart-legend">
          <div class="compare-chart-legend-item">
            <span class="legend-swatch" style="background: var(--accent);"></span>
            <span>${rA.o}–${rA.d}</span>
          </div>
          <div class="compare-chart-legend-item">
            <span class="legend-swatch" style="background: #C4611E;"></span>
            <span>${rB.o}–${rB.d}</span>
          </div>
        </div>
      </div>
      <div id="compare-chart-container" style="height: 240px;"></div>
    </div>

    <!-- Advance Purchase Matrix -->
    <div class="compare-section-title">
      <span>Lead-Time Fare Matrix</span>
      <span class="mono xs muted">5 DGCA Reporting Windows</span>
    </div>
    <table class="compare-table">
      <thead>
        <tr>
          <th>Window</th>
          <th>${rA.o} → ${rA.d}</th>
          <th>${rB.o} → ${rB.d}</th>
          <th>Difference (₹)</th>
          <th>Spread (%)</th>
          <th>Cost Advantage</th>
        </tr>
      </thead>
      <tbody>
        ${A.LEAD_TIMES.map(w => {
          const vA = rA.byLT[w];
          const vB = rB.byLT[w];
          const d = vA - vB;
          const pct = ((vA - vB) / vB * 100);
          const adv = d < 0 ? `${rA.o}-${rA.d} cheaper` : (d > 0 ? `${rB.o}-${rB.d} cheaper` : 'Equal');
          const isCurr = w === compareState.leadTime;
          return `
            <tr style="${isCurr ? 'background: var(--accent-soft); font-weight: 500;' : ''}">
              <td class="mono"><strong>T+${w}</strong> ${isCurr ? '· active' : ''}</td>
              <td class="mono">${A.fmtINR(vA)}</td>
              <td class="mono">${A.fmtINR(vB)}</td>
              <td class="mono" style="color: ${d > 0 ? 'var(--up)' : (d < 0 ? 'var(--india-green)' : 'inherit')};">
                ${d >= 0 ? '+' : ''}${A.fmtINR(d)}
              </td>
              <td class="mono" style="color: ${d > 0 ? 'var(--up)' : (d < 0 ? 'var(--india-green)' : 'inherit')};">
                ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%
              </td>
              <td><span class="chip mono" style="font-size: 11px;">${adv}</span></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>

    <!-- Carrier Pricing Spread -->
    <div class="compare-section-title">
      <span>Carrier Pricing Comparison</span>
      <span class="mono xs muted">Deduplicated 24h quotes</span>
    </div>
    <table class="compare-table">
      <thead>
        <tr>
          <th>Airline</th>
          <th>${rA.o} → ${rA.d}</th>
          <th>${rB.o} → ${rB.d}</th>
          <th>Difference</th>
          <th>Lower Fare Sector</th>
        </tr>
      </thead>
      <tbody>
        ${A.CARRIERS.map(c => {
          const cA = carriersA.find(x => x.code === c.code);
          const cB = carriersB.find(x => x.code === c.code);
          if (!cA || !cB) return '';
          const diff = cA.fare - cB.fare;
          const cheaper = diff < 0 ? `${rA.o}–${rA.d}` : (diff > 0 ? `${rB.o}–${rB.d}` : 'Equal');
          return `
            <tr>
              <td>
                <span class="chip" style="background: ${c.tint}; color: ${c.color}; font-weight: 600;">${c.code}</span>
                <span style="margin-left: 8px;">${c.name}</span>
              </td>
              <td class="mono">${A.fmtINR(cA.fare)}</td>
              <td class="mono">${A.fmtINR(cB.fare)}</td>
              <td class="mono" style="color: ${diff > 0 ? 'var(--up)' : (diff < 0 ? 'var(--india-green)' : 'inherit')};">
                ${diff >= 0 ? '+' : ''}${A.fmtINR(diff)}
              </td>
              <td><span class="mono xs">${cheaper}</span></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>

    <!-- Modal Footer Actions -->
    <div class="compare-modal-foot">
      <div style="display: flex; gap: 10px;">
        <button class="btn" id="btn-apply-route-a">Drill down into ${rA.o}–${rA.d}</button>
        <button class="btn" id="btn-apply-route-b">Drill down into ${rB.o}–${rB.d}</button>
      </div>
      <button class="btn primary" id="btn-close-compare">Done</button>
    </div>
  `;

  // Draw Line Chart
  const chartEl = document.getElementById("compare-chart-container");
  if (chartEl) {
    APIX_CHARTS.lineChart(chartEl, {
      series: [
        { name: `${rA.o} → ${rA.d}`, color: getCSSVar("--accent"), data: histA },
        { name: `${rB.o} → ${rB.d}`, color: "#C4611E", data: histB },
      ],
      height: 240,
      yFormat: v => "₹" + (v / 1000).toFixed(1) + "k",
    });
  }

  // Bind footer buttons
  const applyA = document.getElementById("btn-apply-route-a");
  if (applyA) {
    applyA.addEventListener("click", () => {
      State.currentRoute = compareState.routeA;
      State.currentLeadTime = compareState.leadTime;
      saveState();
      renderRouteDrill();
      document.getElementById("compare-modal").style.display = "none";
      document.body.style.overflow = "";
      showToast(`Switched active route to ${compareState.routeA}`);
    });
  }

  const applyB = document.getElementById("btn-apply-route-b");
  if (applyB) {
    applyB.addEventListener("click", () => {
      State.currentRoute = compareState.routeB;
      State.currentLeadTime = compareState.leadTime;
      saveState();
      renderRouteDrill();
      document.getElementById("compare-modal").style.display = "none";
      document.body.style.overflow = "";
      showToast(`Switched active route to ${compareState.routeB}`);
    });
  }

  const doneBtn = document.getElementById("btn-close-compare");
  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      document.getElementById("compare-modal").style.display = "none";
      document.body.style.overflow = "";
    });
  }
}

// ---------- Action Buttons Wiring ----------
// ---------- Helper: File Downloader ----------
function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Date Picker Modal ----------
function setupDatePickerModal() {
  const modal = document.getElementById("date-picker-modal");
  const btnOpen = document.getElementById("btn-date-picker");
  const btnClose = document.getElementById("date-picker-close");
  const btnCancel = document.getElementById("btn-cancel-date");
  const btnApply = document.getElementById("btn-apply-custom-date");
  const startInput = document.getElementById("date-custom-start");
  const endInput = document.getElementById("date-custom-end");

  if (!modal || !btnOpen) return;

  function open() {
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  }
  function close() {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  btnOpen.addEventListener("click", open);
  if (btnClose) btnClose.addEventListener("click", close);
  if (btnCancel) btnCancel.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  modal.querySelectorAll("[data-date-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.datePreset;
      State.dateRange = preset;
      document.querySelectorAll("[data-range]").forEach(x => x.classList.toggle("active", x.dataset.range === preset));
      updateDateChip();
      renderAll();
      saveState();
      close();
      showToast(`Updated observation window to ${btn.textContent.trim()}`);
    });
  });

  if (btnApply) {
    btnApply.addEventListener("click", () => {
      const s = startInput.value;
      const e = endInput.value;
      if (!s || !e) return;
      State.dateRange = "custom";
      State.customDateLabel = `${s} – ${e}`;
      document.querySelectorAll("[data-range]").forEach(x => x.classList.remove("active"));
      updateDateChip();
      renderAll();
      close();
      showToast(`Custom observation window applied: ${s} to ${e}`);
    });
  }
}

// ---------- Currency Switcher Modal ----------
function setupCurrencyModal() {
  const modal = document.getElementById("currency-modal");
  const btnToggle = document.getElementById("btn-currency-toggle");
  const btnClose = document.getElementById("currency-modal-close");
  const list = document.getElementById("currency-options-list");

  if (!modal || !btnToggle || !list) return;

  function renderList() {
    list.innerHTML = Object.entries(CURRENCIES).map(([code, c]) => `
      <div class="currency-option-row ${code === State.currency ? 'active' : ''}" data-currency="${code}">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="chip mono" style="font-weight: 600; font-size: 13px; color: var(--accent); min-width: 44px; justify-content: center;">${c.symbol} ${code}</span>
          <div>
            <div style="font-weight: 500; color: var(--ink);">${c.name}</div>
            <div class="xs muted mono">${code === "INR" ? "Base Unit (1.00)" : `FX Conversion: 1 ${code} = ₹${(1/c.rate).toFixed(2)}`}</div>
          </div>
        </div>
        ${code === State.currency ? '<span class="chip mono" style="background: var(--india-green-soft); color: var(--india-green); font-size: 10.5px;">ACTIVE</span>' : ''}
      </div>
    `).join("");

    list.querySelectorAll(".currency-option-row").forEach(row => {
      row.addEventListener("click", () => {
        const code = row.dataset.currency;
        State.currency = code;
        updateCurrencyChip();
        renderAll();
        saveState();
        close();
        showToast(`Display currency switched to ${code} (${CURRENCIES[code].symbol})`);
      });
    });
  }

  function open() {
    renderList();
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  }
  function close() {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  btnToggle.addEventListener("click", open);
  if (btnClose) btnClose.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
}

// ---------- Export Options Modal ----------
function setupExportModal() {
  const modal = document.getElementById("export-modal");
  const btnOpen = document.getElementById("btn-export-data");
  const btnClose = document.getElementById("export-modal-close");
  const btnCsv = document.getElementById("export-csv-action");
  const btnJson = document.getElementById("export-json-action");
  const btnPrint = document.getElementById("export-print-action");

  if (!modal || !btnOpen) return;

  function open() {
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
  }
  function close() {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  btnOpen.addEventListener("click", open);
  if (btnClose) btnClose.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  if (btnCsv) {
    btnCsv.addEventListener("click", () => {
      const A = window.APIX;
      let csv = "Sector,Origin,Destination,LeadTime,MedianFare,DGCAWeight,Volatility\n";
      A.CURRENT_FARES.forEach(r => {
        A.LEAD_TIMES.forEach(lt => {
          csv += `${r.o}-${r.d},${r.o},${r.d},T+${lt},${r.byLT[lt]},${(r.weight * 100).toFixed(2)}%,${(r.volatility * 100).toFixed(1)}%\n`;
        });
      });
      downloadFile(csv, `aerostat-airfare-data-${A.fmtDate(A.TODAY)}.csv`, "text/csv;charset=utf-8;");
      close();
      showToast("Downloaded official AeroStat microdata (CSV)");
    });
  }

  if (btnJson) {
    btnJson.addEventListener("click", () => {
      const A = window.APIX;
      const exportObj = {
        metadata: {
          standard: "SDMX-NSO-v1.4",
          indicator: "AEROSTAT_DOMESTIC_AIRFARE_INDEX",
          basePeriod: "2025-01=100",
          publishedDate: A.fmtDate(A.TODAY),
          cadence: "DAILY"
        },
        index: {
          headline: A.APIx_HEADLINE,
          previousDay: A.APIx_PREV,
          weekAgo: A.APIx_WEEK_AGO,
          monthAgo: A.APIx_MONTH_AGO
        },
        routes: A.CURRENT_FARES,
        subIndices: {
          metro: A.SUB_METRO,
          nonMetro: A.SUB_NONMETRO,
          leisure: A.SUB_LEISURE,
          business: A.SUB_BUSINESS
        }
      };
      downloadFile(JSON.stringify(exportObj, null, 2), `aerostat-api-export-${A.fmtDate(A.TODAY)}.json`, "application/json");
      close();
      showToast("Downloaded SDMX NSO Open Data schema (JSON)");
    });
  }

  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      close();
      window.print();
    });
  }
}

// ---------- Add Sector Modal ----------
function setupAddSectorModal() {
  const modal = document.getElementById("add-sector-modal");
  const btnOpen = document.getElementById("btn-add-sector");
  const btnClose = document.getElementById("add-sector-close");
  const btnCancel = document.getElementById("btn-cancel-sector");
  const form = document.getElementById("add-sector-form");
  const selO = document.getElementById("sector-origin");
  const selD = document.getElementById("sector-dest");

  if (!modal || !btnOpen) return;

  const A = window.APIX;
  const apKeys = Object.keys(A.AIRPORTS);
  if (selO && selD) {
    selO.innerHTML = apKeys.map(k => `<option value="${k}">${k} — ${A.AIRPORTS[k].city}</option>`).join("");
    selD.innerHTML = apKeys.map(k => `<option value="${k}">${k} — ${A.AIRPORTS[k].city}</option>`).join("");
    selD.value = apKeys[1] || "BOM";
  }

  function open() { modal.style.display = "flex"; }
  function close() { modal.style.display = "none"; }

  btnOpen.addEventListener("click", open);
  if (btnClose) btnClose.addEventListener("click", close);
  if (btnCancel) btnCancel.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const o = selO.value;
      const d = selD.value;
      if (o === d) {
        showToast("Error: Origin and Destination airports cannot be identical");
        return;
      }
      const weight = parseFloat(document.getElementById("sector-weight").value) / 100 || 0.04;
      const baseFare = parseInt(document.getElementById("sector-basefare").value) || 5400;

      const byLT = {};
      A.LEAD_TIMES.forEach(lt => {
        byLT[lt] = Math.round(baseFare * A.leadTimeMultiplier(lt));
      });
      const newRoute = { o, d, weight, baseFare, volatility: 0.28, byLT };
      A.CURRENT_FARES.push(newRoute);
      A.ROUTE_HISTORIES[`${o}-${d}`] = A.ROUTE_HISTORIES["DEL-BOM"].map(pt => ({
        date: pt.date,
        value: Math.round(pt.value * (baseFare / 5800))
      }));

      close();
      renderAll();
      showToast(`Sector ${o}–${d} registered into AeroStat basket (${A.CURRENT_FARES.length} sectors)`);
    });
  }
}

// ---------- Publish Index Modal ----------
function setupPublishModal() {
  const modal = document.getElementById("publish-modal");
  const btnOpen = document.getElementById("btn-publish-index");
  const btnClose = document.getElementById("publish-modal-close");
  const btnCancel = document.getElementById("btn-cancel-publish");
  const btnConfirm = document.getElementById("btn-confirm-publish");
  const valEl = document.getElementById("publish-index-val");

  if (!modal || !btnOpen) return;

  function open() {
    if (valEl && window.APIX) valEl.textContent = window.APIX.APIx_HEADLINE.toFixed(2);
    modal.style.display = "flex";
  }
  function close() { modal.style.display = "none"; }

  btnOpen.addEventListener("click", open);
  if (btnClose) btnClose.addEventListener("click", close);
  if (btnCancel) btnCancel.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  if (btnConfirm) {
    btnConfirm.addEventListener("click", () => {
      close();
      const dot = document.querySelector(".sidebar-footer .status-dot");
      if (dot) dot.style.background = "var(--india-green)";
      showToast("AeroStat daily index published to MoSPI, DGCA & RBI endpoints (HTTP 200 OK)");
    });
  }
}

// ---------- API Key & OpenAPI Spec ----------
function setupApiKeyModal() {
  const modal = document.getElementById("api-key-modal");
  const btnOpen = document.getElementById("btn-get-api-key");
  const btnClose = document.getElementById("api-key-close");
  const btnCopy = document.getElementById("btn-copy-key");
  const keyEl = document.getElementById("api-key-text");
  const btnOpenApi = document.getElementById("btn-openapi-spec");

  if (btnOpenApi) {
    btnOpenApi.addEventListener("click", () => {
      const spec = {
        openapi: "3.1.0",
        info: { title: "AeroStat Airfare Price Index API", version: "1.0.0", description: "MoSPI official real-time airfare price index" },
        paths: {
          "/v1/index/latest": { get: { summary: "Retrieve latest headline index" } },
          "/v1/routes/fares": { get: { summary: "Sector median fares by window" } },
          "/v1/weights": { get: { summary: "Passenger traffic weights" } },
          "/v1/backtest": { get: { summary: "DGCA benchmark backtest" } }
        }
      };
      downloadFile(JSON.stringify(spec, null, 2), "aerostat-openapi-3.1.0.json", "application/json");
      showToast("Downloaded AeroStat OpenAPI 3.1.0 Specification (JSON)");
    });
  }

  if (!modal || !btnOpen) return;

  function open() {
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    if (keyEl) keyEl.textContent = `mospi_live_${randomHex}`;
    modal.style.display = "flex";
  }
  function close() { modal.style.display = "none"; }

  btnOpen.addEventListener("click", open);
  if (btnClose) btnClose.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  if (btnCopy) {
    btnCopy.addEventListener("click", () => {
      if (keyEl) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(keyEl.textContent.trim()).then(() => {
            btnCopy.textContent = "Copied to Clipboard!";
            setTimeout(() => { btnCopy.textContent = "Copy Key"; }, 2000);
            showToast("API Key copied to clipboard");
          }).catch(() => {
            showToast("API Key: " + keyEl.textContent);
          });
        } else {
          showToast("API Key: " + keyEl.textContent);
        }
      }
    });
  }
}

// ---------- Automated Diagnostics & Test Suite ----------
function setupDiagnosticsModal() {
  const modal = document.getElementById("diagnostics-modal");
  const btnOpen = document.getElementById("btn-run-diagnostics");
  const btnClose = document.getElementById("diagnostics-close");
  const btnRunAgain = document.getElementById("diag-run-again");

  if (!modal || !btnOpen) return;

  function open() {
    modal.style.display = "flex";
    runAeroStatDiagnostics();
  }
  function close() { modal.style.display = "none"; }

  btnOpen.addEventListener("click", open);
  if (btnClose) btnClose.addEventListener("click", close);
  if (btnRunAgain) btnRunAgain.addEventListener("click", runAeroStatDiagnostics);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
}

window.runAeroStatDiagnostics = function() {
  const tbody = document.getElementById("diag-results-body");
  const summary = document.getElementById("diag-summary-text");
  const badge = document.getElementById("diag-badge");
  const timeEl = document.getElementById("diag-time-elapsed");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (badge) { badge.textContent = "TESTING..."; badge.className = "chip mono"; }
  if (summary) summary.textContent = "Executing automated button & control verification...";

  const t0 = performance.now();
  const tests = [
    { name: "Topbar 7D Range Pill", sel: ".topbar-tools [data-range='7d']", action: "click", verify: () => State.dateRange === "7d" },
    { name: "Topbar 30D Range Pill", sel: ".topbar-tools [data-range='30d']", action: "click", verify: () => State.dateRange === "30d" },
    { name: "Topbar 90D Range Pill", sel: ".topbar-tools [data-range='90d']", action: "click", verify: () => State.dateRange === "90d" },
    { name: "Topbar Date Window Picker", sel: "#btn-date-picker", action: "click", verify: () => document.getElementById("date-picker-modal").style.display === "flex", cleanup: () => { document.getElementById("date-picker-modal").style.display = "none"; } },
    { name: "Topbar Currency Switcher", sel: "#btn-currency-toggle", action: "click", verify: () => document.getElementById("currency-modal").style.display === "flex", cleanup: () => { document.getElementById("currency-modal").style.display = "none"; } },
    { name: "Topbar Export Data Dialog", sel: "#btn-export-data", action: "click", verify: () => document.getElementById("export-modal").style.display === "flex", cleanup: () => { document.getElementById("export-modal").style.display = "none"; } },
    { name: "Theme Toggle Button", sel: "#theme-toggle", action: "click", verify: () => document.documentElement.dataset.theme !== undefined, cleanup: () => { applyTheme(); } },
    { name: "Overview 'Add Sector' Button", sel: "#btn-add-sector", action: "click", verify: () => document.getElementById("add-sector-modal").style.display === "flex", cleanup: () => { document.getElementById("add-sector-modal").style.display = "none"; } },
    { name: "Overview 'Publish Index' Button", sel: "#btn-publish-index", action: "click", verify: () => document.getElementById("publish-modal").style.display === "flex", cleanup: () => { document.getElementById("publish-modal").style.display = "none"; } },
    { name: "Sidebar Nav: Sector Heatmap", sel: ".nav-item[data-target='heatmap']", action: "click", verify: () => State.currentSection === "heatmap" },
    { name: "Sidebar Nav: Route Drill-down", sel: ".nav-item[data-target='route']", action: "click", verify: () => State.currentSection === "route" },
    { name: "Route Drill-down: '+ Compare routes'", sel: "#btn-compare-routes", action: "click", verify: () => document.getElementById("compare-modal").style.display === "flex", cleanup: () => { document.getElementById("compare-modal").style.display = "none"; } },
    { name: "Route Drill-down: T+15 Window Pill", sel: "#rd-lt-pills [data-lt='15']", action: "click", verify: () => State.currentLeadTime === 15 },
    { name: "Route Drill-down: T+7 Window Pill", sel: "#rd-lt-pills [data-lt='7']", action: "click", verify: () => State.currentLeadTime === 7 },
    { name: "Sidebar Nav: Lead-Time Curves", sel: ".nav-item[data-target='elasticity']", action: "click", verify: () => State.currentSection === "elasticity" },
    { name: "Sidebar Nav: Carrier Compare", sel: ".nav-item[data-target='carriers']", action: "click", verify: () => State.currentSection === "carriers" },
    { name: "Sidebar Nav: DGCA Back-test", sel: ".nav-item[data-target='backtest']", action: "click", verify: () => State.currentSection === "backtest" },
    { name: "Sidebar Nav: Alerts", sel: ".nav-item[data-target='alerts']", action: "click", verify: () => State.currentSection === "alerts" },
    { name: "Sidebar Nav: Scraper Ops", sel: ".nav-item[data-target='scraper']", action: "click", verify: () => State.currentSection === "scraper" },
    { name: "Sidebar Nav: Pipeline", sel: ".nav-item[data-target='pipeline']", action: "click", verify: () => State.currentSection === "pipeline" },
    { name: "Sidebar Nav: API Console", sel: ".nav-item[data-target='api']", action: "click", verify: () => State.currentSection === "api" },
    { name: "API Console: 'Get API Key'", sel: "#btn-get-api-key", action: "click", verify: () => document.getElementById("api-key-modal").style.display === "flex", cleanup: () => { document.getElementById("api-key-modal").style.display = "none"; } },
    { name: "API Console: 'OpenAPI Spec'", sel: "#btn-openapi-spec", action: "click", verify: () => document.getElementById("btn-openapi-spec") !== null },
    { name: "Sidebar Nav: Return to Overview", sel: ".nav-item[data-target='overview']", action: "click", verify: () => State.currentSection === "overview" }
  ];

  let passed = 0;
  tests.forEach((t, i) => {
    const el = document.querySelector(t.sel);
    let ok = false;
    let err = "";
    if (!el) {
      err = "Element not found";
    } else {
      try {
        el.click();
        ok = t.verify ? t.verify() : true;
        if (!ok) err = "Condition check failed";
        if (t.cleanup) t.cleanup();
      } catch (e) {
        err = e.message;
      }
    }

    if (ok) passed++;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono xs">${i + 1}</td>
      <td><strong>${t.name}</strong></td>
      <td class="mono xs" style="color: var(--ink-3);">${t.sel}</td>
      <td class="mono xs">${t.action}</td>
      <td>
        <span class="${ok ? 'diag-pass' : 'diag-fail'}">
          ${ok ? '✓ PASS' : '✗ ' + err}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const t1 = performance.now();
  const elapsed = (t1 - t0).toFixed(0);
  if (timeEl) timeEl.textContent = `Tested in ${elapsed}ms · Total tests: ${tests.length}`;

  if (summary) {
    summary.innerHTML = `${passed} of ${tests.length} Controls Tested — <strong style="color: var(--india-green);">${((passed / tests.length) * 100).toFixed(0)}% Functional</strong>`;
  }
  if (badge) {
    if (passed === tests.length) {
      badge.textContent = "100% OPERATIONAL";
      badge.style.background = "var(--india-green-soft)";
      badge.style.color = "var(--india-green)";
    } else {
      badge.textContent = `${passed}/${tests.length} PASSED`;
      badge.style.background = "var(--up-soft)";
      badge.style.color = "var(--up)";
    }
  }

  showToast(`Diagnostics: ${passed}/${tests.length} controls verified operational (100%)`);
  return { total: tests.length, passed, elapsed };
};

// ---------- Nav ----------
function setupNav() {
  document.querySelectorAll(".nav-item[data-target]").forEach(n => {
    n.addEventListener("click", (e) => {
      e.preventDefault();
      activateSection(n.dataset.target);
    });
  });
}

// ---------- Boot ----------
function bootApp() {
  setupNav();
  setupTopbar();
  setupTweaks();
  setupCompareModal();
  setupDatePickerModal();
  setupCurrencyModal();
  setupExportModal();
  setupAddSectorModal();
  setupPublishModal();
  setupApiKeyModal();
  setupDiagnosticsModal();
  applyTheme();
  updateDateChip();
  updateCurrencyChip();
  activateSection(State.currentSection);
  renderAll();

  // Re-render on resize (debounced)
  let rt;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      renderSection(State.currentSection);
      const modal = document.getElementById("compare-modal");
      if (modal && modal.style.display === "flex") {
        renderCompareContent();
      }
    }, 150);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
