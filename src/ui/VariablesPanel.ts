import {
  LAYERS,
  layersByCategory,
  type LayerCategory,
  type LayerId,
} from "../lib/timeline";
import { plainLayerName } from "../lib/plainLanguage";

export interface VariableItem {
  id: LayerId;
  code: string;
  label: string;
  units: string;
  visible: boolean;
  color: string;
}

export const INITIAL_VARIABLES: VariableItem[] = [
  {
    id: "ndvi",
    code: "NDVI",
    label: "Greenness (NDVI)",
    units: "Index (0–1)",
    visible: true,
    color: "#10b981", // Emerald green
  },
  {
    id: "lst",
    code: "LST",
    label: "Land temperature (LST)",
    units: "°C",
    visible: true,
    color: "#0284c7", // Sky blue / cyan
  },
  {
    id: "airtemp",
    code: "T2M",
    label: "Air temperature (MERRA-2)",
    units: "°C",
    visible: false,
    color: "#f59e0b", // Amber
  },
  {
    id: "precip",
    code: "PRECIP",
    label: "Rain (GLDAS)",
    units: "mm/mo",
    visible: false,
    color: "#6366f1", // Indigo
  },
  {
    id: "soil",
    code: "SOIL",
    label: "Ground moisture (GLDAS)",
    units: "kg/m²",
    visible: false,
    color: "#8b5cf6", // Purple
  },
];

const CATEGORY_COLORS: Record<LayerCategory, { bg: string; text: string }> = {
  Vegetation: { bg: "#ecfdf5", text: "#10b981" },
  Temperature: { bg: "#fffbeb", text: "#f59e0b" },
  Water: { bg: "#f0f9ff", text: "#0284c7" },
  Cryosphere: { bg: "#ecfeff", text: "#06b6d4" },
  Atmosphere: { bg: "#f5f3ff", text: "#6366f1" },
  Land: { bg: "#f0fdf4", text: "#059669" },
  Terrain: { bg: "#fef3c7", text: "#d97706" },
};

const CATEGORY_ICONS: Record<LayerCategory, string> = {
  Vegetation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9A9 9 0 0 0 12 2Z"/><path d="M12 12v9"/><path d="M12 12c-2.5 0-4.5-2-4.5-4.5S9.5 3 12 3"/></svg>`,
  Temperature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>`,
  Water: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  Cryosphere: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`,
  Atmosphere: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
  Land: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
  Terrain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="1 22 10 7 16 16 23 22 1 22"/></svg>`,
};

export class VariablesPanel {
  readonly element: HTMLElement;
  private variables: VariableItem[] = [...INITIAL_VARIABLES];
  private activeId: LayerId = "ndvi";
  private viewMode: "catalog" | "active" = "catalog";
  private isCollapsed = false;
  private searchQuery = "";
  private collapsedCategories = new Set<string>(["Temperature", "Water", "Cryosphere", "Atmosphere", "Land", "Terrain"]);

  constructor(
    container: HTMLElement,
    private callbacks: {
      onSelect: (id: LayerId) => void;
      onToggle: (id: LayerId, visible: boolean) => void;
      onListChange: (variables: VariableItem[]) => void;
      onClose?: () => void;
    }
  ) {
    this.element = document.createElement("div");
    this.element.className = "clima-panel variables-panel";
    container.appendChild(this.element);
    this.render();
  }

  getActiveLayerId(): LayerId {
    return this.activeId;
  }

  getActiveVariables(): VariableItem[] {
    return this.variables.filter((v) => v.visible);
  }

  setActive(id: LayerId): void {
    if (this.activeId !== id) {
      this.activeId = id;
      const existing = this.variables.find((v) => v.id === id);
      if (existing) {
        existing.visible = true;
      } else if (LAYERS[id]) {
        this.variables.push({
          id,
          code: id.toUpperCase(),
          label: `${plainLayerName(id)} (${id})`,
          units: "",
          visible: true,
          color: "#0284c7",
        });
      }

      // Automatically collapse all and open ONLY the category containing this active layer
      const categories = layersByCategory();
      for (const { category, ids } of categories) {
        if (ids.includes(id)) {
          for (const c of categories) {
            this.collapsedCategories.add(c.category);
          }
          this.collapsedCategories.delete(category);
          break;
        }
      }

      this.render();
    }
  }

  private render(): void {
    const categories = layersByCategory();

    this.element.innerHTML = `
      <div class="clima-panel__header">
        <div class="variables-header-left">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
          </svg>
          <span class="clima-panel__title">Data Layers</span>
        </div>
        <div class="variables-header-actions">
          <div class="clima-segmented var-view-switch">
            <button type="button" class="clima-seg-btn ${this.viewMode === "catalog" ? "is-active" : ""}" data-mode="catalog" title="Grouped NASA Catalog">Catalog</button>
            <button type="button" class="clima-seg-btn ${this.viewMode === "active" ? "is-active" : ""}" data-mode="active" title="Multi-Variable Analysis">Active (${this.getActiveVariables().length})</button>
          </div>
          <button type="button" class="clima-icon-btn collapse-var-btn" title="Toggle Collapse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="${this.isCollapsed ? "m6 9 6 6 6-6" : "m18 15-6-6-6 6"}"/></svg>
          </button>
          <button type="button" class="clima-icon-btn close-var-btn" title="Close Panel" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      ${!this.isCollapsed ? `
        ${this.viewMode === "catalog" ? `
          <!-- Search filter input -->
          <div class="variables-search-wrap">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="catalog-filter-input" placeholder="Filter NASA layers..." value="${this.searchQuery}" />
            ${this.searchQuery ? `<button type="button" class="catalog-clear-search-btn">&times;</button>` : ""}
          </div>

          <!-- Grouped NASA Catalog Accordion -->
          <div class="layer-catalog-browser">
            ${categories.map(({ category, ids }) => {
              const matchingIds = ids.filter((id) => {
                if (!this.searchQuery) return true;
                const plain = plainLayerName(id).toLowerCase();
                const desc = (LAYERS[id]?.description ?? "").toLowerCase();
                const q = this.searchQuery.toLowerCase();
                return plain.includes(q) || desc.includes(q) || id.toLowerCase().includes(q);
              });

              if (matchingIds.length === 0) return "";
              const isCatCollapsed = this.collapsedCategories.has(category);

              const catColor = CATEGORY_COLORS[category] ?? { bg: "#f1f5f9", text: "#64748b" };

              return `
                <div class="catalog-category-block" data-category-block="${category}">
                  <div class="catalog-category-header" data-category="${category}">
                    <div class="cat-header-title">
                      <span class="cat-header-icon" style="background: ${catColor.bg}; color: ${catColor.text};">${CATEGORY_ICONS[category] ?? ""}</span>
                      <span class="cat-header-name">${category}</span>
                    </div>
                    <div class="cat-header-meta">
                      <span class="cat-header-count">${matchingIds.length}</span>
                      <svg class="cat-chevron ${isCatCollapsed ? "is-collapsed" : ""}" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>

                  ${!isCatCollapsed ? `
                    <div class="catalog-category-list">
                      ${matchingIds.map((id) => {
                        const cfg = LAYERS[id];
                        const isSelected = this.activeId === id;
                        const inVariables = this.variables.find((v) => v.id === id);
                        const isVisible = inVariables?.visible ?? false;

                        return `
                          <div class="catalog-card ${isSelected ? "is-active" : ""}" data-layer-id="${id}">
                            <div class="catalog-card__main">
                              <button type="button" class="catalog-card__select" title="Activate ${plainLayerName(id)} on globe">
                                <span class="catalog-card__radio ${isSelected ? "is-checked" : ""}">
                                  ${isSelected ? `<span class="catalog-card__radio-dot"></span>` : ""}
                                </span>
                                <div class="catalog-card__info">
                                  <div class="catalog-card__title-row">
                                    <span class="catalog-card__name">${plainLayerName(id)}</span>
                                    <span class="catalog-card__id">${id.toUpperCase()}</span>
                                  </div>
                                  <div class="catalog-card__sensor">
                                    <span>${cfg.dataset?.shortName ?? "NASA GIBS"}</span>
                                    <span class="catalog-card__dot">·</span>
                                    <span>${cfg.start.year}–${cfg.latest?.year ?? 2026}</span>
                                  </div>
                                </div>
                              </button>

                              <button type="button" class="catalog-card__toggle-eye ${isVisible ? "is-on" : ""}" title="${isVisible ? "Hide from multi-variable simulation" : "Add to multi-variable simulation"}" aria-label="Toggle ${plainLayerName(id)}">
                                ${isVisible ? `
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                ` : `
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                                `}
                              </button>
                            </div>
                          </div>
                        `;
                      }).join("")}
                    </div>
                  ` : ""}
                </div>
              `;
            }).join("")}
          </div>
        ` : `
          <!-- Active Variables List (Multi-Variable Simulation Mode) -->
          <div class="variables-active-view">
            <div class="variables-panel__subhead">
              <span class="variables-panel__dataset-label">Active Variables (${this.getActiveVariables().length})</span>
              <button type="button" class="clima-text-btn add-var-btn" title="Browse full catalog">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                <span>Add Layer</span>
              </button>
            </div>

            <div class="variables-panel__list">
              ${this.variables.map((v) => {
                const isActive = v.id === this.activeId;
                return `
                  <div class="variable-row ${isActive ? "is-active" : ""} ${!v.visible ? "is-hidden" : ""}" data-var-id="${v.id}">
                    <button type="button" class="variable-row__select" title="Activate ${v.label} on globe">
                      <span class="variable-row__swatch" style="background-color: ${v.color}"></span>
                      <span class="variable-row__label">${v.label}</span>
                    </button>
                    <div class="variable-row__controls">
                      <button type="button" class="variable-row__btn var-toggle-btn" title="${v.visible ? "Hide variable" : "Show variable"}" aria-label="Toggle ${v.label}">
                        ${v.visible ? `
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        ` : `
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                        `}
                      </button>
                      <button type="button" class="variable-row__btn var-remove-btn" title="Remove ${v.label}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        `}
      ` : ""}
    `;

    // Event listeners
    this.element.querySelector(".close-var-btn")?.addEventListener("click", () => {
      this.callbacks.onClose?.();
    });

    this.element.querySelector(".collapse-var-btn")?.addEventListener("click", () => {
      this.isCollapsed = !this.isCollapsed;
      this.render();
    });

    this.element.querySelectorAll(".var-view-switch button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = (btn as HTMLElement).dataset.mode as "active" | "catalog";
        this.viewMode = mode;
        this.render();
      });
    });

    // Search filter input
    const filterInput = this.element.querySelector<HTMLInputElement>(".catalog-filter-input");
    filterInput?.addEventListener("input", (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.render();
      const updatedInput = this.element.querySelector<HTMLInputElement>(".catalog-filter-input");
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.selectionStart = updatedInput.selectionEnd = this.searchQuery.length;
      }
    });

    this.element.querySelector(".catalog-clear-search-btn")?.addEventListener("click", () => {
      this.searchQuery = "";
      this.render();
    });

    // Category accordions toggle — Single-Open Exclusive Accordion
    this.element.querySelectorAll(".catalog-category-header").forEach((header) => {
      header.addEventListener("click", () => {
        const cat = (header as HTMLElement).dataset.category;
        if (cat) {
          const wasOpen = !this.collapsedCategories.has(cat);
          // Collapse ALL categories so none overlap or stack
          for (const c of categories) {
            this.collapsedCategories.add(c.category);
          }
          // If it was closed, open ONLY this one
          if (!wasOpen) {
            this.collapsedCategories.delete(cat);
          }
          this.render();
        }
      });
    });

    // Catalog card clicks
    this.element.querySelectorAll(".catalog-card").forEach((cardEl) => {
      const layerId = (cardEl as HTMLElement).dataset.layerId as LayerId;

      cardEl.querySelector(".catalog-card__select")?.addEventListener("click", () => {
        this.setActive(layerId);
        this.callbacks.onSelect(layerId);
      });

      cardEl.querySelector(".catalog-card__toggle-eye")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const existing = this.variables.find((v) => v.id === layerId);
        if (existing) {
          existing.visible = !existing.visible;
          this.callbacks.onToggle(layerId, existing.visible);
        } else {
          this.variables.push({
            id: layerId,
            code: layerId.toUpperCase(),
            label: `${plainLayerName(layerId)} (${layerId})`,
            units: "",
            visible: true,
            color: "#0284c7",
          });
          this.callbacks.onToggle(layerId, true);
        }
        this.render();
        this.callbacks.onListChange(this.variables);
      });
    });

    // Active variables list handlers
    this.element.querySelector(".add-var-btn")?.addEventListener("click", () => {
      this.viewMode = "catalog";
      this.render();
    });

    this.element.querySelectorAll(".variable-row").forEach((row) => {
      const varId = (row as HTMLElement).dataset.varId as LayerId;

      row.querySelector(".variable-row__select")?.addEventListener("click", () => {
        this.activeId = varId;
        this.render();
        this.callbacks.onSelect(varId);
      });

      row.querySelector(".var-toggle-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const v = this.variables.find((item) => item.id === varId);
        if (v) {
          v.visible = !v.visible;
          this.render();
          this.callbacks.onToggle(varId, v.visible);
          this.callbacks.onListChange(this.variables);
        }
      });

      row.querySelector(".var-remove-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.variables.length > 1) {
          this.variables = this.variables.filter((item) => item.id !== varId);
          if (this.activeId === varId) {
            this.activeId = this.variables[0].id;
            this.callbacks.onSelect(this.activeId);
          }
          this.render();
          this.callbacks.onListChange(this.variables);
        }
      });
    });
  }
}
