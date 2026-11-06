export interface DatasetItem {
  id: string;
  name: string;
  version: string;
  provider: string;
  temporalCoverage: string;
  spatialResolution: string;
  description: string;
}

export const AVAILABLE_DATASETS: DatasetItem[] = [
  {
    id: "nasa-earth-system",
    name: "NASA Earth System",
    version: "v2026.1",
    provider: "NASA EOSDIS / GIBS",
    temporalCoverage: "1980 - 2026 (Monthly)",
    spatialResolution: "1 km - 0.25°",
    description: "Harmonized multi-sensor satellite observations and land/atmosphere reanalysis."
  },
  {
    id: "clima-land",
    name: "CLiMA Land Diagnostics",
    version: "v0.12.3",
    provider: "Climate Modeling Alliance",
    temporalCoverage: "2000 - 2025 (Monthly)",
    spatialResolution: "0.5° Grid",
    description: "Process-based terrestrial biosphere simulations coupled with satellite constraints."
  }
];

export class DatasetsPanel {
  readonly element: HTMLElement;
  private currentDataset = AVAILABLE_DATASETS[0];
  private isCollapsed = false;

  constructor(
    container: HTMLElement,
    private onDatasetChange?: (dataset: DatasetItem) => void
  ) {
    this.element = document.createElement("div");
    this.element.className = "clima-panel datasets-panel";
    container.appendChild(this.element);
    this.render();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="clima-panel__header">
        <span class="clima-panel__title">Datasets</span>
        <div class="clima-panel__actions">
          <button type="button" class="clima-icon-btn add-dataset-btn" title="Add / Switch Dataset" aria-label="Add Dataset">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          </button>
          <button type="button" class="clima-icon-btn collapse-btn" title="Toggle Collapse" aria-label="Collapse Datasets">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="${this.isCollapsed ? 'm6 9 6 6 6-6' : 'm18 15-6-6-6 6'}"/></svg>
          </button>
        </div>
      </div>
      ${!this.isCollapsed ? `
        <div class="datasets-panel__content">
          <div class="dataset-card">
            <div class="dataset-card__meta">
              <span class="dataset-card__name">${this.currentDataset.name}</span>
              <span class="dataset-card__ver">${this.currentDataset.version}</span>
            </div>
            <div class="dataset-card__sub">${this.currentDataset.provider} · ${this.currentDataset.spatialResolution}</div>
          </div>
        </div>
      ` : ""}
    `;

    const addBtn = this.element.querySelector(".add-dataset-btn");
    addBtn?.addEventListener("click", () => {
      // Toggle between available datasets
      const nextIndex = (AVAILABLE_DATASETS.indexOf(this.currentDataset) + 1) % AVAILABLE_DATASETS.length;
      this.currentDataset = AVAILABLE_DATASETS[nextIndex];
      this.render();
      this.onDatasetChange?.(this.currentDataset);
    });

    const collapseBtn = this.element.querySelector(".collapse-btn");
    collapseBtn?.addEventListener("click", () => {
      this.isCollapsed = !this.isCollapsed;
      this.render();
    });
  }
}
