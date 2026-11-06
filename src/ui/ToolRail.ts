export interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distance: number;
  layer: string;
  description: string;
}

export const EGYPT_HOTSPOTS: Hotspot[] = [
  {
    id: "nile-delta",
    name: "Nile Delta (Agricultural Greenness)",
    lat: 30.8,
    lon: 31.0,
    distance: 1.5,
    layer: "ndvi",
    description: "Agricultural intensification, seasonal vegetation cycle, and soil degradation monitoring."
  },
  {
    id: "lake-nasser",
    name: "Lake Nasser & Aswan Dam",
    lat: 23.97,
    lon: 32.88,
    distance: 1.6,
    layer: "soil",
    description: "Water reservoir levels, evaporative loss, and hydrological dynamics in Upper Egypt."
  },
  {
    id: "toshka-lakes",
    name: "Toshka Depression & Western Desert",
    lat: 23.1,
    lon: 30.5,
    distance: 1.6,
    layer: "lst",
    description: "Land reclamation projects and extreme surface thermal regimes in hyper-arid zones."
  },
  {
    id: "sinai-peninsula",
    name: "Sinai & Gulf of Suez",
    lat: 29.0,
    lon: 33.8,
    distance: 1.7,
    layer: "airtemp",
    description: "Mountain thermal regimes and aerosol transport channels across the Red Sea rift."
  },
  {
    id: "red-sea-coast",
    name: "Red Sea Marine Biosphere",
    lat: 26.5,
    lon: 35.0,
    distance: 1.8,
    layer: "sst",
    description: "Northern Red Sea thermal warming trends and high-salinity coral reef baseline."
  }
];

export interface ToolRailCallbacks {
  onResetNorth: () => void;
  onToggleTilt: (isOblique: boolean) => void;
  onResetGlobe: () => void;
  onFlyToHotspot: (hotspot: Hotspot) => void;
  onToggleFullscreen: () => void;
  onShare: () => void;
  onToggleOverlay: (id: string, on: boolean) => void;
  isOverlayOn: (id: string) => boolean;
  onToggleCompare?: () => void;
  onToggleDraw?: () => void;
  onToggleViews?: () => void;
}

export class ToolRail {
  readonly element: HTMLElement;
  private compassNeedle: HTMLElement | null = null;
  private isOblique = true;
  private showHotspotsMenu = false;
  private showOverlaysMenu = false;

  constructor(
    container: HTMLElement,
    private callbacks: ToolRailCallbacks
  ) {
    this.element = document.createElement("div");
    this.element.className = "clima-tool-rail";
    container.appendChild(this.element);
    this.render();
  }

  /** Update the compass needle angle (in radians or degrees). */
  setHeading(headingRad: number): void {
    if (this.compassNeedle) {
      const deg = (-headingRad * 180) / Math.PI;
      this.compassNeedle.style.transform = `rotate(${deg}deg)`;
    }
  }

  private render(): void {
    this.element.innerHTML = `
      <!-- North-up Compass -->
      <button type="button" class="tool-rail__btn compass-btn" title="Reset North Up (Click to align)" aria-label="North-up Compass">
        <span class="compass-label">N</span>
        <span class="compass-needle">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L6 14l6-3 6 3L12 2z" fill="#ef4444"/>
            <path d="M12 22l-6-8 6 3 6-3-6 8z" fill="#94a3b8"/>
          </svg>
        </span>
      </button>

      <!-- Tilt 2D / 3D Toggle -->
      <button type="button" class="tool-rail__btn tilt-btn" title="Toggle 2D / 3D Tilt View" aria-label="Toggle Tilt">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="m3.27 6.96 8.73 4.85 8.73-4.85"/><path d="M12 22V12"/>
        </svg>
        <span class="tool-rail__btn-sub">${this.isOblique ? "3D" : "2D"}</span>
      </button>

      <!-- Reset Globe View (Center Egypt) -->
      <button type="button" class="tool-rail__btn reset-btn" title="Reset Globe to Egypt / Regional View" aria-label="Reset Globe">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20"/>
        </svg>
        <span class="tool-rail__btn-sub">Reset</span>
      </button>

      <!-- Hotspots / Presets (Egypt) -->
      <div class="tool-rail__dropdown-wrap">
        <button type="button" class="tool-rail__btn hotspots-btn ${this.showHotspotsMenu ? "is-active" : ""}" title="Egypt Regional Hotspots" aria-label="Regional Hotspots">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span class="tool-rail__btn-sub">Egypt</span>
        </button>

        ${this.showHotspotsMenu ? `
          <div class="tool-rail__menu hotspots-menu">
            <div class="tool-rail__menu-title">Study Regions (Egypt)</div>
            ${EGYPT_HOTSPOTS.map(
              (h) => `
              <button type="button" class="hotspot-item" data-hotspot-id="${h.id}">
                <div class="hotspot-item__name">${h.name}</div>
                <div class="hotspot-item__desc">${h.description}</div>
              </button>
            `
            ).join("")}
          </div>
        ` : ""}
      </div>

      <!-- Compare Split Divider Tool -->
      <button type="button" class="tool-rail__btn compare-btn" title="Split Compare (Then & Now)" aria-label="Split Compare">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <line x1="12" y1="3" x2="12" y2="21"/><polyline points="8 8 4 12 8 16"/><polyline points="16 8 20 12 16 16"/>
        </svg>
        <span class="tool-rail__btn-sub">Compare</span>
      </button>

      <!-- Draw Study Region Bounding Box Tool -->
      <button type="button" class="tool-rail__btn draw-btn" title="Draw Study Region Bounding Box" aria-label="Draw Region">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><circle cx="3" cy="3" r="1.5"/><circle cx="21" cy="21" r="1.5"/>
        </svg>
        <span class="tool-rail__btn-sub">Draw</span>
      </button>

      <!-- Explore Views Cards Drawer Toggle -->
      <button type="button" class="tool-rail__btn views-btn" title="Featured Views & Satellite Stories" aria-label="Explore Views">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        <span class="tool-rail__btn-sub">Views</span>
      </button>

      <!-- Context Overlays Popover -->
      <div class="tool-rail__dropdown-wrap">
        <button type="button" class="tool-rail__btn overlays-btn ${this.showOverlaysMenu ? "is-active" : ""}" title="Map Context Overlays" aria-label="Context Overlays">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
          </svg>
          <span class="tool-rail__btn-sub">Context</span>
        </button>

        ${this.showOverlaysMenu ? `
          <div class="tool-rail__menu overlays-menu">
            <div class="tool-rail__menu-title">Map Overlays</div>
            <label class="overlay-toggle-item">
              <input type="checkbox" data-overlay-id="borders" ${this.callbacks.isOverlayOn("borders") ? "checked" : ""}>
              <span>National Borders</span>
            </label>
            <label class="overlay-toggle-item">
              <input type="checkbox" data-overlay-id="cities" ${this.callbacks.isOverlayOn("cities") ? "checked" : ""}>
              <span>Major Cities & Capitals</span>
            </label>
            <label class="overlay-toggle-item">
              <input type="checkbox" data-overlay-id="plate-boundaries" ${this.callbacks.isOverlayOn("plate-boundaries") ? "checked" : ""}>
              <span>Tectonic Plate Boundaries</span>
            </label>
            <label class="overlay-toggle-item">
              <input type="checkbox" data-overlay-id="earthquakes" ${this.callbacks.isOverlayOn("earthquakes") ? "checked" : ""}>
              <span>USGS Seismicity (30d)</span>
            </label>
            <label class="overlay-toggle-item">
              <input type="checkbox" data-overlay-id="atmosphere" ${this.callbacks.isOverlayOn("atmosphere") ? "checked" : ""}>
              <span>Atmospheric Glow</span>
            </label>
          </div>
        ` : ""}
      </div>

      <!-- Fullscreen Toggle -->
      <button type="button" class="tool-rail__btn fullscreen-btn" title="Toggle Fullscreen" aria-label="Fullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>

      <!-- Share View Link -->
      <button type="button" class="tool-rail__btn share-btn" title="Share View State (URL)" aria-label="Share View">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>
    `;

    this.compassNeedle = this.element.querySelector(".compass-needle");

    // Compass click
    this.element.querySelector(".compass-btn")?.addEventListener("click", () => {
      this.callbacks.onResetNorth();
    });

    // Tilt toggle
    this.element.querySelector(".tilt-btn")?.addEventListener("click", () => {
      this.isOblique = !this.isOblique;
      this.callbacks.onToggleTilt(this.isOblique);
      this.render();
    });

    // Reset globe
    this.element.querySelector(".reset-btn")?.addEventListener("click", () => {
      this.callbacks.onResetGlobe();
    });

    // Hotspots toggle & clicks
    this.element.querySelector(".hotspots-btn")?.addEventListener("click", () => {
      this.showHotspotsMenu = !this.showHotspotsMenu;
      this.showOverlaysMenu = false;
      this.render();
    });

    this.element.querySelectorAll(".hotspot-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.hotspotId;
        const hotspot = EGYPT_HOTSPOTS.find((h) => h.id === id);
        if (hotspot) {
          this.callbacks.onFlyToHotspot(hotspot);
          this.showHotspotsMenu = false;
          this.render();
        }
      });
    });

    // Compare click
    this.element.querySelector(".compare-btn")?.addEventListener("click", () => {
      this.callbacks.onToggleCompare?.();
    });

    // Draw click
    this.element.querySelector(".draw-btn")?.addEventListener("click", () => {
      this.callbacks.onToggleDraw?.();
    });

    // Views click
    this.element.querySelector(".views-btn")?.addEventListener("click", () => {
      this.callbacks.onToggleViews?.();
    });

    // Overlays toggle & change
    this.element.querySelector(".overlays-btn")?.addEventListener("click", () => {
      this.showOverlaysMenu = !this.showOverlaysMenu;
      this.showHotspotsMenu = false;
      this.render();
    });

    this.element.querySelectorAll<HTMLInputElement>(".overlay-toggle-item input").forEach((input) => {
      input.addEventListener("change", () => {
        const id = input.dataset.overlayId;
        if (id) {
          this.callbacks.onToggleOverlay(id, input.checked);
        }
      });
    });

    // Fullscreen
    this.element.querySelector(".fullscreen-btn")?.addEventListener("click", () => {
      this.callbacks.onToggleFullscreen();
    });

    // Share
    this.element.querySelector(".share-btn")?.addEventListener("click", () => {
      this.callbacks.onShare();
    });
  }
}
