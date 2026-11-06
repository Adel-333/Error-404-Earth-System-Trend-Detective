# Information Architecture

## Product model

The top-level object is an **Investigation**: a saved, shareable configuration describing a scientific question. It references a dataset and variable, an area of interest, time bounds, temporal aggregation, and analysis settings. Its result must record the exact source/version and processing choices. The interface should keep the investigation context visible as the user moves among views.

## Primary navigation

1. **Investigations** — recent, saved, or shared investigations; start a new one.
2. **Explore data** — browse datasets and variables by Earth-system category, source, coverage, and frequency.
3. **Methods** — explain supported analyses, assumptions, and limitations in plain language.
4. **About / sources** — product scope, provider attribution, and citations.

## Core workflow and view boundaries

### 1. Dataset and variable selection

Show variable name, definition, units, source, temporal/spatial resolution, coverage dates and footprint, quality notes, and current availability. Allow selecting a compatible dataset/variable pair. Do not offer combinations that cannot produce a meaningful result without explaining why.

### 2. Investigation setup

Collect dataset/variable, region, date interval, and temporal resolution. Keep this a short guided setup with coverage validation, not a long configuration form. Region selection can be a named region, map-drawn bounding box/polygon, or point only where the selected source supports it. Explain whether a point resolves to a pixel/grid cell or an observation station.

### 3. Analysis workspace

Keep a stable shell and a synchronized map/time-series view. The user's active variable, ROI, period, and data status remain visible. Selecting a map cell updates the series and selected-cell summary; changing time bounds updates the series/map and exposes the new sample count. Provide controls for aggregation and analysis method only when those choices are supported.

### 4. Results and evidence

Separate result interpretation from configuration. Show direction and slope with units, interval/uncertainty, test and assumptions, sample count, missingness, and significance adjustment. For grids, summarize positive/negative/no-trend/no-data cells and show the spatial field. Clearly distinguish statistical significance, magnitude, and causal interpretation.

### 5. Provenance and export

An always-available provenance inspector contains data provider/product/version, variable identifier, source link, spatial/temporal coverage, ROI geometry or identifier, aggregation, units/transforms, analysis method/version, timestamps, demo/official status, and citations. Export only the currently represented result and configuration; name formats and file contents explicitly.

## Proposed routes (subject to the real app inspection)

```text
/investigations
/investigations/new
/investigations/[id]
/datasets
/datasets/[datasetId]
/methods
/about
```

An investigation route should preserve shareable inputs in search parameters where practical: dataset, variable, date interval, temporal scale, method, and region reference. Large polygon geometry may require a stable saved investigation ID rather than a giant URL.

## Information hierarchy within an investigation

1. Data status and current question.
2. Map / time-series evidence.
3. Main result (slope, units, uncertainty, significance).
4. Region and coverage diagnostics.
5. Method explanation and provenance.
6. Comparison and export actions.

Do not put all details at equal visual weight. Progressive disclosure should hide optional diagnostic detail while retaining a clear path to inspect it.

## Responsive behavior

- **Wide desktop:** setup rail, map and time series in a coordinated canvas, detail inspector.
- **Tablet:** retain a single primary visualization and a compact selection summary; switch map/chart focus with clear tabs rather than squeezing both into unreadable columns.
- **Mobile:** task sequence becomes linear; use full-width map and chart views, persistent compact investigation summary, bottom sheet or dedicated detail route for the inspector. Map controls must not overlap critical data or cover the selected location.

## Empty, loading, and failure states

Every state communicates what the user can do next. Distinguish catalog loading, unsupported ROI, no coverage, insufficient valid samples, analysis failure, unavailable basemap, and demo fallback. Never quietly substitute synthetic data for a failed official request.

