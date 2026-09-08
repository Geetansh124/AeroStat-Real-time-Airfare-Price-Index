# AeroStat · Real-time Airfare Price Index

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://aerostat-airfare-index.vercel.app)
[![Status](https://img.shields.io/badge/Status-Live_Production-success?style=for-the-badge)](https://aerostat-airfare-index.vercel.app)

> **High-Frequency Daily Domestic Airfare Index & Market Surveillance System**  
> *Conceptualized for the Ministry of Statistics and Programme Implementation (MoSPI) · National Statistical Office (NSO) · Smart India Hackathon (SIH)*  
> 
> 🔗 **Live Deployment**: [https://aerostat-airfare-index.vercel.app](https://aerostat-airfare-index.vercel.app)

---

## 📌 Executive Summary

Official Consumer Price Index (CPI) transport components and Reserve Bank of India (RBI) inflation forecasting models have historically relied on low-frequency, delayed, or manual periodic price surveys. In the civil aviation sector, algorithm-driven dynamic pricing creates rapid intra-day and intra-month volatility that monthly averages miss entirely.

**AeroStat (Airfare Price Index)** is an automated, real-time index platform that compiles daily airfare indices across major Indian domestic flight sectors. By monitoring high-frequency quotes across multiple advance-purchase windows and carrier endpoints, AeroStat bridges the gap between official statistical benchmarks and real-time market dynamics.

- **Base Period**: January 2025 = 100.00
- **Compilation Cadence**: Daily at 06:00 IST
- **Coverage**: 12 high-density domestic sectors · 5 carriers (~100% domestic market share) · 5 advance-purchase lead-time windows
- **Data Ingestion**: 11 airline direct and OTA aggregation feeds

---

## 📐 Index Methodology & Mathematics

AeroStat applies a modified Laspeyres/Fisher-aligned composite weighting model combining DGCA passenger-traffic shares with advance-purchase booking distributions:

$$\text{AeroStat}_t = \sum_{r} \sum_{w} w_r \cdot w_w \cdot \left(\frac{P_{r,w,t}}{P_{r,w,0}}\right)$$

Where:
- **$w_r$**: Route weight proportional to historical DGCA passenger traffic volume.
- **$w_w$**: Advance-purchase window weight reflecting booking lead-time distributions:
  - **T+1 Day (Late / Urgent)**: 10% weight ($w = 0.10$)
  - **T+7 Days (Near-term)**: 30% weight ($w = 0.30$)
  - **T+15 Days (Mid-term)**: 25% weight ($w = 0.25$)
  - **T+30 Days (Standard)**: 20% weight ($w = 0.20$)
  - **T+45 Days (Early / Leisure)**: 15% weight ($w = 0.15$)
- **$P_{r,w,t}$**: Median quoted fare for route $r$ and window $w$ on day $t$.
- **$P_{r,w,0}$**: Base period median fare (January 2025).

---

## 🚀 Key Modules & Capabilities

### 1. Headline Overview & Multi-View Hero
- **Composite Index Tracking**: Daily close, day-on-day, week-on-week, and month-on-month percentage changes.
- **Three Presentation Modes**:
  - *Statesman*: High-impact statistical editorial layout with trend sparklines.
  - *Ticker*: Real-time financial market ticker with 90-day highs/lows and corridor deltas.
  - *Report*: Official MoSPI/NSO press bulletin format.
- **Sub-Indices**: Granular tracking for **Metro corridors**, **Non-metro sectors**, **Leisure routes**, and **Business pairs**.

### 2. Sector Heatmap (12 Routes × 5 Windows)
- Color-coded deviation matrix measuring current fares against 90-day baseline medians.
- Immediate visual detection of corridor demand surges and capacity bottlenecks.

### 3. Route Drill-Down Analytics
- In-depth corridor inspection (e.g., DEL–BOM, BLR–HYD, DEL–GOI).
- Lead-time toggle (T+1 to T+45) with 60-day historical trend graphs.
- **Box-and-Whisker Plots**: Depicts min, 25th percentile ($Q_1$), median, 75th percentile ($Q_3$), and maximum fares per lead-time window.
- **Fare Decomposition**: Itemized breakdown into Base Fare, User Development Fee (UDF), Passenger Service Fee (PSF), and GST.

### 4. Lead-Time Elasticity & Dynamic Pricing Curves
- Quantifies the late-booking penalty curve across corridors (T+1 vs T+30 fare spread).
- Identifies routes with steep price escalation curves and elevated volatility ($\sigma$).

### 5. Carrier Comparison & Market Share
- Tracks pricing behaviour across India's top scheduled carriers:
  - **IndiGo (6E)**, **Air India (AI)**, **Air India Express (IX)**, **SpiceJet (SG)**, and **Akasa Air (QP)**.
  - 60-day carrier-specific fare indices and DGCA passenger share distributions.

### 6. DGCA Benchmark Back-Testing
- Historical validation against published DGCA monthly average domestic fare data (Sep 2025 – Aug 2026).
- Accuracy metrics:
  - **Pearson Correlation ($r$)**: $> 0.98$
  - **MAE** (Mean Absolute Error)
  - **RMSE** (Root Mean Square Error)
  - **MAPE** (Mean Absolute Percentage Error)
- Explains divergence during high within-month volatility (e.g., Diwali, festival travel spikes).

### 7. Automated Anomaly Detection & Alerts
- Real-time $Z$-score anomaly rules flag quotes exceeding $\ge 2\sigma$ deviations from expected seasonal baselines.
- Alert categories: Carrier price convergence, sudden inventory exhaustion, and scrape feed errors.

### 8. Scraper Operations Monitor
- Health status for 11 scraping workers (Playwright & Scrapy).
- Tracks daily quote throughput (~38,000+ quotes/day), scrape latency, request failure rates, and proxy rotation health.

### 9. Data Pipeline & Outlier Cleaning Ledger
- 5-stage idempotent pipeline: **Scrape $\to$ Parse $\to$ Deduplicate $\to$ Clean $\to$ Index**.
- Robust outlier elimination using IQR log-space boundaries and median imputation.

### 10. Developer API Console
- RESTful, SDMX/NSO Open Data compatible endpoint schemas.
- Interactive endpoint viewer with sample JSON responses, rate limits, and SLA definitions.

---

## 🛠 Tech Stack & Design Philosophy

The prototype is intentionally engineered with **zero external framework dependencies** to ensure maximum performance, instant load times, and auditability:

- **HTML5**: Semantic document structure with high accessibility and embedded SVG icons.
- **Vanilla CSS (Custom Properties)**: Design system tailored to government/institutional aesthetic (Ashoka Blue palette, warm neutrals, serif headers, monospace tabular figures). Includes Light & Dark theme support.
- **Modular Vanilla JavaScript**:
  - `apix-data.js`: Deterministic PRNG (`mulberry32`) simulation engine generating reproducible market and time-series data.
  - `apix-charts.js`: Handcrafted lightweight SVG visualization library (line charts, area fills, sparklines, boxplots, heatmaps, bar charts).
  - `apix-app.js`: State management, client-side routing, theme switching, and component renderers.

---

## 📂 Project Structure

```text
Prototype/
├── index.html              # Main application shell and layout
├── apix-styles.css         # Complete design system, themes, and responsive CSS
├── apix-data.js            # Synthetic data generation and market models
├── apix-charts.js          # Standalone SVG chart rendering engine
├── apix-app.js             # Application router, UI interactions, and state
├── .gitattributes          # Git LFS & file type configurations
├── .gitignore              # Ignored build & deployment artifacts
└── README.md               # Project documentation
```

---

## 🌐 Live Production Deployment

The prototype is deployed and hosted on Vercel:
- **Live URL**: [https://aerostat-airfare-index.vercel.app](https://aerostat-airfare-index.vercel.app)

To deploy your own instance to Vercel:
```bash
vercel --name aerostat-airfare-index --prod --yes
```

---

## ⚡ Local Setup & Development

No build step, package manager, or Node installation is strictly required. You can launch the application with any static web server:

### Option 1: Python HTTP Server (Quickest)
```bash
# From the project directory
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.

### Option 2: Node `serve` or `npx`
```bash
npx serve .
```

### Option 3: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

### Option 4: Direct Browser Open
Double-click `index.html` to open it directly in modern browsers (Chrome, Edge, Firefox, Safari).

---

## 🎨 Theme & Appearance Customization

Click the **Sliders / Settings** icon in the dashboard to access the **Tweaks Panel**:
- **Themes**: Switch between Light Mode and Dark Mode.
- **Accent Palettes**: Ashoka Blue, Deep Navy, Saffron, Emerald, or Ink.
- **Hero Styles**: Choose between *Statesman*, *Ticker*, or *Official Report* hero views.
- **Navigation Toggle**: Show or hide the Scraper Ops tab in the sidebar.

---

## 👥 Authors & Acknowledgments

- **Project**: AeroStat (Real-time Airfare Price Index)
- **Target Institutions**: Ministry of Statistics and Programme Implementation (MoSPI) · Directorate General of Civil Aviation (DGCA) · Reserve Bank of India (RBI)
- **Competition / Event**: Smart India Hackathon (SIH) / AI Summit 2026 Prototype
