/* ================================================================
   APIx — Synthetic Data Generator
   Seeded random for reproducibility
   ================================================================ */

// Simple seeded PRNG (mulberry32)
function seedRNG(seed) {
  let s = seed >>> 0;
  return function() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const RNG = seedRNG(20260907);
const rand = () => RNG();
const randRange = (a, b) => a + (b - a) * rand();
const randInt = (a, b) => Math.floor(randRange(a, b + 1));
const pick = arr => arr[Math.floor(rand() * arr.length)];

// ---------- Routes ----------
const AIRPORTS = {
  DEL: { name: "Delhi", city: "New Delhi" },
  BOM: { name: "Mumbai", city: "Mumbai" },
  BLR: { name: "Bengaluru", city: "Bengaluru" },
  MAA: { name: "Chennai", city: "Chennai" },
  CCU: { name: "Kolkata", city: "Kolkata" },
  HYD: { name: "Hyderabad", city: "Hyderabad" },
  GOI: { name: "Goa (Dabolim)", city: "Goa" },
  AMD: { name: "Ahmedabad", city: "Ahmedabad" },
  PNQ: { name: "Pune", city: "Pune" },
  COK: { name: "Kochi", city: "Kochi" },
};

// Route basket — weighted by DGCA-ish passenger traffic
const ROUTES = [
  { o: "DEL", d: "BOM", weight: 0.185, baseFare: 5800, volatility: 0.32 },
  { o: "DEL", d: "BLR", weight: 0.135, baseFare: 6900, volatility: 0.35 },
  { o: "BOM", d: "BLR", weight: 0.105, baseFare: 4600, volatility: 0.28 },
  { o: "DEL", d: "CCU", weight: 0.078, baseFare: 6400, volatility: 0.30 },
  { o: "BLR", d: "HYD", weight: 0.068, baseFare: 3400, volatility: 0.22 },
  { o: "MAA", d: "DEL", weight: 0.075, baseFare: 7200, volatility: 0.33 },
  { o: "DEL", d: "GOI", weight: 0.062, baseFare: 5900, volatility: 0.42 },
  { o: "BOM", d: "CCU", weight: 0.055, baseFare: 6800, volatility: 0.31 },
  { o: "HYD", d: "BOM", weight: 0.058, baseFare: 4200, volatility: 0.26 },
  { o: "DEL", d: "HYD", weight: 0.088, baseFare: 5400, volatility: 0.29 },
  { o: "BLR", d: "MAA", weight: 0.045, baseFare: 3100, volatility: 0.21 },
  { o: "DEL", d: "AMD", weight: 0.046, baseFare: 4800, volatility: 0.27 },
];

// Normalise weights
{
  const s = ROUTES.reduce((a, r) => a + r.weight, 0);
  ROUTES.forEach(r => r.weight /= s);
}

// ---------- Carriers ----------
const CARRIERS = [
  { code: "6E", name: "IndiGo",         share: 0.62, color: "#003C7E", tint: "#DBE4F0" },
  { code: "AI", name: "Air India",      share: 0.15, color: "#A6182B", tint: "#F3D8DC" },
  { code: "IX", name: "Air India Express", share: 0.10, color: "#F26522", tint: "#FBE1D0" },
  { code: "SG", name: "SpiceJet",       share: 0.06, color: "#B7202E", tint: "#F0D5D8" },
  { code: "QP", name: "Akasa Air",      share: 0.07, color: "#F58024", tint: "#FCE3CE" },
];

// ---------- Lead-time windows ----------
const LEAD_TIMES = [1, 7, 15, 30, 45];
// Fare multiplier as a function of days-to-departure (higher for T+1)
const leadTimeMultiplier = (t) => {
  // t=1: ~1.65x; t=7: ~1.22; t=15: ~1.05; t=30: ~0.92; t=45: ~0.88
  return 1.0 + 0.85 * Math.exp(-t / 8) + 0.03 * Math.exp(-t / 30) - 0.12;
};

// ---------- Time series ----------
const TODAY = new Date(2026, 8, 7); // Sept 7, 2026
const HISTORY_DAYS = 90;

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}
function shortDate(d) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
function daysAgo(n) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d;
}

// ---------- Generate APIx history ----------
function genAPIxSeries(days = 90, base = 100, drift = 0.0012, vol = 0.008) {
  const out = [];
  let level = base;
  // Add seasonality: festival bump around days 15-25 (Diwali-ish), summer peak earlier
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const dow = d.getDay();
    const dayIdx = days - 1 - i;
    // Weekly cycle
    const weekly = 0.006 * Math.sin(dayIdx * 2 * Math.PI / 7);
    // Festival bump ramp
    const festival = 0.018 * Math.exp(-Math.pow((dayIdx - 68) / 8, 2));
    // Random walk
    const shock = (rand() - 0.5) * vol * 2;
    level = level * (1 + drift + shock + weekly + festival);
    out.push({ date: d, dateStr: fmtDate(d), value: level });
  }
  return out;
}

const APIx_ALL = genAPIxSeries(HISTORY_DAYS, 100.0, 0.0011, 0.009);
const APIx_HEADLINE = APIx_ALL[APIx_ALL.length - 1].value;
const APIx_PREV = APIx_ALL[APIx_ALL.length - 2].value;
const APIx_WEEK_AGO = APIx_ALL[APIx_ALL.length - 8].value;
const APIx_MONTH_AGO = APIx_ALL[APIx_ALL.length - 31].value;

// Sub-indices — Metro, Non-metro, Leisure, Business
function subSeries(bias, vol) {
  return APIx_ALL.map((p, i) => ({
    date: p.date,
    value: p.value * (1 + bias) * (1 + (rand() - 0.5) * vol),
  }));
}
const SUB_METRO   = subSeries(0.02, 0.004);
const SUB_NONMETRO = subSeries(-0.03, 0.005);
const SUB_LEISURE = subSeries(0.06, 0.008);
const SUB_BUSINESS = subSeries(-0.01, 0.003);

// ---------- Route-level current fares ----------
function currentFares() {
  return ROUTES.map(r => {
    const byLT = {};
    LEAD_TIMES.forEach(t => {
      const mult = leadTimeMultiplier(t);
      const noise = 1 + (rand() - 0.5) * r.volatility * 0.6;
      byLT[t] = Math.round(r.baseFare * mult * noise);
    });
    // Week-ago comparison for delta
    const weekAgoIdx = { value: 1 + (rand() - 0.5) * 0.15 };
    const delta = (byLT[7] - byLT[7] / weekAgoIdx.value) / (byLT[7] / weekAgoIdx.value);
    return { ...r, byLT, delta };
  });
}
const CURRENT_FARES = currentFares();

// ---------- Route-level history ----------
function genRouteHistory(route, days = 60) {
  const out = [];
  const base = route.baseFare;
  let level = base;
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const dow = d.getDay();
    const dayIdx = days - 1 - i;
    const weekly = 0.04 * Math.sin(dayIdx * 2 * Math.PI / 7);
    const festival = 0.10 * Math.exp(-Math.pow((dayIdx - (days - 5)) / 6, 2));
    const shock = (rand() - 0.5) * route.volatility * 0.15;
    level = base * (1 + weekly + festival + shock);
    out.push({ date: d, value: Math.round(level) });
  }
  return out;
}
const ROUTE_HISTORIES = {};
ROUTES.forEach(r => {
  ROUTE_HISTORIES[`${r.o}-${r.d}`] = genRouteHistory(r, 60);
});

// ---------- Carrier data ----------
function carrierFaresForRoute(route, leadTime = 7) {
  const routeKey = `${route.o}-${route.d}`;
  const hist = ROUTE_HISTORIES[routeKey];
  const todayVal = hist ? hist[hist.length - 1].value : route.baseFare;
  const prevVal = hist ? hist[hist.length - 8].value : route.baseFare;
  const ltMult = leadTimeMultiplier(leadTime);

  // Deterministic seed per route and lead-time window
  const hash = (route.o.charCodeAt(0) * 31 + route.d.charCodeAt(0)) * 17 + leadTime;

  return CARRIERS.map((c, idx) => {
    const baseAdj = c.code === "6E" ? 1.0 :
                    c.code === "AI" ? 1.08 :
                    c.code === "IX" ? 0.94 :
                    c.code === "SG" ? 0.92 :
                    c.code === "QP" ? 0.96 : 1.0;

    // Carrier pricing behavior: realistic market deviation around route index
    const cSeed = ((hash + idx * 101) % 100) / 100;
    const devToday = (cSeed - 0.5) * 0.04;
    const devPrev = (((hash * 3 + idx * 79) % 100) / 100 - 0.5) * 0.04;

    const fare = Math.round(todayVal * baseAdj * ltMult * (1 + devToday));
    const prevFare = Math.round(prevVal * baseAdj * ltMult * (1 + devPrev));
    const wow = ((fare - prevFare) / prevFare) * 100;

    // Sample size proportional to DGCA market share
    const sampleN = Math.round(c.share * 480 + 30 + (cSeed - 0.5) * 40);

    return { ...c, fare, prevFare, wow, sampleN };
  });
}

// ---------- Scraper jobs ----------
const SCRAPER_SOURCES = [
  { name: "IndiGo",         url: "goindigo.in",       type: "airline", tech: "Playwright" },
  { name: "Air India",      url: "airindia.com",      type: "airline", tech: "Playwright" },
  { name: "Air India Express", url: "airindiaexpress.com", type: "airline", tech: "Selenium" },
  { name: "SpiceJet",       url: "spicejet.com",      type: "airline", tech: "Playwright" },
  { name: "Akasa Air",      url: "akasaair.com",      type: "airline", tech: "Playwright" },
  { name: "MakeMyTrip",     url: "makemytrip.com",    type: "ota",     tech: "Scrapy+Splash" },
  { name: "Yatra",          url: "yatra.com",         type: "ota",     tech: "Scrapy" },
  { name: "EaseMyTrip",     url: "easemytrip.com",    type: "ota",     tech: "Playwright" },
  { name: "Cleartrip",      url: "cleartrip.com",     type: "ota",     tech: "Playwright" },
  { name: "Ixigo",          url: "ixigo.com",         type: "ota",     tech: "Scrapy" },
  { name: "Goibibo",        url: "goibibo.com",       type: "ota",     tech: "Playwright" },
];

function scraperJobs() {
  return SCRAPER_SOURCES.map((s, i) => {
    const success = randRange(0.86, 0.995);
    const status = success > 0.97 ? "ok" : success > 0.92 ? "warn" : success > 0.86 ? "warn" : "err";
    const quotes = randInt(2400, 8600);
    const failed = Math.round(quotes * (1 - success));
    return {
      ...s,
      status,
      success: success * 100,
      quotes,
      failed,
      lastRun: `0${randInt(3,6)}:${String(randInt(0,59)).padStart(2,'0')} IST`,
      latency: randInt(180, 620),
    };
  });
}
const JOBS = scraperJobs();

// ---------- Alerts ----------
const ALERTS = [
  { level: "high", route: "DEL-GOI", msg: "Fare spike +38% on T+1 booking window", detail: "Festival demand surge — Onam corridor", time: "07:14 IST" },
  { level: "med",  route: "BOM-BLR", msg: "Carrier price convergence detected", detail: "IndiGo, Akasa, AI within ±3% band", time: "06:42 IST" },
  { level: "med",  route: "DEL-BOM", msg: "T+30 fares up 12% WoW", detail: "Above 30-day seasonal norm", time: "06:00 IST" },
  { level: "low",  route: "BLR-HYD", msg: "Anomaly cleared — cache stale", detail: "Auto-refreshed IndiGo endpoint", time: "05:58 IST" },
  { level: "high", route: "MAA-DEL", msg: "SpiceJet quotes missing 4 hrs", detail: "Anti-bot escalation — fallback to OTA pool", time: "04:30 IST" },
  { level: "low",  route: "DEL-BLR", msg: "Sample size below threshold (n<200)", detail: "Increased polling frequency to hourly", time: "03:15 IST" },
];

// ---------- Pipeline stats ----------
const PIPELINE = [
  { name: "Scrape",     val: "38,412", sub: "raw quotes / day", num: 38412 },
  { name: "Parse",      val: "38,207", sub: "structured OK (99.5%)", num: 38207 },
  { name: "Deduplicate", val: "34,116", sub: "unique quotes (10.7% dup)", num: 34116 },
  { name: "Clean",      val: "33,204", sub: "outliers removed (2.7%)", num: 33204 },
  { name: "Index",      val: "12", sub: "sectors × 5 windows", num: 60 },
];

// ---------- Back-test vs DGCA ----------
function genBacktest(months = 12) {
  const out = [];
  const monthNames = ["Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26", "Jul 26", "Aug 26"];
  let apixLevel = 100, dgcaLevel = 100;
  for (let i = 0; i < months; i++) {
    // DGCA moves more smoothly (monthly avg), APIx captures more
    const seasonal = 0.02 * Math.sin(i * 2 * Math.PI / 12 + 1);
    const shock = (rand() - 0.5) * 0.015;
    apixLevel *= (1 + 0.006 + seasonal + shock);
    dgcaLevel *= (1 + 0.006 + seasonal * 0.75 + shock * 0.5);
    out.push({ label: monthNames[i], apix: apixLevel, dgca: dgcaLevel });
  }
  return out;
}
const BACKTEST = genBacktest(12);
// Correlation + errors
function statsBacktest() {
  const n = BACKTEST.length;
  const mA = BACKTEST.reduce((s,p)=>s+p.apix,0)/n;
  const mD = BACKTEST.reduce((s,p)=>s+p.dgca,0)/n;
  let num=0, dA=0, dD=0, sae=0, sse=0;
  BACKTEST.forEach(p=>{
    num += (p.apix-mA)*(p.dgca-mD);
    dA += (p.apix-mA)**2;
    dD += (p.dgca-mD)**2;
    sae += Math.abs(p.apix-p.dgca);
    sse += (p.apix-p.dgca)**2;
  });
  const corr = num / Math.sqrt(dA*dD);
  const mae = sae / n;
  const rmse = Math.sqrt(sse / n);
  const mape = BACKTEST.reduce((s,p)=>s+Math.abs(p.apix-p.dgca)/p.dgca,0)/n * 100;
  return { corr, mae, rmse, mape };
}
const BACKTEST_STATS = statsBacktest();

// ---------- Ticker items ----------
const TICKER = ROUTES.slice(0, 10).map(r => {
  const change = (rand() - 0.4) * 5.5;
  const fare = Math.round(r.baseFare * leadTimeMultiplier(7));
  return { rt: `${r.o}-${r.d}`, fare, change };
});

// ---------- Export to global ----------
window.APIX = {
  AIRPORTS, ROUTES, CARRIERS, LEAD_TIMES, TODAY,
  APIx_ALL, APIx_HEADLINE, APIx_PREV, APIx_WEEK_AGO, APIx_MONTH_AGO,
  SUB_METRO, SUB_NONMETRO, SUB_LEISURE, SUB_BUSINESS,
  CURRENT_FARES, ROUTE_HISTORIES,
  carrierFaresForRoute,
  JOBS, ALERTS, PIPELINE, BACKTEST, BACKTEST_STATS, TICKER,
  fmtDate, shortDate, daysAgo, leadTimeMultiplier,
  fmtINR: (n) => "₹" + Math.round(n).toLocaleString("en-IN"),
  fmtIdx: (n, dp=2) => n.toFixed(dp),
  pctDelta: (curr, prev) => ((curr - prev) / prev * 100),
  fmtPct: (n, dp=2) => (n >= 0 ? "+" : "") + n.toFixed(dp) + "%",
};
