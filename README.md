<div align="center">

<img src="https://shieldcn.dev/header/gradient.svg?title=AeroStat&subtitle=An%20interactive%20airfare%20index%20prototype&accent=%230ea5e9&mode=dark" alt="AeroStat banner" width="100%" />

![JavaScript](https://shieldcn.dev/badge/vanilla-javascript-browser-app-f1e05a.svg?logo=javascript&variant=secondary)
![Data](https://shieldcn.dev/badge/data-synthetic-demo-amber.svg?animate=shimmer)
![License](https://shieldcn.dev/github/license/Geetansh124/AeroStat-Real-time-Airfare-Price-Index.svg?variant=outline)

**A browser-based prototype for exploring route-level airfare trends, lead-time comparisons, and index-style dashboards.**

[Open repository](https://github.com/Geetansh124/AeroStat-Real-time-Airfare-Price-Index) · [Issues](https://github.com/Geetansh124/AeroStat-Real-time-Airfare-Price-Index/issues)

</div>

> **Data note:** The dashboard generates seeded synthetic data in apix-data.js. Its charts and index values are for interface demonstration; they are not live airline quotes, official statistics, or a validated price index.

## Explore the prototype

AeroStat is a static front-end concept. It presents an index overview, route comparisons, fare lead-time views, carrier comparisons, and related dashboard screens. The UI and seeded data generator are included in the repository; this README makes no claim of active airline or OTA data feeds, official institutional sponsorship, or production deployment.

~~~mermaid
flowchart LR
  D[Seeded synthetic data] --> V[Dashboard views]
  V --> C[Charts and interactions]
  S[Styles] --> V
  H[index.html] --> V
~~~

| File | Role |
| --- | --- |
| index.html | Page shell and application entry point |
| apix-app.js | Navigation and dashboard rendering |
| apix-data.js | Reproducible synthetic sample data |
| apix-charts.js | Chart rendering helpers |
| apix-styles.css | Layout, typography, and theme styles |
| tests/ | Existing project test assets |

## Run locally

No build step is required. From the repository root, start a local web server:

~~~bash
python -m http.server 8000
~~~

Open http://localhost:8000. Python 3 is required. Serving over HTTP avoids browser restrictions that can affect local JavaScript modules and assets.

## Read the numbers responsibly

- Values are generated locally from fixed seed logic, assumptions, and illustrative route/carrier weights.
- A chart labeled as an index or fare is a product-design example, not measured market data.
- Before using the prototype for research or decisions, replace the synthetic source with documented, lawfully obtained observations and publish a defensible methodology, validation, and limitations.
- The project is not affiliated with MoSPI, NSO, DGCA, RBI, SIH, airlines, or booking services unless a separate, verifiable endorsement is documented.

## Contributing

Open an issue for a reproducible UI or data-model improvement. Keep demo values clearly labeled and preserve the distinction between synthetic and observed data.
