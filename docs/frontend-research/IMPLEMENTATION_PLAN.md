# Frontend Implementation Plan

**Updated:** local frontend prototype has now been created in this workspace. This plan records both the completed first pass and what remains blocked by unavailable dependencies and missing official data.

## Current gate: repository unavailable

The workspace initially contained only `Earth_Trend_Detective_Blueprint_Clean.md` and the research docs. A frontend-only Next.js project has since been authored locally. The four requested shallow clones failed with `Could not resolve host: github.com`; no reference checkout was retained. Public repository pages and some source/documentation were inspected in browser research, as recorded in `REFERENCE_ANALYSIS.md`.

### Project inventory (workspace as received)

| Area | Finding |
|---|---|
| Files at start | `Earth_Trend_Detective_Blueprint_Clean.md` (project plan, not source code). |
| Next.js routes/layouts | No original app was present. New `src/app/layout.tsx` and `src/app/page.tsx` now provide the local prototype. |
| Components/styles/assets | New demo workspace uses inline React components and `src/app/globals.css`; no source project was overwritten. |
| State/types/data clients | Local fixture state/types are in `src/app/page.tsx`; no external data client exists yet. |
| Dependencies/scripts/tests | `package.json` declares Next/React/TypeScript. Compatible packages are installed in the local YPWC Publication project and will be reused. |
| Git history/remotes | Not present; `git status` and `git remote` report this is not a repository. |
| Preservation baseline | No running app or existing interactions available to assess. |

### Implementation and QA status

- Frontend implementation: **first pass authored** as a new local app because no existing project was present.
- Dependencies declared: Next.js, React, React DOM, and TypeScript. Compatible preinstalled versions were found in `C:\Users\wasfy\Downloads\YPWC Assets`.
- Interactions implemented in code: variable selection, sample region selection by map marker and region list, time-range selection, series/linear-fit display switch, comparison toggle, CSV download, browser-local save/restore, and dataset/method information drawers.
- Interactions verified in a browser: **not yet**; without installed packages the app cannot run here.
- Screenshots: **not captured**.
- Build, tests, and design audits: **not run**; dependency installation stalled and was stopped.

The missing original app meant there was nothing to preserve or extend, so a new frontend scaffold was created in this folder. Dependency access remains a blocker to running or visually verifying it. The project remains frontend-only and does not scaffold a backend.

## Stage 0 — Inventory and baseline

1. Confirm repository root and read `AGENTS.md`, README, blueprint, package scripts, lockfile, and environment notes.
2. Inventory routes, layouts, components, styles, assets, state, data clients, types, test setup, and map/chart dependencies.
3. Run the existing app and capture baseline behavior/screenshots before edits.
4. Record what works, what is incomplete, known errors, browser support, and preservation constraints.
5. Record the proposed information architecture and design direction next to actual route/component ownership.

**Exit:** concrete project inventory with a baseline and no unverified claims about the implementation.

## Stage 1 — Research completion in a connected checkout

1. Acquire the four reference repositories into a temporary, ignored directory outside the production source tree, or inspect file-level web sources if the environment cannot clone.
2. Trace representative user interactions through source, not only READMEs: Orion's map selection/evidence panel and layer setup; PyClima's map point/time series and compare mode; Arctic's route boot, scene/chart, map preload and error boundary; VEDA's catalog and configured map/chart view.
3. Record exact file path and symbol references with repository revision/date; distinguish maintainer documentation from observed code behavior.
4. Review the three requested design repositories' skill instructions, reference files, demo, hooks, and licenses. Install only what is compatible and safe for the actual Codex project after checking hooks and side effects.
5. Update the reference report with local findings and license status.

**Exit:** each reference workflow can be described from source and evidence; unanswered claims are marked.

## Stage 2 — Preserve and establish the design system

1. Map existing tokens/primitives to the selected cartographic-workbench direction; retain useful components.
2. Define type, spacing, surface, focus, border, semantic status, data sequential/diverging, and no-data tokens.
3. Establish scientific chart and map rules, including units, legends, selection, resolution, missingness, and accessibility.
4. Build representative desktop/tablet/mobile shells and review screenshots before expanding.
5. Add stories/fixtures only if the repository already supports them or the benefit justifies introducing the tool.

**Exit:** core shell and visualization language are reviewed in a real browser and pass an accessibility check.

## Stage 3 — Typed investigation workflow

1. Define contracts for dataset summary/detail, variable metadata, ROI, time range, preview, series, and analysis result.
2. Implement an API-agnostic client and deterministic synthetic fixture provider, visibly labelled.
3. Build dataset/variable discovery and a validated investigation setup flow.
4. Synchronize map selection, chart series, time controls, selected variable, and result inspector.
5. Implement loading, empty, no-coverage, insufficient-data, invalid geometry, error, and offline/demo states.
6. Expose method and provenance details. Do not claim scientific validity for synthetic calculations.
7. Add comparison/export only when they can create real, understandable outputs from available data.

**Exit:** the full demo investigation works end to end; every visible control has an effect.

## Stage 4 — Visual review and quality

1. Start the existing Next.js app and inspect desktop, tablet, and mobile in a real browser.
2. Review map sizing, chart readability, focus order, keyboard interactions, clipping, and loading/failure fallbacks.
3. Capture screenshots and iterate through several review cycles.
4. Run the repository's existing lint/typecheck/test/build commands. Add tests only when the project owner requests them or they are part of the agreed implementation scope.
5. Run the selected design audits only after verifying their installation/hooks and using the real project.
6. Report dependency changes with reasons, interactions verified, screenshots, audit results, and remaining issues.

**Exit:** no known nonfunctional visible controls; app builds and the key workflow is visually reviewed at target widths.

## Stage 5 — Real data connection (after official resources and team decision)

Frontend work remains against typed contracts. Once the official data and approved backend/API exist, validate metadata, units, calendar, CRS, native grid, QA flags, coverage, authentication, and terms. Implement only the adapter necessary for the chosen source; keep the deterministic demo fallback explicit. This stage does not choose or scaffold a backend.

## Dependencies

**Added in this research pass: none.** Map, chart, skill CLI, and UI dependencies remain undecided until the app inventory identifies current packages and the data/rendering requirements.

