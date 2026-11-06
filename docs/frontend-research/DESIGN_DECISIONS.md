# Design Decisions

**Status:** proposed decisions derived from blueprint and reference research; validate against the real application before implementation.

| Decision | Choice | Reason / evidence | Revisit when |
|---|---|---|---|
| Product form | Scientific investigation workbench | The user needs to configure and interrogate a question, not browse a marketing landing page. | User research shows different audience/task priorities. |
| Visual direction | Cartographic workbench | Best balance of spatial analysis, time-series reading, and nearby provenance. | Screenshots of the real app reveal existing useful patterns or accessibility issues. |
| Navigation | Investigations, Explore data, Methods, About | Separates setup, catalog discovery, analysis references, and product context. | Existing routing and state structure is available for inspection. |
| Map | 2D-first, renderer undecided | Makes the spatial task direct and avoids spending effort on a globe without evidence of user benefit. | Data geometry, rendering requirements, and basemap/provider terms are known. |
| Charts | Choose after inspecting existing dependencies; keep one visual grammar | No need to add ECharts, Plotly, and D3 simultaneously. D3 is for custom encodings/interactions where a chart package is insufficient. | Existing chart code and specific chart types are inventoried. |
| Data boundary | Typed UI contracts and replaceable provider adapter | Official data/API and backend are still pending in the blueprint. Views should not depend on one provider response shape. | Real dataset and API contract are documented. |
| Demo status | Persistent, prominent synthetic/demo label | Synthetic outputs must not be mistaken for NASA observations or findings. | Real data becomes available; demo fixtures remain labeled. |
| Analysis result display | Rate plus units, interval/uncertainty, test, p-value/adjustment, n, missingness, caveats | A trend claim without method and data context is not reproducible or responsibly interpretable. | Selected data frequency and scientific method justify a different output set. |
| Color | Semantic tokens; scientific ramps chosen per variable | Colors encode magnitude/sign/status, not decoration. | Variable, units, map basemap, and color-vision review are known. |
| Components | Prefer existing app primitives; avoid blanket UI-kit adoption | Preserve working code and distinct identity. | Repository reconnaissance reveals current component system. |
| Skills | Apply critique/audit/checklist principles; install only after project context exists | Impeccable, avoid-ai-design, and no-slop-ui can guide workflow but should not write a design identity by themselves. | Actual project hooks and compatibility are reviewed. |
| Reference reuse | Concepts first; no copied source/assets from these references in this research pass | Arctic project license is restrictive; other repositories require component/dependency-specific license review. | Exact code reuse is proposed and legal notices/dependencies have been checked. |

## Explicitly rejected defaults

- A metric-card grid without decisions it supports.
- A map that only decorates an otherwise generic analytics dashboard.
- A chat assistant as a substitute for an analysis engine.
- Automatically promoting mock results into official-looking findings.
- Locking the backend or choosing a scientific method from library convenience.
- Committing to a dark/light palette or map renderer before inspecting the app and actual data.

