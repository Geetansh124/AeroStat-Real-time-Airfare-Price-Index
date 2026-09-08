/* ================================================================
   APIx — SVG Chart helpers
   FT-style minimal line/area/heatmap/bar
   ================================================================ */

const CSS = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};

// Nice ticks
function niceTicks(min, max, count = 5) {
  const range = max - min;
  const roughStep = range / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + step/2; v += step) ticks.push(+v.toFixed(6));
  return { ticks, min: niceMin, max: niceMax, step };
}

// ---------- Line/Area chart ----------
function lineChart(container, opts) {
  const {
    data,               // [{date, value}]
    series = null,      // multi: [{name, color, data}]
    height = 280,
    padding = { t: 16, r: 16, b: 28, l: 44 },
    area = true,
    smoothCurve = false,
    yLabel = null,
    xTickCount = 6,
    yTickCount = 5,
    accent = null,
    animated = true,
    yFormat = v => v.toFixed(2),
    xFormat = null,
  } = opts;

  container.innerHTML = "";
  const w = container.clientWidth || 800;
  const h = height;
  const iw = w - padding.l - padding.r;
  const ih = h - padding.t - padding.b;

  const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", height: h });

  const allSeries = series || [{ name: "series", color: accent || CSS("--accent"), data }];
  const allValues = allSeries.flatMap(s => s.data.map(p => p.value));
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const pad = (maxV - minV) * 0.12 || 1;
  const { ticks: yTicks, min: y0, max: y1 } = niceTicks(minV - pad, maxV + pad * 0.5, yTickCount);

  const xLen = allSeries[0].data.length;
  const xScale = i => padding.l + (i / (xLen - 1)) * iw;
  const yScale = v => padding.t + ih - ((v - y0) / (y1 - y0)) * ih;

  // Y grid + ticks
  const gY = el("g", { class: "axis" });
  yTicks.forEach(t => {
    const y = yScale(t);
    gY.appendChild(el("line", { class: "grid-line", x1: padding.l, x2: w - padding.r, y1: y, y2: y }));
    const tx = el("text", { x: padding.l - 8, y: y + 3.5, "text-anchor": "end" });
    tx.textContent = yFormat(t);
    gY.appendChild(tx);
  });
  svg.appendChild(gY);

  // X ticks
  const gX = el("g", { class: "axis" });
  const xIdxStep = Math.max(1, Math.floor(xLen / xTickCount));
  for (let i = 0; i < xLen; i += xIdxStep) {
    const x = xScale(i);
    const tx = el("text", { x, y: h - padding.b + 16, "text-anchor": "middle" });
    const dp = allSeries[0].data[i];
    tx.textContent = xFormat ? xFormat(dp, i) : (dp.date ? window.APIX.shortDate(dp.date) : (dp.label || i));
    gX.appendChild(tx);
  }
  svg.appendChild(gX);

  // Baseline
  svg.appendChild(el("line", {
    x1: padding.l, x2: w - padding.r,
    y1: padding.t + ih, y2: padding.t + ih,
    stroke: CSS("--border"), "stroke-width": 1
  }));

  // Series paths
  allSeries.forEach((s, si) => {
    const pts = s.data.map((p, i) => [xScale(i), yScale(p.value)]);
    const pathD = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ");

    if (area && !series) {
      const areaD = pathD + ` L ${pts[pts.length-1][0]},${padding.t + ih} L ${pts[0][0]},${padding.t + ih} Z`;
      const gradId = `grad-${Math.random().toString(36).slice(2)}`;
      const defs = el("defs");
      const grad = el("linearGradient", { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 });
      grad.appendChild(el("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": 0.22 }));
      grad.appendChild(el("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": 0 }));
      defs.appendChild(grad);
      svg.appendChild(defs);
      svg.appendChild(el("path", { d: areaD, fill: `url(#${gradId})` }));
    }

    const p = el("path", { d: pathD, fill: "none", stroke: s.color, "stroke-width": si === 0 ? 1.8 : 1.5, "stroke-linejoin": "round", "stroke-linecap": "round" });
    if (s.dashed) p.setAttribute("stroke-dasharray", "4 3");
    if (animated) {
      // simple entrance
      const len = pts.reduce((a, c, i) => i === 0 ? 0 : a + Math.hypot(c[0]-pts[i-1][0], c[1]-pts[i-1][1]), 0);
      p.setAttribute("stroke-dasharray", `${len}`);
      p.setAttribute("stroke-dashoffset", `${len}`);
      p.style.animation = `drawIn 900ms ${si * 120}ms ease-out forwards`;
    }
    svg.appendChild(p);

    // End dot
    if (!series || si === 0) {
      const last = pts[pts.length - 1];
      svg.appendChild(el("circle", { cx: last[0], cy: last[1], r: 3.5, fill: s.color, stroke: CSS("--panel"), "stroke-width": 2 }));
    }
  });

  // Hover overlay
  const hover = el("g", { style: "opacity: 0; pointer-events: none;" });
  const hLine = el("line", { x1: 0, x2: 0, y1: padding.t, y2: padding.t + ih, stroke: CSS("--ink-3"), "stroke-width": 1, "stroke-dasharray": "3 2" });
  hover.appendChild(hLine);
  const hDots = [];
  allSeries.forEach((s) => {
    const c = el("circle", { r: 4, fill: s.color, stroke: CSS("--panel"), "stroke-width": 2 });
    hover.appendChild(c);
    hDots.push(c);
  });
  svg.appendChild(hover);

  const tooltip = document.createElement("div");
  tooltip.style.cssText = `
    position: absolute; pointer-events: none; opacity: 0;
    background: var(--panel); border: 1px solid var(--border-strong);
    border-radius: 4px; padding: 8px 12px; font-size: 12px;
    box-shadow: var(--shadow-md); z-index: 10; transition: opacity 0.12s;
    font-family: var(--font-mono); min-width: 120px;
  `;
  container.style.position = "relative";
  container.appendChild(tooltip);

  const overlay = el("rect", { x: padding.l, y: padding.t, width: iw, height: ih, fill: "transparent", style: "cursor: crosshair;" });
  overlay.addEventListener("mousemove", (ev) => {
    const rect = svg.getBoundingClientRect();
    const scale = w / rect.width;
    const mx = (ev.clientX - rect.left) * scale;
    const idx = Math.round(((mx - padding.l) / iw) * (xLen - 1));
    if (idx < 0 || idx >= xLen) return;
    const x = xScale(idx);
    hLine.setAttribute("x1", x); hLine.setAttribute("x2", x);
    allSeries.forEach((s, si) => {
      const y = yScale(s.data[idx].value);
      hDots[si].setAttribute("cx", x);
      hDots[si].setAttribute("cy", y);
    });
    hover.style.opacity = 1;
    // Tooltip
    const dp = allSeries[0].data[idx];
    const dateStr = dp.date ? window.APIX.shortDate(dp.date) : (dp.label || "");
    let html = `<div style="color: var(--ink-3); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">${dateStr}</div>`;
    allSeries.forEach(s => {
      html += `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:2px;">
        <span style="color: ${s.color};">■</span>
        <span style="color: var(--ink-3);">${s.name}</span>
        <span style="color: var(--ink); font-weight: 500;">${yFormat(s.data[idx].value)}</span>
      </div>`;
    });
    tooltip.innerHTML = html;
    tooltip.style.opacity = 1;
    const px = (x / w) * rect.width;
    tooltip.style.left = Math.min(rect.width - 150, Math.max(0, px - 60)) + "px";
    tooltip.style.top = "8px";
  });
  overlay.addEventListener("mouseleave", () => {
    hover.style.opacity = 0;
    tooltip.style.opacity = 0;
  });
  svg.appendChild(overlay);

  container.appendChild(svg);
}

// ---------- Sparkline ----------
function sparkline(container, data, opts = {}) {
  const { color = CSS("--accent"), height = 32, showFill = true } = opts;
  container.innerHTML = "";
  const w = container.clientWidth || 200;
  const h = height;
  const values = data.map(d => typeof d === "number" ? d : d.value);
  const min = Math.min(...values), max = Math.max(...values);
  const pad = (max - min) * 0.15 || 1;
  const y0 = min - pad, y1 = max + pad;
  const xs = (i) => (i / (values.length - 1)) * w;
  const ys = (v) => h - ((v - y0) / (y1 - y0)) * h * 0.9 - h * 0.05;
  const pts = values.map((v, i) => [xs(i), ys(v)]);
  const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, class: "spark", preserveAspectRatio: "none" });
  const pathD = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ");
  if (showFill) {
    const gradId = `sp-${Math.random().toString(36).slice(2)}`;
    const defs = el("defs");
    const grad = el("linearGradient", { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": color, "stop-opacity": 0.2 }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": color, "stop-opacity": 0 }));
    defs.appendChild(grad);
    svg.appendChild(defs);
    svg.appendChild(el("path", {
      d: pathD + ` L ${w},${h} L 0,${h} Z`,
      fill: `url(#${gradId})`,
    }));
  }
  svg.appendChild(el("path", { d: pathD, fill: "none", stroke: color, "stroke-width": 1.5, "stroke-linejoin": "round" }));
  const last = pts[pts.length - 1];
  svg.appendChild(el("circle", { cx: last[0], cy: last[1], r: 2, fill: color }));
  container.appendChild(svg);
}

// ---------- Bar chart ----------
function barChart(container, data, opts = {}) {
  const {
    height = 220,
    padding = { t: 12, r: 12, b: 40, l: 44 },
    color = CSS("--accent"),
    yFormat = v => v.toFixed(0),
    horizontal = false,
  } = opts;
  container.innerHTML = "";
  const w = container.clientWidth || 600;
  const h = height;
  const iw = w - padding.l - padding.r;
  const ih = h - padding.t - padding.b;
  const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", height: h });

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(0, ...data.map(d => d.value));
  const { ticks: yTicks, min: y0, max: y1 } = niceTicks(min, max, 4);

  // Y ticks
  yTicks.forEach(t => {
    const y = padding.t + ih - ((t - y0) / (y1 - y0)) * ih;
    svg.appendChild(el("line", { class: "grid-line", x1: padding.l, x2: w - padding.r, y1: y, y2: y }));
    const tx = el("text", { x: padding.l - 8, y: y + 3.5, "text-anchor": "end", "class": "axis-tick", fill: CSS("--ink-3"), "font-size": 10.5, "font-family": "var(--font-mono)" });
    tx.textContent = yFormat(t);
    svg.appendChild(tx);
  });

  // Bars
  const n = data.length;
  const bw = iw / n * 0.62;
  const gap = iw / n * 0.38;
  data.forEach((d, i) => {
    const x = padding.l + (iw / n) * i + gap / 2;
    const barH = Math.abs((d.value - Math.max(y0, 0)) / (y1 - y0)) * ih;
    const y = d.value >= 0
      ? padding.t + ih - ((d.value - y0) / (y1 - y0)) * ih
      : padding.t + ih - ((0 - y0) / (y1 - y0)) * ih;
    const rect = el("rect", {
      x, y, width: bw, height: barH,
      fill: d.color || color, rx: 2
    });
    if (opts.animated !== false) {
      rect.style.transformOrigin = `${x + bw/2}px ${padding.t + ih}px`;
      rect.style.transform = "scaleY(0)";
      rect.style.animation = `barIn 700ms ${i*40}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`;
    }
    svg.appendChild(rect);
    // Label
    const lb = el("text", {
      x: x + bw/2, y: h - padding.b + 16,
      "text-anchor": "middle", fill: CSS("--ink-3"),
      "font-size": 11, "font-family": "var(--font-mono)"
    });
    lb.textContent = d.label;
    svg.appendChild(lb);
    // Value label on bar
    if (opts.valueLabel !== false) {
      const vl = el("text", {
        x: x + bw/2, y: y - 4,
        "text-anchor": "middle", fill: CSS("--ink"),
        "font-size": 11, "font-weight": 500, "font-family": "var(--font-mono)"
      });
      vl.textContent = d.valueLabel || yFormat(d.value);
      svg.appendChild(vl);
    }
  });

  container.appendChild(svg);
}

// ---------- Heatmap ----------
function heatmapColor(v, min, max) {
  const t = (v - min) / (max - min);
  // 0 = green (down), 0.5 = saffron, 1 = red (up)
  const stops = [
    { at: 0.0, r: 219, g: 238, b: 214 },  // green-soft
    { at: 0.5, r: 255, g: 235, b: 209 },  // saffron-soft
    { at: 1.0, r: 251, g: 234, b: 231 },  // red-soft
  ];
  const dark = document.documentElement.dataset.theme === "dark";
  if (dark) {
    stops[0] = { r: 30, g: 60, b: 40 };
    stops[1] = { r: 60, g: 45, b: 25 };
    stops[2] = { r: 70, g: 30, b: 30 };
    stops[0].at = 0; stops[1].at = 0.5; stops[2].at = 1;
  }
  let s1, s2;
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].at && t <= stops[i + 1].at) { s1 = stops[i]; s2 = stops[i + 1]; break; }
  }
  if (!s1) { s1 = stops[stops.length-1]; s2 = s1; }
  const k = (s2.at === s1.at) ? 0 : (t - s1.at) / (s2.at - s1.at);
  const r = Math.round(s1.r + (s2.r - s1.r) * k);
  const g = Math.round(s1.g + (s2.g - s1.g) * k);
  const b = Math.round(s1.b + (s2.b - s1.b) * k);
  return `rgb(${r},${g},${b})`;
}

// ---------- Distribution / candle ----------
function fareBoxplot(container, boxes, opts = {}) {
  const { height = 220, padding = { t: 12, r: 12, b: 32, l: 60 }, color = CSS("--accent") } = opts;
  container.innerHTML = "";
  const w = container.clientWidth || 600;
  const h = height;
  const iw = w - padding.l - padding.r;
  const ih = h - padding.t - padding.b;
  const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: "100%", height: h });

  const allV = boxes.flatMap(b => [b.min, b.max]);
  const min = Math.min(...allV), max = Math.max(...allV);
  const pad = (max - min) * 0.1;
  const { ticks: yTicks, min: y0, max: y1 } = niceTicks(min - pad, max + pad, 5);
  yTicks.forEach(t => {
    const y = padding.t + ih - ((t - y0) / (y1 - y0)) * ih;
    svg.appendChild(el("line", { class: "grid-line", x1: padding.l, x2: w - padding.r, y1: y, y2: y }));
    const tx = el("text", { x: padding.l - 8, y: y + 3.5, "text-anchor": "end", fill: CSS("--ink-3"), "font-size": 10.5, "font-family": "var(--font-mono)" });
    tx.textContent = "₹" + (t / 1000).toFixed(1) + "k";
    svg.appendChild(tx);
  });

  const n = boxes.length;
  const bw = iw / n * 0.32;
  boxes.forEach((b, i) => {
    const cx = padding.l + (iw / n) * (i + 0.5);
    const yMin = padding.t + ih - ((b.min - y0) / (y1 - y0)) * ih;
    const yMax = padding.t + ih - ((b.max - y0) / (y1 - y0)) * ih;
    const yQ1 = padding.t + ih - ((b.q1 - y0) / (y1 - y0)) * ih;
    const yQ3 = padding.t + ih - ((b.q3 - y0) / (y1 - y0)) * ih;
    const yMed = padding.t + ih - ((b.med - y0) / (y1 - y0)) * ih;
    // whisker
    svg.appendChild(el("line", { x1: cx, x2: cx, y1: yMin, y2: yMax, stroke: CSS("--ink-3"), "stroke-width": 1 }));
    svg.appendChild(el("line", { x1: cx - bw/4, x2: cx + bw/4, y1: yMin, y2: yMin, stroke: CSS("--ink-3"), "stroke-width": 1 }));
    svg.appendChild(el("line", { x1: cx - bw/4, x2: cx + bw/4, y1: yMax, y2: yMax, stroke: CSS("--ink-3"), "stroke-width": 1 }));
    // box
    svg.appendChild(el("rect", { x: cx - bw/2, y: yQ3, width: bw, height: yQ1 - yQ3, fill: color, opacity: 0.25, stroke: color, "stroke-width": 1.2 }));
    // median
    svg.appendChild(el("line", { x1: cx - bw/2, x2: cx + bw/2, y1: yMed, y2: yMed, stroke: color, "stroke-width": 2 }));
    // label
    const lb = el("text", { x: cx, y: h - padding.b + 16, "text-anchor": "middle", fill: CSS("--ink-3"), "font-size": 11, "font-family": "var(--font-mono)" });
    lb.textContent = b.label;
    svg.appendChild(lb);
  });

  container.appendChild(svg);
}

// Add keyframes
(function addKF() {
  const st = document.createElement("style");
  st.textContent = `
    @keyframes drawIn { to { stroke-dashoffset: 0; } }
    @keyframes barIn { to { transform: scaleY(1); } }
  `;
  document.head.appendChild(st);
})();

window.APIX_CHARTS = { lineChart, sparkline, barChart, fareBoxplot, heatmapColor };
