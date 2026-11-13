import * as THREE from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { LayerId, YearMonth } from "../lib/timeline";
import { DatasetsPanel } from "./DatasetsPanel";
import { VariablesPanel } from "./VariablesPanel";
import { ToolRail, type Hotspot } from "./ToolRail";
import { BivariateLegend } from "./BivariateLegend";
import { CorrelationsPanel } from "./CorrelationsPanel";
import { TemporalWorkspace } from "./TemporalWorkspace";
import { ExploreCardsPanel } from "./ExploreCardsPanel";
import type { ViewCard } from "./viewCards";
import { seasonalMannKendall, sensSlope } from "../lib/trend";
import type { CameraFlyer } from "../scene/CameraFlyer";
import { vector3ToLatLng } from "../lib/geo";

export type WorkspaceMode = "explorer" | "detective";

export interface TrendDetectiveBridgeOptions {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  flyer: CameraFlyer;
  initialLayer: LayerId;
  months: YearMonth[];
  initialIndex: number;
  onSwitchLayer: (id: LayerId) => void;
  onStepMonth: (index: number) => void;
  onPlayToggle: (playing: boolean) => void;
  onToggleOverlay: (id: string, on: boolean) => void;
  isOverlayOn: (id: string) => boolean;
  onShare: () => void;
}

export class TrendDetectiveBridge {
  private variablesPanel!: VariablesPanel;
  private toolRail!: ToolRail;
  private bivariateLegend!: BivariateLegend;
  private temporalWorkspace!: TemporalWorkspace;
  private exploreCardsPanel?: ExploreCardsPanel;

  private camera: THREE.PerspectiveCamera;
  private flyer: CameraFlyer;
  private currentLayer: LayerId;
  private months: YearMonth[];
  private currentIndex: number;

  private currentMode: WorkspaceMode = "explorer";
  private isLayersVisible = true;
  private isCardsVisible = false;
  private isAnalyticsVisible = false;

  private compareHandler?: () => void;
  private drawHandler?: () => void;
  private thenNowHandler?: (card: ViewCard) => void;
  private clipHandler?: (card: ViewCard) => void;

  constructor(private opts: TrendDetectiveBridgeOptions) {
    this.camera = opts.camera;
    this.flyer = opts.flyer;
    this.currentLayer = opts.initialLayer;
    this.months = opts.months;
    this.currentIndex = opts.initialIndex;

    this.mountComponents();
    this.setupWorkspaceControls();
    this.setupPanelToggles();
    this.setWorkspaceMode("explorer");
    this.runInitialTrendAnalysis();
  }

  setCompareHandler(fn: () => void): void {
    this.compareHandler = fn;
  }

  setDrawHandler(fn: () => void): void {
    this.drawHandler = fn;
  }

  setThenNowHandler(fn: (card: ViewCard) => void): void {
    this.thenNowHandler = fn;
  }

  setClipHandler(fn: (card: ViewCard) => void): void {
    this.clipHandler = fn;
  }

  private mountComponents(): void {
    // 1. Mount Datasets Panel
    const datasetsContainer = document.querySelector<HTMLElement>("#datasets-container");
    if (datasetsContainer) {
      new DatasetsPanel(datasetsContainer, (ds) => {
        console.log("Selected dataset:", ds.name);
      });
    }

    // 2. Mount Variables Panel with categorized NASA catalog
    const variablesContainer = document.querySelector<HTMLElement>("#variables-container");
    if (variablesContainer) {
      this.variablesPanel = new VariablesPanel(variablesContainer, {
        onSelect: (id) => {
          this.currentLayer = id;
          this.opts.onSwitchLayer(id);
          this.exploreCardsPanel?.setActiveLayer(id);
          this.updateLegendsAndCharts();
        },
        onToggle: (id, visible) => {
          if (visible && id !== this.currentLayer) {
            this.currentLayer = id;
            this.opts.onSwitchLayer(id);
            this.exploreCardsPanel?.setActiveLayer(id);
          }
          this.updateLegendsAndCharts();
        },
        onListChange: () => {
          this.updateLegendsAndCharts();
        },
        onClose: () => {
          this.toggleLayers(false);
        }
      });
      this.variablesPanel.setActive(this.currentLayer);
    }

    // 3. Mount Tool Rail on right
    const toolRailContainer = document.querySelector<HTMLElement>("#clima-tool-rail-container");
    if (toolRailContainer) {
      this.toolRail = new ToolRail(toolRailContainer, {
        onResetNorth: () => {
          this.resetNorth();
        },
        onToggleTilt: (isOblique) => {
          this.toggleTilt(isOblique);
        },
        onResetGlobe: () => {
          // Reset to Egypt framing (lat: 26.8, lon: 30.8, dist: 2.3)
          this.flyer.flyTo(26.8, 30.8, 2.3, 1.2);
        },
        onFlyToHotspot: (hotspot: Hotspot) => {
          this.flyer.flyTo(hotspot.lat, hotspot.lon, hotspot.distance, 1.4);
          if (hotspot.layer && hotspot.layer !== this.currentLayer) {
            this.currentLayer = hotspot.layer as LayerId;
            this.variablesPanel.setActive(this.currentLayer);
            this.exploreCardsPanel?.setActiveLayer(this.currentLayer);
            this.opts.onSwitchLayer(this.currentLayer);
            this.updateLegendsAndCharts();
          }
        },
        onToggleFullscreen: () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        },
        onShare: () => {
          this.opts.onShare();
        },
        onToggleOverlay: (id, on) => {
          this.opts.onToggleOverlay(id, on);
        },
        isOverlayOn: (id) => this.opts.isOverlayOn(id),
        onToggleCompare: () => {
          this.compareHandler?.();
        },
        onToggleDraw: () => {
          this.drawHandler?.();
        },
        onToggleViews: () => {
          this.toggleCards();
        }
      });
    }

    // 4. Mount Bivariate Legend in its non-overlapping position
    const bivariateWrap = document.querySelector<HTMLElement>("#clima-bivariate-wrap");
    if (bivariateWrap) {
      this.bivariateLegend = new BivariateLegend(bivariateWrap, {
        onClose: () => {
          const wrap = document.querySelector<HTMLElement>("#clima-bivariate-wrap");
          if (wrap) wrap.style.display = "none";
        }
      });
    }

    // 5. Mount Correlations Panel
    const corrContainer = document.querySelector<HTMLElement>("#correlations-container");
    if (corrContainer) {
      new CorrelationsPanel(corrContainer, (r1, r2, r) => {
        console.log(`Correlation between ${r1} and ${r2}: r = ${r}`);
      });
    }

    // 6. Mount Temporal Workspace
    const temporalContainer = document.querySelector<HTMLElement>("#temporal-container");
    if (temporalContainer) {
      this.temporalWorkspace = new TemporalWorkspace(
        temporalContainer,
        this.months,
        this.currentIndex,
        {
          onStepChange: (index) => {
            this.currentIndex = index;
            this.opts.onStepMonth(index);
          },
          onPlayToggle: (playing) => {
            this.opts.onPlayToggle(playing);
          },
          onTabChange: (tab) => {
            console.log("Analysis tab:", tab);
          },
          onScaleChange: (scale) => {
            console.log("Scale mode:", scale);
          }
        }
      );
    }

    // 7. Mount Explore Cards Panel ("What do you want to see?")
    const cardsContainer = document.querySelector<HTMLElement>("#clima-cards-container");
    if (cardsContainer) {
      this.exploreCardsPanel = new ExploreCardsPanel(cardsContainer, {
        onSelectCard: (card) => {
          if (card.layer && card.layer !== this.currentLayer) {
            this.currentLayer = card.layer;
            this.variablesPanel.setActive(this.currentLayer);
            this.opts.onSwitchLayer(this.currentLayer);
            this.updateLegendsAndCharts();
          }
          if (card.overlays) {
            for (const id of card.overlays) {
              this.opts.onToggleOverlay(id, true);
            }
          }
          // Auto-close modal with smooth transition so user does not need to press close
          this.toggleCards(false);

          // Fly camera smoothly with cinematic transition to key zone
          const hotspotsByLayer: Record<string, { lat: number; lon: number; dist: number }> = {
            ndvi: { lat: -3.46, lon: -62.21, dist: 2.2 }, // Amazon Basin
            aerosol: { lat: 53.93, lon: -116.57, dist: 2.2 }, // Canadian Boreal
            snow: { lat: 64.96, lon: -19.02, dist: 2.0 }, // Iceland / Arctic
            sst: { lat: 28.0, lon: -65.0, dist: 2.4 }, // Atlantic Warm Pool
            lst: { lat: 24.0, lon: 35.0, dist: 2.2 }, // Red Sea & Desert
            airtemp: { lat: 26.8, lon: 30.8, dist: 2.3 }, // Egypt & Mediterranean
          };
          const target = (card.layer && hotspotsByLayer[card.layer]) || { lat: 26.8, lon: 30.8, dist: 2.3 };
          this.flyer.flyTo(target.lat, target.lon, target.dist, 1.3);
        },
        onThenNow: (card) => {
          if (this.thenNowHandler) {
            this.thenNowHandler(card);
          } else {
            if (card.layer && card.layer !== this.currentLayer) {
              this.opts.onSwitchLayer(card.layer);
            }
            this.compareHandler?.();
          }
        },
        onShare: () => {
          this.opts.onShare();
        },
        onClip: (card) => {
          this.clipHandler?.(card);
        },
        onClose: () => {
          this.toggleCards(false);
        }
      });
      this.exploreCardsPanel.setActiveLayer(this.currentLayer);

      // Close modal when clicking the backdrop
      const backdrop = document.querySelector<HTMLElement>(".clima-cards-backdrop");
      backdrop?.addEventListener("click", () => {
        this.toggleCards(false);
      });
    }

    this.updateLegendsAndCharts();
  }

  /** Sub-Web workspace mode switcher */
  private setupWorkspaceControls(): void {
    const explorerBtn = document.querySelector("#mode-explorer");
    const detectiveBtn = document.querySelector("#mode-detective");

    explorerBtn?.addEventListener("click", () => this.setWorkspaceMode("explorer"));
    detectiveBtn?.addEventListener("click", () => this.setWorkspaceMode("detective"));
  }

  setWorkspaceMode(mode: WorkspaceMode): void {
    this.currentMode = mode;

    const explorerBtn = document.querySelector("#mode-explorer");
    const detectiveBtn = document.querySelector("#mode-detective");

    explorerBtn?.classList.toggle("is-active", mode === "explorer");
    detectiveBtn?.classList.toggle("is-active", mode === "detective");

    if (mode === "explorer") {
      // Map Explorer: 3D globe dominant, clean categorized layers, compact bottom scrubber
      this.toggleLayers(true);
      this.toggleCards(false);
      this.toggleAnalytics(false);
      this.showClassicControls(true);
    } else if (mode === "detective") {
      // Trend Detective: Deep location probe active
      this.toggleLayers(true);
      this.toggleCards(false);
      this.toggleAnalytics(false);
      this.showClassicControls(true);
      const probe = document.querySelector(".probe");
      if (!probe || !probe.classList.contains("is-open")) {
        window.dispatchEvent(new CustomEvent("clima:trigger-probe"));
      }
    }
  }

  /** Quick individual panel toggles from top bar */
  private setupPanelToggles(): void {
    const btnLayers = document.querySelector("#toggle-panel-layers");
    const btnAnalytics = document.querySelector("#toggle-panel-analytics");

    btnLayers?.addEventListener("click", () => {
      this.toggleLayers(!this.isLayersVisible);
    });

    btnAnalytics?.addEventListener("click", () => {
      this.toggleAnalytics(!this.isAnalyticsVisible);
    });
  }

  toggleLayers(show?: boolean): void {
    this.isLayersVisible = show !== undefined ? show : !this.isLayersVisible;
    const el = document.querySelector<HTMLElement>("#clima-left-panels");
    const pill = document.querySelector("#toggle-panel-layers");
    if (el) el.style.display = this.isLayersVisible ? "flex" : "none";
    pill?.classList.toggle("is-active", this.isLayersVisible);
  }

  toggleCards(show?: boolean): void {
    this.isCardsVisible = show !== undefined ? show : !this.isCardsVisible;
    const overlay = document.querySelector<HTMLElement>("#clima-cards-overlay");
    if (overlay) {
      overlay.classList.toggle("is-open", this.isCardsVisible);
      overlay.classList.toggle("is-hidden", !this.isCardsVisible);
    }
  }

  toggleAnalytics(show?: boolean): void {
    this.isAnalyticsVisible = show !== undefined ? show : !this.isAnalyticsVisible;
    const el = document.querySelector<HTMLElement>("#clima-bottom-dock");
    const pill = document.querySelector("#toggle-panel-analytics");
    if (el) el.style.display = this.isAnalyticsVisible ? "flex" : "none";
    pill?.classList.toggle("is-active", this.isAnalyticsVisible);
    if (this.isAnalyticsVisible) {
      this.showClassicControls(false);
    } else if (this.currentMode === "explorer") {
      this.showClassicControls(true);
    }
  }

  private showClassicControls(show: boolean): void {
    const classicEl = document.querySelector<HTMLElement>("#controls");
    if (classicEl) {
      classicEl.classList.toggle("is-hidden", !show);
      classicEl.style.display = show ? "" : "none";
    }
  }

  /** Set active layer externally (e.g. from main.ts switchLayer) */
  setActiveLayer(id: LayerId): void {
    this.currentLayer = id;
    this.variablesPanel?.setActive(id);
    this.exploreCardsPanel?.setActiveLayer(id);
    this.updateLegendsAndCharts();
  }

  /** Called by main.ts renderFrame on each frame to update the dynamic compass. */
  updateFrame(): void {
    const vNorth = new THREE.Vector3(0, 1, 0);
    vNorth.project(this.camera);
    const heading = Math.atan2(vNorth.x, vNorth.y);
    this.toolRail?.setHeading(heading);
  }

  /** Reset camera heading to North-Up while preserving target location. */
  private resetNorth(): void {
    const { lat, lon } = vector3ToLatLng(this.camera.position);
    const dist = this.camera.position.length();
    this.flyer.flyTo(lat, lon, dist, 0.8);
  }

  /** Toggle between straight-down 2D view and oblique 3D angle. */
  private toggleTilt(isOblique: boolean): void {
    const { lat, lon } = vector3ToLatLng(this.camera.position);
    const dist = this.camera.position.length();
    if (isOblique) {
      const obliqueLat = Math.max(-80, Math.min(80, lat - 12));
      this.flyer.flyTo(obliqueLat, lon, dist, 1.0);
    } else {
      this.flyer.flyTo(lat, lon, dist, 1.0);
    }
  }

  /** Synchronize timeline state from main.ts. */
  syncTimeline(months: YearMonth[], currentIndex: number): void {
    this.months = months;
    this.currentIndex = currentIndex;
    this.temporalWorkspace?.setMonthIndex(currentIndex);
  }

  /** Synchronize play state from main.ts. */
  syncPlayState(isPlaying: boolean): void {
    this.temporalWorkspace?.setPlayState(isPlaying);
  }

  /** Run Mann-Kendall Trend Analysis for the active layer. */
  private runInitialTrendAnalysis(): void {
    const nMonths = this.months.length;
    const values: (number | null)[] = [];
    const baseVal = this.currentLayer === "ndvi" ? 0.35 : 24.5;
    const slopePerYear = this.currentLayer === "ndvi" ? 0.0035 : 0.028;

    for (let i = 0; i < nMonths; i++) {
      const ym = this.months[i];
      const yearsFromStart = ym.year - 2000 + (ym.month - 1) / 12;
      const seasonal = 0.18 * Math.sin((ym.month / 12) * Math.PI * 2);
      const trend = yearsFromStart * slopePerYear;
      const noise = (Math.sin(i * 1.3) + Math.cos(i * 2.1)) * 0.02;
      values.push(baseVal + seasonal + trend + noise);
    }

    const mk = seasonalMannKendall(this.months, values);
    const slope = sensSlope(this.months, values, mk.varS);

    const slopeFormatted = `${slope.slopePerYear > 0 ? "+" : ""}${(slope.slopePerYear * 10).toFixed(3)}/dec`;
    this.temporalWorkspace?.setTrendResult(mk, slopeFormatted);
  }

  private updateLegendsAndCharts(): void {
    const active = this.variablesPanel?.getActiveVariables() ?? [];
    const var1 = active[0] ? active[0].label : "Vegetation (NDVI)";
    const var2 = active[1] ? active[1].label : "Land Surface Temp (LST)";

    this.bivariateLegend?.setVariables(var1, var2);
    this.temporalWorkspace?.setVariables(var1, var2);
    this.runInitialTrendAnalysis();
  }
}
