# Frontend Reference Analysis

**Status:** research pass completed from publicly readable GitHub source pages and repository documentation. A local source audit is still pending.  
**Project under study:** EarthTrend Detective, planned Next.js App Router frontend.  
**Research date:** 3 November 2026.

## Scope and evidence limits

The workspace supplied for this task contained the project blueprint only; there was no Next.js application, package manifest, or Git repository. Four requested shallow clones were attempted into `.reference-repos/`, but all failed because the shell could not resolve `github.com`. The empty temporary directory was removed. The browser research view allowed inspection of repository trees, READMEs, the Orion trend-analysis script, the Arctic architecture document, and VEDA documentation. It did not provide a complete checkout or reliable access to every source file. Accordingly, implementation details below distinguish what is documented or visible from what still needs a local code audit. No reference source or asset has been copied.

## Comparison matrix

| Reference | Problem and stack | Workflow / effective decisions | Useful for EarthTrend | Weak fit / avoid | License and reuse |
|---|---|---|---|---|---|
| [Orion Space](https://github.com/MD-Mushfiqur123/orion-space) | Same challenge; Vite, React, CesiumJS globe and a Node middleware server. README identifies a trend-analysis subproject using Python, NumPy and SciPy. | Focuses a globe on Bangladesh and exposes a climate evidence panel. Its reproducible analysis script separates month-by-month and annual Mann–Kendall tests, Theil–Sen slopes, BH-FDR, and a trend-free pre-whitening check. Presenting an annual null alongside a seasonal signal makes aggregation effects understandable. | Separate evidence from map context; link location changes to a readable finding; expose seasonal and annual results together; keep a reproducible analysis artifact. | One-variable, one-country analysis is not a general catalogue. A 3D globe and inherited live layers can distract from the core workflow. Static hosting lacks some middleware API routes per README. Do not infer real analysis from experimental modules: README says `src/osint/` modules are not wired into the running app and some simulate values. | README states MIT and says it is built on the MIT-licensed God's Eye View; preserve notices and check third-party data/service terms before reuse. Treat their results as their team's claims, not validated ground truth. |
| [PyClimaExplorer](https://github.com/reshmiee/PyClimaExplorer) | Climate explorer built with Streamlit, PyDeck and Plotly; its README structure names `app.py`, `src/data.py`, `src/utils.py`, `src/plotting.py`, and pages for heatmap, compare, globe, story and future scope. | Claims map point selection to a historical series, two-year side-by-side comparison, variable/time controls, sample ERA5 data at startup, plus story and forecasting modes. Shared plotting helpers and page separation are useful patterns. | Borrow the interaction idea of selecting a map cell and seeing its time series; offer a clear time/period comparison; keep demo-data generation and plotting conventions centralized. | Do not migrate the Streamlit UI or assume every advertised story/forecast is methodologically appropriate. Separate analysis of observed records from forecasts and AI-written interpretation. Confirm sample provenance and how each mode routes data before trusting it. | No license was visible in the inspected root file listing. Treat all code/assets as unavailable for reuse unless the repository's current license is verified. |
| [Arctic Climate Story](https://github.com/lukaskreibig/climate-dashboard) | A bilingual story-led climate product. The repository architecture describes Next.js 15 App Router, React, FastAPI, typed TypeScript/Pydantic DTOs, GSAP scenes, Mapbox/MapTiler, Recharts/D3, Tailwind/CSS modules, Radix, data pipelines, PostgreSQL with JSON fallback. | `frontend/app/[lng]/page.tsx` bootstraps data; `frontend/lib/apiClient.ts` fetches typed data; `frontend/types/` mirrors backend schemas. `components/scenes/ChartScene.tsx` centralizes scroll scene behavior; `SceneErrorBoundary.tsx` contains individual scene failures. `MapboxPreloader.tsx` prewarms viewpoints and tiles. Locale files and typed DTOs keep complex scenes coherent. | Study typed boundaries, error containment, staged map initialization, loading resilience, locale-aware routes, and documenting architecture. Retain those techniques without adopting their story sequence. | Scrollytelling, animation choreography, Mapbox-specific preloading, and a permanently dark story theme are not the target workbench. Its architecture page itself notes that Playwright regression coverage and strict backend typing remain improvement areas. | Repository states All Rights Reserved in blueprint; inspect current license before any reuse. This research treats it as learning-only: no source, assets, or components copied. |
| [NASA VEDA UI](https://github.com/NASA-IMPACT/veda-ui) | NASA-IMPACT Dashboard Evolution frontend; repository tree includes a dashboard app and reusable `packages/veda-ui`, docs, Storybook, mocks, and content tests. README marks it maintenance mode. | VEDA's MDX content docs describe composable Blocks and typed Map/Chart/Table content; a map binds dataset/layer/date and may show a compare date. Content and visual components are configuration-oriented, while dataset pages can link into data views. This is a concrete pattern for metadata-led scientific publishing. | Learn how dataset/layer/time selection, source descriptions, map/charts, tables, and narrative content can share a vocabulary. Consider stable dataset IDs and configuration-driven metadata rather than hard-coded display strings. | It is a broad story/dashboard publishing system, not necessarily the right interaction model for running analysis on a user-selected ROI. Maintenance mode means no new features or major refactors are accepted; do not adopt its legacy build stack as a new-app starter. | Repository exposes Apache-2.0. Reuse may be possible under that license, but retain notices and review the specific package and dependency licenses before copying code. |

## Repository A — Orion Space

### What it solves and how the workflow works

The challenge-specific workflow combines a Bangladesh temperature finding with a CesiumJS globe and layers. The README says the team's work includes the MERRA-2 T2M data and analysis, the Climate Detective panel and `src/agent/OrionMapHarness.js`, NASA GIBS true-colour imagery, a UI redesign, and a pitch deck. It separately attributes the globe engine, general layer system, live-feed server, and most non-climate layers to the upstream God's Eye View project. This distinction is important when judging which feature decisions belong to the challenge solution.

The cited analysis code is `analysis/trend_analysis.py`. The visible script defines `mann_kendall`, `sen_slope`, `tfpw_p`, polygon membership helpers, and `bh_fdr`; reads `public/data/climate/bangladesh_t2m_regional_raw.json` and the boundary GeoJSON; and writes per-cell/month CSV results under `analysis/results/`. That is a better source for methodological study than the map's rendered pixels. The README points to `analysis/README.md`, `public/data/climate/`, `src/agent/OrionMapHarness.js`, `DATA_SOURCES.md`, and `LICENSE` as follow-up audit targets.

### Assessment

Its most effective product choice is a specific, legible evidence card tied to a map location. The strongest science communication choice is comparing annual and monthly results, including multiple-testing correction and autocorrelation diagnostics. The main limitation for our product is generality: the README states that T2M is the only analyzed variable. The app also contains many contextual event/live layers, and its README explicitly says experimental `src/osint/` modules are not connected to the app and some produce simulated values. The blueprint's requirement that demo or simulated data never masquerade as observations is essential here.

**Adapt:** location-linked evidence, expandable method details, seasonal-vs-annual comparison, offline/static result bundle.  
**Avoid:** reproducing its globe/layer-heavy layout, using a chat/agent facade as the scientific engine, using contextual raster imagery as quantitative trend data, or assuming README-described modules are active.  
**Still to inspect locally:** exact layer lifecycle, camera controls, mobile layout, component boundaries, loading/error paths, UI state synchronization, and the inherited/modified diff.

## Repository B — PyClimaExplorer

### What it solves and how the workflow works

The README lists five distinct modes: Heatmap, Compare, 3D Globe, Story, and Forecast. It describes map/city selection opening a 30-year history, side-by-side year maps and series, a PyDeck globe, an AI story, and pixel-wise forecasts. The repository tree documents a useful separation: `src/data.py` (ERA5 loading and synthetic sample generation), `src/utils.py` (geocoding, nearest-index, units), `src/plotting.py` (shared Plotly layout), and `src/pages/{heatmap,compare,globe,story,future_scope}.py`, routed from `app.py`.

### Assessment

Point-to-series linking and two-period comparison solve genuine exploration needs. A centralized loader that can fall back to a bundled sample is a useful demo pattern, provided the UI marks the sample's source and status. Different modes give a sense of feature boundaries, but five modes can also create a shallow surface area. The forecast and Gemini narrative features must remain visually and scientifically distinct from descriptive trend analysis. The README is a feature description, not a verification that every advertised path is connected to official data or scientifically validated.

**Adapt:** map point → nearest grid cell → time series, shared chart theme, explicit sample-data provider, year/period comparison.  
**Avoid:** a direct Streamlit translation, putting every capability into one dashboard, mixing projections with historical data, or implying an LLM explains causality.  
**Still to inspect locally:** actual data fixtures and their provenance, Streamlit page state transitions, point-index behavior, chart input transformations, and validation of advertised forecast intervals.

## Repository C — Arctic Climate Story

The most useful inspected artifact is `docs/ARCHITECTURE.md`, not screenshots. It documents `frontend/app/[lng]/page.tsx`, `frontend/lib/apiClient.ts`, `frontend/types/dashboard.ts`, `components/scenes/ChartScene.tsx`, `components/MapFlyScene.tsx`, `components/SeaIceScene.tsx`, `components/StoryProgress.tsx`, `components/SceneErrorBoundary.tsx`, and `MapboxPreloader.tsx`. Its architecture uses concurrent data fetches, normalized frontend DTOs, map viewpoint registration, map warm-up before a scene is shown, and individual error boundaries. It also describes FastAPI `backend/schemas.py` mirroring TypeScript contracts, plus CSV/PostgreSQL pipeline outputs and a committed JSON fallback.

This structure demonstrates that a coherent complex experience comes from lifecycle and data-contract design as much as from its visual language. Its narrative scenes are the wrong navigation shape for an investigator who must change dataset, ROI, temporal resolution, and analysis method repeatedly. Mapbox warm-up is provider-specific and should be justified against our actual library and performance needs. The repo advertises All Rights Reserved, so use concepts only.

**Adapt:** DTO symmetry as a communication pattern (without committing to a backend), resilient scene/component boundaries, explicit loading/preload strategy, localization-aware content, typed errors.  
**Avoid:** the scrollytelling shell, unnecessary animation, or copying code/assets.  
**Still to inspect locally:** responsive scene implementations, D3/Recharts details, accessibility audit results, actual error boundaries, asset weights, and the precise license text/version.

## Repository D — NASA VEDA UI

`packages/veda-ui`, `apps/dashboard-parcel`, `docs`, `storybook`, `mock`, `content-tests`, and shared `types` make a mature content-driven system visible in the repository tree. The `docs/content/MDX_BLOCKS.md` source describes reusable block composition and `Map`, `Chart`, and `Table` components. Its `Map` API associates a `layerId` and date with a configured dataset; comparison can specify `compareDateTime` and a label. Metadata-led content can link a dataset story to its catalog page. VEDA's repository README declares maintenance mode: bug fixes and blockers, no new features or large refactors.

**Adapt:** separate dataset metadata from views, stable IDs, provenance labels adjacent to the view, and composable map/chart/table content.  
**Avoid:** treating a narrative publishing system as the complete investigation engine, or adopting the old Parcel app and assumptions wholesale.  
**Still to inspect locally:** catalog/filter implementation, current package APIs, map rendering dependencies, release constraints, and licenses of dependencies.

## Design-skill review

- [Impeccable](https://github.com/pbakaus/impeccable) describes an agent-oriented design workflow with commands for direction-setting and review such as critique/audit. Its repository lists Apache-2.0 and has Codex-specific integration files. The `npx impeccable install` / `$impeccable init` flow was not run because there is no application or package manifest here and shell network access is unavailable. Do not add a project hook without checking its actual scope and approval behavior in a real repo.
- [avoid-ai-design](https://github.com/funboy322/avoid-ai-design) has `SKILL.md`, `references/`, `examples/demo/`, and scripts. Its explicit point is to detect both obvious gradient slop and its current counter-clichés. It is MIT-licensed. Its scanner and exact four requested reference files could not be executed/read from a local checkout; use its principles as a design review prompt, not an unexamined aesthetic generator.
- [no-slop-ui](https://github.com/LeoStehlik/no-slop-ui) includes `SKILL.md`, `references/`, `examples/`, and a review checklist. Its MIT-licensed rules call out fake metric cards, gradient/glass effects, oversize rounding, vague product copy, and ineffective internal-dashboard hero sections. Use as a checklist, not a substitute for user task testing or visual critique.

## Cross-reference conclusions

1. The application should treat the map as a spatial input and evidence surface, not as a decorative centerpiece.
2. Every selected location/time series must resolve to a stated source, grid resolution, temporal range, units, and aggregation rule.
3. Keep dataset metadata, chart data, and analysis result contracts explicit; the front end should depend on the contract, not a provider response shape.
4. Design comparison around a scientific question (different seasons, regions, periods, or compatible variables), not two arbitrary panels.
5. Make demo mode useful and conspicuous. Include a visible data-status label and source details next to all demo outputs.
6. Prioritize the 2D analysis map. Add a globe only if the actual challenge data and user's task benefit enough to offset interaction and implementation costs.
7. Treat public README claims as hypotheses about implementation until the relevant path and data are traced. No project here is a NASA endorsement or proof that our product should use its stack.

## Sources reviewed

- Orion Space README and analysis script: [repository](https://github.com/MD-Mushfiqur123/orion-space), [trend_analysis.py](https://github.com/MD-Mushfiqur123/orion-space/blob/main/analysis/trend_analysis.py).
- PyClimaExplorer README/tree: [repository](https://github.com/reshmiee/PyClimaExplorer).
- Arctic Climate Story README and architecture: [repository](https://github.com/lukaskreibig/climate-dashboard), [docs/ARCHITECTURE.md](https://github.com/lukaskreibig/climate-dashboard/blob/main/docs/ARCHITECTURE.md).
- NASA VEDA UI README/tree and content API: [repository](https://github.com/NASA-IMPACT/veda-ui), [MDX blocks](https://github.com/NASA-IMPACT/veda-ui/blob/main/docs/content/MDX_BLOCKS.md), [maintenance-mode issue](https://github.com/NASA-IMPACT/veda-ui/issues/1912).
- Design guardrails: [Impeccable](https://github.com/pbakaus/impeccable), [avoid-ai-design](https://github.com/funboy322/avoid-ai-design), [no-slop-ui](https://github.com/LeoStehlik/no-slop-ui).
