# Visual Direction

## Product framing

EarthTrend Detective should feel like a working scientific instrument: a place where the user sets up an investigation, checks what the data can support, and interrogates the result. The interface needs to prioritize the evidence chain—variable, source, region, period, sampling/aggregation, analysis—over decoration. Map and chart color must encode data consistently and include an explicit legend.

## Three candidate directions

### A. Cartographic workbench — selected

- **Concept:** A precise geospatial work surface informed by field instruments and modern cartography. The map is the main spatial canvas; a narrow investigation rail shows the current selection; analysis and provenance live in adjacent, resizable or tabbed panes.
- **Typography:** A highly legible humanist sans for controls/body; a restrained tabular numeric face for dates, coordinates, and values. Use a distinct but quiet display face only for editorial/report headings, not every screen.
- **Color:** Warm-neutral paper-like canvas and dark graphite text as utility surfaces, with thin cool-gray rules. Reserve color for data: sequential palettes for magnitude, a perceptually balanced diverging palette for signed change, and a separate categorical palette for source/quality. Avoid assigning identity through a fashionable two-color theme.
- **Layout:** Persistent instrument header with investigation name/status, compact left-side setup rail, large map or chart canvas, right-side inspector for selected feature/evidence. Data table and methodology can expand below or into a secondary view. Keep controls close to the object they change.
- **Chart styling:** Clear axis titles and units, visible missing periods, uncertainty band, simple observed-series mark plus fitted/trend overlay, and concise annotation for method/result. Use a neutral grid and let data carry the color.
- **Map treatment:** 2D first. Crisp geographic boundaries, restrained basemap labels, native-resolution raster/cell boundaries visible when useful, and explicit no-data styling. Selection outline is distinct from data encoding. Legends state units, date, and resampling status.
- **Navigation/components:** Persistent workspace navigation with task labels (Investigate, Datasets, Methods, Saved findings); native form controls with visible focus; dense but calm inspector sections; plain rectangular buttons and square-cornered chart/map tools.
- **Advantages:** Supports repeated investigation, dense metadata, linked map/chart selection, and scientific provenance without turning into a generic dashboard.
- **Trade-offs:** Can become too dense. Requires disciplined progressive disclosure and strong responsive layout rather than shrinking every panel.

### B. Satellite operations console

- **Concept:** A high-contrast instrument console inspired by operational mission software, with a wide map, timeline strip, compact layer controls, and diagnostic readout.
- **Typography:** Condensed sans for short controls paired with a highly readable text face; tabular numerals for time and coordinates.
- **Color:** Dark neutral surfaces with restrained instrument accent colors; color must still encode variables rather than decoration.
- **Layout:** Map-led full-screen workspace with docked drawers and timeline scrubber.
- **Chart styling:** High contrast against dark background, coarse grid, marker/selection focused.
- **Map treatment:** Strong raster presence and dense layer controls.
- **Navigation/components:** Compact toolbars, collapsible drawers, keyboard-first operation.
- **Advantages:** Excellent for continuous temporal navigation and expert users.
- **Trade-offs:** Risks looking like a generic sci-fi HUD, reduces readability for long methodology text, and can obscure landforms and subtle color ramps.

### C. Evidence atlas

- **Concept:** A publication-oriented atlas of investigations, with maps and charts paired with explanatory notes and curated findings.
- **Typography:** Editorial serif/sans pairing with prominent section titles and body copy.
- **Color:** Light paper surfaces, ink text, and limited evidence annotations.
- **Layout:** Topic and dataset index leads to a finding page with map, chart, and evidence notes.
- **Chart styling:** Static-first, annotation-heavy, optimized for reading exported analyses.
- **Map treatment:** Composed map figures with scale, legend, source note, and boundary context.
- **Navigation/components:** Dataset index, saved investigations, findings pages.
- **Advantages:** Strong for teaching, sharing, and report-like outputs.
- **Trade-offs:** Less efficient for iterative parameter changes; may fall into the beige editorial visual cliché the project explicitly wants to avoid.

## Selection and visual rules

Select **Cartographic workbench** because the core task is interactive investigation. It gives the map and time series room to work together, keeps metadata within reach, and supports a repeatable workflow. It borrows no single reference product's palette or layout.

1. Define colors by semantic role and scientific variable, not by branding fashion.
2. Use one prominent visualization per working view; do not fill empty space with metric cards.
3. Put units, temporal resolution, source, and data status beside the visualization they qualify.
4. Prefer thin dividers and whitespace to nested cards and heavy shadows.
5. Keep headings task-specific: “Choose variable”, “Region coverage”, “Monthly trend”, not generic inspiration copy.
6. Use motion only to explain selection, loading, or map navigation; honor reduced-motion settings.
7. Maintain accessible contrast and a non-color-only distinction for negative/positive/no-data states.
8. Revisit palette choices when the actual data variable and map basemap are known. Do not fix an assumed climate ramp before data selection.

## Provisional design tokens (not yet implemented)

Tokens should be defined in CSS variables after the actual app and map provider are present. The intended semantic families are `surface`, `surface-raised`, `text-primary`, `text-secondary`, `rule`, `focus`, `selection`, `data-sequential`, `data-diverging`, and `data-missing`. Exact hex values, font assets, and contrast checks are deliberately pending implementation inspection and basemap selection.

