# Earth System Trend Detective — Project Blueprint

> **Document type:** Product + technical blueprint  
> **Status:** Pre-hackathon / data-source-pending  
> **Prepared:** 3 November 2026  
> **Revision note:** 3 November 2026 — added prior-hackathon EO providers/tools, clarified the frontend-first workstream, and made backend technology explicitly provisional.  
> **Working project name:** Earth System Intelligence (name is provisional)  
> **Primary challenge:** [NASA Space Apps Challenge 2026 — Be An Earth System Trend Detective](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/)

---

## 0. Read This First — Project Status and Non-Negotiable Assumptions

This document defines what the team intends to build, how it should be engineered, which existing projects should be studied, and how the application should be prepared before the official hackathon data is available.

### 0.1 Data availability status

**The official challenge dataset / exact resource package has not yet been received by the team.** The team expects the relevant data and/or final resource instructions to become available during the hackathon. Therefore:

- We are preparing the frontend, design system, typed data contracts, realistic mock/demo workflow, test fixtures, and documented target architecture. The backend, real ingestion pipeline, and scientific engine will be implemented only after their requirements and technology are agreed.
- The **frontend decision is fixed for the current project phase: Next.js App Router + React + TypeScript**. The immediate implementation priority is the frontend, because the current owner of this workstream is responsible for the web experience.
- **The backend is deliberately NOT finalised.** Python + FastAPI is one candidate because of the scientific Python ecosystem, but .NET, another service framework, a hosted processing service, or a hybrid may be more appropriate after the official dataset, integration requirements, and team strengths are known. Do not treat any backend stack in this document as a locked decision.
- For the current phase, build the frontend against typed contracts and deterministic mock/demo providers. Do not block UI work on the backend and do not prematurely scaffold a production backend.
- Before major UI implementation, the team should install/review the selected agent skills in Section 8.4 and complete the reverse-engineering protocol in Section 12.4.
- We are **not** selecting a final scientific dataset, collection ID, variable, temporal range, spatial resolution, or processing method before seeing the official resources.
- We must not hard-code assumptions that force us to rebuild the product when the real data arrives.
- We will use explicitly labelled **synthetic/demo data** during development. Synthetic data is only for UI, pipeline, and algorithm testing. It must never be presented as a real NASA observation or scientific finding.
- On hackathon day, the team will inspect the official data package, select compatible adapters, validate metadata and coverage, and connect the real data to the existing normalized data model.
- If the official package is a link to a NASA service rather than downloadable files, we will implement the appropriate provider adapter after checking access, authentication, rate limits, and data-use requirements.

### 0.2 What is known from the challenge brief

The challenge asks for a tool that can:

1. Help identify Earth-science variables worth investigating.
2. Acquire data for a chosen geographic region.
3. Generate and visualize a time series covering a sufficiently long period.
4. Quantify the rate and direction of change.
5. Test whether the trend is statistically significant.

The brief explicitly mentions satellite products and model/reanalysis sources, including MODIS, OMI, AIRS, GPM, MERRA-2, and GLDAS. It gives examples such as temperature, precipitation, evaporation, streamflow, and other environmental variables. It suggests daily or monthly data as practical temporal resolutions and describes linear trend detection as a suitable starting point. These are **examples and candidate sources**, not a final confirmed dataset list for our implementation.

### 0.3 Product principle

We are not building another generic climate dashboard. We are building a **scientific investigation workspace** that guides a user from a question to traceable evidence:

**Discover a variable → select a region → inspect data coverage → build a time series → calculate trends → test significance → inspect the spatial pattern → export a reproducible finding.**

Every displayed scientific result must be traceable to the dataset, variable, region, time period, preprocessing choices, and statistical method that produced it.

---

# 1. Product Vision

## 1.1 Working concept

A modern web platform for exploring Earth-system data and detecting environmental trends across time and space.

The application should make it possible for a high-school or university user, researcher, or scientifically curious member of the public to investigate questions such as:

- Is near-surface air temperature increasing in this region?
- Is rainfall decreasing in one part of a country but increasing in another?
- Does an annual average hide an important seasonal pattern?
- Where is the strongest statistically supported change?
- How large is the trend, in meaningful physical units?
- Is the trend robust after accounting for seasonality, autocorrelation, missing values, and multiple testing?

The application must help users discover the answer rather than merely show preselected charts.

## 1.2 The four challenge questions

| Challenge question | What our platform should return |
|---|---|
| What is changing? | Selected variable, its definition, units, source, and detected trend direction. |
| Where is it changing? | Region-level result plus a spatial map of local trends where the data supports it. |
| How much is it changing? | A rate of change with units and a confidence interval, e.g. units per decade. |
| Is it significant? | Test name, p-value, significance threshold, adjusted p-value where applicable, and an understandable interpretation. |

## 1.3 What makes our intended solution distinctive

Our differentiation should come from the combination of:

1. **Variable discovery:** a usable catalogue rather than a fixed set of hard-coded charts.
2. **Region-first investigation:** users can select a region with a map, named area, point, bounding box, or polygon when supported.
3. **Spatially resolved analysis:** do not collapse a large region into one mean too early. Show how the trend varies inside the region when data resolution allows.
4. **Seasonal intelligence:** annual aggregation can hide opposing or seasonal trends. Offer seasonal/monthly views where supported.
5. **Statistical honesty:** show uncertainty, data coverage, effective sample size, missingness, autocorrelation handling, and multiple-testing correction where relevant.
6. **Data provenance:** every result carries a source and a reproducible analysis configuration.
7. **Data-source independence:** a new official dataset should be connected through an adapter, not by rewriting the UI or statistical engine.
8. **Professional scientific UX:** a modern, purpose-built research interface, not a generic AI SaaS template.

---

# 2. Reference Projects and Reverse-Engineering Review

The references below are not all equivalent. Some are direct implementations of the same challenge, some are official NASA analysis tools, and some are design or engineering references. We should study their workflows, code boundaries, scientific choices, and interaction patterns. We must not assume that a repository is a winner, NASA-endorsed, scientifically validated, or fully implemented simply because its README says so.

## 2.1 Priority reference matrix

| Reference | Type | Best reason to study it | Main limitation for our use |
|---|---|---|---|
| [NASA Earth Trend Detective — nasa-earth-detectives](https://github.com/nasa-earth-detectives/nasa-earth-trend-detective) | Public project for the exact 2026 challenge | Multi-variable concept, React + 3D map, backend/data separation, DuckDB, team workflow | More complex stack; README claims and code maturity must be independently checked; visual approach includes glassmorphism, which we do not want to copy; license needs verification. |
| [Orion Space](https://github.com/MD-Mushfiqur123/orion-space) | Public project for the exact 2026 challenge | Reproducible trend analysis, Mann–Kendall, Sen slope, FDR, pre-whitening, CesiumJS globe | Scientific analysis is focused on one variable (T2M) and one country; some extra globe layers are inherited/contextual rather than part of the trend engine; static hosting does not serve all API routes. |
| [NASA Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/) | Official NASA data analysis tool | Variable discovery, date/region selection, area-averaged time series, provenance | Specialist-oriented and information-dense UX; use as a workflow reference, not as our visual design target. |
| [NASA Giovanni User Guide](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html) | Official documentation | Exact details of variable search, ROI selection, time series, recurring averages, missing-data failures | Documentation reflects Giovanni's supported holdings and behaviour, not necessarily the official challenge data package. |
| [NASA Sea Level Change Data Analysis Tool](https://sealevel.nasa.gov/data_tools/1) | Official NASA analysis tool | Map layers, ROI statistics, area-averaged time series, dataset comparison and filtering | It is sea-level focused; its quick-look datasets are interpolated to a 1° grid for computational reasons. |
| [PyClimaExplorer](https://github.com/reshmiee/PyClimaExplorer) | Hackathon climate dashboard | Built-in sample data, NetCDF upload, separation of data loading and visual modes | Streamlit is less flexible for our intended bespoke web UI; its forecast and AI-story modes are outside our core challenge scope. |
| [Arctic Climate Story](https://github.com/lukaskreibig/climate-dashboard) / [live story](https://arctic.rip) | High-quality climate storytelling web app | Frontend polish, narrative data presentation, typed frontend/backend contracts, reproducible data pipeline | Story-first scrolling experience, not a general variable/ROI analysis workbench; README states all-rights-reserved licensing. |
| [earth — Open Climate Data on a Globe](https://github.com/blauewelt/earth) / [live globe](https://blauewelt.github.io/earth/) | Open-source 3D data explorer prototype | Layer catalogue, globe interaction, date controls, comparison, aggregation, data catalogue | Broad prototype with multiple providers; not a focused statistical trend-detection application. |
| [Watcher-ux — Earth Trend Detective](https://github.com/Watcher-ux/Earth-Trend-Detective) | Public project for NASA Space Apps GO 2026 | Small Python/Streamlit app with a separate engine, tests, data fetcher, Mann–Kendall, Sen slope, dual-region comparison | Very small repository/history at the time reviewed; license wording is not a standard SPDX license; inspect carefully before reuse. |
| [Trend Detective](https://github.com/Team-Error-404/Earth-System-Trend-Detective) / [live site](https://error404.earth) | Open-source NASA data globe | Excellent time scrubber, layer catalogue, point probes, provenance, research methods and agent guidance | Some point-series extraction is explicitly approximate because it inverts rendered colours; do not use that approximate probe as a substitute for raw numeric data in our scientific engine. |
| [Tiefer team profile](https://www.spaceappschallenge.org/2026/find-a-team/eigenon/) / [lab repository](https://github.com/tiefer-labs/lab) | Team concept for the same challenge | Cloud-cover trend investigation using MODIS and cloud-image filtering | Team profile describes the intended direction; do not assume a complete, validated challenge implementation without inspecting the repository. |
| [NASA Worldview](https://worldview.earthdata.nasa.gov/) | Official NASA Earth-observation browser | Layer catalogue, time navigation, map interaction, geographic context | Primarily a visualization/discovery experience; do not extract scientific trend values from rendered pixels. |
| [Climate Reanalyzer](https://climatereanalyzer.org/) | University of Maine climate visualization platform | Map and time-series workflow, anomaly views, comparison of climate/reanalysis sources | Not a direct substitute for a statistical trend-significance engine; verify dataset provenance and frequency. |
| [Our World in Data Grapher](https://github.com/owid/owid-grapher) | Interactive chart platform and source repository | Chart annotations, source notes, axis/legend design, interactive chart storytelling | Public source is now proprietary/all-rights-reserved; study only, do not reuse code/assets without written permission. |
| [NASA-IMPACT VEDA UI](https://github.com/NASA-IMPACT/veda-ui) | NASA Earth-data exploration dashboard | Map/data storytelling architecture, configurable dashboard pages, data-driven content | Repository is in maintenance mode; Apache-2.0. Study architecture and components, but do not assume active feature development. |
| [NASA-IMPACT Next VEDA UI](https://github.com/NASA-IMPACT/next-veda-ui) | Experimental Next.js + VEDA UI integration | A direct reference for combining Next.js with geospatial visualization/storytelling components | Explicitly marked unsupported/beta and has dependency-maintenance warnings; inspect for ideas only, not as a production starter. |

## 2.2 Reference A — NASA Earth Trend Detective (same challenge)

**Repository:** [github.com/nasa-earth-detectives/nasa-earth-trend-detective](https://github.com/nasa-earth-detectives/nasa-earth-trend-detective)  
**Production preview listed by the repository:** [nasa-earth-trend-detective.vercel.app](https://nasa-earth-trend-detective.vercel.app/)  
**QA preview:** [nasa-earth-trend-detective-qa.vercel.app](https://nasa-earth-trend-detective-qa.vercel.app/)  
**Development preview:** [nasa-earth-trend-detective-dev.vercel.app](https://nasa-earth-trend-detective-dev.vercel.app/)  
**Backend health endpoint listed by the repository:** [nasa-trend-detective-api.onrender.com/health](https://nasa-trend-detective-api.onrender.com/health)

The repository identifies itself as a 2026 NASA Space Apps Earth System Trend Detective project. Its README describes a monorepo with:

- Backend: .NET 10, Clean Architecture, REST API, DuckDB.
- Frontend: React 19, Three.js / Globe.gl, Tailwind CSS.
- Shared package: shared geophysical data contracts and DTOs.
- Docker Compose for local orchestration.
- Separate team responsibilities for backend/ETL/scientific methods and frontend/3D visualization.
- Proposed analysis of variables including surface temperature, MODIS vegetation/NDVI, GRACE-FO water/ice mass anomalies, OCO-2 CO₂, and Sentinel-6 sea level.
- Sen's slope for change rate and Mann–Kendall for non-parametric trend significance.

### What to study

1. `backend/`: boundaries between API, domain/application logic, and infrastructure.
2. `frontend/`: map and globe composition, interaction state, timeline, and result presentation.
3. `packages/shared/`: shared contracts and DTO design.
4. `data/datasets/`: dataset manifests and how raw/derived data are organised.
5. `TEAM.md`: division of labour and responsibilities.
6. `CONTRIBUTING.md`: branches, pull requests, conventional commits, and code review.
7. `docker-compose.yml`: local multi-service setup.

### Strengths

- It is a direct same-challenge reference, so its product scope maps closely to our problem.
- It acknowledges the need for a scientific core separate from the 3D frontend.
- DuckDB is a sensible candidate for analytical queries over tabular and spatially indexed data.
- Shared contracts can reduce frontend/backend integration errors.
- It documents team ownership, a useful practice for a time-limited hackathon.

### Limitations and things not to copy blindly

- .NET plus DuckDB plus React/Three.js is a capable stack, while Python/FastAPI may be simpler for a science-heavy workflow that relies on Python geospatial libraries. Neither backend option is selected; assess both against the official data, team skills, and event constraints.
- Three.js/3D globe rendering is visually impressive but does not itself solve statistical trend analysis. Do not let 3D work consume time needed for correct data handling and analysis.
- Its README lists a glassmorphism direction. We explicitly want to avoid generic glossy AI/SaaS styling. Study the information architecture and engineering, not that visual treatment.
- The README describes several variables and methods; verify the actual data adapters, algorithms, tests, and outputs in the repository before considering any feature implemented.
- A public repository does not prove that the project won, was selected, or was endorsed by NASA. We have not established such a claim.
- At the time of this review, no clear root-level `LICENSE` was visible in the repository listing. Treat its code as **not reusable** until an explicit license is found and checked or permission is obtained.

**Verdict:** high-priority architecture and product reference; not our default codebase or visual template.

**Live-demo availability note:** the repository README lists production, QA, and development preview URLs. These are deployment endpoints, not guaranteed permanent documentation. During this review, the pages did not expose readable content through the inspection environment and the advertised backend health endpoint returned a `503` response. If a preview link shows `404`, `503`, or a blank page, use the GitHub repository and its source tree as the stable reference, and test the local build rather than assuming the repository itself is missing.

## 2.3 Reference B — Orion Space (same challenge)

**Repository:** [github.com/MD-Mushfiqur123/orion-space](https://github.com/MD-Mushfiqur123/orion-space)  
**Analysis source:** [analysis/trend_analysis.py](https://github.com/MD-Mushfiqur123/orion-space/blob/main/analysis/trend_analysis.py)  
**Analysis documentation:** [analysis/README.md](https://github.com/MD-Mushfiqur123/orion-space/blob/main/analysis/README.md)

The repository reports an analysis of NASA MERRA-2 2 m air temperature (T2M), retrieved through NASA POWER, for Bangladesh over 2001–2025. It analyses monthly and annual series across grid cells, then uses:

- Mann–Kendall trend test.
- Theil–Sen slope, expressed per decade.
- Benjamini–Hochberg false-discovery-rate correction across multiple cell/month tests.
- Lag-1 autocorrelation checking and trend-free pre-whitening where needed.

The team's stated finding is that a seasonal signal (especially September) is visible even though the annual mean does not show a significant trend across the study cells. This is an excellent example of why annual averages can hide useful behaviour.

### What to study

- `analysis/trend_analysis.py`: transparent calculations and outputs.
- `analysis/README.md`: how the data, methods, tests, and limitations are documented.
- `public/data/climate/`: how derived files are consumed by the web application.
- `src/agent/OrionMapHarness.js`: how the trend explanation panel is connected to map interactions.
- `package.json`, `vite.config.js`, and `server/`: frontend/build/server separation.
- `THIRD_PARTY_NOTICES.md`, `LICENSE`, and inherited base-project notices.

### Strengths

- A real, reproducible analysis script is provided; the README states how to rerun it.
- It documents limitations instead of pretending that grid cells are weather stations.
- It treats monthly/seasonal analysis separately from annual means.
- It applies multiple-testing correction and checks temporal autocorrelation, both important for a spatial grid with many tests.
- It links the statistical result to a geographic view and evidence card.
- The repository states that it is MIT licensed, while also documenting that the globe and much of the inherited system originate from another project. Preserve all applicable upstream notices if studying or reusing code.

### Limitations and things to improve in our own design

- Its stated trend analysis is for T2M only. Our ingestion and analysis model should be variable-agnostic.
- It is a focused Bangladesh case study, not a general-purpose variable discovery tool.
- The repository notes that a static deployment does not serve the Node middleware API routes. We must test deployed functionality end-to-end rather than assuming that a static frontend includes working backend endpoints.
- Its extra operational layers (fires, earthquakes, vessels, aircraft, etc.) can be useful context but are not the central challenge deliverable. We should not add unrelated map layers just to make the interface look busy.
- The Trend Agent is a presentation/interaction layer; it must not replace deterministic statistical calculations.

**Verdict:** strongest scientific-analysis reference. Reuse concepts and study the code carefully; preserve upstream license notices if any code is reused.

## 2.4 Reference C — Watcher-ux Earth Trend Detective (same challenge)

**Repository:** [github.com/Watcher-ux/Earth-Trend-Detective](https://github.com/Watcher-ux/Earth-Trend-Detective)

The public README describes a NASA Space Apps GO 2026 submission with a Streamlit UI, a separate `engine/` folder, and a `tests/` folder. Its listed features include a 3D globe, monthly time-series charts, Mann–Kendall significance overlays, Sen's slope, and dual-region comparison. Its listed variables include surface temperature from NASA POWER, sea ice from NSIDC, and sea-level anomaly from NASA/JPL PODAAC.

### What to study

- `engine/data_fetcher.py`: provider/data-fetching separation.
- `engine/trend_engine.py`: trend-engine boundary.
- `engine/region_compare.py`: dual-region comparison logic.
- `tests/`: what scientific behaviours they test.
- `app/components/timeseries.py` and `significance.py`: chart and significance communication.

### Strengths

- Very close to the challenge's core workflow.
- Keeps data fetching and trend calculations outside the UI pages.
- Explicitly includes a two-region comparison, which is relevant to opposing regional trends.
- Documents source citations for multiple datasets.
- The small module structure is easier to understand than a large, highly coupled application.

### Limitations

- The repository history was very small at the time reviewed, so we should treat it as a compact implementation reference, not a proven production system.
- Streamlit is useful for a fast prototype but is not our preferred route for the custom React workbench.
- The README uses the phrase “open source for educational purposes” but does not establish a standard OSI/SPDX licence in the reviewed text. Do not reuse source code until a clear licence is confirmed.
- Its listed variables and time ranges are claims in its README; verify data access, freshness, units, and actual code before reproducing them.

**Verdict:** study its modular science-engine organisation and region-comparison feature. Do not assume it is more complete than its public source proves.

## 2.5 Reference D — NASA Giovanni

**Website:** [giovanni.gsfc.nasa.gov/giovanni](https://giovanni.gsfc.nasa.gov/giovanni/)  
**User guide:** [Giovanni User Guide](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html)

Giovanni is an official NASA environment for displaying and analysing geophysical parameters. Its workflow includes:

- Faceted and keyword-based variable search.
- Date-range selection.
- Region-of-interest selection through coordinates, a map, or a predefined shape.
- Multiple plot types, including maps and area-averaged time series.
- Access to data lineage/provenance and output options.

### Strengths

- A strong reference for a real scientific data-discovery workflow.
- It makes variable, period, and region selection explicit before plotting.
- It explains that an area-averaged time series is calculated from the valid spatial values at each time step; fill values should not contribute to averages.
- Its guide documents many failure conditions, including no temporal coverage, spatial gaps, and regions with no valid values.
- It supports recurring averages and multiple temporal views, which can inspire our seasonal-analysis UX.

### Limitations for our product

- Giovanni is a professional scientific tool, not a consumer-friendly visual design reference.
- The interface and terminology can be dense for beginners. We should translate the workflow into a guided, clearer experience.
- Its available variables and functions depend on its own supported data holdings; we must not assume that all challenge datasets will be available through Giovanni.
- Full functionality/data access can involve Earthdata Login; authentication and access requirements should be tested early.

**Verdict:** use it to reverse-engineer scientific workflows, variable discovery, provenance, coverage warnings, and time-series semantics. Do not copy its UI.

## 2.6 Reference E — NASA Sea Level Change Data Analysis Tool

**Tool:** [NASA Data Analysis Tool](https://sealevel.nasa.gov/data_tools/1)

The official tool supports data-layer selection and comparison, a region of interest (drawn box or selected point), regional statistics such as minimum/maximum/standard deviation/trend/correlation, and area-averaged time-series comparison for up to two datasets. It also provides filters for non-seasonal and other temporal signals.

### Strengths

- Strong reference for keeping the map, selected ROI, and analysis linked.
- Shows how to compare datasets in the same region.
- Useful design ideas for an analysis side panel and map-layer catalogue.
- Demonstrates that a trend result should be connected to an explicitly selected spatial area.

### Limitations

- The tool is tailored to sea-level-change datasets, so it is not a complete general-purpose variable-discovery platform.
- NASA notes that its data are interpolated to a 1° × 1° grid for computational reasons. That resolution limitation is a useful reminder: a map should never imply finer scientific detail than the data support.
- Treat it as a workflow reference, not as a source of data for every possible variable.

**Verdict:** use it for ROI interactions, map-to-chart linkage, and regional comparison.

## 2.7 Reference F — PyClimaExplorer

**Repository:** [github.com/reshmiee/PyClimaExplorer](https://github.com/reshmiee/PyClimaExplorer)

The repository describes a Streamlit climate-data dashboard with heatmap, compare, 3D globe, story, and forecast modes. Its README says it loads a built-in synthetic ERA5-like sample for immediate use and allows users to upload a real NetCDF file. It separates data loading, utility functions, plotting helpers, and pages.

### Strengths

- The **sample-data-first** approach is exactly what we need before the official hackathon data arrives.
- It demonstrates an upload flow for NetCDF and a switch between sample and real data.
- Its `data.py`, `utils.py`, `plotting.py`, and page modules are easy to understand as a small prototype structure.
- It is MIT licensed according to its README.

### Limitations

- Streamlit is convenient for prototypes, but it constrains fine-grained custom interaction and visual identity compared with a bespoke React application.
- The project's story, AI narration, and forecast modes are not core requirements for our challenge.
- Its own README describes the forecast as trend extrapolation rather than a climate simulation. We should not add future forecasts to our MVP or confuse extrapolation with climate-model prediction.
- Sample data are synthetic/ERA5-like and must not be confused with official measured data.

**Verdict:** study its ingestion and demo-mode pattern, not its overall interface or scope.

## 2.8 Reference G — Arctic Climate Story

**Repository:** [github.com/lukaskreibig/climate-dashboard](https://github.com/lukaskreibig/climate-dashboard)  
**Live site:** [arctic.rip](https://arctic.rip)

The repository describes a story-first climate experience using Next.js, React, GSAP, D3, Recharts, Mapbox GL, FastAPI, Python data pipelines, and a PostgreSQL/Supabase data layer. It combines NASA GISTEMP, NOAA sea-ice data, Our World in Data CO₂ data, and a separate Sentinel-2 processing pipeline.

### Strengths

- A strong engineering reference for typed frontend/backend contracts.
- Thoughtful data-pipeline separation and refresh documentation.
- High-quality chart/map storytelling and intentional sequencing.
- Accessibility and internationalisation are considered in the project structure.
- Useful reference for production-style architecture and operational documentation.

### Limitations

- It is a guided narrative, not an open-ended scientific exploration tool.
- Mapbox/MapTiler keys and hosted infrastructure add external dependencies.
- Its repository states **All rights reserved**. Do not copy source code, CSS, assets, screenshots, or design components without permission. Use it as a high-level visual/interaction reference only.
- Its rich scroll choreography is not necessary for our main investigation workspace and could slow down development.

**Verdict:** learn from visual hierarchy, narrative clarity, data provenance, and software organisation. Do not reuse its code or assets without permission.

## 2.9 Reference H — earth: Open Climate Data on a Globe

**Repository:** [github.com/blauewelt/earth](https://github.com/blauewelt/earth)  
**Live site:** [blauewelt.github.io/earth](https://blauewelt.github.io/earth/)

The project is an interactive CesiumJS globe with a broad public-data catalogue and layers from NASA GIBS, ocean data, reanalysis, biodiversity, emissions, and other sources. Its README describes controls for dates, layer selection, side-by-side comparison, per-pixel differences, aggregation windows, and downloads.

### Strengths

- Strong reference for a layer catalogue and a date-aware globe.
- Helpful examples of side-by-side comparison and per-pixel difference views.
- Its data catalogue records provider, canonical source, access method, formats, temporal/spatial coverage, update cadence, and licensing. This metadata discipline is worth adopting.
- It is MIT licensed according to its README, while individual data sources retain their own licenses.

### Limitations

- It is a broad globe prototype rather than a focused, guided trend-analysis product.
- A visually impressive globe does not provide statistical significance by itself.
- Its README distinguishes easy-to-render layers from datasets that still need integration. This is a useful warning: a catalogue entry is not proof that a dataset is fully wired into a working analysis pipeline.
- Combining many providers increases provenance, licensing, harmonisation, and quality-control complexity.

**Verdict:** study the layer catalogue, timeline, comparison mechanics, and metadata structure. Keep our first release much narrower.

## 2.10 Reference I — Trend Detective

**Repository:** [github.com/Team-Error-404/Earth-System-Trend-Detective](https://github.com/Team-Error-404/Earth-System-Trend-Detective)  
**Live site:** [error404.earth](https://error404.earth)  
**Methods:** [METHODS.md](https://github.com/Team-Error-404/Earth-System-Trend-Detective/blob/main/METHODS.md)  
**Architecture:** [ARCHITECTURE.md](https://github.com/Team-Error-404/Earth-System-Trend-Detective/blob/main/ARCHITECTURE.md)  
**Data sources:** [DATA_SOURCES.md](https://github.com/Team-Error-404/Earth-System-Trend-Detective/blob/main/DATA_SOURCES.md)  
**Agent guidance:** [AGENTS.md](https://github.com/Team-Error-404/Earth-System-Trend-Detective/blob/main/AGENTS.md)

Trend Detective describes itself as an open-source, provenance-first 3D globe for browsing NASA satellite/reanalysis records over time. Its README lists a ruler-like monthly time scrubber, multiple Earth-science layers, a provider catalogue, point time-series probes, data-source labels, and research recipes. It also documents seasonal Mann–Kendall and Sen-slope methods.

### What to study

- `AGENTS.md`: unusually useful example of project-specific coding-agent instructions.
- `ARCHITECTURE.md`: module boundaries and application architecture.
- `METHODS.md`: how the application describes its scientific methods and limitations.
- `DATA_SOURCES.md`: source catalogue and provenance structure.
- `catalog/` and `contract/`: data/catalogue and contract organisation.
- `e2e/`, Playwright configs, and visual tests: testing strategy.
- The live temporal scrubber, layer picker, point inspector, and source labels.

### Strengths

- Particularly strong reference for a time-first Earth-observation experience.
- Good ideas for a clear layer picker, ruler-style timeline, source provenance, and accessible exploration.
- Includes methodology documentation and explicitly documents where outputs stop being trustworthy.
- Its repository contains agent instructions, architecture, data-source, governance, and launch documents. This is useful when setting up our own AI-assisted development rules.
- MIT licence is exposed in the repository; each external dataset still has its own licence and attribution requirements.

### Limitations and scientific caveats

- The README explicitly says its point time-series probe is approximate by design because it inverts rendered colormap pixels. It documents that limitation. That may be acceptable for exploratory inspection, but we must not use colour-inverted imagery as the data source for our inferential trend calculations.
- It is a 3D data browser, not a direct replacement for our region-level significance workflow.
- Its broad layer catalogue and high-resolution streaming are ambitious; we should not copy its scale or feature scope into a hackathon MVP.
- Confirm current live behaviour and actual supported layers; a README catalogue is not proof that every item is integrated.

**Verdict:** very high-priority reference for timeline interactions, provenance, engineering documentation, and coding-agent instructions. For our statistical engine, use numeric scientific data—not colour-inverted map pixels.

## 2.11 Reference J — Tiefer (same challenge team concept)

**Official team profile:** [Tiefer — NASA Space Apps team profile](https://www.spaceappschallenge.org/2026/find-a-team/eigenon/)  
**Repository linked by the team:** [github.com/tiefer-labs/lab](https://github.com/tiefer-labs/lab)

The team profile describes a Baku-based team working on onboard AI to filter cloudy satellite images and a challenge direction to map changes in cloud cover using NASA MODIS data.

### What to study

- How cloud contamination and image quality affect an Earth-observation variable.
- How a team frames a remote-sensing preprocessing task as part of a broader trend investigation.
- Any documented pipeline for image filtering, cloud masks, and the resulting quality flags—after inspecting the repository.

### Limitations

- The official team profile describes the intended project direction, not proof of a complete or scientifically validated final implementation.
- Cloud masking is a specialist image-processing problem and may be outside our first-release scope unless the official data requires it.
- A cloud-filtering model should not be introduced just to add AI. It needs an actual data-quality problem and validation evidence.

**Verdict:** a useful concept reference for data quality and preprocessing, but not a core architecture reference.

## 2.12 Reference K — NASA Worldview

**Application:** [worldview.earthdata.nasa.gov](https://worldview.earthdata.nasa.gov/)

NASA Worldview is a useful reference for browsing Earth-observation imagery and layers through a geographic interface. Study its time controls, layer discovery, map navigation, projection options, layer metadata, and the way it helps a user move from a global view to a place/time of interest.

### Strengths

- A strong example of a real NASA Earth-observation map experience.
- Useful layer-discovery and time-navigation patterns.
- Good reference for map controls, legends, metadata, and the distinction between visible layers.

### Limitations

- Worldview is an imagery/visualization experience, not our statistical trend engine.
- Rendered map tiles are not a substitute for the underlying numeric product when calculating trends.
- Do not copy NASA branding, logos, mission identifiers, or protected design elements into the team's own visual identity.

**Verdict:** study its Earth-observation map workflow and provenance cues; use the actual science data product for calculations.

## 2.13 Reference L — Climate Reanalyzer

**Application:** [climatereanalyzer.org](https://climatereanalyzer.org/) · [University of Maine overview](https://climatechange.umaine.edu/climate-matters/climate-reanalyzer/)

Climate Reanalyzer provides accessible interfaces for exploring climate and weather datasets, including gridded reanalysis, station observations, maps, anomalies, and time series.

### Strengths

- Useful example of connecting a map with a time-series workflow.
- Shows ways to let users explore anomalies and compare different datasets.
- Its language and interaction model can help us communicate climate information to both students and more experienced users.

### Limitations

- It includes weather forecast products as well as historical climate data; these must not be confused with long-term trend analysis.
- It is not our replacement for autocorrelation-aware trend significance and field-significance procedures.
- Dataset provenance, units, temporal coverage, and spatial resolution still need to be shown explicitly in our own application.

**Verdict:** a useful product/UX reference for accessible climate exploration, time series, and anomalies.

## 2.14 Reference M — Our World in Data Grapher

**Source repository:** [github.com/owid/owid-grapher](https://github.com/owid/owid-grapher) · **Chart documentation:** [docs.owid.io/projects/grapher](https://docs.owid.io/projects/grapher/)

Our World in Data's Grapher is a mature interactive charting system. Its public source repository is available for transparency and educational reference, but the current repository states that it is no longer MIT licensed and that code reuse requires prior written permission.

### What to study

- Strong chart titles and explanatory subtitles.
- Clear source attribution and metadata close to the visualization.
- Axis, legend, annotation, and selected-series behaviour.
- The way a chart can support comparison without adding decorative UI.
- Separation between chart configuration and the data it renders.

### Limitations and licence

- The repository is not a reusable permissively licensed library at present.
- It is tightly coupled to Our World in Data's own database and publishing system.
- Do not copy source code, assets, or component styling into our project without written permission. Use the public site and documentation as visual/interaction references only.

**Verdict:** excellent reference for data communication and chart writing; not a code-reuse dependency.

## 2.15 Reference N — NASA / Earthdata data services

These are technical service references rather than finished applications:

- [NASA Earthdata Login documentation](https://urs.earthdata.nasa.gov/documentation)
- [NASA Harmony documentation](https://harmony.earthdata.nasa.gov/docs)
- [NASA GIBS API documentation](https://nasa-gibs.github.io/gibs-api-docs/)
- [NASA POWER Monthly and Annual API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)

### Critical distinction: scientific data vs. rendered imagery

**NASA GIBS is primarily a visualization/tile service.** It serves map imagery through services such as WMTS/WMS/TMS and supports time dimensions for imagery layers. It is excellent for a basemap or contextual satellite-image layer. It should not be treated as a replacement for the underlying numerical scientific data used to calculate a trend.

For calculations, we need the actual gridded observations/model values (or an appropriate analytical data service), including metadata, units, time coordinates, spatial coordinates, and quality/fill-value information.

NASA Harmony provides access and transformation services across supported EOSDIS DAAC holdings; its documentation recommends Harmony-Py for programmatic use. Whether it is suitable depends on the exact collection supplied by the challenge.

NASA POWER offers analysis-ready temporal data and supports formats including JSON, CSV, and NetCDF for documented services. It can be useful for prototypes or a compatible fallback, but it must not be substituted for the official challenge dataset without checking the challenge rules and source requirements.

## 2.16 Reference O — NASA VEDA and its Next.js experiment

**VEDA UI:** [NASA-IMPACT/veda-ui](https://github.com/NASA-IMPACT/veda-ui) · **Next.js experiment:** [NASA-IMPACT/next-veda-ui](https://github.com/NASA-IMPACT/next-veda-ui)

VEDA (Visualization, Exploration, and Data Analysis) is a NASA Earth-data exploration experience. The `veda-ui` repository is a React frontend for a dashboard that explores data and supports configurable content. Its repository currently states that it is in maintenance mode and accepts bug fixes/blockers rather than new features or large refactors. The repository lists Apache-2.0 licensing.

The separate `next-veda-ui` repository is explicitly a beta/unsupported test of using Next.js with VEDA UI components and the U.S. Web Design System. Its README warns about lack of active ownership and dependency vulnerabilities. It is not a production-ready starter.

### What to study

- How a geospatial data portal organizes story pages, datasets, maps, metadata, and reusable visualization components.
- The boundary between reusable dashboard UI and content/configuration.
- How an established public-sector design system can support consistent forms, navigation, and accessible controls.
- How Next.js can be composed with geospatial visualization components, while recognising that the experiment is unsupported.

### Limitations and reuse rules

- The VEDA UI is in maintenance mode; inspect the exact commit and dependency versions before relying on its patterns.
- The Next.js experiment is unsupported and should not be copied as our foundation. Use it only to understand integration boundaries and inspect its dependency/security caveats.
- Apache-2.0 for `veda-ui` permits reuse subject to its terms and notices; check the actual LICENSE file and each dependency/asset. The Next.js experiment lists MIT, but its dependencies and assets still require separate review.
- Do not adopt USWDS wholesale unless its visual language fits our product; use it as an accessibility and interaction reference.

**Verdict:** VEDA is one of the most relevant NASA product references for scientific data exploration. Its Next.js experiment is useful precisely because it exposes integration trade-offs—not because it is a ready-made scaffold.

---

## 2.17 Additional Earth-observation data providers and tools collected from an earlier hackathon

The following links were supplied by the team from a previous hackathon. Keep them in the research register as **candidate Earth-observation providers and geospatial tools**, not as confirmed resources for the current NASA challenge. They may help with future dataset discovery, imagery context, land-cover context, and AOI preparation. Their presence here does not mean that the challenge requires them, that the team has access to every product, or that each source is suitable for a long-term statistical trend.

### Multispectral imagery and catalogues

| Resource | What it is useful for | Potential value to this project | Important limitations / checks |
|---|---|---|---|
| [Sentinel-2 / Copernicus Data Space](https://dataspace.copernicus.eu/) | Multispectral optical imagery and associated catalogue/download/processing services. | Candidate for vegetation, water, land-surface, and change indicators derived from spectral bands (e.g. NDVI or water indices) when a suitable time series can be built. | Cloud cover, acquisition gaps, product level, atmospheric correction, resolution, compositing, and cross-date harmonisation matter. Copernicus exposes several APIs; STAC is one catalogue route and is not itself the imagery. Check the current catalogue coverage and quotas. |
| [Microsoft Planetary Computer](https://planetarycomputer.microsoft.com/) | Cloud-hosted catalogue and access to multiple Earth-observation/environmental datasets through STAC and data assets. | Useful for dataset discovery and cloud-native access; the catalogue includes examples such as Sentinel-2 and Landsat. | The public STAC API can be queried anonymously, but data access can be throttled and some asset access patterns use SAS tokens. Inspect each collection's licence, asset format, and availability. |
| [Landsat (NASA mission site)](https://landsat.gsfc.nasa.gov/) | Mission information, science context, and access pathways for the Landsat record. | Especially interesting when a longer historical optical record is useful for land-cover, surface, vegetation, or water indicators. | The operational data archive/download services are primarily provided through USGS systems such as EarthExplorer and cloud distribution. Confirm the exact Landsat collection, processing level, scale factors, and access route. |
| [USGS EarthExplorer](https://earthexplorer.usgs.gov/) | Search and download portal for Landsat and many other satellite, aerial, land-cover, and elevation datasets. | Useful for searching by AOI, place, date range, and dataset; can help compare scene availability before committing to a workflow. | It is a portal, not a single dataset/API contract. Programmatic access, bulk download, account requirements, and formats vary by product. |
| [Planet](https://www.planet.com/) | Commercial Earth-observation imagery and derived products, including high-resolution and frequently updated imagery. | Potentially useful for detailed local change studies if an eligible open/public dataset or event-provided access is available. | Do not assume the full archive is free or openly accessible. Many products are commercial and require an account, subscription, quota, or specific licence. Check redistribution and hackathon-use rights. |
| [Planet Developers](https://developers.planet.com/) | Planet developer documentation and APIs for catalog search, orders, data access, and related services. | Useful only if the project later selects a Planet collection and the team has appropriate credentials/permissions. | Requires API authentication for relevant services; access, quotas, product availability, and terms vary. Never put API keys in browser code or public repositories. |

### Hyperspectral data

| Resource | What it is useful for | Potential value to this project | Important limitations / checks |
|---|---|---|---|
| [Planet STAC / open data](https://www.planet.com/data/stac/) | A Planet data/STAC discovery entry point supplied by the team. | Worth checking for relevant open collections and for learning STAC-style item/asset discovery. | Do not assume the page means every Planet archive is open. Planet's developer documentation describes its STAC service as beta and authenticated; confirm the exact collection, endpoint, account requirements, and licence before planning around it. |
| [EnMAP](https://www.enmap.org/) | German hyperspectral Earth-observation mission and data access portal. | Useful for detailed spectral characterisation of vegetation, minerals, water, and other surface properties; could support a focused case study. | Hyperspectral products are specialised and acquisition coverage/revisit may not provide the regular, long time series needed for a broad trend product. Check product level, scene coverage, and user registration. |
| [EnMAP EOC Geoservice](https://geoservice.dlr.de/) | DLR Earth Observation Center service for access to EnMAP and other EO products, including Analysis Ready Data pathways. | Possible programmatic/product-download route if EnMAP is selected. | Registration and acceptance of data terms are required; current access rules may require an institutional/company affiliation or an exemption. Verify the current policy before relying on access during the event. |

### Land-cover reference data

| Resource | What it is useful for | Potential value to this project | Important limitations / checks |
|---|---|---|---|
| [ESA WorldCover data access](https://esa-worldcover.org/en/data-access) | Global land-cover maps and related composites at approximately 10 m resolution for the published 2020 and 2021 products. | Useful as contextual data, an ROI stratification layer, or a land-cover mask when interpreting environmental trends. | **Do not treat the 2020 and 2021 maps as a clean annual land-cover change time series.** ESA notes that the two maps used different algorithm versions, so apparent differences include both real land-cover change and algorithm change. Annual composites described on the page also cover only 2020 and 2021. Check the current product versions, licence, and required attribution. |

### STAC and geospatial APIs

| Resource | What it is useful for | Potential value to this project | Important limitations / checks |
|---|---|---|---|
| [Microsoft Planetary Computer STAC API](https://planetarycomputer.microsoft.com/api/stac/v1) | STAC API endpoint for querying collections and spatiotemporal assets in the Planetary Computer catalogue. | Useful for catalogue search by collection, geometry, time range, and asset metadata; a candidate source-discovery path. | STAC search returns catalogue metadata and asset links; it does not automatically perform our complete scientific trend analysis. Read collection-specific access, signing, and licence instructions. |
| [STAC specification](https://stacspec.org/) | Open specification for describing geospatial assets and collections with spatial/temporal metadata. | A good candidate for a provider-neutral dataset discovery contract. A frontend catalogue can display STAC-derived metadata without hardcoding one provider's schema. | STAC is a metadata/catalogue specification, not a satellite mission, dataset, processing engine, or guarantee that assets are free/open. STAC API capabilities/extensions differ between implementations. |

### Geospatial authoring utility

| Resource | What it is useful for | Potential value to this project | Important limitations / checks |
|---|---|---|---|
| [geojson.io](https://geojson.io/) | Browser-based utility for drawing, viewing, editing, importing, and exporting spatial features such as points, lines, and polygons. | Excellent reference/tool for understanding GeoJSON and preparing test AOIs. It can help the team create valid sample polygons for frontend and map testing. | Treat it as a research/authoring utility, not a runtime dependency. Our own Next.js map should provide the required AOI selection/drawing experience, using a suitable map drawing library if needed. Validate geometry, CRS, and coordinate order when importing GeoJSON. |

### How these sources fit the actual challenge

These sources are especially relevant to **multispectral/hyperspectral image exploration and land-cover context**. The challenge also needs variables with a sufficiently long, analysable time series. A satellite scene archive is not automatically a ready-made monthly time series: scenes may need cloud masking, atmospheric correction, compositing, index calculation, gap handling, and cross-sensor harmonisation before trend analysis.

For a first implementation, prioritise a source that provides a consistent variable and temporal coverage appropriate to the question. Regular gridded products or model/reanalysis datasets may be easier for the required time-series/statistical workflow than raw high-resolution imagery. Optical imagery can still provide a compelling spatial context or a specialised derived-variable case study when the time coverage supports it.

**Frontend implication:** do not integrate all these providers into the browser now. Build a provider-neutral source/collection explorer that can display a source name, instrument/product, data type, temporal coverage, spatial coverage, processing level, access status, licence/attribution, and a link to the official catalogue. Real catalogue queries and downloads belong behind a later backend or trusted server-side data client. Never expose private Planet, Copernicus, or other provider credentials in client-side code.

---

# 3. What We Should Build

## 3.1 Product structure

A focused web application with four principal workspaces:

1. **Discover** — search and understand datasets and variables.
2. **Investigate** — select the period and geographic region; inspect coverage and data quality.
3. **Analyze** — create time series, calculate rates, test significance, and inspect spatial trends.
4. **Explain / Export** — present a transparent scientific summary and export evidence.

## 3.2 Main user journey

1. User opens the investigation workspace.
2. User searches for a variable or browses by Earth-system category: land, ocean, atmosphere, hydrology, cryosphere, etc.
3. User selects a dataset/variable and sees its definition, unit, source, coverage, temporal resolution, and spatial resolution.
4. User selects a region using one of the supported methods: named region, map-drawn rectangle, polygon, or point.
5. User selects a date range that overlaps the dataset's true temporal coverage.
6. The system validates that data exist for the selected combination.
7. A future data/analysis service (backend technology TBD) extracts/subsets the selected data and creates a time series using a documented aggregation method. The current frontend uses a mock implementation of this contract.
8. The application displays the time series and map of the selected variable or derived trend.
9. User selects an analysis mode: linear trend, non-parametric trend, or seasonal trend when supported.
10. The results panel displays direction, slope, units, confidence interval, test statistic, p-value, corrected significance when applicable, sample count, missingness, and caveats.
11. User can compare a second region, period, or compatible dataset.
12. User exports a report and/or data products with the method and source metadata attached.

## 3.3 Proposed feature set and priority

### P0 — Must work for a valid end-to-end challenge submission

- Dataset and variable metadata catalogue.
- Variable selection.
- Region selection.
- Date-range selection.
- Data ingestion from at least the official challenge source(s).
- Data validation and coverage feedback.
- Time-series generation.
- Interactive time-series visualization.
- Linear rate-of-change estimate with clear units.
- Statistical significance test.
- A clear result explanation and source attribution.
- Reproducible configuration / method display.

### P1 — High-value features if time and data support them

- Per-grid-cell spatial trend map.
- Multi-region comparison.
- Multi-variable comparison only when units and scientific meanings make it valid.
- Monthly/seasonal analysis.
- Deseasonalized view or seasonal Mann–Kendall test where methodologically appropriate.
- Multiple-testing correction for map-wide or many-variable testing.
- Data-quality and missing-value coverage panel.
- Download of CSV/JSON/GeoJSON and a compact PDF/HTML report.
- A guided demonstration using clearly labelled synthetic data.

### P2 — Optional polish, only after P0 is stable

- 3D globe mode.
- A short guided data story for a selected finding.
- A question-answer assistant that explains already-computed results and links to evidence.
- Additional data catalogues beyond the official package.
- Advanced animations or heavy map effects.

### Explicitly out of scope for the first release

- Building a new climate model.
- Making future climate predictions.
- Training an ML model merely to add an AI feature.
- Supporting every NASA mission or every Earth-system variable.
- Building a custom authentication platform.
- Replacing the statistical engine with an LLM.

---

# 4. Technical Stack — Frontend Chosen, Backend Provisional

The frontend framework is selected. The backend choice must be deferred until the official data and team capabilities are known; Python-based scientific tooling is listed as one candidate, not the default commitment.

## 4.1 Frontend — Next.js is the chosen framework

**Decision: use Next.js with the App Router, React, and TypeScript. Do not scaffold this project with Vite.** Use the current stable Next.js release available when the repository is created; do not pin a canary release for a hackathon product.

For a new frontend, start from the official generator and select TypeScript, App Router, Tailwind CSS, ESLint, and a `src/` directory. The exact prompts/flags can change between releases, so prefer the current generator rather than copying an old starter template:

```bash
npx create-next-app@latest frontend
```

| Technology | Role | Why it is recommended | Implementation notes |
|---|---|---|---|
| **Next.js App Router** | Main web framework, routing, layouts, server rendering, route handlers | Gives the project a coherent application structure, server/client component model, navigation, metadata, and deployment path. | Use App Router. Keep pages/layouts server-first; add client boundaries only for interactive map, chart, timeline, and controls. |
| **React + TypeScript** | UI and typed component contracts | Mature ecosystem and strict contracts across complex panels. | Enable strict TypeScript. Avoid `any` for data contracts. |
| **Tailwind CSS + CSS variables** | Styling and tokens | Speeds implementation without requiring a prebuilt visual theme. | Define our own tokens in CSS variables. Do not accept generated default theme styling without design review. |
| **Radix UI Primitives** | Accessible low-level controls | Provides behaviour/accessibility for dialogs, tabs, popovers, sliders, menus, etc., while leaving visual identity to us. | Use primitives, not a wholesale unmodified theme. |
| **shadcn/ui (selectively)** | Editable component starting points | Components are copied into the project and can be modified. | Use only when useful; do not let the default shadcn dashboard look become the design. Strip/rework default radius, spacing, shadows, colors, and layout. |
| **MapLibre GL JS** | Main interactive 2D map | Open map renderer with vector/raster tile support and no mandatory Mapbox runtime dependency. | Select the basemap/tile provider only after checking terms, attribution, rate limits, and keys. |
| **deck.gl** | High-volume geospatial overlays | GPU-accelerated layers for grids, points, polygons, contours, heatmaps, and other spatial data. | Add only the layers required by the selected dataset. Test performance with representative grid sizes. |
| **Apache ECharts** | Time-series and analytical charts | Rich interactions and flexible chart types; supports custom styling and large datasets. | Build a shared scientific chart theme. Do not use its defaults without tuning. |
| **TanStack Query (optional)** | Client-side API cache and request lifecycle | Useful if multiple panels request/refetch the same analysis or dataset metadata. | Add only if the fetch/state needs justify it; do not use it as a substitute for URL-addressable investigation state. |
| **Zustand (optional)** | Shared transient investigation state | A lightweight state store when map, chart, and inspector need coordinated client state. | Keep shareable inputs in URL search params where practical; avoid unnecessary global state. |
| **Storybook** | Component workbench and visual review | Lets the team review map controls, legends, charts, empty states, and loading/error states in isolation. | Add stories for important visual states; optionally use screenshot-based visual tests. |
| **Playwright** | End-to-end and screenshot testing | Verifies real navigation and interactions and captures consistent screenshots for review. | Use stable demo fixtures and fixed viewport sizes for visual comparisons. |

### Next.js rendering boundaries

- Use **Server Components** for the application shell, static documentation, dataset catalogue pages where possible, metadata, and server-side calls that do not require browser APIs.
- Use **Client Components** for MapLibre, deck.gl, ECharts, drawing tools, brush/zoom interactions, local panel state, and any component that requires browser APIs.
- Load WebGL/map/chart components with a client-only boundary or `next/dynamic` where server-side rendering is unsuitable. Do not allow `window`, `document`, WebGL, or canvas dependencies to execute during server rendering.
- Use Next.js Route Handlers only if later needed for thin application endpoints, secure proxying, or upload coordination. They are not a substitute for a suitable scientific processing service.
- Do not run large NetCDF decoding, raster processing, long statistical loops, or heavy spatial analysis inside a short-lived Next.js request handler.
- Keep NASA credentials and provider secrets server-side. Never expose private tokens through `NEXT_PUBLIC_*` variables.
- Use URL query parameters for a shareable investigation state (dataset, variable, time range, ROI identifier/geometry reference, method) when practical.

**Official guidance:** [Next.js App Router documentation](https://nextjs.org/docs/app), [installation guide](https://nextjs.org/docs/app/getting-started/installation), and [Vercel React Best Practices skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices).

## 4.2 Backend and scientific-computing options — provisional, not selected

**No backend framework or hosting architecture is approved yet.** This section is a shortlist for later evaluation, not a requirement to implement now. The frontend workstream should proceed independently using typed contracts and mock data.

| Candidate | Potential role | Why it may fit | What must be checked before choosing |
|---|---|---|---|
| **Python + FastAPI** | Scientific API and orchestration | Strong ecosystem for xarray, rasterio/rioxarray, NumPy, SciPy, statsmodels, NetCDF, and geospatial processing. | Team experience, deployment constraints, file sizes, long-running jobs, authentication, and whether the official data requires Python-specific tooling. |
| **.NET 10 + DuckDB** | API, data services, and analytical storage | Demonstrated in a public same-challenge project; clean separation can be effective for a team experienced in C# and analytical SQL. | Team familiarity, geospatial/scientific library coverage, integration cost, and whether DuckDB is useful for the chosen data. |
| **Next.js Route Handlers / Node service** | Thin BFF, proxy, upload coordination, and lightweight metadata endpoints | Convenient near the frontend and useful for web-specific orchestration. | Not a default location for heavy NetCDF/raster processing or long statistical computations. It may still call a separate scientific service. |
| **Managed geospatial processing service** | Data access or processing if official resources provide it | Could avoid building infrastructure when a provider offers a suitable API or hosted processing environment. | Provider limits, coverage, authentication, licensing, reproducibility, cost, and whether numeric values needed for trend analysis are accessible. |

### Candidate scientific libraries (only if the eventual backend uses Python)

| Technology | Possible role | Evaluation note |
|---|---|---|
| xarray | N-dimensional labelled arrays | Strong fit for gridded time × latitude × longitude datasets. |
| NumPy / Pandas | Numerical and tabular processing | Broadly useful, but avoid copying large rasters into ordinary tables unnecessarily. |
| SciPy / statsmodels | Statistical tests, regression, diagnostics | Choose methods based on the data's statistical properties, not library availability. |
| pymannkendall | Mann–Kendall variants | Verify exact test variant and assumptions. |
| netCDF4 / h5netcdf | NetCDF reading | Select based on the actual file encoding. |
| rasterio / rioxarray | GeoTIFF and raster metadata | Add only if required by the selected products. |
| DuckDB + Parquet | Optional analytical storage | Evaluate only if query patterns and data volume justify it; DuckDB is not mandatory. |
| Dask / Zarr | Lazy and chunked processing | Add only if measured data size or performance requires it. |

## 4.3 Architecture decision — frontend fixed, backend deliberately open

**Fixed now:** Next.js App Router + React + TypeScript for the web frontend.

**Not fixed now:** backend framework, language, processing runtime, database, job queue, and hosting.

The first deliverable is a complete, polished frontend that can run independently with realistic, clearly labelled synthetic fixtures. The frontend should communicate through an API-agnostic data-client interface. During development, that interface will use a local mock implementation; later, it can be replaced by an HTTP implementation for whichever backend is selected without rewriting the screens.

Recommended boundary:

```text
Next.js App Router UI
        │
        ▼
Typed frontend contracts + data-client interface
        │
        ├── MockEarthDataClient (current phase)
        │
        └── HttpEarthDataClient (later, after backend decision)
                    │
                    ▼
          Backend / data services (TBD)
                    │
                    ▼
          Data adapters + processing + science
```

Why this is the right current decision:

- The frontend owner can make progress immediately without waiting for dataset or backend decisions.
- Mock data can exercise all states and interactions without pretending to be official NASA observations.
- The backend can change later without forcing the map, charts, variable explorer, or investigation workflow to be rebuilt.
- The same-challenge .NET/DuckDB example demonstrates that a backend other than FastAPI is plausible; FastAPI remains a candidate, not a commitment.
- Heavy scientific processing should ultimately run in a suitable service/runtime, but the exact technology should be chosen from evidence after the official data is inspected.

### Frontend-first deliverables — current owner

| Module | Build now | How it works without the backend |
|---|---|---|
| App shell and navigation | Next.js routes, workspace layout, navigation, responsive behaviour | Static configuration and local state |
| Dataset/source explorer | Search, filters, dataset cards, source details, coverage and access metadata | Curated metadata fixtures; clearly mark connection status as unconnected/demo |
| Variable explorer | Categories, definitions, units, variable selection | Typed variable catalogue fixture |
| Investigation setup | Dataset/variable selection, region tools, date range, URL-shareable state | Deterministic local options and sample regions |
| Map workspace | Map, layer controls, legends, ROI selection/drawing, coordinate readout | Local GeoJSON and synthetic raster/grid previews, labelled DEMO |
| Time-series and analysis views | Charts, trend panel, method explanation, diagnostics, confidence/uncertainty display | Synthetic time series with known behaviour; result badges show DEMO / NOT OFFICIAL |
| Findings and export experience | Provenance panel, method notes, export UI, shareable finding view | Mock result objects; no claim of scientific validation |
| Quality/design system | Tokens, reusable components, accessibility, Storybook, Playwright visual checks | Frontend-only tests and deterministic fixtures |

**Frontend acceptance rule:** every screen must work with the mock provider and gracefully handle loading, empty, invalid selection, error, and no-coverage states. Do not hard-code any provider's API response shape into visual components.

### Suggested frontend data-client boundary

```ts
export interface EarthDataClient {
  listDatasets(): Promise<DatasetSummary[]>;
  getDataset(datasetId: string): Promise<DatasetDetail>;
  listVariables(datasetId: string): Promise<VariableMetadata[]>;
  getPreview(request: InvestigationRequest): Promise<InvestigationPreview>;
  runAnalysis(request: AnalysisRequest): Promise<AnalysisResult>;
}

// Current phase: deterministic local fixtures, visibly labelled SYNTHETIC / DEMO.
export class MockEarthDataClient implements EarthDataClient { /* implementation */ }

// Later phase: adapter to whichever backend/API is selected.
export class HttpEarthDataClient implements EarthDataClient { /* implementation */ }
```

The example types are illustrative and should be refined from the UI's actual needs. Keep the UI dependent on this interface, not on a guessed backend framework or provider SDK.

## 4.4 Deployment — frontend first; backend later

- **Current phase:** run and test the Next.js application locally. A preview deployment may be used for design review, but do not expose credentials or imply that official data is connected.
- **Frontend hosting:** Vercel is a natural candidate for Next.js, but the final choice should consider event-demo reliability, server/client requirements, and availability. The host must support the Next.js features actually used.
- **Backend hosting:** intentionally undecided. Choose after the backend implementation and data-processing requirements are known.
- **Local development:** Docker Compose is not required for the first frontend-only milestone. Add it later if the selected backend and data services need coordinated startup.
- **CI now:** lint, TypeScript checks, frontend unit/component tests, Playwright smoke tests, and Next.js production build. Add backend checks only after a backend exists.
- **Fallback:** maintain a deterministic offline demo and a short screen recording in case event Wi-Fi, hosting, or external data services are unreliable.

Deployment is not part of the scientific proof. The first milestone is a robust frontend demo; scientific integration comes later.

# 5. Data-Agnostic Architecture — The Most Important Engineering Decision

## 5.1 Core design rule

**The frontend and statistical engine must not depend on the original file format or provider.**

All providers and uploads should be converted into a single normalized internal representation. A new official dataset should require a new or adjusted data adapter, not a rewrite of the map, charts, or analysis methods.

During the current frontend-only milestone, this normalized model is represented by TypeScript contracts and deterministic local fixtures. The backend-side normalizer/adapters will be implemented later, after the official resource is inspected and the backend stack is selected.

## 5.2 Architecture flow

```text
                  OFFICIAL DATA (to be announced / supplied)
                  ├── Downloadable scientific files
                  ├── NASA data service / API
                  └── User-provided resource URL or archive
                                   │
                                   ▼
                         DATA SOURCE ADAPTERS
                  ├── SyntheticDemoAdapter (pre-hackathon only)
                  ├── NetCDFAdapter
                  ├── CSVAdapter (only when metadata is sufficient)
                  ├── GeoTIFFAdapter (if required)
                  └── OfficialProviderAdapter (implement after data release)
                                   │
                                   ▼
                       INGESTION + VALIDATION
                  ├── Inspect metadata and coordinates
                  ├── Identify variables and units
                  ├── Validate time and spatial coverage
                  ├── Handle fill values / quality flags
                  ├── Check coordinate ordering and CRS
                  └── Record data provenance
                                   │
                                   ▼
                     NORMALIZED SCIENTIFIC MODEL
                  xarray Dataset / DataArray
                  dimensions: time, lat, lon (or documented equivalents)
                  coordinates + values + units + metadata + quality mask
                                   │
                   ┌───────────────┴────────────────┐
                   ▼                                ▼
             SPATIAL SUBSETTING              TEMPORAL PROCESSING
             ROI / grid cells                monthly / daily / annual
                   │                                │
                   └───────────────┬────────────────┘
                                   ▼
                        SCIENTIFIC ANALYSIS ENGINE
                  ├── Time-series extraction
                  ├── Linear regression / slope
                  ├── Mann–Kendall / seasonal MK
                  ├── Sen's slope
                  ├── Autocorrelation diagnostics
                  ├── Multiple-testing correction
                  └── Confidence intervals / diagnostics
                                   │
                                   ▼
                      RESULT + PROVENANCE INTERFACE
                          (backend technology TBD)
                                   │
                                   ▼
                     NEXT.JS INVESTIGATION FRONTEND
                  Map + time series + trend layer + methods + export
```

## 5.3 Normalized data model

The normalized model should preserve at least:

| Field | Meaning |
|---|---|
| `dataset_id` | Stable internal identifier. |
| `dataset_title` | Human-readable dataset name. |
| `provider` | NASA DAAC, mission, model, or other official provider. |
| `collection_id` | Official collection/product identifier, when supplied. |
| `variable_id` | Machine-readable variable name in the source. |
| `variable_name` | Human-readable variable name. |
| `long_name` / `description` | Variable meaning. |
| `standard_name` | CF standard name when available. |
| `units` | Original physical units; never omit. |
| `time` | Time coordinate with documented calendar and frequency. |
| `latitude`, `longitude` | Spatial coordinates where applicable. |
| `crs` | Coordinate reference system/projection information. |
| `values` | Numeric observations/model values. |
| `fill_value` / `nodata` | Missing-data marker(s). |
| `quality_flags` | Quality information where available. |
| `temporal_resolution` | Hourly, 3-hourly, daily, monthly, etc. |
| `spatial_resolution` | Native grid/pixel resolution, with caveats. |
| `temporal_coverage` | Start and end time actually available. |
| `spatial_coverage` | Bounding box, geometry, or coverage description. |
| `source_url` | Stable provider/source URL. |
| `citation` | Required dataset acknowledgement/citation. |
| `retrieved_at` | Retrieval timestamp. |
| `processing_history` | Subsetting, aggregation, unit conversion, filtering, and resampling steps. |

Do not assume every product has a simple `time, lat, lon` cube. Some products may be swath-based, point observations, vertical profiles, irregular grids, or model ensembles. The adapter must identify the source geometry and either normalize it safely or report that the selected product is not supported by the current analysis path.

## 5.4 Example internal dataset manifest

The following is a conceptual manifest, not a claim about the official data package:

```json
{
  "dataset_id": "demo_temperature_monthly",
  "title": "Synthetic Monthly Near-Surface Temperature",
  "provider": "DEMO_SYNTHETIC",
  "source_kind": "synthetic",
  "variable": {
    "id": "t2m",
    "name": "Near-surface air temperature",
    "units": "degC",
    "description": "Synthetic values for testing only"
  },
  "temporal": {
    "start": "2000-01-01",
    "end": "2025-12-01",
    "frequency": "monthly"
  },
  "spatial": {
    "representation": "regular_lat_lon_grid",
    "crs": "EPSG:4326",
    "resolution_degrees": 1.0
  },
  "provenance": {
    "is_synthetic": true,
    "citation": "Demo-only generated dataset; not NASA data"
  }
}
```

## 5.5 Data modes

The application must have two unmistakably different modes:

### Demo mode

- Uses deterministic synthetic fixtures.
- Includes at least one spatially varying variable and a time series with trend, seasonality, noise, and optional missing values.
- Has known ground-truth trend parameters so tests can verify the analysis engine.
- Displays a permanent visible label: **SYNTHETIC DEMO DATA — NOT REAL OBSERVATIONS**.
- Can be used offline and must load without a NASA login or network connection.

### Official-data mode

- Activated only after a real source is configured and validated.
- Displays the provider, exact dataset/product, variable, units, data period, grid resolution, and source citation.
- Never silently falls back to synthetic data if official data fail to load.
- On failure, show an explicit error and preserve the source-selection state.
- All analysis results include real source provenance and processing parameters.

---

# 6. Data Ingestion Plan and Hackathon-Day Readiness

## 6.1 What we can complete before the data arrives — frontend-first

**Current execution focus: the Next.js frontend.** The person responsible for the frontend should be able to complete the primary user experience without a final backend, official dataset, provider credentials, or live scientific API.

### Build now (frontend scope)

- Build the Next.js App Router application shell, routes, responsive workspace, and navigation.
- Define frontend TypeScript interfaces for datasets, variables, regions/AOIs, time series, analysis requests, trend results, provenance, and errors.
- Implement a `MockEarthDataClient` with deterministic local fixtures and keep an `HttpEarthDataClient` boundary for later.
- Complete the dataset/source explorer, variable explorer, region/time setup, map workspace, time-series panel, analysis-result view, and provenance presentation.
- Create realistic loading, empty, error, offline, invalid-geometry, and no-coverage states.
- Use local GeoJSON and clearly labelled synthetic grid/series previews for interaction and screenshot testing.
- Build the UI so real backend response values can be injected later without redesigning the component tree.
- Test the full user journey with mock responses, including selection changes, linked map/chart state, filters, export presentation, and responsive behaviour.
- Create a short backend decision record listing candidate stacks and the evidence still needed; do not implement the backend now.

### Defer until the backend/data workstream begins

- Production ingestion adapters for NetCDF, GeoTIFF, STAC, or provider APIs.
- Server-side metadata inspection and data validation.
- Actual ROI subsetting and time-series extraction from scientific files.
- Authoritative trend calculations and statistical tests.
- Provider authentication, credential handling, and data downloads.
- Production caching, long-running jobs, database/storage selection, and backend deployment.

Synthetic analysis-result objects may be used to demonstrate how the UI will present outputs, but they must be labelled `DEMO / SYNTHETIC` and must not be described as scientifically validated results from real observations.

## 6.2 What must wait for the official challenge resources

- Final mission/product/collection selection.
- Exact variable names and meanings.
- Final supported file formats and access methods.
- Authentication flow and whether Earthdata Login is needed.
- Data period, resolution, CRS, scale factors, offsets, and quality flags.
- Any source-specific preprocessing required by the challenge data.
- Final scientific demonstration region and the claims we make from the real data.

## 6.3 Hackathon-day data integration checklist

When the data is announced or supplied:

- [ ] Download the official challenge resource instructions and record the URL.
- [ ] Identify the provider, DAAC, mission/model, collection ID, and version.
- [ ] Read the data dictionary and product documentation before analysis.
- [ ] Confirm the variable name, long name, units, scale factor, offset, fill value, and quality flags.
- [ ] Inspect the time coordinate, calendar, interval, missing periods, and start/end dates.
- [ ] Inspect the coordinate system, grid orientation, longitude convention, spatial resolution, and coverage.
- [ ] Confirm whether the resource is numerical data or only a rendered visualization layer.
- [ ] Check whether Earthdata Login, tokens, or other credentials are required.
- [ ] Select/implement the matching adapter.
- [ ] Run ingestion validation and produce a metadata/coverage report.
- [ ] Run the known analysis tests on the adapter output where possible.
- [ ] Run the first real-data analysis and independently spot-check sample values.
- [ ] Replace demo data in the UI with the real-data provider without changing the scientific result components.
- [ ] Update the source citations and data acknowledgements in the app and submission.
- [ ] Keep demo mode available as a fallback, but never represent it as the official result.

## 6.4 Data-access cautions

- Earthdata Login is a separate account/access system. Test account access and required authorisations before the event if the likely data source needs them.
- NASA Harmony supports transformations for supported EOSDIS collections, but not every dataset or format is guaranteed to be accessible through the same route.
- NASA GIBS map tiles are excellent for visual context. Do not reverse-engineer numerical trend values from coloured tile pixels.
- NASA POWER can be a convenient time-series source for supported meteorological/solar parameters, but its own service limits and product provenance must be checked. Do not assume it satisfies challenge-specific source requirements.
- Do not place credentials, access tokens, or personal account information in Git commits or frontend bundles.

---

# 7. Scientific Analysis Engine

This is the intellectual core of the application. The UI must display the method and assumptions, not just a green/red “significant” badge.

## 7.1 Minimum analysis output

For a selected variable, region, and time range, the engine should return:

- Trend direction: increasing, decreasing, or no clear evidence of monotonic trend.
- Estimated slope and units, such as `°C / decade` or `mm / year`.
- Confidence interval for the slope where supported.
- Selected statistical test and test statistic.
- Raw p-value.
- Adjusted p-value or q-value when multiple testing is performed.
- Significance threshold used (e.g. alpha = 0.05).
- Number of valid observations and the temporal interval used.
- Missing-value count/fraction.
- Autocorrelation diagnostic and any correction applied.
- Seasonal handling choice.
- Data source, variable, region, and processing provenance.
- Warnings about limitations and insufficient coverage.

## 7.2 Recommended methods

### A. Linear regression (baseline)

Fit a linear model to a time series:

`value(t) = intercept + slope * time + error`

Use this for an intuitive trend line and a parametric estimate of the rate of change. Report the slope in meaningful units. If the x-axis uses months, convert the slope correctly to units/year or units/decade.

Return slope, standard error, confidence interval, t-statistic, p-value, sample count, and basic model diagnostics.

**Important:** the OLS slope is sensitive to outliers and assumptions about residuals. It is a useful baseline, not the only method.

### B. Mann–Kendall test

A non-parametric test for a monotonic trend. It is useful when normality assumptions for a simple regression test are questionable, but serial dependence and seasonality still matter.

Return S, variance (with tie correction where appropriate), Z, p-value, and the exact test variant.

### C. Sen's slope / Theil–Sen estimator

A robust slope estimator based on the median of pairwise slopes. Report the physical units per year or decade and the method used to calculate it.

### D. Seasonal Mann–Kendall

For a time series with a recurring seasonal cycle (e.g. monthly data), a seasonal method may be more appropriate than applying a basic test to the raw series. Preserve month/season grouping. Do not claim that seasonality has been handled unless the selected method actually does so.

### E. Autocorrelation diagnostics

Environmental time series often contain serial dependence. Test for it and document the strategy. Depending on data and assumptions, possible methods include trend-free pre-whitening or other validated approaches. Do not apply a correction mechanically without understanding its effect on the trend and variance.

### F. Multiple-testing correction

A map may contain hundreds or thousands of local trend tests. Applying `p < 0.05` independently to every cell can produce false positives. When performing many tests, define the family of tests and apply a correction such as Benjamini–Hochberg false-discovery rate (FDR), then display raw and adjusted significance separately.

### G. Confidence intervals

Show uncertainty around the slope, not only a point estimate. Confidence intervals should match the method and assumptions used. Do not label a confidence interval as a “95% confidence interval” unless that is actually what the backend calculated.

## 7.3 Seasonality and annual aggregation

The challenge explicitly notes that regular cycles can obscure trends. Our UI should therefore support, when the data frequency permits:

- Raw time series.
- Annual aggregation.
- Monthly/seasonal grouping.
- Deseasonalized series or a seasonal trend test.

Do not automatically remove seasonality without informing the user. Keep the raw series accessible and document the transformation.

## 7.4 Spatial aggregation

When creating a regional mean from a latitude/longitude grid, do not blindly take an unweighted arithmetic mean if grid-cell areas differ with latitude. Use an area-weighted mean or the appropriate native cell-area weights when available. For a regular geographic grid, cosine-latitude weighting can be a practical approximation, but prefer supplied cell areas for a production-quality result.

For spatial trend maps:

- Compute per-cell trends only where enough valid time points exist.
- Show cells with insufficient data as no-data, not as zero trend.
- Keep the data's native resolution visible in the legend or metadata.
- Do not interpolate a coarse result to a finer grid in a way that implies new scientific information.
- If the region includes land and ocean or multiple data masks, respect the product's valid-data mask.

## 7.5 Opposing trends

The application should be able to reveal that the same variable is increasing in one part of a region and decreasing in another. A regional average may cancel these effects out.

The product should therefore expose:

- An area-averaged trend.
- A per-cell trend map, where the data supports it.
- A summary of the number/percentage of valid cells with positive, negative, and statistically supported trends.
- A warning when regional aggregation hides spatially opposing behaviour.

## 7.6 Scientific interpretation rules

- Statistical significance is not the same as practical importance.
- A trend is not proof of causation.
- A small p-value does not mean the effect is large.
- A non-significant trend is not proof that no change exists.
- A short record may be underpowered to detect a real trend.
- A model/reanalysis grid cell is not automatically a direct station measurement.
- Spatial resolution, temporal resolution, data quality, and missingness affect interpretation.
- Never invent a causal explanation unless supported by cited scientific evidence.
- AI-generated explanations, if introduced, must be grounded in the calculated result and its metadata, and must clearly distinguish interpretation from measured fact.

---

# 8. User Experience and Visual Design Direction

## 8.1 Design goal

The website must feel like a modern scientific instrument / cartographic research workspace. It should be visually distinctive, polished, restrained, and credible. It should not look like a generic AI startup landing page or a copied dashboard template.

The interface should feel designed around the actual task: selecting a variable, inspecting a region, reading a time series, and understanding statistical evidence.

## 8.2 Visual direction

**Working design language: “Scientific Cartographic Workbench.”**

Recommended qualities:

- Editorial and precise, rather than futuristic for its own sake.
- Clear typography with strong information hierarchy.
- Real data visualisation as the visual centre of the application.
- Thin borders, restrained surfaces, intentional whitespace, and precise alignment.
- A neutral, content-first workspace. Do not assume the entire product must be dark because it is about satellites or space; test a light scientific workbench and use a darker map canvas only when it improves layer contrast.
- A restrained, data-semantic palette: neutral ink/surface colors for the application, a consistent accent for selection, and properly designed sequential/diverging scales for scientific values. Do not select colors solely because they look futuristic.
- Typography with a deliberate voice. Evaluate families such as IBM Plex Sans, Source Sans 3, or another legible family; use a tabular/monospaced face only for values where it improves alignment. The final selection must be justified by real screenshots and readability tests.
- Small, consistent icons used only when they communicate an action or state.
- A distinctive visual signature should come from cartographic detail, information hierarchy, carefully designed plots, and precise interactions—not decorative gradients, glow, or a forced space aesthetic.

Typography is a decision to test, not a default to copy. Do not automatically choose Inter/Roboto/Arial just because an agent commonly reaches for them. Use the Next.js font optimization path (`next/font`) where appropriate and verify the final font's licensing and loading behaviour.

## 8.3 Explicitly avoid generic AI design patterns

Do **not** default to:

- Purple/blue gradient backgrounds.
- Large glowing orbs, blurred blobs, neon glows, or decorative stars.
- Glassmorphism panels everywhere.
- Excessive translucent floating cards.
- Generic “AI-powered” hero sections as the main product experience.
- A chat box as the centre of the application.
- Robot, sparkle, brain, or wand icons used as decoration.
- Repeated rounded cards with identical content hierarchy.
- Oversized headings that waste space in an analytical application.
- Random decorative charts that are not connected to real data.
- The same three-column rounded-card layout on every route.
- Marketing-page hero sections inside the actual investigation workbench.
- Generic status badges that colour every ordinary metadata field.
- All-caps micro-labels above every heading and repeated eyebrow text.
- Hover scale/bounce effects on every button, card, or panel.
- Fake metrics, fabricated map legends, or meaningless animations.
- A 3D globe merely because it looks impressive.

The word “AI” should not dominate the product identity. The value is reliable scientific analysis.

## 8.4 Design skills and anti-generic-UI guardrails for coding agents

These resources should be installed or included in the team's agent instructions before the first serious UI implementation. They are **guidance and review tools, not a guarantee** that an agent will produce a good design. The team must still inspect the generated UI in a browser and reject generic results.

| Skill / repository | What it contributes | How our team should use it | Limitation / caution |
|---|---|---|---|
| [Anthropic `frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Forces an intentional visual direction, contextual design choices, typography, hierarchy, and critique rather than defaulting to a template. | Primary creative-design brief before a new page or major redesign. Ask the agent to state the proposed art direction before coding. | It is a broad skill, not a scientific-cartography design system. The project's own constraints in this blueprint take precedence where there is a conflict. |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Searchable UI/UX guidance, design styles, palettes, typography, responsive/accessibility rules, chart recommendations, and stack-specific suggestions including Next.js. | Use as a reference catalogue and UX checklist. Ask it for 2–3 evidence-based options, then choose one design direction for this product. | Do **not** let it automatically select a generic SaaS/dashboard preset or copy a ready-made template. Review optional scripts and permissions before installing anything beyond the skill content. |
| [No Slop UI](https://github.com/LeoStehlik/no-slop-ui) | Explicit banned-pattern list, agent snippets, and a review checklist for glassmorphism, gradient abuse, fake metric cards, oversized rounding, vague copy, and decorative effects. | Use as a mandatory pre-merge visual audit for every major screen. Read `SKILL.md`, `references/banned-patterns.md`, and `examples/review-checklist.md`. | It is a rule set, not a component library or a substitute for accessibility/usability review. |
| [Avoid AI Design](https://github.com/funboy322/avoid-ai-design) | A skill for detecting and rewriting generic AI design tells in HTML/CSS/React/Tailwind/shadcn interfaces. | Optional second-opinion audit on a completed screen; use detection-only mode first, then decide which recommendations to apply. | Do not stack conflicting style instructions blindly. Read its current skill and license before adding it to the agent toolchain. |
| [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) | Performance and implementation rules for React and Next.js, including async waterfalls, bundle size, server-side performance, and rendering. | Use during component implementation and code review. | This is an engineering-performance skill, not an art-direction skill. |
| [Vercel Web Design Guidelines](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Audits UI code against accessibility, interaction, typography, animation, and performance guidelines. | Run as a final code audit on the important pages/components, then fix actual violations. | A code audit cannot judge the whole visual concept; pair it with screenshot critique and usability checks. |
| [Vercel Composition Patterns](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) | React composition guidance for flexible, maintainable components and avoiding boolean-prop overload. | Use when refactoring shared map/chart/control components or complex panels. | Engineering guidance, not a visual-design system. |
| [Next.js official docs and agent skills](https://github.com/vercel/next.js) | Version-aligned guidance for the Next.js framework and App Router. | Prefer official docs for the exact installed version; inspect the current `skills/` directory and install only relevant official skills. | Do not follow old Next.js advice from unrelated tutorials when it conflicts with the installed version's docs. |

### Suggested skill installation commands

Run these from the project root using the skills CLI. The CLI's agent flags and install paths can change, so check `npx skills --help` and inspect the generated files after installation.

```bash
# Intentional, distinctive visual design
npx skills add anthropics/skills --skill frontend-design -a codex

# Broad UI/UX reference; use the CLI's selection prompt to choose only relevant design/UI skills
npx skills add nextlevelbuilder/ui-ux-pro-max-skill -a codex

# React/Next.js engineering and performance guidance
npx skills add vercel-labs/agent-skills --skill react-best-practices -a codex

# Final UI code audit: accessibility, interaction, typography, motion, and performance
npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a codex

# Component composition patterns for maintainable React architecture
npx skills add vercel-labs/agent-skills --skill composition-patterns -a codex

# Check what is available in the official Next.js skill collection before installing anything from it
npx skills add vercel/next.js -a codex
```

For No Slop UI, clone and inspect the repository, then reference its skill and checklist from `AGENTS.md`:

```bash
git clone --depth 1 https://github.com/LeoStehlik/no-slop-ui.git research-library/agent-skills/no-slop-ui
```

For Avoid AI Design, inspect the current `SKILL.md` and license before copying its skill into the team's agent-skill directory:

```bash
git clone --depth 1 https://github.com/funboy322/avoid-ai-design.git research-library/agent-skills/avoid-ai-design
```

### Required agent workflow for visual reverse engineering

Before implementing a page or major component, the coding agent must complete this sequence:

1. Read the project's `DESIGN_SYSTEM.md`, `DESIGN_DECISIONS.md`, and this blueprint's Section 8.3.
2. Read the relevant installed skills: `frontend-design`, `no-slop-ui`, `avoid-ai-design`, and the relevant Vercel review skill. Do not assume they are installed; check the actual files.
3. Open at least two selected reference products and inspect their real interaction states. Use the repository source for implementation details and the browser for visual behaviour.
4. Capture screenshots at the same viewport and record route, state, date, and data context. Compare geometry and information hierarchy, not just colour.
5. Ask the agent to produce a short `REFERENCE_NOTES.md` with: pattern observed, evidence/source file, why it works, limitation, and how our implementation will differ.
6. Produce an original low-fidelity layout and design rationale before writing polished components.
7. Implement one vertical slice, run it locally, and capture Playwright screenshots. The agent must inspect its own screenshots and list defects before declaring completion.
8. Run `web-design-guidelines` against the relevant files and the No Slop UI checklist against the rendered result. Fix issues rather than merely reporting them.
9. Keep an `AI_DESIGN_AUDIT.md` entry for each major screen: detected generic patterns, changes made, screenshot paths, accessibility checks, and reviewer approval.

The agent must not claim that it has reverse-engineered a reference if it only read the README. It must cite concrete source paths, functions, screenshots, or interactions in its notes.

### Priority order when skills disagree

1. This project's scientific correctness, challenge requirements, privacy, accessibility, and data provenance.
2. The existing project's own design tokens and documented design decisions.
3. The product-specific design brief in this blueprint.
4. `frontend-design` for distinctive art direction and composition.
5. `no-slop-ui` / `avoid-ai-design` for generic-pattern detection and critique.
6. UI UX Pro Max as a searchable reference catalogue.
7. Component library defaults only as low-level implementation aids.

Do not install every skill globally by default. Install at project scope, read the skill files, review dependencies and scripts, and keep only the guidance that improves the work.

## 8.5 Suggested application layout

Desktop concept:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ BRAND / WORKSPACE       Dataset status • Current investigation • Export     │
├───────────────┬───────────────────────────────────────┬─────────────────────┤
│ VARIABLE      │                                       │ INVESTIGATION       │
│ EXPLORER      │           LARGE INTERACTIVE MAP       │ INSPECTOR           │
│               │                                       │                     │
│ Search        │  ROI polygon / selected grid / layer  │ Variable metadata   │
│ Categories    │  trend raster / coverage / legend     │ Source and units    │
│ Variables     │                                       │ Coverage / quality  │
│ Filters       │                                       │ Analysis options    │
├───────────────┴───────────────────────────────────────┴─────────────────────┤
│ TIME SERIES / TREND PANEL                                                   │
│ Observations • fitted trend • confidence band • date range • event markers │
├─────────────────────────────────────────────────────────────────────────────┤
│ RESULT SUMMARY: slope • direction • significance • method • caveats        │
└─────────────────────────────────────────────────────────────────────────────┘
```

This is a structural concept, not a pixel-perfect mockup. The final proportions should be tested with real and demo data.

### Main areas

1. **Top bar:** product identity, current dataset/source status, active investigation, export, and settings.
2. **Left panel:** variable/dataset discovery, filters, categories, saved selections.
3. **Central map:** the dominant spatial workspace, with selection tools and a clear legend.
4. **Right inspector:** variable description, units, coverage, quality, source, ROI details, analysis options.
5. **Bottom temporal panel:** interactive time series, trend overlay, confidence interval, date controls, and comparison.
6. **Results strip/panel:** statistical findings, method, caveats, provenance, and export.

The map, chart, and result panel must share one investigation state. Changing the variable, ROI, or time range should update the dependent views consistently.

## 8.6 Information hierarchy

Make the main result easy to understand in this order:

1. What variable and region were analysed?
2. What direction is the trend?
3. How large is the rate of change and in what units?
4. Is the evidence statistically significant?
5. What test and corrections were used?
6. How much data supports the result?
7. What are the limitations?

Avoid hiding critical scientific qualifications behind a tooltip.

## 8.7 Map and chart design rules

- Always show units in legends and axes.
- Keep no-data visually distinct from zero.
- Use continuous sequential palettes for quantities and diverging palettes for signed trends/anomalies.
- Use colorblind-aware scales; do not encode important meaning by red/green alone.
- A trend scale centred on zero should visually distinguish positive and negative slopes symmetrically where scientifically appropriate.
- Show native grid/pixel resolution and avoid false spatial precision.
- Keep selected ROI boundaries visually obvious.
- Make the time-series crosshair and map selection communicate with each other where useful.
- Provide a table or accessible textual summary for chart values.
- Do not animate data in a way that hides missing observations or creates a false sense of continuity.

## 8.8 Responsive behaviour

Desktop is the main scientific workstation, but the site must remain usable on tablets and mobile devices:

- On tablet, allow the variable explorer and inspector to collapse.
- On mobile, use sequential panels/tabs rather than compressing every panel into a narrow column.
- Prioritise the selected result and time series on small screens.
- Keep essential controls accessible without horizontal scrolling.

---

# 9. Proposed Application Pages and Interactions

## 9.1 Routes

Suggested initial routes:

- `/` — product entry / resume last investigation.
- `/explore` — main scientific workbench.
- `/datasets` — dataset catalogue and metadata.
- `/methods` — statistical methods and interpretation guide.
- `/about/sources` — data sources, acknowledgements, and licensing.

Do not create many empty routes at the beginning. The core `/explore` experience has priority.

## 9.2 Discover panel

Must support:

- Text search by variable name, keyword, and scientific term.
- Filter by Earth-system category.
- Display units and a concise definition.
- Display source, coverage period, spatial/temporal resolution, and data type.
- Distinguish satellite observations, model output, and reanalysis.
- Flag unsupported variables/formats rather than pretending they are ready.

## 9.3 Region selection

Potential selection modes (enable only when supported by the chosen map/data source):

- Click a point.
- Draw a rectangle/bounding box.
- Draw a polygon.
- Select a named predefined geography.
- Enter coordinates.

For every selection show its exact coordinates/geometry and the number of valid grid cells or observations available.

## 9.4 Time range selection

- Start and end dates must be inside the selected product's coverage.
- The temporal frequency must match the actual product.
- Show the number of expected and valid time steps.
- Warn if the range is too short for the selected analysis.
- Do not silently resample daily data to monthly or monthly data to annual.
- If resampling is offered, show the aggregation method and the effect on sample count.

## 9.5 Analysis panel

Provide method choices only when the data and sampling frequency support them. Examples:

- Linear trend (OLS).
- Mann–Kendall + Sen slope.
- Seasonal Mann–Kendall for suitable seasonal data.
- Raw vs deseasonalized/seasonally adjusted view.

Display a method explanation and assumptions close to the result.

## 9.6 Export

At minimum, export:

- CSV of extracted/aggregated time series.
- JSON metadata and analysis configuration.
- PNG/SVG chart where feasible.
- A concise PDF or HTML report if time permits.

Every export must include dataset citation, variable, units, ROI, time range, processing choices, analysis method, software/version information where practical, and the synthetic/real data status.

---

# 10. Frontend Data Contracts and Future API Proposal

**This is an interface proposal only, not a final backend specification.** During the current frontend-first phase, implement a typed data-client interface and a local mock provider. The example endpoints below are placeholders to guide future integration; the selected backend may use different routes, protocols, or job patterns. Revisit them after the official data formats and backend owner/technology are known.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | Health check. |
| `GET` | `/api/v1/datasets` | List registered datasets and availability. |
| `GET` | `/api/v1/datasets/{dataset_id}` | Dataset metadata and coverage. |
| `GET` | `/api/v1/datasets/{dataset_id}/variables` | Variables supported by the dataset. |
| `POST` | `/api/v1/ingest/validate` | Validate an uploaded file or configured source. |
| `POST` | `/api/v1/ingest/upload` | Upload a supported file (with strict size/type limits). |
| `POST` | `/api/v1/subset` | Request data subset by variable, ROI, and time range. |
| `POST` | `/api/v1/timeseries` | Extract time series using a documented spatial aggregation method. |
| `POST` | `/api/v1/analysis/trend` | Run the selected trend method and diagnostics. |
| `GET` | `/api/v1/analysis/{analysis_id}` | Retrieve a saved result and provenance. |
| `GET` | `/api/v1/analysis/{analysis_id}/export` | Export result data/report. |

### API design requirements

- If the eventual backend uses FastAPI, Pydantic is a natural option for request/response validation; otherwise use the schema/validation system native to the selected backend.
- Return structured validation errors, not generic stack traces.
- Return units and provenance with numeric results.
- Include an analysis configuration/version so results can be reproduced.
- Do not return huge raw arrays to the browser when a derived raster/tile or compact series is sufficient.
- Add server-side request size limits and timeouts.
- Keep long-running ingestion/analysis asynchronous only if the data volume requires it; do not introduce a task queue without need.

---

# 11. Proposed Repository Structure

A monorepo is recommended so the team can coordinate the frontend, backend, data fixtures, docs, and tests in one place.

```text
project-root/
├── frontend/                       # Next.js App Router web application
│   ├── src/
│   │   ├── app/                    # App Router layouts, pages, loading/error states
│   │   │   ├── (workspace)/
│   │   │   │   ├── explore/
│   │   │   │   ├── datasets/
│   │   │   │   └── methods/
│   │   │   ├── about/
│   │   │   └── api/                 # Thin Route Handlers/proxies only
│   │   ├── components/
│   │   │   ├── shell/
│   │   │   ├── map/                 # Client-only MapLibre/deck.gl surfaces
│   │   │   ├── charts/              # Client-only ECharts components
│   │   │   ├── variables/
│   │   │   ├── analysis/
│   │   │   ├── controls/
│   │   │   └── shared/
│   │   ├── features/
│   │   │   ├── discover/
│   │   │   ├── investigate/
│   │   │   ├── analyze/
│   │   │   └── export/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/                # API-agnostic data client; mock implementation first, HTTP adapter later
│   │   ├── stores/                  # Only necessary transient client state
│   │   ├── styles/                  # Design tokens and global styles
│   │   └── types/                   # Shared frontend contracts
│   ├── public/
│   ├── e2e/                          # Playwright end-to-end tests
│   ├── .storybook/                   # Optional Storybook configuration
│   └── package.json
│
├── backend/                        # Future placeholder; framework TBD. This example subtree applies only if Python/FastAPI is later selected.
│   ├── app/
│   │   ├── api/v1/              # Example FastAPI routes (only if that option is selected)
│   │   ├── core/                # Settings, logging, errors
│   │   ├── schemas/             # Example Pydantic contracts (only if FastAPI is selected)
│   │   ├── catalog/             # Dataset/variable metadata
│   │   ├── ingestion/
│   │   │   ├── adapters/        # NetCDF, CSV, official provider, demo
│   │   │   ├── validation/
│   │   │   └── normalization/
│   │   ├── processing/          # ROI, time aggregation, unit handling
│   │   ├── analytics/
│   │   │   ├── regression.py
│   │   │   ├── mann_kendall.py
│   │   │   ├── sen_slope.py
│   │   │   ├── seasonality.py
│   │   │   ├── autocorrelation.py
│   │   │   └── multiple_testing.py
│   │   ├── exports/
│   │   └── services/
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
│
├── data/
│   ├── demo/                    # Small deterministic fixtures only
│   ├── manifests/               # Dataset manifests / metadata
│   └── .gitkeep
│
├── docs/
│   ├── PROJECT_BLUEPRINT.md
│   ├── DATA_DICTIONARY.md
│   ├── STATISTICAL_METHODS.md
│   ├── DATA_PROVENANCE.md
│   ├── DESIGN_SYSTEM.md
│   ├── API_CONTRACTS.md
│   └── HACKATHON_DAY_CHECKLIST.md
│
├── research/
│   ├── REFERENCES.md            # Links, findings, license notes
│   ├── screenshots/             # Original reference screenshots for private study
│   └── comparison-matrix.md
│
├── scripts/
│   ├── generate_demo_data.py
│   └── validate_dataset.py
│
├── .github/workflows/
├── .agents/skills/                  # Reviewed project-scoped agent skills
├── AGENTS.md                        # Project instructions for Codex/agents
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

Do not commit large reference-project clones, real user credentials, private tokens, or large scientific data files into the main repository. Keep reference checkouts outside the production source tree or in a clearly ignored research directory.

---

# 12. Reverse-Engineering Research Library

The team may download/clone reference projects into a local research library for inspection. This is for study, not for blindly merging code.

## 12.1 Suggested local layout (frontend-first)

```text
research-library/
├── README.md
├── sources/
│   ├── nasa-earth-trend-detective/   # same challenge, inspect license first
│   ├── orion-space/                  # same challenge, MIT + upstream notices
│   ├── pyclimaexplorer/               # MIT according to README
│   ├── climate-dashboard/             # all-rights-reserved; study only
│   ├── earth-globe/                   # MIT according to README; check data licenses
│   ├── watcher-earth-trend-detective/ # educational-use wording; verify licence
│   ├── trend_detective/                    # MIT; check dataset-specific licences
│   └── tiefer-lab/                    # team-linked lab repository; inspect status/licence
├── screenshots/
│   ├── nasa-giovanni/
│   ├── nasa-sea-level-dat/
│   ├── orion-space/
│   └── reference-websites/
├── agent-skills/
│   ├── no-slop-ui/                  # Visual guardrail reference
│   └── avoid-ai-design/             # Optional visual audit reference
├── notes/
│   ├── architecture-review.md
│   ├── ui-patterns.md
│   ├── data-ingestion-review.md
│   ├── statistical-methods-review.md
│   └── license-register.md
└── comparison-matrix.csv
```

The `research-library/` folder should be outside the deployable application. Add it to `.gitignore` if it contains full clones or large screenshots.

## 12.2 Clone commands

Run these from a separate research folder:

```bash
mkdir -p research-library/sources research-library/agent-skills
cd research-library/sources

git clone --depth 1 https://github.com/nasa-earth-detectives/nasa-earth-trend-detective.git
git clone --depth 1 https://github.com/MD-Mushfiqur123/orion-space.git
git clone --depth 1 https://github.com/reshmiee/PyClimaExplorer.git
git clone --depth 1 https://github.com/lukaskreibig/climate-dashboard.git
git clone --depth 1 https://github.com/blauewelt/earth.git
git clone --depth 1 https://github.com/Watcher-ux/Earth-Trend-Detective.git
git clone --depth 1 https://github.com/Team-Error-404/Earth-System-Trend-Detective.git
git clone --depth 1 https://github.com/tiefer-labs/lab.git
git clone --depth 1 https://github.com/NASA-IMPACT/veda-ui.git nasa-veda-ui
git clone --depth 1 https://github.com/NASA-IMPACT/next-veda-ui.git next-veda-ui

# Agent skills and UI guardrails (small, directly useful checkouts)
git clone --depth 1 https://github.com/LeoStehlik/no-slop-ui.git ../agent-skills/no-slop-ui
git clone --depth 1 https://github.com/funboy322/avoid-ai-design.git ../agent-skills/avoid-ai-design

# Optional code-level references; inspect docs/examples before cloning entire repositories
# Next.js and Storybook are large: use their official docs/source browser unless a file-level audit is needed.
# UI primitives
git clone --depth 1 https://github.com/radix-ui/primitives.git

# Geospatial / visualization libraries
git clone --depth 1 https://github.com/maplibre/maplibre-gl-js.git
git clone --depth 1 https://github.com/visgl/deck.gl.git
git clone --depth 1 https://github.com/apache/echarts.git

# Scientific data / climate analysis references
git clone --depth 1 https://github.com/pydata/xarray.git
git clone --depth 1 https://github.com/Ouranosinc/xclim.git
git clone --depth 1 https://github.com/earthaccess-dev/earthaccess.git
git clone --depth 1 https://github.com/mmhs013/pyMannKendall.git
```

These repositories are for inspection; clone only the portions that matter and do not import their full dependency trees into our app. Large framework repositories may be inspected through GitHub/docs without cloning. Official NASA web tools do not need to be cloned. Study their public UI and user guides.

## 12.3 Required review procedure for every reference

For each repo, produce a one-page review with:

1. What the product does (only what can be verified).
2. Main user journeys.
3. Screenshots at desktop and, if possible, mobile widths.
4. Folder structure and major modules.
5. Data source and file formats.
6. Data model / schema.
7. How region selection works.
8. How the time series is extracted and aggregated.
9. Which statistical methods are actually implemented.
10. How missing values, units, seasonality, and autocorrelation are handled.
11. How charts and maps communicate their data.
12. Dependencies and external services.
13. Test coverage and build/deployment process.
14. License and third-party notices.
15. What we will learn, what we will not copy, and why.

Do not conclude that a method exists from a screenshot or README alone. Locate the actual source implementation and tests.

## 12.4 Visual reverse-engineering protocol

The goal is to learn the design logic and implementation patterns of existing projects—not to copy their screenshots or produce a superficial clone.

For each selected reference (at minimum: NASA Giovanni, NASA Sea Level DAT, Orion Space, the same-challenge NASA Earth Trend Detective, Arctic Climate Story, Trend Detective, and one well-built geospatial UI):

1. **Capture the real product:** open the working site/repository; capture desktop (1440×900) and tablet/mobile screenshots where supported. Record the route, state, viewport, and date. Do not treat a GitHub README banner as a full product review.
2. **Map the user journey:** write the exact steps for variable selection, region selection, time filtering, data loading, chart interaction, analysis, and export.
3. **Inspect interaction states:** selected/hover/focus/disabled, loading, no data, failed request, invalid ROI, missing coverage, and completed analysis.
4. **Inspect layout geometry:** sidebar widths, panel ratios, chart heights, typography scale, spacing rhythm, legend position, map controls, and responsive collapse behaviour.
5. **Inspect component structure:** identify page/layout boundaries, reusable controls, chart/map components, query/state management, API clients, and loading/error boundaries.
6. **Inspect visual encoding:** axes, scales, bins, units, colour semantics, selected-region highlighting, no-data treatment, uncertainty, and chart-map linking.
7. **Inspect technical strategy:** how map layers are loaded, how large arrays are transferred, how data are cached, how interaction events update the UI, and how accessibility is supported.
8. **Record strengths and failures:** distinguish the reference's actual working behaviour from planned features or README claims.
9. **Extract a pattern, not an asset:** describe reusable principles in our own words. Do not copy branding, images, proprietary icons, screenshots, large code blocks, or distinctive page compositions unless the licence clearly permits it and attribution is preserved.
10. **Make an original design decision:** explain what we learned, what we intentionally reject, and how our interface will differ.

### Browser and visual tooling

- [Playwright](https://playwright.dev/) for repeatable screenshots, real interaction tests, and viewport checks.
- [Storybook](https://storybook.js.org/) for isolating components and documenting states before assembling the full workbench.
- [Storybook Visual Tests](https://storybook.js.org/docs/writing-tests/visual-testing) or an equivalent screenshot comparison workflow for catching unintended UI changes.
- Browser DevTools for inspecting layout, accessibility tree, network requests, and performance. Only inspect public behaviour or source code that is lawfully available; do not bypass authentication or scrape private endpoints.
- Keep reference screenshots in the private `research-library/screenshots/` directory with URL, capture date, and viewport metadata. Do not place reference screenshots in the submitted product as decorative assets.

### Required outputs from the reverse-engineering phase

- `research/REFERENCE_AUDIT.md`: reference-by-reference findings, with strengths, weaknesses, and source links.
- `research/USER_FLOW_COMPARISON.md`: workflow comparison across at least three references.
- `docs/DESIGN_SYSTEM.md`: our own tokens and component rules.
- `docs/DESIGN_DECISIONS.md`: why the final direction was selected and what generic patterns were rejected.
- `research/REFERENCE_NOTES.md`: source-backed reverse-engineering notes for each chosen UI/repository.
- `research/AI_DESIGN_AUDIT.md`: detected generic patterns, screenshot links, fixes, and review sign-off for each major screen.
- A screenshot review sheet for the first working `/explore` screen.

## 12.5 Licensing and reuse register
| Reference | License status observed during this review | Reuse rule |
|---|---|---|
| nasa-earth-detectives/nasa-earth-trend-detective | No clear root-level license was visible in the repository listing reviewed. | Treat as all-rights-reserved until a license is confirmed or permission is obtained. Study architecture and workflows. |
| orion-space | Repository states MIT; it is built on the MIT-licensed God's Eye View project and retains upstream notices. | Reuse only after reading its LICENSE and upstream notices; preserve required copyright/license notices and inspect all dependencies. |
| PyClimaExplorer | README states MIT. | Read the actual LICENSE file and preserve its notice when reusing code. |
| climate-dashboard / Arctic Climate Story | README states “All rights reserved.” | Do not copy code, assets, CSS, or screenshots without permission. Use as visual inspiration only. |
| blauewelt/earth | README states MIT; data sources have individual licences/attributions. | Code reuse may be possible under MIT; every dataset and imagery source still needs its own licence/credit review. |
| Watcher-ux/Earth-Trend-Detective | README says “open source for educational purposes”; no standard licence was established in the reviewed text. | Study only until a clear licence or permission is confirmed. |
| Team-Error-404/Earth-System-Trend-Detective | MIT licence is exposed in the repository; each data source has its own terms/credits. | Code reuse may be possible under MIT; preserve notices and do not reuse source data outside its terms. |
| tiefer-labs/lab | Not established in this review. | Study only until repository contents and licence are inspected. |
| NASA Giovanni / NASA Sea Level DAT | Official NASA services/tools; not a general open-source code licence statement for copying application code. | Use as workflow and scientific UX references. Follow NASA service/data terms and acknowledgements. |

**Important:** re-check each repository's current `LICENSE`, asset licences, data licences, and dependency licences at the time of reuse. A repository-level license does not automatically license third-party datasets, logos, imagery, or every asset shown in the project.

## 12.6 Reverse-engineering questions for the coding assistant

When the team points an AI coding assistant at the downloaded research library, instruct it to:

- Inspect code and documentation read-only first.
- Compare the reference implementations and report exact file paths/functions for relevant behaviour.
- Distinguish implemented features from planned features and README claims.
- Identify reusable algorithms separately from UI code.
- Check license files before suggesting code reuse.
- Produce a comparison matrix and implementation recommendation.
- Never copy entire components or large sections of code without an explicit license review.
- Never copy reference screenshots/assets into our submitted project unless permitted.
- Propose an original implementation that fits our architecture and visual language.

---

# 13. Instructions for AI Coding Agents (Codex / Cursor / Other Agents)

This section is intended to be given to the coding assistant as project-level instructions after the repository is created.

## 13.1 General working rules

1. Read this blueprint, `AGENTS.md`, the installed design skills, and the current repository before changing files.
2. Confirm the current branch and working tree; never overwrite existing work without inspecting it.
3. Use Next.js App Router, React, and TypeScript for the web application. Do not switch to Vite or create a standalone SPA unless the team explicitly changes this decision.
4. Do not assume a backend has been selected. During the current phase, build the frontend against typed mock contracts. Once selected, keep authoritative scientific algorithms in an appropriate backend/service; do not implement them as frontend business logic or hide heavy processing in Next.js Route Handlers.
5. Build in small, testable increments. Do not generate the entire application in one giant code dump.
4. Do not fabricate APIs, NASA datasets, mission IDs, measurements, scientific results, or citations.
5. Do not use synthetic values in production mode.
6. Keep the data provider, normalized model, science engine, API, and UI separated.
7. Use type-safe interfaces and explicit error states.
8. Do not introduce a dependency unless its role is clear and the team accepts it.
9. Do not build a 3D globe before the 2D map, variable workflow, time series, and statistical core work.
10. Do not add AI chat or prediction features unless the core challenge requirements are already satisfied.
11. Run lint, typecheck, unit tests, and build after meaningful changes.
12. Document assumptions and unresolved issues instead of guessing.

## 13.2 UI-generation rules — avoid generic AI patterns

Before generating a major interface:

1. Read the `frontend-design` and `no-slop-ui` instructions (and the relevant UI UX Pro Max guidance if installed).
2. Inspect the reference screenshots and the actual source code for at least two relevant references. Record what was learned; do not simply copy a layout.
3. Write a short, specific art-direction brief for this project. The brief must identify audience, primary task, visual hierarchy, palette logic, typography rationale, and one memorable but functional design signature.
4. Show 2–3 distinct design directions in words or low-fidelity wireframes, compare them, and choose one. Do not jump directly to the first generated layout.
5. Define a small token system for colours, typography, spacing, borders, map overlays, legends, charts, and interaction states.
6. Design the actual `/explore` working screen first, not a marketing landing page or fake dashboard.
7. Build with realistic synthetic data that is explicitly labelled as demo data; do not invent scientific findings or decorate the screen with fake KPIs.
8. Capture browser screenshots at agreed desktop and mobile widths, inspect them, and revise. A generated page is not complete until the screenshot review checklist passes.
9. Ensure every panel supports a real task or presents real metadata/results.

Never produce a generic AI-generated dashboard consisting of a purple gradient, blurred glowing blobs, glass cards, a large hero headline, a generic assistant/chat panel, and repeated rounded statistic cards.

Prefer a bespoke cartographic research interface with a clear map, variable explorer, time-series panel, restrained controls, precise labels, and strong data hierarchy. Every visual element must have a functional purpose.

## 13.3 Quality bar

A component is not complete because it renders. It is complete when:

- It works with deterministic demo data.
- It handles empty, loading, error, and no-coverage states.
- It is keyboard-accessible where applicable.
- It has sensible responsive behaviour.
- It uses the shared design tokens.
- It displays correct units and labels.
- It does not use fake scientific values or decorative placeholder charts.
- It does not rely on generic AI patterns listed in Section 8.3.
- It has been reviewed in a real browser at desktop and mobile viewports.
- Its spacing, typography, map controls, legends, empty states, and chart layout are consistent with our design tokens.
- It has tests for important logic and visual regressions where practical.

## 13.4 Root `AGENTS.md` starter instructions

Create a root `AGENTS.md` containing a concise, durable version of the rules below. Link to this blueprint rather than copying the entire document into the agent file.

```md
# Project-wide instructions

Before changing code, read:
- docs/PROJECT_BLUEPRINT.md
- docs/DESIGN_SYSTEM.md (once created)
- .agents/skills/frontend-design/SKILL.md (if installed)
- the No Slop UI SKILL.md and review checklist (if installed)
- the relevant reference audit for the feature being changed

## Product and architecture
- The web app uses Next.js App Router, React, and strict TypeScript.
- The backend framework is not selected yet. The current frontend must work with a mock data provider and typed contracts.
- When a backend is selected, authoritative analysis belongs in a suitable server-side scientific/data-processing service, not in browser components. Do not use Next.js Route Handlers for heavy raster/NetCDF processing or long statistical calculations.
- Keep data adapters, normalized data contracts, analysis, and UI separate.
- Do not invent datasets, observations, API endpoints, citations, units, or statistical results.
- Synthetic data must be visibly labelled DEMO / SYNTHETIC and can never be passed off as NASA observations.

## Design and reverse engineering
- Before a major UI task, inspect at least two relevant references and record what was learned.
- Build an original scientific cartographic workbench; do not clone a reference product or copy proprietary assets/code.
- Avoid generic AI/SaaS patterns: decorative gradients/glows, glass panels, generic hero sections inside the workbench, fake KPI cards, vague copy, and repeated identical rounded cards.
- Use our design tokens. Every component must support a real task or display meaningful metadata/results.
- Capture and review Playwright screenshots at desktop and mobile widths after major visual changes.
- Read the anti-slop checklist and report any unresolved visual issues.

## Quality gates
- During the frontend phase, run lint, TypeScript checks, frontend unit/component tests, Playwright checks, and the Next.js production build. Add tests for the selected backend only after it exists.
- Test loading, empty, error, no-coverage, and successful states.
- Keep keyboard accessibility, readable contrast, responsive layouts, and reduced-motion support.
- Do not claim completion until the tested behaviour and screenshots support it.
```

## 13.5 AI-generated explanations

If a scientific assistant is later implemented:

- It must read from the saved analysis result and metadata, not independently invent numeric values.
- It must quote the exact analysis configuration and data source.
- It must distinguish data, statistical interpretation, and external scientific explanation.
- It must state uncertainty and limitations.
- It must link to sources for any causal/scientific context beyond the computed result.
- If the backend has no valid result, the assistant must say that no analysis is available rather than hallucinate.

---

# 14. Testing and Validation Plan

## 14.1 Demo-data ground-truth tests

Create small deterministic fixtures with known behaviour:

- A clear positive linear trend.
- A clear negative linear trend.
- A no-trend noisy series.
- A strong seasonal cycle with no long-term trend.
- A seasonal series with a trend.
- A series with outliers.
- A series with missing time steps.
- A series with fill values.
- A spatial grid where neighbouring cells have opposing trends.
- A spatial grid with different valid-data coverage.

Test that each method returns sensible results and that the UI shows appropriate warnings.

## 14.2 Backend tests (after backend selection)

- Input metadata validation.
- Coordinate and time parsing.
- Unit preservation and conversion.
- Fill-value and quality-mask handling.
- ROI selection and spatial aggregation.
- Time-series extraction.
- OLS slope and confidence interval.
- Mann–Kendall output.
- Sen slope.
- Seasonal test behaviour.
- Autocorrelation diagnostics/correction branch.
- FDR correction.
- No-data and insufficient-sample handling.
- API schema validation and error responses.

## 14.3 Frontend tests

- Variable search and selection.
- Dataset details and provenance.
- Map region selection.
- Time-range controls.
- Map/chart state synchronisation.
- Analysis-result rendering.
- Synthetic-data warning visibility.
- Real-data failure without silent demo fallback.
- Responsive panels and accessibility.

## 14.4 End-to-end acceptance test

A complete demo must show:

1. Open the application without a network or NASA login.
2. See an unmistakable synthetic-data label.
3. Select a variable.
4. Select a region and date range.
5. Display the time series.
6. Run a trend analysis.
7. Display a slope, units, confidence interval, significance method, and caveats.
8. Show spatially opposing patterns in a known synthetic grid.
9. Export the time series and analysis configuration.
10. Switch to a validated official source later without redesigning the application.

---

# 15. Team Workflow and Responsibilities

Adapt the names and headcount to the actual team. Avoid assigning every person to “help with everything”; each major module needs one owner and one reviewer.

| Workstream | Main responsibilities | Deliverables |
|---|---|---|
| Product / Integration Lead | Challenge compliance, scope, integration decisions, submission narrative, issue tracking | Working product plan, acceptance criteria, final integration |
| **Frontend Lead / UI Engineer (current owner)** | Own the Next.js App Router implementation, visual direction, app shell, variable explorer, map interactions, time-series panel, responsive behaviour, typed mock-data integration, and screenshot-based review | Working Next.js frontend, design system, interaction states, reusable components, frontend tests, and later API integration boundary |
| Data / Backend Engineer (assignment and stack TBD) | After the official resources arrive: inspect datasets, compare backend options, design adapters, metadata, ROI/time extraction, and validation | Backend decision record, data adapters, normalized dataset, provenance metadata |
| Scientific / Statistics Engineer | Statistical methods, diagnostics, test fixtures, scientific interpretation | Tested analysis engine, methods documentation, result validation |
| QA / Demo / Documentation | Test workflows, bug tracking, screenshots, demo script, source credits | QA checklist, pitch/demo, final documentation |

A smaller team can combine roles, but the science logic should still receive an independent review from someone other than its primary author.

## 15.1 Git collaboration

Suggested lightweight workflow:

- `main`: always buildable and demoable.
- Short-lived feature branches: `feat/variable-catalog`, `feat/netcdf-adapter`, `feat/trend-analysis`, etc.
- Pull requests for work that affects shared data contracts or scientific calculations.
- Conventional commits (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`).
- A daily integration checkpoint.
- Keep an issue board with owner, acceptance criteria, and blockers.

Do not over-engineer multiple deployment branches unless the team actually needs them.

---

# 16. Development Roadmap

## Phase 0 — Research and setup (before implementation)

- Read the challenge statement and official resources page.
- Review the references listed in Section 2.
- Download permitted reference repositories into a separate research library.
- Complete the comparison matrix and license register.
- Confirm the team roles and initial stack.
- Create repository, branches, issue board, and project documentation.

**Exit condition:** every team member understands the user journey and the data-pending architecture.

## Phase 1 — Foundation and design system

- Create the Next.js App Router frontend only; do not scaffold a production backend yet.
- Install the reviewed project-scoped agent skills and commit `AGENTS.md` design/code rules.
- Define frontend TypeScript contracts and an API-agnostic data-client interface.
- Create deterministic mock fixtures for datasets, variables, time series, maps, and analysis-result states. Label all mock science as synthetic.
- Build the app shell, design tokens, navigation, and core investigation workspace.
- Build loading, empty, error, no-coverage, and demo-data states.
- Keep a short backend decision record listing candidate options and what evidence is still missing.

**Exit condition:** the Next.js frontend runs locally, the main workspace has an agreed visual direction, all primary screens work with typed mock fixtures, and no backend framework has been prematurely locked.

## Phase 2 — Complete the frontend demo workflow (still frontend-first)

- Populate the interface using deterministic local fixtures for datasets, variables, regions, time-series points, map layers, and example analysis outputs.
- Make the map, selected region, time-series chart, variable controls, and results panel behave as one coherent investigation workspace.
- Implement realistic loading, empty, error, offline, invalid-geometry, and no-coverage states.
- Implement URL-addressable/shareable investigation settings where appropriate.
- Add visual regression screenshots and Playwright flows for the complete frontend journey.
- Review the UI against the reference audit, design tokens, No Slop UI checklist, accessibility requirements, and actual browser screenshots.

**Exit condition:** the frontend can demonstrate the complete intended user journey using clearly labelled synthetic fixtures, without requiring a backend or live data source.

## Phase 3 — Backend and scientific engine (after team decision)

- Inspect the real dataset and its technical documentation before selecting the backend stack.
- Compare the shortlisted backend options against file formats, provider APIs, compute requirements, team experience, deployment, and event-day constraints.
- Select the backend/runtime and write a short Architecture Decision Record (ADR) explaining why.
- Implement the ingestion/normalization pipeline and data adapters for the chosen source(s).
- Implement ROI/time-series extraction and authoritative trend analysis.
- Add the scientifically appropriate methods, diagnostics, validation tests, and spatial analysis.
- Integrate through the agreed typed interface; keep the existing frontend components independent from the backend implementation.

**Exit condition:** the selected service can supply validated, traceable results through the frontend data-client boundary; synthetic fixtures remain available for tests and fallback.

## Phase 4 — Official data integration (after resources arrive)

- Inspect the official resource and product documentation.
- Implement the specific provider/file adapter.
- Validate units, dimensions, time, CRS, quality flags, and coverage.
- Run sample analyses and spot-check values.
- Update source citations and visible provenance.

**Exit condition:** at least one real official dataset works end-to-end and all results are traceable.

## Phase 5 — Polish and submission readiness

- Improve interaction details and responsive behaviour.
- Add report/export.
- Add a guided demo path.
- Verify accessibility and performance.
- Remove unused features and dead code.
- Test local and deployed versions.
- Prepare a short demonstration and technical explanation.

**Exit condition:** the application can be demonstrated reliably and its scientific claims are reproducible.

---

# 17. Performance, Reliability, and Security

## 17.1 Performance

- Never load a full high-resolution global data cube into the browser by default.
- Subset data server-side by variable, time range, and ROI.
- Cache only when the cache key includes dataset/version, variable, ROI, time range, aggregation, and analysis settings.
- Use lazy loading or chunked computation if the official files are large.
- Downsample chart display points for responsiveness while preserving full-resolution values for analysis.
- Render map layers at a defensible resolution and disclose any resampling.
- Keep a small fallback demo fixture available offline.

## 17.2 Reliability

- Do not depend on a single hosted endpoint for the only demo path.
- Log source/provider errors separately from statistical-method errors.
- Return meaningful errors when a dataset does not cover the selected region or time.
- Include a health endpoint and a startup validation check.
- Keep the exact data file/version used for the final analysis identifiable.

## 17.3 Security

- Keep secrets server-side.
- Use `.env.example` with placeholder names only.
- Set upload size limits and supported MIME/extension checks.
- Validate uploaded archives before extraction; protect against path traversal and decompression bombs.
- Never execute uploaded files.
- Avoid storing Earthdata passwords or access tokens in frontend local storage.
- Use HTTPS in deployment.
- Do not commit large files, credentials, or private reference material.

---

# 18. Definition of Done

The project is ready for a credible demonstration only when all required statements below are true:

- [ ] The application starts locally from documented commands.
- [ ] A user can discover and select a variable/dataset.
- [ ] The app displays the data definition, units, provenance, and coverage.
- [ ] A user can select a region and time range.
- [ ] The system checks whether valid data exist for that selection.
- [ ] A time series is generated from the selected data using a documented aggregation.
- [ ] A trend is calculated and its units are correct.
- [ ] Statistical significance is evaluated with an appropriate test.
- [ ] Confidence/uncertainty and key limitations are displayed.
- [ ] Seasonality and autocorrelation are handled or explicitly disclosed where relevant.
- [ ] Multiple testing is addressed for spatial/multiple comparisons.
- [ ] The map and time-series views stay in sync.
- [ ] Demo data are unmistakably labelled as synthetic.
- [ ] Official data are never silently replaced with demo data.
- [ ] Every displayed result can be traced to source and method metadata.
- [ ] The product does not imply greater spatial or temporal resolution than the source.
- [ ] The UI meets the team's non-generic, professional design direction.
- [ ] The team has tested the final demo path and has an offline fallback.

---

# 19. Open Decisions — Intentionally Pending

These items should remain open until the official challenge resources and team constraints are known:

1. Final official dataset(s) and source(s).
2. Exact variables to support in the first release.
3. File formats and API/service access method.
4. Authentication requirements.
5. Actual temporal and spatial coverage.
6. Whether the data are regular grids, swaths, point observations, profiles, or another structure.
7. Final statistical test variants based on the temporal resolution and scientific properties.
8. Final map basemap provider and any required key/licence.
9. Whether a 3D globe is worth the implementation cost.
10. Final hosting choice and deployment secrets.
11. Final product name and visual identity.

Do not resolve these questions by guessing. Record the evidence and decision when the information becomes available.

---

# 20. Source and Reference Link Register

The links below are a research library, not an instruction to install every repository. Prioritise the references that answer a concrete engineering, scientific, design, or communication question. Recheck repository activity, current documentation, licence terms, and data terms before reuse.

## Official challenge and submission context

- [NASA Space Apps Challenge 2026 — Be An Earth System Trend Detective](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/)
- [NASA Space Apps Challenge 2026 main page and submission dates](https://www.spaceappschallenge.org/2026/)

## Same-challenge public projects

- [NASA Earth Trend Detective — nasa-earth-detectives](https://github.com/nasa-earth-detectives/nasa-earth-trend-detective)
- [NASA Earth Trend Detective — TEAM.md](https://github.com/nasa-earth-detectives/nasa-earth-trend-detective/blob/production/TEAM.md)
- [NASA Earth Trend Detective — CONTRIBUTING.md](https://github.com/nasa-earth-detectives/nasa-earth-trend-detective/blob/production/CONTRIBUTING.md)
- [Orion Space — repository](https://github.com/MD-Mushfiqur123/orion-space)
- [Orion Space — trend analysis script](https://github.com/MD-Mushfiqur123/orion-space/blob/main/analysis/trend_analysis.py)
- [Orion Space — statistical analysis README](https://github.com/MD-Mushfiqur123/orion-space/blob/main/analysis/README.md)
- [Orion Space — pitch folder](https://github.com/MD-Mushfiqur123/orion-space/tree/main/public/pitch)
- [Watcher-ux — Earth Trend Detective](https://github.com/Watcher-ux/Earth-Trend-Detective)
- [Tiefer — official team profile](https://www.spaceappschallenge.org/2026/find-a-team/eigenon/)
- [Tiefer — linked lab repository](https://github.com/tiefer-labs/lab)

## NASA tools, APIs, and data access

- [NASA Giovanni](https://giovanni.gsfc.nasa.gov/giovanni/)
- [NASA Giovanni User Guide](https://giovanni.gsfc.nasa.gov/giovanni/doc/UsersManualworkingdocument.docx.html)
- [NASA Sea Level Change Data Analysis Tool](https://sealevel.nasa.gov/data_tools/1)
- [NASA Earthdata Login documentation](https://urs.earthdata.nasa.gov/documentation)
- [NASA GIBS access basics](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
- [NASA GIBS visualization product catalogue](https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/)
- [NASA Worldview](https://worldview.earthdata.nasa.gov/)
- [earthaccess — NASA Earthdata Python client](https://github.com/earthaccess-dev/earthaccess)

**Important distinction:** GIBS is primarily a visualization/tile service. Its pre-rendered map layers are useful for visual context, but they must not be treated as the raw numerical data cube for statistical trend calculations. Use the underlying science product or appropriate data service for numeric analysis.

## Previous application / product references

- [PyClimaExplorer — GitHub](https://github.com/reshmiee/PyClimaExplorer)
- [Arctic Climate Story — GitHub](https://github.com/lukaskreibig/climate-dashboard)
- [Arctic Climate Story — live site](https://arctic.rip)
- [earth — GitHub](https://github.com/blauewelt/earth)
- [earth — live globe](https://blauewelt.github.io/earth/)
- [Trend Detective — GitHub](https://github.com/Team-Error-404/Earth-System-Trend-Detective)
- [Trend Detective — live site](https://error404.earth)
- [Trend Detective — methods](https://github.com/Team-Error-404/Earth-System-Trend-Detective/blob/main/METHODS.md)
- [Trend Detective — architecture](https://github.com/Team-Error-404/Earth-System-Trend-Detective/blob/main/ARCHITECTURE.md)
- [Trend Detective — agent instructions](https://github.com/Team-Error-404/Earth-System-Trend-Detective/blob/main/AGENTS.md)
- [Climate Reanalyzer](https://climatereanalyzer.org/)
- [NASA VEDA UI — GitHub](https://github.com/NASA-IMPACT/veda-ui) (Apache-2.0; maintenance mode)
- [NASA VEDA UI — architecture/setup docs](https://github.com/NASA-IMPACT/veda-ui/tree/main/docs)
- [NASA Next VEDA UI — GitHub](https://github.com/NASA-IMPACT/next-veda-ui) (unsupported beta; study only)
- [Our World in Data Grapher — source repository](https://github.com/owid/owid-grapher) (study only; proprietary licence, no code reuse without permission)
- [Our World in Data Grapher documentation](https://docs.owid.io/projects/grapher/)

## Additional Earth-observation providers and tools collected from a previous hackathon

### Multispectral
- [Sentinel-2 / Copernicus Data Space](https://dataspace.copernicus.eu/)
- [Copernicus Data Space APIs](https://dataspace.copernicus.eu/analyse/apis) — STAC, OData, openEO, Sentinel Hub and processing APIs.
- [Copernicus STAC API documentation](https://documentation.dataspace.copernicus.eu/APIs/STAC.html)
- [Microsoft Planetary Computer](https://planetarycomputer.microsoft.com/)
- [Microsoft Planetary Computer STAC API](https://planetarycomputer.microsoft.com/api/stac/v1)
- [Planetary Computer STAC documentation](https://planetarycomputer.microsoft.com/docs/reference/stac/)
- [Landsat (NASA)](https://landsat.gsfc.nasa.gov/)
- [USGS Landsat Data Access](https://www.usgs.gov/landsat-missions/landsat-data-access)
- [USGS EarthExplorer](https://earthexplorer.usgs.gov/)
- [Planet](https://www.planet.com/)
- [Planet Developers](https://developers.planet.com/)
- [Planet Data Catalog](https://docs.planet.com/data/)

### Hyperspectral
- [Planet STAC / open data](https://www.planet.com/data/stac/)
- [Planet STAC developer documentation](https://docs.planet.com/develop/apis/data/stac/) — currently documented as beta/authenticated; verify before use.
- [EnMAP](https://www.enmap.org/)
- [EnMAP Data Access](https://www.enmap.org/data_access/)
- [DLR EOC Geoservice](https://geoservice.dlr.de/)
- [EnMAP-Box data-access documentation](https://enmap-box.readthedocs.io/en/latest/general/data_access.html)

### Land cover
- [ESA WorldCover data access](https://esa-worldcover.org/en/data-access)

### STAC and geospatial utilities
- [STAC specification](https://stacspec.org/)
- [OGC STAC standard overview](https://www.ogc.org/standards/stac/)
- [geojson.io](https://geojson.io/)
- [geojson.io source repository](https://github.com/mapbox/geojson.io)

**Use note:** these are candidate discovery and processing resources collected from an earlier hackathon, not a list of confirmed sources for the current challenge. Verify each collection's actual temporal coverage, spatial resolution, processing level, authentication, licence, rate limits, and attribution before selecting it.

## Next.js, React, UI engineering, and agent skills

- [Next.js App Router documentation](https://nextjs.org/docs/app)
- [Next.js Learn — App Router dashboard starter](https://nextjs.org/learn/dashboard-app)
- [Next.js Learn starter example source](https://github.com/vercel/next-learn/tree/main/dashboard/starter-example)
- [Next.js installation guide](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js source repository](https://github.com/vercel/next.js)
- [Vercel Agent Skills collection](https://github.com/vercel-labs/agent-skills)
- [Vercel React Best Practices skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
- [Vercel Web Design Guidelines skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines)
- [Vercel Web Interface Guidelines source](https://github.com/vercel-labs/web-interface-guidelines)
- [Vercel Composition Patterns skill](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns)
- [Anthropic Skills repository](https://github.com/anthropics/skills)
- [Anthropic Frontend Design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- [UI UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [No Slop UI skill and review checklist](https://github.com/LeoStehlik/no-slop-ui)
- [Avoid AI Design skill](https://github.com/funboy322/avoid-ai-design)
- [Skills CLI documentation](https://www.skills.sh/docs/cli)
- [Radix UI Primitives](https://github.com/radix-ui/primitives)
- [shadcn/ui](https://github.com/shadcn-ui/ui)
- [NASA-IMPACT VEDA UI](https://github.com/NASA-IMPACT/veda-ui) — geospatial data-exploration reference; maintenance mode.
- [NASA-IMPACT Next VEDA UI](https://github.com/NASA-IMPACT/next-veda-ui) — unsupported Next.js integration experiment; study only.
- [Storybook](https://github.com/storybookjs/storybook)
- [Storybook visual testing](https://storybook.js.org/docs/writing-tests/visual-testing)
- [Playwright](https://github.com/microsoft/playwright)
- [Playwright screenshot documentation](https://playwright.dev/docs/screenshots)

## Geospatial and visualization libraries

- [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)
- [MapLibre documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [deck.gl](https://github.com/visgl/deck.gl)
- [deck.gl examples](https://deck.gl/examples/)
- [deck.gl community examples](https://visgl.github.io/deck.gl-community/examples)
- [Apache ECharts](https://github.com/apache/echarts)
- [Apache ECharts examples](https://echarts.apache.org/examples/en/index.html)
- [Vega-Lite](https://github.com/vega/vega-lite)
- [Vega-Lite paper — A Grammar of Interactive Graphics](https://doi.org/10.1109/TVCG.2016.2599030)
- [Observable Plot](https://github.com/observablehq/plot)
- [Recharts examples](https://recharts.github.io/en-US/examples/)

## Scientific data infrastructure and climate software

- [xarray](https://github.com/pydata/xarray) — labelled N-dimensional arrays and datasets.
- [xarray documentation](https://docs.xarray.dev/)
- [Pangeo project](https://github.com/pangeo-data/pangeo) — reproducible, scalable geoscience ecosystem.
- [Pangeo Gallery](https://gallery.pangeo.io/) — climate/ocean/atmosphere notebooks and examples.
- [xclim](https://github.com/Ouranosinc/xclim) — climate indicators and climate-data processing built around xarray.
- [xclim documentation](https://xclim.readthedocs.io/en/stable/)
- [xclim: xarray-based climate data analytics (JOSS paper)](https://doi.org/10.21105/joss.05415)
- [Dask](https://github.com/dask/dask) — parallel/lazy computation, only if dataset size requires it.
- [Zarr](https://github.com/zarr-developers/zarr-python) — chunked N-dimensional array storage, if the official source format/workflow supports it.
- [DuckDB](https://github.com/duckdb/duckdb) — optional local analytical SQL engine.
- [pyMannKendall](https://github.com/mmhs013/pyMannKendall) — Mann–Kendall family tests; check exact method assumptions/options before use.
- [SciPy statistics documentation](https://docs.scipy.org/doc/scipy/reference/stats.html)
- [statsmodels documentation](https://www.statsmodels.org/stable/index.html)

## Statistical methodology papers and references

1. **Sen (1968), Estimates of the Regression Coefficient Based on Kendall's Tau.** The foundational Sen slope estimator; useful for robust trend magnitude estimation. [DOI](https://doi.org/10.1080/01621459.1968.10480934)
2. **Hirsch, Slack & Smith (1982), Techniques of Trend Analysis for Monthly Water Quality Data.** Especially relevant to seasonality, missing values, skewness, serial correlation, seasonal Kendall, and seasonal Kendall slope. [USGS record](https://pubs.usgs.gov/publication/70011649) · [DOI](https://doi.org/10.1029/WR018i001p00107)
3. **Hirsch & Slack (1984), A Nonparametric Trend Test for Seasonal Data with Serial Dependence.** Relevant when monthly/seasonal data contain serial dependence. [USGS record](https://pubs.usgs.gov/publication/70012890) · [DOI](https://doi.org/10.1029/WR020i006p00727)
4. **Hamed & Rao (1998), A Modified Mann-Kendall Trend Test for Autocorrelated Data.** Explains how positive autocorrelation can inflate false trend detections if ignored. [DOI](https://doi.org/10.1016/S0022-1694(97)00125-X)
5. **Yue, Pilon & Cavadias (2002), Power of the Mann-Kendall and Spearman's rho Tests for Detecting Monotonic Trends in Hydrological Series.** Useful for understanding how sample size, effect size, variability, and significance level affect test power. [DOI](https://doi.org/10.1016/S0022-1694(01)00594-7)
6. **Benjamini & Hochberg (1995), Controlling the False Discovery Rate: A Practical and Powerful Approach to Multiple Testing.** The foundation for FDR correction when testing many grid cells/locations. [DOI](https://doi.org/10.1111/j.2517-6161.1995.tb02031.x)
7. **Wilks (2006), On “Field Significance” and the False Discovery Rate.** Directly relevant to interpreting many local grid-cell significance tests as a spatial field. [DOI](https://doi.org/10.1175/JAM2404.1)
8. **Wang et al. (2021), On the Optimal Design of Field Significance Tests for Changes in Climate Extremes.** Useful for understanding field significance and spatial/temporal dependence in climate-grid testing. [DOI](https://doi.org/10.1029/2021GL092831)
9. **Li et al. (2026), From Local to Field Significance: A Comparative Analysis of Trend Detection Methods for Mean and Extreme Precipitation Over China.** A recent study comparing field-significance methods for precipitation trends. Treat its recommendations as context-specific, not a universal rule. [DOI](https://doi.org/10.1007/s13351-026-5368-2)
10. **NCAR Climate Data Guide — Trend Analysis.** Accessible expert overview of linear regression, t-tests, and Mann–Kendall interpretation. [Guide](https://climatedataguide.ucar.edu/climate-tools/trend-analysis)

### Method selection warning

No paper makes one test universally correct. The selected test must match sampling frequency, seasonality, autocorrelation, sample length, spatial dependence, missingness, and the actual scientific question. Do not implement every method simply to make the methods list longer. Document the selected method and why it is appropriate.

## Scientific visualization, communication, and writing papers

1. **Rougier, Droettboom & Bourne (2014), Ten Simple Rules for Better Figures.** Open access. Use for truthful chart construction, visual hierarchy, audience awareness, and avoiding misleading scales/encodings. [PLOS / PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4161295/) · [DOI](https://doi.org/10.1371/journal.pcbi.1003833)
2. **Midway (2020), Principles of Effective Data Visualization.** Ten practical principles for scientific figures, from defining the message to choosing effective visual encodings. [Article](https://doi.org/10.1016/j.patter.2020.100141)
3. **Satyanarayan et al. (2017), Vega-Lite: A Grammar of Interactive Graphics.** A formal model for composing interactive visual encodings and linked selections. Useful as a conceptual reference even if we use ECharts/deck.gl rather than Vega-Lite. [MIT Visualization Group](https://vis.mit.edu/pubs/vega-lite/) · [DOI](https://doi.org/10.1109/TVCG.2016.2599030)
4. **Zhao & Elmqvist (2023), The Stories We Tell About Data: Surveying Data-Driven Storytelling Using Visualization.** Useful for designing a guided finding/story mode without turning the application into a generic marketing page. [PubMed](https://pubmed.ncbi.nlm.nih.gov/37097789/) · [DOI](https://doi.org/10.1109/MCG.2023.3269850)
5. **Lo Duca & McDowell (2025), Using the S-DIKW Framework to Transform Data Visualization into Data Storytelling.** Helpful for moving from raw data to information, knowledge, and a clearly communicated interpretation. [DOI](https://doi.org/10.1002/asi.24973)
6. **Ten Simple Rules for Writing Research Papers (2014).** Useful for shaping a concise, complete, audience-aware technical narrative and tying claims to evidence. [PLOS article](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1003453)
7. **Romano & Moore (2020), Ten Simple Rules for Writing a Paper about Scientific Software.** Useful if we later write a formal software/methods paper or technical project report. [PLOS article](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1008390)

### How to use the writing references

- **Project summary:** problem → audience → what the tool enables → NASA data actually used → measurable result/benefit.
- **Technical description:** architecture → data source and format → preprocessing → analysis method → validation/tests → limitations.
- **Scientific finding/story:** observation → region and period → trend magnitude and uncertainty → significance method → caveats → why the finding matters.
- **Demo script:** one complete investigation, not a tour of every button. Show a question, the selected variable/region/time range, the resulting map and time series, the statistical result, and the evidence/provenance.
- Never write claims like “NASA proves” or “AI discovered” when the result is a calculation on one selected dataset. State exactly what the selected data and method support.

# 21. Final Strategic Recommendation

Build the project as a **data-agnostic scientific investigation platform**. The immediate, fixed implementation is the Next.js App Router frontend with typed mock-data contracts. The backend and scientific-processing technology remain provisional until the official resources, file formats, access requirements, and team capabilities are reviewed. A reproducible statistical core is required, but its implementation belongs to a later workstream after the backend/data decision; its final runtime and service boundary are still open.

The strongest combination to learn from is:

- **Orion Space** for reproducible statistical analysis and seasonal insight.
- **NASA Giovanni** for the variable → region → period → time-series workflow.
- **NASA Sea Level Change DAT** for map-linked regional analysis and dataset comparison.
- **PyClimaExplorer** for synthetic-demo and real-file switching.
- **Arctic Climate Story** for frontend craftsmanship and data storytelling principles.
- **earth** for layer catalogues, timeline interactions, and map-based exploration.
- **NASA Earth Trend Detective** for another direct same-challenge architecture and team-workflow reference.
- **NASA Worldview** for Earth-observation layer discovery and time navigation.
- **Climate Reanalyzer** for approachable climate map/time-series exploration.
- **Our World in Data Grapher** for chart communication and source annotation (study only; do not reuse proprietary code).

Our own distinguishing strengths should be scientific transparency, robust regional trend detection, a genuinely useful variable-discovery experience, data-source independence, a Next.js-powered product experience, and a professional interface shaped through real reference study and screenshot-based critique—not generic AI-generated styling. For the current frontend workstream, progress is measured by the completeness, usability, responsiveness, accessibility, and visual quality of the Next.js experience—not by how early a backend is scaffolded.

**The next engineering milestone is frontend-only:** complete the Next.js workspace with a coherent original design system, typed data contracts, deterministic synthetic fixtures, and fully working interactions across the dataset explorer, variable selector, map, time-series view, analysis presentation, and provenance panel. Do not wait for a backend and do not present mock analysis values as validated scientific results. Once the official data and team requirements are available, select the backend and implement the real ingestion, normalization, scientific analysis, and provider integrations behind the existing frontend data-client boundary.
