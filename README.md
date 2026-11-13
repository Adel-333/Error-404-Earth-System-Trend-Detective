# Earth System Trend Detective

**NASA Space Apps Challenge 2026** — *Category: Be an Earth System Trend Detective!*  
**Team:** Error 404 (`Adel-333`)  
**Repository:** [Adel-333/Error-404-Earth-System-Trend-Detective](https://github.com/Adel-333/Error-404-Earth-System-Trend-Detective)  
**Deployment:** Production Single Page Application deployed via Vite and Vercel  

---

## 1. System Overview

Earth System Trend Detective is a scientific climate analytics and planetary exploration platform. It is engineered to analyze multi-decadal NASA Earth observations (2000–2026), calculate robust monotonic environmental trajectories, identify extreme climatological anomalies, and deliver transparent, explainable climate intelligence.

The architecture emphasizes scientific honesty, mathematical rigor, and data provenance. Every analytical output explicitly identifies its origin—distinguishing between verified satellite observation archives, non-parametric statistical proofs, and client-side methodological simulations.

---

## 2. Scientific Data Provenance and Observational Baselines

### 2.1 Live Satellite Composite Layers (NASA GIBS WMTS)
The 3D planetary globe streams calibrated, full-resolution satellite composite tiles directly from the NASA Global Imagery Browse Services (GIBS) Web Map Tile Service (WMTS):
- MOD13A3: Normalized Difference Vegetation Index (NDVI) and Enhanced Vegetation Index (EVI), 1 km resolution, Terra MODIS.
- MOD11C3: Daytime Land Surface Temperature (LST), 0.05° resolution, Terra MODIS.
- M2TMNXSLV: 2-meter Air Temperature Reanalysis, NASA GMAO MERRA-2.
- MODIS Aqua L3 SST: Daytime Sea Surface Temperature, 9 km resolution.
- GLDAS_NOAH025_M: Total Precipitation Rate and 0–10 cm Soil Moisture, GLDAS v2.1.
- MOD10CM: Global Snow Cover Fraction, Terra MODIS.

### 2.2 Quantitative Multi-Decadal Time Series (Investigation Workspace)
For time-series decomposition and statistical trend discovery (2000–2026), the platform uses a hybrid dual-tier architecture:

1. **Curated Ground-Truth Observation Archives (Verified Real NASA Data):**
   For critical benchmark environmental hotspots, the platform bundles complete, non-simulated monthly observations (2000–2025) extracted directly from the NASA GMAO MERRA-2 and NASA POWER archives (located in `public/data/nasa_real/`):
   - Nile River Delta Agricultural Basin (Egypt): Multi-decadal cropland dynamics, seasonal greenness, and land surface temperature trends.
   - Egyptian Western Desert (Egypt): Hyper-arid thermal baselines and soil moisture constraints.
   - Amazon River Basin (Brazil): Tropical rainforest vegetation resilience and hydrological flux.
   - Lake Chad Basin (Chad): Hydrological recession dynamics and surface water balance.

2. **Global Coordinates Climatological Baseline (Physical Simulation):**
   When analyzing arbitrary coordinates outside the curated real archives, the system invokes the `ScientificSimulationEarthDataProvider`. It computes an empirical physical baseline derived from latitude-dependent solar insolation, continental thermal inertia, elevation lapse rates, and autoregressive AR(1) red-noise dynamics. The user interface explicitly labels all simulated data to preserve transparency for the evaluation committee.

---

## 3. Statistical Trend Detection Framework

Monotonic trajectory evaluations are computed using established non-parametric statistical methods rather than generative models:

- **Seasonal Mann-Kendall Test (Hirsch & Slack 1982):**
  Evaluates monotonic trends within individual calendar months across multi-decadal baselines, computing rank correlation Kendall's tau and assessing significance at p < 0.05.
- **Theil-Sen Robust Median Slope Estimator (Sen 1968):**
  Quantifies the median rate of change per decade, impervious to missing data points or extreme sensor outliers.
- **Bivariate Pearson Matrix and Cross-Lagged Autocorrelation (R^2):**
  Evaluates coupling between physical variables (e.g., Land Surface Temperature vs. Vegetation Index or Soil Moisture vs. Precipitation).

---

## 4. Foundation Time-Series Modeling (Client-Side Simulations)

To run entirely within standard client browsers without requiring server-side GPU clusters or multi-gigabyte PyTorch environments, the platform implements client-side mathematical simulations that mirror the core behavior of foundation models:

- **Chronos-2 Probabilistic Forecaster (Simulating amazon-science/chronos-forecasting):**
  Decomposes historical time series into trend and seasonal harmonics using tokenized scaling approximations. Extrapolates future trajectories (+24 months) alongside an 80% inter-quantile uncertainty cone (P10, P50, P90).
- **MOMENT Anomaly Detective (Simulating moment-timeseries-foundation-model/moment):**
  Applies unsupervised reconstruction-residual tracking and Extreme Value Thresholding (EVT) using a robust Median Absolute Deviation (MAD) filter, detecting anomalous deviations exceeding 2.25 sigma.

---

## 5. Interactive Climate Intelligence (Erro 404 / Gemini Integration)

The platform includes an AI Climate Detective copilot connected to the Google Gemini API (`models/gemini-3.1-flash-lite`):
- **Telemetry Grounding:** System prompts receive real-time application context, including selected coordinates, active sensor layer, Theil-Sen drift rates, Mann-Kendall p-values, and detected anomaly scores.
- **Scientific Query Processing:** Explains atmospheric, hydrological, and vegetative shifts based on physical principles, supporting inquiries in English and Arabic.

---

## 6. Directory Structure

```
.
├── public/
│   ├── data/
│   │   ├── nasa_real/          # Curated real NASA MERRA-2 & POWER observation time series
│   │   ├── cities.json         # Global reference cities
│   │   └── countries.geojson   # Boundary geometry data
│   └── erro-logo.jpg           # Application logo
├── src/
│   ├── investigation/
│   │   ├── aiEngine.ts         # Chronos-2 forecasting and MOMENT anomaly detection logic
│   │   ├── analysis.ts         # Statistical engine (Mann-Kendall, Theil-Sen, Pearson matrix)
│   │   ├── provider.ts         # Hybrid provider (Real NASA data + physical simulation)
│   │   ├── globe.ts            # 3D interactive Earth sphere with satellite trajectories
│   │   └── workspace.ts        # Analytical charts, comparison matrix, and Gemini telemetry chat
│   ├── lib/
│   │   ├── timeline.ts         # NASA GIBS WMTS layer registry and date calculations
│   │   └── trend.ts            # Mathematical implementations of Mann-Kendall and Sen's slope
│   ├── ui/
│   │   ├── EarthDetectiveCopilot.ts  # Floating AI Copilot modal with Gemini API connection
│   │   └── copilot.css         # Copilot interface styles
│   └── main.ts                 # Main Explorer view controller
├── vercel.json                 # Vercel deployment configuration
├── package.json
└── README.md
```

---

## 7. Deployment and Local Setup

### Local Development
```bash
# Clone the repository
git clone https://github.com/Adel-333/Error-404-Earth-System-Trend-Detective.git
cd Error-404-Earth-System-Trend-Detective

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build
```bash
# Compile and build production assets
npm run build
```

### Vercel Deployment
The repository includes a root `vercel.json` configured for Vite SPA routing:
1. Connect the GitHub repository `Adel-333/Error-404-Earth-System-Trend-Detective` in the Vercel Dashboard.
2. Framework Preset: **Vite**.
3. Build Command: `vite build` (or `npm run build`).
4. Output Directory: `dist`.
5. Deploy.

---

## 8. Authors and Challenge Attribution
- **Team:** Error 404 (`Adel-333`)
- **Event:** NASA Space Apps Challenge 2026
- **Challenge:** Be an Earth System Trend Detective!
