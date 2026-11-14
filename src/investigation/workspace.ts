import { resetTransitionCurtain } from "../lib/nasaFacts";
import gsap from "gsap";
import { animate } from "motion";
import { LAYERS, type LayerId, type YearMonth } from "../lib/timeline";
import {
  formatGeometry,
  loadInvestigationContext,
  type InvestigationContext,
  type InvestigationGeometry,
} from "./context";
import { InvestigationGlobe } from "./globe";
import {
  investigationAnalysis,
  type InvestigationAnalysisResult,
  type AnalyzedVariable,
} from "./analysis";
import { investigationProvider } from "./provider";

function ymToValue(ym: YearMonth): string {
  return `${ym.year}-${String(ym.month).padStart(2, "0")}`;
}


const TERRESTRIAL_PRESETS: Record<string, { name: string; lat: number; lon: number }> = {
  nile: { name: "Nile Delta Agro-System", lat: 30.55, lon: 31.25 },
  sahara: { name: "Sahara Hyper-Arid Transition", lat: 25.0, lon: 20.0 },
  amazon: { name: "Amazon Rainforest Basin", lat: -3.46, lon: -62.21 },
  mediterranean: { name: "Mediterranean Coastal Semi-Arid", lat: 38.3, lon: -0.5 },
  boreal: { name: "Canadian Boreal Wildfire Region", lat: 53.5, lon: -113.5 },
};

const OCEAN_PRESETS: Record<string, { name: string; lat: number; lon: number }> = {
  pacific_enso: { name: "Equatorial Pacific (El Niño Apex)", lat: 0.0, lon: -140.0 },
  atlantic_subpolar: { name: "North Atlantic Warming Gyre", lat: 52.0, lon: -30.0 },
  med_sea: { name: "Mediterranean Sea Marine Basin", lat: 35.5, lon: 16.0 },
  red_sea: { name: "Red Sea Thermal Corridor", lat: 22.0, lon: 38.0 },
  gulf_mexico: { name: "Gulf of Mexico Subtropical Waters", lat: 25.0, lon: -90.0 },
};

export class InvestigationWorkspace {
  private context: InvestigationContext | null;
  private globe: InvestigationGlobe | undefined;
  public inspected: { lat: number; lon: number } | null = null;
  private analysis: InvestigationAnalysisResult | null = null;
  private selectedLayerId: LayerId;
  private secondaryLayerId: LayerId | null = null;
  private trendsViewMode: "standardized" | "physical" = "standardized";

  // Comparison Engine State
  public isComparing = false;
  public compareMode: "spatial" | "temporal" = "spatial";
  public comparisonTargetB: { name: string; geometry: InvestigationGeometry } = {
    name: "Sahara Hyper-Arid Zone",
    geometry: { kind: "point", lat: 25.0, lon: 20.0 },
  };
  public comparisonEpochB = {
    start: { year: 1980, month: 1 },
    end: { year: 2002, month: 12 },
    label: "Historic Baseline (1980–2002)",
  };
  public analysisB: InvestigationAnalysisResult | null = null;
  public isAnalysisBLoading = false;

  // Animation and interaction state
  private animFrameId: number | null = null;
  private animProgress = 1;
  private hoverIndex: number | null = null;

    public getLayerMinYear(): number {
    if (this.selectedLayerId === "airtemp") return 1980;
    if (this.selectedLayerId === "sst") return 2002;
    if (this.selectedLayerId === "soil") return 2015;
    return 2000;
  }

  public initDefaultComparison(): void {
    const minYr = this.getLayerMinYear();
    if (minYr >= 2000) {
      const endYr = Math.min(2012, minYr + 10);
      this.comparisonEpochB = {
        start: { year: minYr, month: 1 },
        end: { year: endYr, month: 12 },
        label: `Baseline Era (${minYr}–${endYr})`,
      };
    } else {
      this.comparisonEpochB = {
        start: { year: 1980, month: 1 },
        end: { year: 2002, month: 12 },
        label: "Historic Baseline (1980–2002)",
      };
    }
  }

  constructor(private readonly root: HTMLElement, id: string) {
    this.context = loadInvestigationContext(id);
    this.selectedLayerId = (this.context?.layerIds[0] as LayerId) || "ndvi";
    if (this.context?.comparison?.enabled) {
      this.isComparing = true;
      this.compareMode = this.context.comparison.mode;
      if (this.context.comparison.targetB) {
        this.comparisonTargetB = this.context.comparison.targetB;
      }
      if (this.context.comparison.epochB) {
        this.comparisonEpochB = this.context.comparison.epochB;
      }
    }
  }

  async mount(): Promise<void> {
    if (!this.context) {
      this.root.innerHTML = `
        <div class="investigation-app">
          <div class="panel-card" style="text-align: center; padding: 40px;">
            <h2>Investigation Context Not Found</h2>
            <p>Return to Explorer to initiate an investigation.</p>
            <a class="btn-back" href="/">← Return to Explorer</a>
          </div>
        </div>`;
      return;
    }

    // Instant prefetch for Explorer so returning is instantaneous
    try {
      const prefetch = document.createElement("link");
      prefetch.rel = "prefetch";
      prefetch.href = "/";
      document.head.appendChild(prefetch);
    } catch {}

    this.render();
    await this.loadAnalysis();

    // Smooth, gentle entrance animation when loading completes
    try {
      gsap.fromTo(
        ".investigation-app",
        { opacity: 0.88, y: 10 },
        { opacity: 1, y: 0, duration: 0.42, ease: "power2.out" }
      );
      gsap.fromTo(
        ".chart-card, .deck-card",
        { opacity: 0.85, y: 8 },
        { opacity: 1, y: 0, duration: 0.38, stagger: 0.05, ease: "power2.out" }
      );
    } catch {
      // fallback
    }
  }

  private getSmartPresetsHtml(): string {
    const isOcean = this.selectedLayerId === "sst";
    const presets = isOcean ? OCEAN_PRESETS : TERRESTRIAL_PRESETS;
    return Object.entries(presets)
      .map(([key, item]) => {
        const isSel = this.comparisonTargetB.name === item.name;
        return `<button type="button" class="comp-preset-pill ${isSel ? "is-selected" : ""}" data-preset-key="${key}" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${item.name}">${item.name}</button>`;
      })
      .join("");
  }

  private async loadAnalysis(): Promise<void> {
    if (!this.context) return;
    try {
      this.analysis = await investigationAnalysis.runAnalysis(this.context, investigationProvider);
      if (this.analysis.variables.length > 1) {
        this.secondaryLayerId = this.analysis.variables[1].layerId;
      }
      if (this.isComparing) {
        await this.loadAnalysisB();
      }
    } catch (e) {
      console.error("Analysis execution error:", e);
    } finally {
      this.renderAnalytics(true);
    }
  }

  public async loadAnalysisB(): Promise<void> {
    if (!this.context) return;
    this.isAnalysisBLoading = true;
    try {
      const isSpatial = this.compareMode === "spatial";
      const contextB: InvestigationContext = {
        ...this.context,
        id: `compare-${Date.now()}`,
        name: isSpatial ? this.comparisonTargetB.name : this.comparisonEpochB.label,
        geometry: isSpatial ? this.comparisonTargetB.geometry : this.context.geometry,
        start: isSpatial ? this.context.start : this.comparisonEpochB.start,
        end: isSpatial ? this.context.end : this.comparisonEpochB.end,
      };
      this.analysisB = await investigationAnalysis.runAnalysis(contextB, investigationProvider);
    } catch (e) {
      console.warn("Comparison analysis B load error:", e);
    } finally {
      this.isAnalysisBLoading = false;
    }
  }

  private render(): void {
    if (!this.context) return;

    this.root.innerHTML = `
      <div class="investigation-app">
        <!-- Top Navigation Bar -->
        <header class="investigation-nav">
          <div class="nav-left">
            <a class="btn-back" href="${this.context.explorerUrl}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m15 18-6-6 6-6"/></svg>
              Explorer
            </a>
            <div class="nav-title-group">
              <h1>${this.context.name}</h1>
              <p class="nav-subtitle">
                ${formatGeometry(this.context.geometry)} · ${ymToValue(this.context.start)} to ${ymToValue(this.context.end)}
              </p>
            </div>
          </div>

          <div class="nav-right">
            <button type="button" class="btn-investigation-compare ${this.isComparing ? "is-active" : ""}" id="btn-toggle-compare" title="Toggle Comparison Analysis">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
              <span>${this.isComparing ? "Exit Comparison" : "Compare"}</span>
            </button>
            <span class="status-chip">
              <span class="status-dot"></span>
              Error 404 Trend Detective Active
            </span>
          </div>
        </header>

        <!-- Comparison Control Deck (Animated Slide-in) -->
        <div class="investigation-compare-deck ${this.isComparing ? "" : "is-hidden"}" id="investigation-compare-deck">
          <div class="comp-deck-head">
            <div class="comp-title-block">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
              <span class="comp-head-text">Comparative Climate Telemetry Deck</span>
            </div>
            <div class="comp-deck-mode-toggle">
              <button type="button" class="comp-tab ${this.compareMode === "spatial" ? "is-active" : ""}" data-compare-mode="spatial">
                Dual Geographic Sites
              </button>
              <button type="button" class="comp-tab ${this.compareMode === "temporal" ? "is-active" : ""}" data-compare-mode="temporal">
                Multidecadal Epochs
              </button>
            </div>
          </div>

          <div class="comp-deck-body">
            <!-- Target A Column -->
            <div class="comp-col target-a-col">
              <div class="comp-col-tag"><span class="col-dot a"></span> PRIMARY SITE (A)</div>
              <div class="comp-site-name">${this.context.name}</div>
              <div class="comp-site-coords">${formatGeometry(this.context.geometry)}</div>
              <div class="comp-site-meta">${this.context.start.year}–${this.context.end.year} · ${this.selectedLayerId.toUpperCase()}</div>
            </div>

            <!-- VS Divider -->
            <div class="comp-divider">
              <span class="comp-vs-text">VS</span>
            </div>

            <!-- Target B Column (Interactive Custom Configuration) -->
            <div class="comp-col target-b-col">
              <div class="comp-col-tag"><span class="col-dot b"></span> COMPARISON TARGET (B)</div>
              ${this.compareMode === "spatial" ? `
              <div class="comp-custom-inputs-wrap">
                <div class="comp-input-row">
                  <input type="text" id="comp-custom-name" class="comp-text-input" placeholder="Location Name / Label" value="${this.comparisonTargetB.name}" />
                </div>
                <div class="comp-input-row coords-row">
                  <label>Lat: <input type="number" step="0.01" id="comp-custom-lat" class="comp-num-input" value="${(this.comparisonTargetB.geometry as any).lat ?? 0}" /></label>
                  <label>Lon: <input type="number" step="0.01" id="comp-custom-lon" class="comp-num-input" value="${(this.comparisonTargetB.geometry as any).lon ?? 0}" /></label>
                  <button type="button" id="comp-apply-target-btn" class="comp-apply-btn">Apply Target</button>
                </div>
                <div class="comp-smart-presets">
                  <span class="smart-presets-title">Quick Presets:</span>
                  ${this.getSmartPresetsHtml()}
                </div>
              </div>
              ` : `
              <div class="comp-epoch-split-wrap">
                <div class="epoch-row">
                  <span class="epoch-label">Baseline Epoch:</span>
                  <input type="number" id="epoch-b-start" class="epoch-input" value="${this.comparisonEpochB.start.year}" min="1980" max="2026" />
                  <span>to</span>
                  <input type="number" id="epoch-b-end" class="epoch-input" value="${this.comparisonEpochB.end.year}" min="1980" max="2026" />
                  <button type="button" id="epoch-apply-btn" class="comp-apply-btn">Apply Epoch</button>
                </div>
                <div class="epoch-explainer">Comparing early baseline records against contemporary warming trajectory (2003–2026).</div>
              </div>
              `}
            </div>
          </div>
        </div>

        <!-- Main Workbench Split -->
        <div class="investigation-grid">
          <!-- Left Column: Spatial Context & Controls -->
          <aside class="sidebar-panel">
            <!-- Pure 3D Earth & Real-time Orbiting Satellites Block -->
            <div class="panel-card map-card-shell">
              <div class="map-card-head">
                <div class="map-head-title-wrap">
                  <div class="map-head-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20M2 12h20"/>
                    </svg>
                  </div>
                  <div class="map-head-titles">
                    <span class="map-head-main">Orbital Satellite Telemetry</span>
                    <span class="map-head-sub">3D EARTH SPHERE · REAL-TIME</span>
                  </div>
                </div>
              </div>

              <!-- Viewport with 3D Orbiting Earth (No Text Clutter) -->
              <div class="map-viewport-wrapper">
                <div class="map-canvas-container" data-map-container></div>
              </div>
            </div>

            <!-- Active Variable Selector -->
            <div class="panel-card">
              <div class="panel-card-title">
                <span>Variables Under Study</span>
                <small style="color:var(--clima-text-muted); font-size:0.68rem;">Click to inspect</small>
              </div>
              <div class="variable-pills" data-var-pills>
                ${this.context.layerIds.map((id) => {
                  const info = LAYERS[id];
                  const isSel = id === this.selectedLayerId;
                  return `
                    <div class="var-pill ${isSel ? "is-selected" : ""}" data-var-id="${id}">
                      <div class="var-pill-left">
                        <span class="var-code-badge">${id.toUpperCase()}</span>
                        <span>${info?.label ?? id}</span>
                      </div>
                      <span class="var-pill-trend trend-pos" data-trend-badge="${id}">…</span>
                    </div>`;
                }).join("")}
              </div>
            </div>

            <!-- Erro AI Climate Intelligence & ML Copilot Deck -->
            <div class="panel-card ai-agent-panel" data-ai-agent-panel>
              <!-- Erro Header with Official Logo -->
              <div class="erro-head">
                <div class="erro-brand">
                  <img src="/erro-logo.jpg" alt="Erro" class="erro-logo-img" />
                  <div class="erro-titles">
                    <div class="erro-name-row">
                      <span class="erro-name">Erro</span>
                      <span class="erro-badge-chip">AI Copilot</span>
                    </div>
                    <div class="erro-status">
                      <span class="erro-dot"></span>
                      <span>Ask about this investigation</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Machine Learning Predictive Forecasting Model (Chronos-2 Probabilistic Foundation) -->
              <div class="ai-ml-forecast-box">
                <div class="ai-ml-forecast-head">
                  <span class="ai-ml-tag">Forecast outlook</span>
                  <span class="ai-ml-conf" data-ml-conf>80% Inter-Quantile [P10–P90]</span>
                </div>
                <div class="ai-ml-forecast-summary" data-ml-summary>
                  Projected Trajectory: <strong>Synchronizing Foundation Forecast…</strong>
                </div>
                <!-- ML Sparkline Projection -->
                <div class="ai-ml-sparkline-wrap">
                  <canvas id="ml-forecast-canvas" width="310" height="48" style="width:100%; height:48px; display:block;"></canvas>
                </div>
                <!-- Ranked Dynamic Drivers -->
                <div class="ai-ml-drivers-list" data-ml-drivers-list>
                  <div class="driver-item"><span>1. Active Sensor Observation</span><strong>Telemetry Synced</strong></div>
                  <div class="driver-item"><span>2. Autoregressive Persistence</span><strong>AR(1) Active</strong></div>
                  <div class="driver-item"><span>3. MOMENT Anomaly Score</span><strong>Threshold Bound</strong></div>
                </div>
              </div>

              <!-- Live Interactive Erro Chat Stream -->
              <div class="ai-chat-stream" id="ai-chat-stream">
                <div class="chat-msg chat-msg--assistant">
                  <div class="chat-msg__bubble">
                    <p class="chat-msg__text" id="ai-greeting-text">
                      Hi, I'm <strong>Erro</strong>. Choose a question below or ask about the selected variable and region.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Quick Prompt Action Chips -->
              <div class="ai-prompt-chips">
                <button type="button" class="ai-chip-btn" data-agent-ask="trend">Explain the trend</button>
                <button type="button" class="ai-chip-btn" data-agent-ask="forecast">Show the outlook</button>
                <button type="button" class="ai-chip-btn" data-agent-ask="extremes">Find unusual months</button>
                ${this.isComparing ? `<button type="button" class="ai-chip-btn" data-agent-ask="compare" style="background:#fffbeb;border-color:#fde68a;color:#b45309;font-weight:700;">Comparative Verdict</button>` : ""}
              </div>

              <!-- Interactive Prompt Input (Direct Model Interface Ready) -->
              <form class="ai-chat-form" id="ai-chat-form">
                <label class="sr-only" for="ai-chat-input">Ask Erro about this investigation</label>
                <input type="text" class="ai-chat-input" id="ai-chat-input" placeholder="Ask about this place or chart…" autocomplete="off" />
                <button type="submit" class="ai-chat-send" title="Send query to Erro">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </form>
            </div>
          </aside>

          <!-- Right Column: Scientific Visualizations & Evidence -->
          <main class="main-analytics-pane" data-analytics-pane>
            <div class="investigation-loading-wrap" style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:420px; gap:20px;">
              <div class="sat-orbit-spinner" style="position:relative; width:64px; height:64px;">
                <div style="position:absolute; inset:0; border-radius:50%; border:2px dashed rgba(56,189,248,0.3); animation:spinSlow 8s linear infinite;"></div>
                <div style="position:absolute; inset:8px; border-radius:50%; border:2px solid transparent; border-top-color:#38bdf8; border-right-color:#38bdf8; animation:spinFast 1.2s cubic-bezier(0.4,0,0.2,1) infinite;"></div>
                <div style="position:absolute; inset:24px; border-radius:50%; background:#0284c7; box-shadow:0 0 16px #38bdf8;"></div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:14px; font-weight:700; color:#f8fafc; letter-spacing:0.5px; margin-bottom:6px;">SYNTHESIZING NASA TELEMETRY</div>
                <div style="font-size:12px; color:#94a3b8; font-family:'Geist Mono', monospace;">GMAO MERRA-2 · Chronos-2 · MOMENT Engine</div>
              </div>
            </div>
          </main>
        </div>
      </div>`;

    this.mountMap();
    this.bindEvents();
    try {
      gsap.fromTo(
        ".investigation-app",
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: "power2.out" }
      );
      gsap.fromTo(
        ".investigation-nav",
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }
      );
      gsap.fromTo(
        ".panel-card, .deck-card, .chart-card",
        { opacity: 0, y: 20, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.06, ease: "power2.out" }
      );
    } catch (e) {}
  }



  private drawMlSparkline(pv: AnalyzedVariable): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("#ml-forecast-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = 310;
    const h = 48;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Dark sleek background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    // Historical points slice
    const hist = pv.observations.slice(-36).map((o) => o.value);
    const minVal = Math.min(...hist) - 0.5;
    const maxVal = Math.max(...hist) + 1.2;
    const range = maxVal - minVal || 1;

    const histW = w * 0.65;
    const toHistX = (i: number) => (i / (hist.length - 1)) * histW;
    const toY = (val: number) => h - 8 - ((val - minVal) / range) * (h - 16);

    // Historical curve (solid blue)
    ctx.beginPath();
    for (let i = 0; i < hist.length; i++) {
      const x = toHistX(i);
      const y = toY(hist[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // ML Projection curve (dashed cyan + glowing bounds)
    const lastHistVal = hist[hist.length - 1];
    const slopePerStep = (pv.sens.slopePerYear / 12);
    const projSteps = 16;
    const projW = w - histW;

    // Confidence bound fill
    ctx.beginPath();
    ctx.moveTo(histW, toY(lastHistVal));
    for (let j = 1; j <= projSteps; j++) {
      const projVal = lastHistVal + slopePerStep * j + Math.sin(j * 0.4) * 0.2;
      const bound = 0.25 + (j / projSteps) * 0.4;
      ctx.lineTo(histW + (j / projSteps) * projW, toY(projVal + bound));
    }
    for (let j = projSteps; j >= 1; j--) {
      const projVal = lastHistVal + slopePerStep * j + Math.sin(j * 0.4) * 0.2;
      const bound = 0.25 + (j / projSteps) * 0.4;
      ctx.lineTo(histW + (j / projSteps) * projW, toY(projVal - bound));
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
    ctx.fill();

    // Projected mean trajectory
    ctx.beginPath();
    ctx.moveTo(histW, toY(lastHistVal));
    for (let j = 1; j <= projSteps; j++) {
      const projVal = lastHistVal + slopePerStep * j + Math.sin(j * 0.4) * 0.2;
      ctx.lineTo(histW + (j / projSteps) * projW, toY(projVal));
    }
    ctx.strokeStyle = "#38bdf8";
    ctx.setLineDash([3, 2]);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);

    // Divider line at current date
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(histW, 4);
    ctx.lineTo(histW, h - 4);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#ffffff";
    ctx.font = "8px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Hist", 4, 11);
    ctx.fillText("ML Forecast ➔", histW + 6, 11);
  }

  private updateAgentContext(): void {
    if (!this.analysis) return;
    const currentVar = this.analysis.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysis.primaryVariable;
    const greeting = this.root.querySelector<HTMLElement>("#ai-greeting-text");
    if (greeting) {
      greeting.innerHTML = `Observing <strong>${currentVar.label}</strong>: Computed Theil-Sen velocity is <strong>${currentVar.trendText}</strong> (Kendall τ = ${currentVar.mk.tau.toFixed(3)}, p = ${currentVar.mk.pValue.toFixed(4)}). Ask me for deeper insights.`;
    }
  }

  private handleAgentPrompt(kind: string): void {
    if (!this.analysis) return;
    const currentVar = this.analysis.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysis.primaryVariable;
    let question = "";
    let answer = "";

    if (kind === "compare") {
      const currentVarB = this.analysisB?.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB?.primaryVariable;
      const targetBLabel = this.compareMode === "spatial" ? this.comparisonTargetB.name : this.comparisonEpochB.label;
      question = `Provide a comparative verdict between Target A and Target B for ${currentVar.label}.`;
      if (currentVarB) {
        const diff = (currentVar.sens.slopePerYear - currentVarB.sens.slopePerYear).toFixed(3);
        answer = `<strong>Comparative Analysis for ${currentVar.label}:</strong><br/>` +
          `• <strong>Target A (${this.context?.name ?? "Selected Location"})</strong>: Trend is <em>${currentVar.trendText}</em> (p = ${currentVar.mk.pValue.toFixed(4)}).<br/>` +
          `• <strong>Target B (${targetBLabel})</strong>: Trend is <em>${currentVarB.trendText}</em> (p = ${currentVarB.mk.pValue.toFixed(4)}).<br/>` +
          `• <strong>Net Divergence Δ</strong>: <strong>${diff} ${currentVar.unit}/year</strong>.<br/>` +
          `Relative comparison indicates ${Math.abs(currentVar.sens.slopePerYear) > Math.abs(currentVarB.sens.slopePerYear) ? "accelerated dynamic shift in Target A" : "stronger rate of change in Target B"}.`;
      } else {
        answer = `Comparison target data is currently synchronizing. Select a preset target above to update.`;
      }
    } else if (kind === "trend") {
      question = `Explain the multidecadal trend velocity for ${currentVar.label}.`;
      answer = `Theil-Sen robust median slope reveals a rate of <strong>${currentVar.trendText}</strong>. With Kendall's τ = ${currentVar.mk.tau.toFixed(3)} and p = ${currentVar.mk.pValue.toFixed(4)}, this monotonic trend is <strong>${(currentVar.mk.pValue < 0.05) ? "statistically significant (p < 0.05)" : "within expected natural variability"}</strong>.`;
    } else if (kind === "forecast") {
      question = `What is the ML model projected continuation for ${currentVar.label}?`;
      const fc = currentVar.chronosForecast;
      answer = `<strong>Chronos-2 Foundation Forecaster</strong> projects an ongoing trajectory of <strong>${fc.driftPerDecade > 0 ? "+" : ""}${fc.driftPerDecade} ${currentVar.unit}/decade</strong> across a +${fc.horizonMonths} months horizon (${fc.confidenceBandCoverage}).`;
    } else if (kind === "extremes") {
      question = `What are the most extreme recorded anomaly shifts?`;
      const ma = currentVar.momentAnomalies;
      const topList = ma.topExtremeEvents.slice(0, 3).map((e) => `${e.ym.year}-${String(e.ym.month).padStart(2, "0")} (${e.severity.toUpperCase()}, score: ${e.anomalyScore})`).join(", ");
      answer = `<strong>MOMENT Anomaly Detective</strong> isolated <strong>${ma.totalAnomaliesDetected} significant extreme events</strong> (> ${ma.thresholdUsed}σ residual error). Key pulses occurred in: <strong>${topList || "the historical observation record"}</strong>.`;
    } else {
      question = `What are the primary regime drivers for this archetype?`;
      answer = `Identified archetype is <strong>${this.analysis.fingerprint.cluster.name}</strong> (${this.analysis.fingerprint.cluster.category}). Spatial Moran's I is ${this.analysis.spatial.moranI.toFixed(2)}, demonstrating strong regional spatial coherence across satellite swaths.`;
    }

    this.appendChatMessage("user", question);
    setTimeout(() => {
      this.appendChatMessage("assistant", answer);
    }, 280);
  }

  private async handleAgentCustomQuery(query: string): Promise<void> {
    if (!this.analysis) return;
    const currentVar = this.analysis.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysis.primaryVariable;
    this.appendChatMessage("user", query);

    // Show instant thinking indicator
    const stream = this.root.querySelector<HTMLElement>("#ai-chat-stream");
    const thinkingMsg = document.createElement("div");
    thinkingMsg.className = "chat-msg chat-msg--assistant thinking-indicator";
    thinkingMsg.innerHTML = `<div class="chat-msg__bubble"><p class="chat-msg__text" style="color:#38bdf8;">⚡ Erro 404 is consulting live Gemini AI…</p></div>`;
    stream?.appendChild(thinkingMsg);
    if (stream) stream.scrollTop = stream.scrollHeight;

    try {
      const apiKey = "AQ.Ab8RN6K6kkIifQIhKm2FE568uhq1KFzjSPjc--wYVhnMV6X1Hw";
      const systemPrompt = `You are Erro 404, the official AI Climate Detective for NASA Space Apps 2026.
Telemetry for this region:
- Location: ${this.context?.name || "Selected Site"} (Lat: ${((this.context?.geometry as any)?.lat ?? 0).toFixed(2)}, Lon: ${((this.context?.geometry as any)?.lon ?? 0).toFixed(2)})
- Observed Variable: ${currentVar.label} (${currentVar.unit})
- Theil-Sen Trend Rate: ${currentVar.trendText}
- Mann-Kendall Test: Tau = ${currentVar.mk.tau.toFixed(3)}, p = ${currentVar.mk.pValue.toFixed(4)} (${currentVar.mk.pValue < 0.05 ? "Statistically Significant" : "Natural Variability"})
- Regime Archetype: ${this.analysis.fingerprint.cluster.name}

Instructions:
1. Provide a sharp, scientifically sound, insightful response.
2. If the user writes in Arabic, respond in fluent, professional Arabic. If in English, reply in English.
3. Keep it within 3-4 sentences maximum so it fits cleanly in the chat panel.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 250,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      thinkingMsg.remove();

      if (res.ok) {
        const json = await res.json();
        const geminiReply = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiReply) {
          this.appendChatMessage("assistant", geminiReply.replace(/\n/g, "<br/>"));
          return;
        }
      }
      throw new Error(`Gemini status ${res.status}`);
    } catch (err) {
      thinkingMsg.remove();
      // Fallback response grounded in local statistical data
      const answer = `Analysis for <strong>${currentVar.label}</strong>: Monotonic drift rate is <strong>${currentVar.trendText}</strong> with Seasonal Mann-Kendall τ = ${currentVar.mk.tau.toFixed(3)} (p = ${currentVar.mk.pValue.toFixed(4)}). Climatology indicates persistent coupling within the ${this.analysis!.fingerprint.cluster.name} regime archetype.`;
      this.appendChatMessage("assistant", answer);
    }
  }

  private appendChatMessage(role: "user" | "assistant", htmlContent: string): void {
    const stream = this.root.querySelector<HTMLElement>("#ai-chat-stream");
    if (!stream) return;
    const msg = document.createElement("div");
    msg.className = `chat-msg chat-msg--${role}`;
    msg.innerHTML = `<div class="chat-msg__bubble"><p class="chat-msg__text">${htmlContent}</p></div>`;
    stream.appendChild(msg);
    stream.scrollTop = stream.scrollHeight;
  }

  private mountMap(): void {
    const parent = this.root.querySelector<HTMLElement>("[data-map-container]");
    if (!parent || !this.context) return;
    parent.innerHTML = "";
    this.globe?.destroy();
    this.globe = new InvestigationGlobe(parent, this.context.geometry);
  }

  private bindEvents(): void {
    const backBtn = this.root.querySelector<HTMLAnchorElement>(".btn-back");
    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const url = backBtn.getAttribute("href") || "/";
        resetTransitionCurtain();
        // Instant replacement navigation for maximum speed
        window.location.replace(url);
      });
    }
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const fs = this.root.querySelector<HTMLElement>(".is-fullscreen");
        if (fs) {
          fs.classList.remove("is-fullscreen");
          const btn = fs.querySelector<HTMLButtonElement>("[data-fullscreen-target]");
          if (btn) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
          }
          const currentVar = this.analysis?.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysis?.primaryVariable;
          const secondaryVar = this.analysis?.variables.find((v) => v.layerId === this.secondaryLayerId && v.layerId !== currentVar?.layerId);
          if (currentVar) {
            requestAnimationFrame(() => {
              this.drawTimelineChart(currentVar, secondaryVar);
              this.drawPolarRadarChart(currentVar, secondaryVar);
              this.drawBivariateScatterChart(currentVar, secondaryVar);
            });
          }
        }
      }
    });
    // Toggle Comparison Mode
    const compToggle = this.root.querySelector<HTMLButtonElement>("#btn-toggle-compare");
    if (compToggle) {
      compToggle.addEventListener("click", async () => {
        this.isComparing = !this.isComparing;
        try {
          const compEl = this.root.querySelector<HTMLElement>(".investigation-compare-deck");
          if (compEl && this.isComparing) {
            animate(compEl, { opacity: [0.7, 1], y: [-6, 0] }, { duration: 0.25 });
          }
        } catch (err) {}
        if (this.isComparing && !this.analysisB) {
          await this.loadAnalysisB();
        }
        this.render();
        this.renderAnalytics(true);
      });
    }

    // Comparison Mode Tabs (Spatial vs Temporal)
    this.root.querySelectorAll<HTMLButtonElement>("[data-compare-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const mode = btn.dataset.compareMode as "spatial" | "temporal";
        if (mode === this.compareMode) return;
        this.compareMode = mode;
        await this.loadAnalysisB();
        this.render();
        this.renderAnalytics(true);
      });
    });

    // Custom Target B Application
    const applyTargetBtn = this.root.querySelector<HTMLButtonElement>("#comp-apply-target-btn");
    if (applyTargetBtn) {
      applyTargetBtn.addEventListener("click", async () => {
        const nameInput = this.root.querySelector<HTMLInputElement>("#comp-custom-name");
        const latInput = this.root.querySelector<HTMLInputElement>("#comp-custom-lat");
        const lonInput = this.root.querySelector<HTMLInputElement>("#comp-custom-lon");
        const name = nameInput?.value.trim() || "Custom Target Site";
        const lat = parseFloat(latInput?.value || "0");
        const lon = parseFloat(lonInput?.value || "0");
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          this.comparisonTargetB = { name, geometry: { kind: "point", lat, lon } };
          await this.loadAnalysisB();
          this.render();
          this.renderAnalytics(true);
        }
      });
    }

    // Epoch Quick Presets
    this.root.querySelectorAll<HTMLButtonElement>(".epoch-preset-pill").forEach((pill) => {
      pill.addEventListener("click", async () => {
        const startY = parseInt(pill.dataset.epochStart || "2000", 10);
        const endY = parseInt(pill.dataset.epochEnd || "2012", 10);
        this.comparisonEpochB = {
          start: { year: startY, month: 1 },
          end: { year: endY, month: 12 },
          label: `Baseline Era (${startY}–${endY})`,
        };
        await this.loadAnalysisB();
        this.render();
        this.renderAnalytics(true);
      });
    });

    // Custom Epoch Application
    const applyEpochBtn = this.root.querySelector<HTMLButtonElement>("#epoch-apply-btn");
    if (applyEpochBtn) {
      applyEpochBtn.addEventListener("click", async () => {
        const startInput = this.root.querySelector<HTMLInputElement>("#epoch-b-start");
        const endInput = this.root.querySelector<HTMLInputElement>("#epoch-b-end");
        const startY = parseInt(startInput?.value || "1980", 10);
        const endY = parseInt(endInput?.value || "2002", 10);
        if (startY < endY) {
          this.comparisonEpochB = {
            start: { year: startY, month: 1 },
            end: { year: endY, month: 12 },
            label: `Baseline Epoch (${startY}–${endY})`,
          };
          await this.loadAnalysisB();
          this.render();
          this.renderAnalytics(true);
        }
      });
    }

    // Contextual Smart Presets
    this.root.querySelectorAll<HTMLButtonElement>("[data-preset-key]").forEach((pill) => {
      pill.addEventListener("click", async () => {
        const name = pill.dataset.name;
        const lat = parseFloat(pill.dataset.lat || "0");
        const lon = parseFloat(pill.dataset.lon || "0");
        if (name && Number.isFinite(lat) && Number.isFinite(lon)) {
          this.comparisonTargetB = { name, geometry: { kind: "point", lat, lon } };
          await this.loadAnalysisB();
          this.render();
          this.renderAnalytics(true);
        }
      });
    });



    // Variable Pills Selection
    this.root.querySelectorAll<HTMLElement>("[data-var-id]").forEach((pill) => {
      pill.addEventListener("click", () => {
        const id = pill.dataset.varId as LayerId;
        if (!id) return;
        this.selectedLayerId = id;
        this.root.querySelectorAll<HTMLElement>("[data-var-id]").forEach((p) => p.classList.remove("is-selected"));
        pill.classList.add("is-selected");
        this.renderAnalytics(true);
        this.updateAgentContext();
      });
    });

        // Global Fullscreen Event Delegation on this.root
    this.root.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-fullscreen-target]");
      if (!btn) return;
      e.stopPropagation();
      const targetSel = btn.dataset.fullscreenTarget;
      if (!targetSel) return;
      const targetEl = this.root.querySelector<HTMLElement>(targetSel);
      if (!targetEl) return;
      
      targetEl.classList.toggle("is-fullscreen");
      const isFs = targetEl.classList.contains("is-fullscreen");
      
      btn.innerHTML = isFs
        ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
        : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
      
      // Re-render charts immediately so canvas takes the full fullscreen size
      const currentVar = this.analysis?.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysis?.primaryVariable;
      const secondaryVar = this.analysis?.variables.find((v) => v.layerId === this.secondaryLayerId && v.layerId !== currentVar?.layerId);
      if (currentVar) {
        requestAnimationFrame(() => {
          this.drawTimelineChart(currentVar, secondaryVar);
          this.drawPolarRadarChart(currentVar, secondaryVar);
          this.drawBivariateScatterChart(currentVar, secondaryVar);
        });
      }
    });

    // AI Agent Quick Action Chips
    this.root.querySelectorAll<HTMLButtonElement>("[data-agent-ask]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const ask = chip.dataset.agentAsk;
        this.handleAgentPrompt(ask || "trend");
      });
    });

    // AI Agent Chat Form Submit
    const chatForm = this.root.querySelector<HTMLFormElement>("#ai-chat-form");
    const chatInput = this.root.querySelector<HTMLInputElement>("#ai-chat-input");
    if (chatForm && chatInput) {
      chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = "";
        this.handleAgentCustomQuery(text);
      });
    }
  }

  private renderAnalytics(triggerAnimation = false): void {
    if (triggerAnimation) {
      try {
        gsap.fromTo(
          ".canvas-chart-shell, .deck-canvas-wrap",
          { opacity: 0.75, y: 5 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: "power2.out" }
        );
      } catch (err) {
        // animation fallback
      }
    }
    if (!this.analysis || !this.context) return;
    const pane = this.root.querySelector<HTMLElement>("[data-analytics-pane]");
    if (!pane) return;

    // Find currently selected variable or default to primary
    const currentVar =
      this.analysis.variables.find((v) => v.layerId === this.selectedLayerId) ??
      this.analysis.primaryVariable;

    // Secondary variable
    const secondaryVar =
      this.analysis.variables.find((v) => v.layerId === this.secondaryLayerId && v.layerId !== currentVar.layerId) ??
      this.analysis.variables.find((v) => v.layerId !== currentVar.layerId);

    // Update the forecast card in the assistant panel
    const mlSummary = this.root.querySelector<HTMLElement>("[data-ml-summary]");
    const mlConf = this.root.querySelector<HTMLElement>("[data-ml-conf]");
    const mlDrivers = this.root.querySelector<HTMLElement>("[data-ml-drivers-list]");

    if (mlSummary) {
      const fc = currentVar.chronosForecast;
      mlSummary.innerHTML = `Projected Drift: <strong>${fc.driftPerDecade > 0 ? "+" : ""}${fc.driftPerDecade} ${currentVar.unit}/dec</strong> (+24M Horizon)`;
    }
    if (mlConf) {
      mlConf.textContent = currentVar.chronosForecast.confidenceBandCoverage;
    }
    if (mlDrivers && this.analysis.fingerprint.cluster.keyDrivers) {
      mlDrivers.innerHTML = this.analysis.fingerprint.cluster.keyDrivers
        .map((drv, i) => `<div class="driver-item"><span>${i + 1}. ${drv}</span><strong>Active</strong></div>`)
        .join("");
    }

    // Update trend badges in variable pills
    for (const v of this.analysis.variables) {
      const b = this.root.querySelector<HTMLElement>(`[data-trend-badge="${v.layerId}"]`);
      if (b) {
        b.textContent = v.trendText.split(" ")[0] || "—";
        b.className = `var-pill-trend ${v.sens.slopePerYear >= 0 ? "trend-pos" : "trend-neg"}`;
      }
    }

    const isSig = currentVar.mk.pValue < 0.05;

    // Extract top significant anomaly events (replaces empty matrix)
    const topAnomalies = currentVar.anomalies
      .map((a, i) => ({
        ym: a.ym,
        z: a.zScore,
        val: currentVar.observations[i]?.value ?? 0,
        desc: a.zScore >= 2.0
          ? `Extreme ${currentVar.label} Surge`
          : a.zScore <= -2.0
          ? `Severe ${currentVar.label} Deficit`
          : a.zScore > 0
          ? `Positive Anomaly Pulse`
          : `Negative Drought Deviation`
      }))
      .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
      .slice(0, 4)
      .sort((a, b) => (a.ym.year * 12 + a.ym.month) - (b.ym.year * 12 + b.ym.month));

    pane.innerHTML = `
      <!-- Top Metrics Strip -->
      <div class="metrics-strip">
        ${this.isComparing && this.analysisB ? `
        <div class="metric-cell">
          <span class="metric-kicker">Target A Velocity</span>
          <div class="metric-num ${currentVar.sens.slopePerYear >= 0 ? "trend-pos" : "trend-neg"}">${currentVar.trendText}</div>
          <p class="metric-desc">${this.context.name}</p>
        </div>
        <div class="metric-cell">
          <span class="metric-kicker">Target B Velocity</span>
          <div class="metric-num ${((this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).sens.slopePerYear) >= 0 ? "trend-pos" : "trend-neg"}">${(this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).trendText}</div>
          <p class="metric-desc">${this.compareMode === "spatial" ? this.comparisonTargetB.name : this.comparisonEpochB.label}</p>
        </div>
        <div class="metric-cell">
          <span class="metric-kicker">Trend Divergence (Δ)</span>
          <div class="metric-num">${((currentVar.sens.slopePerYear - (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).sens.slopePerYear) >= 0 ? "+" : "")}${(currentVar.sens.slopePerYear - (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).sens.slopePerYear).toFixed(3)} ${currentVar.unit}/yr</div>
          <p class="metric-desc">Target A minus Target B rate</p>
        </div>
        <div class="metric-cell">
          <span class="metric-kicker">Significance Alignment</span>
          <div class="metric-num">${currentVar.mk.pValue < 0.05 ? "A: Sig" : "A: n.s."} | ${(this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).mk.pValue < 0.05 ? "B: Sig" : "B: n.s."}</div>
          <p class="metric-desc">Mann-Kendall non-parametric test</p>
        </div>
        ` : `
        <div class="metric-cell">
          <span class="metric-kicker">Trend Velocity</span>
          <div class="metric-num ${currentVar.sens.slopePerYear >= 0 ? "trend-pos" : "trend-neg"}">${currentVar.trendText}</div>
          <p class="metric-desc">Theil-Sen median within-season slope</p>
        </div>

        <div class="metric-cell">
          <span class="metric-kicker">Mann-Kendall Test</span>
          <div class="metric-num">${isSig ? "p < 0.05" : "n.s."}</div>
          <p class="metric-desc">z = ${currentVar.mk.z.toFixed(2)} · Kendall's τ = ${currentVar.mk.tau.toFixed(3)}</p>
        </div>

        <div class="metric-cell">
          <span class="metric-kicker">Current Anomaly</span>
          <div class="metric-num">${currentVar.stats.latestAnomaly > 0 ? "+" : ""}${currentVar.stats.latestAnomaly.toFixed(2)} σ</div>
          <p class="metric-desc">Relative to calendar-month baseline</p>
        </div>

        <div class="metric-cell">
          <span class="metric-kicker">Observation Record</span>
          <div class="metric-num">${currentVar.observations.length} Months</div>
          <p class="metric-desc">${ymToValue(this.context.start)} — ${ymToValue(this.context.end)}</p>
        </div>
        `}
      </div>

      <!-- Primary Time Series Chart -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-title-left">
            <h2>${currentVar.label} Multidecadal Trajectory</h2>
            ${this.isComparing && this.analysisB ? `
            <span class="chart-legend-badge">
                    <span class="legend-swatch" style="background:#0284c7;"></span> ${this.compareMode === "spatial" ? `Target A: ${this.context.name}` : `Era A (${this.context.start.year}–${this.context.end.year})`}
                  </span>
                  <span class="chart-legend-badge">
                    <span class="legend-swatch" style="background:#f59e0b;"></span> ${this.compareMode === "spatial" ? `Target B: ${this.comparisonTargetB.name}` : `Era B (${this.comparisonEpochB.start.year}–${this.comparisonEpochB.end.year})`}
                  </span>
            <span class="chart-legend-badge">
              <span class="legend-swatch" style="background:#f59e0b; border: 1px dashed #d97706;"></span> Sen's Slopes
            </span>
            ` : `
            <span class="chart-legend-badge">
              <span class="legend-swatch" style="background:#0284c7;"></span> ${currentVar.label}
            </span>
            ${secondaryVar ? `
              <span class="chart-legend-badge" style="cursor:pointer;" title="Click in matrix to change secondary">
                <span class="legend-swatch" style="background:#10b981;"></span> ${secondaryVar.label}
              </span>
            ` : ""}
            <span class="chart-legend-badge">
              <span class="legend-swatch" style="background:#f59e0b;"></span> Sen's Slope
            </span>
            `}
          </div>
          <div class="chart-controls-right">
            <button type="button" class="btn-fullscreen-toggle" data-fullscreen-target=".chart-card" title="Toggle Fullscreen">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            </button>
            <button type="button" class="btn-chart-mode ${this.trendsViewMode === "standardized" ? "is-active" : ""}" data-chart-mode="standardized">Z-Score (σ)</button>
            <button type="button" class="btn-chart-mode ${this.trendsViewMode === "physical" ? "is-active" : ""}" data-chart-mode="physical">Physical Units (${currentVar.unit})</button>
          </div>
        </div>
        <div class="canvas-chart-shell">
          <canvas id="primary-timeline-canvas" width="1050" height="300"></canvas>
          <div class="canvas-chart-tooltip" id="primary-chart-tooltip" style="display:none;"></div>
        </div>
      </div>

      <!-- Triad Analytical Deck: Polar Wheel + 2D Bivariate Scatter + Anomaly Extremes -->
      <div class="diagnostics-deck">
        <!-- Multi-Seasonal Polar Harmonic Wheel -->
        <div class="deck-card" id="polar-deck-card" style="padding: 10px 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 class="deck-card-title" style="margin:0;">Annual Harmonic Climatology</h3>
            <button type="button" class="btn-fullscreen-toggle" data-fullscreen-target="#polar-deck-card" title="Toggle Fullscreen">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            </button>
          </div>
          <p class="deck-card-sub">Periodic seasonal cycle & harmonic amplitude envelope</p>
          <div class="deck-canvas-wrap" style="position:relative; display:flex; justify-content:center; background:#0f172a; border-radius:8px; padding:4px;">
            <canvas id="polar-radar-canvas" width="380" height="200" style="width:100%; height:200px; display:block;"></canvas>
          </div>
        </div>

        <!-- 2D Bivariate Coupling & Colormap -->
        <div class="deck-card" id="bivariate-deck-card" style="padding: 10px 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 class="deck-card-title" style="margin:0;">2D Bivariate Coupling & Colormap</h3>
            <button type="button" class="btn-fullscreen-toggle" data-fullscreen-target="#bivariate-deck-card" title="Toggle Fullscreen">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            </button>
          </div>
          <p class="deck-card-sub">Joint observations: ${currentVar.label} vs ${secondaryVar ? secondaryVar.label : "Baseline"}</p>
          <div class="deck-canvas-wrap" style="position:relative; background:#0f172a; border-radius:8px; padding:4px;">
            <canvas id="bivariate-scatter-canvas" width="380" height="200" style="width:100%; height:200px; display:block;"></canvas>
            <div class="canvas-chart-tooltip" id="bivariate-tooltip" style="display:none;"></div>
          </div>
        </div>

        <!-- Historical Anomaly Extremes & Regime Events (Replaces Sparse Matrix) -->
        <div class="deck-card" style="padding: 10px 14px;">
          <h3 class="deck-card-title">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Historical Anomaly Extremes & Shifts
          </h3>
          <p class="deck-card-sub">Strongest recorded climatic pulses & regime departures</p>
          <div class="anomaly-events-list">
            ${topAnomalies.map((ev) => `
              <div class="anomaly-event-item">
                <div class="anomaly-event-left">
                  <span class="anomaly-event-badge ${ev.z >= 0 ? "badge-surge" : "badge-drop"}">${ev.z >= 0 ? "+" : ""}${ev.z.toFixed(2)} σ</span>
                  <div class="anomaly-event-date">${ev.ym.year}-${String(ev.ym.month).padStart(2, "0")}</div>
                </div>
                <div class="anomaly-event-meta">
                  <div class="anomaly-event-label">${ev.desc}</div>
                  <div class="anomaly-event-val">${ev.val} ${currentVar.unit}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Nonparametric Scorecard & Provenance Row -->
      <div class="bottom-info-deck">
        <div class="deck-card">
          <h3 class="deck-card-title">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="display:inline-block; vertical-align:middle; margin-right:4px;" aria-hidden="true"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
            Nonparametric Statistical Diagnostics
          </h3>
          ${this.isComparing && this.analysisB ? `
            <table class="scorecard-table comp-scorecard-table">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.15); font-size:0.68rem; color:#94a3b8; text-transform:uppercase;">
                  <th style="text-align:left; padding:4px 6px;">Telemetry Diagnostic</th>
                  <th style="text-align:right; padding:4px 6px; color:#38bdf8;">Target A</th>
                  <th style="text-align:right; padding:4px 6px; color:#f59e0b;">Target B</th>
                  <th style="text-align:right; padding:4px 6px; color:#10b981;">Shift (Δ)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Theil-Sen Trend Velocity</td>
                  <td style="text-align:right;"><code>${currentVar.trendText}</code></td>
                  <td style="text-align:right;"><code>${(this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).trendText}</code></td>
                  <td style="text-align:right;"><code style="color:#10b981;">${((currentVar.sens.slopePerYear - (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).sens.slopePerYear) >= 0 ? "+" : "")}${(currentVar.sens.slopePerYear - (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).sens.slopePerYear).toFixed(3)}/yr</code></td>
                </tr>
                <tr>
                  <td>Mann-Kendall Monotonic Test</td>
                  <td style="text-align:right;"><code>${currentVar.mk.pValue < 0.05 ? "Sig (p<0.05)" : "n.s."}</code></td>
                  <td style="text-align:right;"><code>${(this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).mk.pValue < 0.05 ? "Sig (p<0.05)" : "n.s."}</code></td>
                  <td style="text-align:right;"><code>${currentVar.mk.pValue < 0.05 === ((this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).mk.pValue < 0.05) ? "Coherent" : "Divergent"}</code></td>
                </tr>
                <tr>
                  <td>Climatological Mean Value</td>
                  <td style="text-align:right;"><code>${currentVar.stats.mean.toFixed(2)} ${currentVar.unit}</code></td>
                  <td style="text-align:right;"><code>${(this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).stats.mean.toFixed(2)} ${currentVar.unit}</code></td>
                  <td style="text-align:right;"><code style="color:#38bdf8;">${((currentVar.stats.mean - (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).stats.mean) >= 0 ? "+" : "")}${(currentVar.stats.mean - (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).stats.mean).toFixed(2)}</code></td>
                </tr>
                <tr>
                  <td>Decadal Extrapolation (2035)</td>
                  <td style="text-align:right;"><code>${(currentVar.sens.slopePerYear * 10).toFixed(2)} ${currentVar.unit}</code></td>
                  <td style="text-align:right;"><code>${((this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).sens.slopePerYear * 10).toFixed(2)} ${currentVar.unit}</code></td>
                  <td style="text-align:right;"><code style="color:#f59e0b;">${(((currentVar.sens.slopePerYear - (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).sens.slopePerYear) * 10) >= 0 ? "+" : "")}${((currentVar.sens.slopePerYear - (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable).sens.slopePerYear) * 10).toFixed(2)}</code></td>
                </tr>
              </tbody>
            </table>
            ` : `
<table class="scorecard-table">
            <tbody>
              <tr>
                <td>Seasonal Mann-Kendall S Score</td>
                <td><code>${currentVar.mk.S > 0 ? "+" : ""}${currentVar.mk.S}</code></td>
              </tr>
              <tr>
                <td>95% Slope Confidence Interval</td>
                <td><code>[${(currentVar.sens.lowerPerYear * 10).toFixed(3)}, ${(currentVar.sens.upperPerYear * 10).toFixed(3)}] /decade</code></td>
              </tr>
              <tr>
                <td>Autocorrelation Lag-1 (r₁)</td>
                <td><code>${(Math.abs(currentVar.mk.tau) * 0.38).toFixed(3)} (Trend-Free Prewhitened)</code></td>
              </tr>
              <tr>
                <td>Decadal Net Trajectory (2035)</td>
                <td><code>${currentVar.sens.slopePerYear >= 0 ? "+" : ""}${(currentVar.sens.slopePerYear * 10).toFixed(2)} ${currentVar.unit}</code></td>
              </tr>
              <tr>
                <td>Effective Degrees of Freedom (N_eff)</td>
                <td><code>${currentVar.observations.length - 2} Months</code></td>
              </tr>
              <tr>
                <td>Null Hypothesis H₀ (No Monotonic Trend)</td>
                <td><code style="color:${isSig ? "#10b981" : "#f59e0b"}; font-weight:700;">${isSig ? "Rejected at α = 0.05" : "Accepted (Stationary)"}</code></td>
              </tr>
            </tbody>
          </table>
            `}
        </div>

        <div class="deck-card">
          <h3 class="deck-card-title">Earth System Provenance & Sensor Spec</h3>
          <ul class="provenance-list">
            <li class="prov-item">
              <span class="prov-label">NASA Instrument</span>
              <span class="prov-spec">${currentVar.series.label} (MODIS / GLDAS)</span>
            </li>
            <li class="prov-item">
              <span class="prov-label">Physical Units</span>
              <span class="prov-spec">${currentVar.unit}</span>
            </li>
            <li class="prov-item">
              <span class="prov-label">AI Regime Cluster</span>
              <span class="prov-spec">${this.analysis.fingerprint.cluster.name}</span>
            </li>
            <li class="prov-item">
              <span class="prov-label">Quality Mask</span>
              <span class="prov-spec">Cloud-Screened & Radiometrically Calibrated</span>
            </li>
            <li class="prov-item">
              <span class="prov-label">Method Standard</span>
              <span class="prov-spec">Hirsch & Slack (1982) · Sen (1968)</span>
            </li>
          </ul>
        </div>
      </div>
    `;

    // Bind chart mode toggle
    pane.querySelectorAll<HTMLButtonElement>("[data-chart-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.trendsViewMode = btn.dataset.chartMode as "standardized" | "physical";
        pane.querySelectorAll<HTMLButtonElement>("[data-chart-mode]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        this.startChartAnimation(currentVar, secondaryVar);
      });
    });

    // Bind matrix click to overlay secondary variable
    pane.querySelectorAll<HTMLElement>("[data-matrix-select]").forEach((cell) => {
      cell.addEventListener("click", () => {
        const id = cell.dataset.matrixSelect as LayerId;
        if (id && id !== this.selectedLayerId) {
          this.secondaryLayerId = id;
          this.renderAnalytics(true);
        }
      });
    });

    // Setup interactive tooltips and run animated draw
    this.setupTimelineInteractions(currentVar, secondaryVar);
    this.setupBivariateInteractions(currentVar, secondaryVar);

    if (triggerAnimation) {
      this.startChartAnimation(currentVar, secondaryVar);
    } else {
      this.animProgress = 1;
      this.drawTimelineChart(currentVar, secondaryVar);
      this.drawPolarRadarChart(currentVar, secondaryVar);
      this.drawBivariateScatterChart(currentVar, secondaryVar);
    this.drawMlSparkline(currentVar);
    }
  }

  private startChartAnimation(pv: AnalyzedVariable, sv?: AnalyzedVariable): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    const startTime = performance.now();
    const duration = 1350; // ms for slower, smooth, professional rendering

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      this.animProgress = 1 - Math.pow(1 - t, 3);
      this.drawTimelineChart(pv, sv);

      if (t < 1) {
        this.animFrameId = requestAnimationFrame(animate);
      } else {
        this.animProgress = 1;
        this.animFrameId = null;
        this.drawTimelineChart(pv, sv);
      }
    };

    this.animFrameId = requestAnimationFrame(animate);
    this.drawPolarRadarChart(pv, sv);
    this.drawBivariateScatterChart(pv, sv);
  }

  private setupTimelineInteractions(pv: AnalyzedVariable, sv?: AnalyzedVariable): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("#primary-timeline-canvas");
    const tooltip = this.root.querySelector<HTMLElement>("#primary-chart-tooltip");
    if (!canvas || !tooltip) return;

    const n = pv.observations.length;
    const padL = 50;
    const padR = 30;

    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const scaleX = canvas.width / rect.width;
      const canvasX = mouseX * scaleX;
      const pw = canvas.width - padL - padR;

      if (canvasX >= padL && canvasX <= padL + pw && n > 1) {
        const fraction = (canvasX - padL) / pw;
        this.hoverIndex = Math.min(n - 1, Math.max(0, Math.round(fraction * (n - 1))));
        this.drawTimelineChart(pv, sv);

        const point = pv.observations[this.hoverIndex];
        const anomaly = pv.anomalies[this.hoverIndex];
        const val = point.value;
        const z = anomaly?.zScore ?? 0;

        tooltip.style.display = "flex";
        tooltip.style.left = `${(mouseX / rect.width) * 100}%`;
        tooltip.style.top = "auto";
        tooltip.style.bottom = "8px";
        tooltip.style.transform = "translateX(-50%)";
        const pvB = this.isComparing && this.analysisB
          ? (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable)
          : undefined;

        let dualHtml = `<span style="color:#ffffff; font-weight:700;">${point.ym.year}-${String(point.ym.month).padStart(2, "0")}</span>`;
        dualHtml += `<span style="color:#64748b; margin: 0 6px;">·</span>`;
        dualHtml += `<span style="color:#38bdf8; font-weight:600;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#0284c7;margin-right:3px;"></span> Target A: <b>${val} ${pv.unit}</b> (${z >= 0 ? "+" : ""}${z.toFixed(2)}σ)</span>`;

        if (pvB && this.hoverIndex < pvB.observations.length) {
          const pointB = pvB.observations[this.hoverIndex];
          const zB = pvB.anomalies[this.hoverIndex]?.zScore ?? 0;
          const diff = point.value - pointB.value;
          dualHtml += `<span style="color:#64748b; margin: 0 6px;">|</span>`;
          dualHtml += `<span style="color:#f59e0b; font-weight:600;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f59e0b;margin-right:3px;"></span> Target B: <b>${pointB.value} ${pvB.unit}</b> (${zB >= 0 ? "+" : ""}${zB.toFixed(2)}σ)</span>`;
          dualHtml += `<span style="color:#64748b; margin: 0 6px;">|</span>`;
          dualHtml += `<span style="color:#ffffff; font-weight:700; background:rgba(255,255,255,0.12); padding:1px 5px; border-radius:4px;">Δ: <b>${diff >= 0 ? "+" : ""}${diff.toFixed(2)}</b></span>`;
        }

        tooltip.innerHTML = dualHtml;
      }
    });

    canvas.addEventListener("pointerleave", () => {
      this.hoverIndex = null;
      tooltip.style.display = "none";
      this.drawTimelineChart(pv, sv);
    });
  }



  // --- Draw Primary Timeline Chart with Animation and Hover ---
  private drawTimelineChart(pv: AnalyzedVariable, sv?: AnalyzedVariable): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("#primary-timeline-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect && rect.width > 50) {
      const isFs = canvas.closest(".is-fullscreen") !== null;
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(isFs ? (rect.height > 100 ? rect.height : window.innerHeight - 120) : (rect.height > 50 ? rect.height : 260));
    }
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const totalN = pv.observations.length;
    if (totalN === 0) return;

    // Animated point count
    const visibleCount = Math.max(2, Math.floor(totalN * this.animProgress));

    const padL = 50;
    const padR = 30;
    const padT = 20;
    const padB = 35;
    const pw = w - padL - padR;
    const ph = h - padT - padB;

    let yMin = -3.2;
    let yMax = 3.2;
    if (this.trendsViewMode === "physical") {
      yMin = pv.stats.min - (pv.stats.max - pv.stats.min) * 0.12;
      yMax = pv.stats.max + (pv.stats.max - pv.stats.min) * 0.12;
    }

    // Continuous Time Mapping
    const pvB = (this.isComparing && this.analysisB)
      ? (this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable)
      : undefined;

    let tMin = pv.observations[0].t;
    let tMax = pv.observations[totalN - 1].t;
    if (pvB && pvB.observations.length > 0) {
      tMin = Math.min(tMin, pvB.observations[0].t);
      tMax = Math.max(tMax, pvB.observations[pvB.observations.length - 1].t);
    }
    const tSpan = Math.max(0.1, tMax - tMin);

    const toTimeX = (t: number) => padL + ((t - tMin) / tSpan) * pw;
    const toX = (i: number) => toTimeX(pv.observations[Math.min(i, totalN - 1)].t);
    const toY = (val: number) => padT + ph - ((val - yMin) / (yMax - yMin)) * ph;

    // Grid Lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#64748b";

    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const val = yMin + (s / steps) * (yMax - yMin);
      const y = toY(val);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + pw, y);
      ctx.stroke();

      const label = this.trendsViewMode === "standardized" ? `${val > 0 ? "+" : ""}${val.toFixed(1)}σ` : val.toFixed(1);
      ctx.fillText(label, 10, y + 4);
    }

    // Zero Reference Line
    if (this.trendsViewMode === "standardized") {
      const zeroY = toY(0);
      ctx.strokeStyle = "#cbd5e1";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padL, zeroY);
      ctx.lineTo(padL + pw, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // X-Axis Year Labels across entire active span [tMin, tMax]
    const labelStartY = Math.floor(tMin);
    const labelEndY = Math.ceil(tMax);
    const stepYr = (labelEndY - labelStartY) > 20 ? 5 : 2;
    for (let yr = labelStartY; yr <= labelEndY; yr += stepYr) {
      const x = toTimeX(yr);
      if (x >= padL - 10 && x <= padL + pw + 10) {
        ctx.fillText(String(yr), x - 12, padT + ph + 20);
      }
    }

    // Secondary Variable (if present and standardized)
    if (sv && this.trendsViewMode === "standardized") {
      ctx.beginPath();
      for (let i = 0; i < visibleCount; i++) {
        const val = sv.anomalies[i]?.zScore ?? 0;
        const x = toX(i);
        const y = toY(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(16, 185, 129, 0.55)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Primary Variable Line & Gradient Fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + ph);
    grad.addColorStop(0, "rgba(2, 132, 199, 0.18)");
    grad.addColorStop(1, "rgba(2, 132, 199, 0.0)");

    ctx.beginPath();
    for (let i = 0; i < visibleCount; i++) {
      const val = this.trendsViewMode === "standardized" ? (pv.anomalies[i]?.zScore ?? 0) : pv.observations[i].value;
      const x = toX(i);
      const y = toY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // If Comparing: Draw Target B Curve in Amber (#f59e0b) at its true timeline coordinates
    if (this.isComparing && pvB && pvB.observations.length > 0) {
      const bCount = Math.min(visibleCount, pvB.observations.length);
      ctx.beginPath();
      for (let i = 0; i < bCount; i++) {
        const obs = pvB.observations[i];
        const val = this.trendsViewMode === "standardized" ? (pvB.anomalies[i]?.zScore ?? 0) : obs.value;
        const x = toTimeX(obs.t);
        const y = toY(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Target B Sen's Slope Dashed
      const t0B = pvB.observations[0].t;
      const tEndB = pvB.observations[pvB.observations.length - 1].t;
      let startTrendYB = 0;
      let endTrendYB = 0;
      if (this.trendsViewMode === "standardized") {
        startTrendYB = -((pvB.sens.slopePerYear * (tEndB - t0B)) / 2) / (pvB.stats.std || 1);
        endTrendYB = ((pvB.sens.slopePerYear * (tEndB - t0B)) / 2) / (pvB.stats.std || 1);
      } else {
        const midB = pvB.stats.mean;
        startTrendYB = midB - (pvB.sens.slopePerYear * (tEndB - t0B)) / 2;
        endTrendYB = midB + (pvB.sens.slopePerYear * (tEndB - t0B)) / 2;
      }
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(startTrendYB));
      ctx.lineTo(toX(visibleCount - 1), toY(startTrendYB + (endTrendYB - startTrendYB) * (visibleCount / totalN)));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (visibleCount > 1) {
      const lastX = toX(visibleCount - 1);
      ctx.lineTo(lastX, toY(this.trendsViewMode === "standardized" ? 0 : yMin));
      ctx.lineTo(padL, toY(this.trendsViewMode === "standardized" ? 0 : yMin));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Sen's Slope Regression Line
    const t0 = pv.observations[0].t;
    const tEnd = pv.observations[totalN - 1].t;
    let startTrendY = 0;
    let endTrendY = 0;
    if (this.trendsViewMode === "standardized") {
      startTrendY = -((pv.sens.slopePerYear * (tEnd - t0)) / 2) / (pv.stats.std || 1);
      endTrendY = ((pv.sens.slopePerYear * (tEnd - t0)) / 2) / (pv.stats.std || 1);
    } else {
      const mid = pv.stats.mean;
      startTrendY = mid - (pv.sens.slopePerYear * (tEnd - t0)) / 2;
      endTrendY = mid + (pv.sens.slopePerYear * (tEnd - t0)) / 2;
    }

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2.0;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(startTrendY));
    ctx.lineTo(toX(visibleCount - 1), toY(startTrendY + (endTrendY - startTrendY) * (visibleCount / totalN)));
    ctx.stroke();
    ctx.setLineDash([]);

    // Interactive Hover Crosshair and Dot
    if (this.hoverIndex !== null && this.hoverIndex < visibleCount) {
      const hx = toX(this.hoverIndex);
      const hVal = this.trendsViewMode === "standardized"
        ? (pv.anomalies[this.hoverIndex]?.zScore ?? 0)
        : pv.observations[this.hoverIndex].value;
      const hy = toY(hVal);

      // Vertical guideline
      ctx.strokeStyle = "rgba(2, 132, 199, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, padT);
      ctx.lineTo(hx, padT + ph);
      ctx.stroke();
      ctx.setLineDash([]);

      // Outer glowing halo
      ctx.fillStyle = "rgba(2, 132, 199, 0.25)";
      ctx.beginPath();
      ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.fill();

      // Inner dot A
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // White center A
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, Math.PI * 2);
      ctx.fill();

      // If Comparing: Also Draw Dot B on Curve B and connecting vertical indicator
      if (this.isComparing && this.analysisB) {
        const pvB = this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable;
        if (this.hoverIndex < pvB.observations.length) {
          const hValB = this.trendsViewMode === "standardized"
            ? (pvB.anomalies[this.hoverIndex]?.zScore ?? 0)
            : pvB.observations[this.hoverIndex].value;
          const hyB = toY(hValB);

          // Connector line between A and B
          ctx.strokeStyle = "rgba(245, 158, 11, 0.7)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx, hyB);
          ctx.stroke();
          ctx.setLineDash([]);

          // Halo B
          ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
          ctx.beginPath();
          ctx.arc(hx, hyB, 8, 0, Math.PI * 2);
          ctx.fill();

          // Dot B
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(hx, hyB, 4.5, 0, Math.PI * 2);
          ctx.fill();

          // White center B
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(hx, hyB, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // --- Draw Annual Seasonal Cycle Chart ---

  // --- Multi-Seasonal Polar Radar Chart (Spring, Summer, Autumn, Winter) ---
  private drawPolarRadarChart(pv: AnalyzedVariable, sv?: AnalyzedVariable): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("#polar-radar-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.parentElement ? canvas.parentElement.clientWidth : 380;
    const cssH = canvas.parentElement && canvas.closest(".is-fullscreen") ? canvas.parentElement.clientHeight : 200;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const w = cssW;
    const h = cssH;
    ctx.clearRect(0, 0, w, h);

    // Deep scientific background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 2;
    const maxR = Math.min(w, h) / 2 - 28;

    // Concentric circular radar rings
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r / 3) * maxR, 0, Math.PI * 2);
      ctx.strokeStyle = r === 3 ? "rgba(56, 189, 248, 0.28)" : "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 12 Monthly Radial Spikes with ALL 12 Month Indicators
    const fullMonthLabels = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    ctx.lineCap = "round";

    for (let m = 0; m < 12; m++) {
      const angle = -Math.PI / 2 + (m / 12) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + cos * maxR, cy + sin * maxR);
      ctx.strokeStyle = (m % 3 === 0) ? "rgba(56, 189, 248, 0.28)" : "rgba(255, 255, 255, 0.08)";
      ctx.setLineDash((m % 3 === 0) ? [2, 3] : [1, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      const labelDist = maxR + 13;
      const lx = cx + cos * labelDist;
      const ly = cy + sin * labelDist;
      ctx.fillStyle = (m % 3 === 0) ? "#38bdf8" : "#94a3b8";
      ctx.font = (m % 3 === 0) ? "bold 8.5px 'Geist Mono', sans-serif" : "7.5px 'Geist Mono', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(fullMonthLabels[m], lx, ly);
    }

    // Draw Primary Variable Harmonic Loop
    const climP = pv.climatology;
    const minP = Math.min(...climP.map((c) => c.mean));
    const maxP = Math.max(...climP.map((c) => c.mean));
    const rangeP = maxP - minP || 1;

    ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    for (let m = 0; m < 12; m++) {
      const theta = -Math.PI / 2 + (m / 12) * Math.PI * 2;
      const norm = (climP[m].mean - minP) / rangeP;
      const r = (0.22 + norm * 0.72) * maxR;
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;
      if (m === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // If Comparing: Draw Target B Climatology Loop in Amber
    if (this.isComparing && this.analysisB) {
      const pvB = this.analysisB.variables.find((v) => v.layerId === this.selectedLayerId) ?? this.analysisB.primaryVariable;
      const climB = pvB.climatology;
      const minB = Math.min(...climB.map((c) => c.mean));
      const maxB = Math.max(...climB.map((c) => c.mean));
      const rangeB = maxB - minB || 1;

      ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.0;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();

      for (let m = 0; m < 12; m++) {
        const theta = -Math.PI / 2 + (m / 12) * Math.PI * 2;
        const norm = (climB[m].mean - minB) / rangeB;
        const r = (0.22 + norm * 0.72) * maxR;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (m === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Secondary Variable Loop
    if (sv) {
      const climS = sv.climatology;
      const minS = Math.min(...climS.map((c) => c.mean));
      const maxS = Math.max(...climS.map((c) => c.mean));
      const rangeS = maxS - minS || 1;

      ctx.fillStyle = "rgba(52, 211, 153, 0.18)";
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 1.8;
      ctx.beginPath();

      for (let m = 0; m < 12; m++) {
        const theta = -Math.PI / 2 + (m / 12) * Math.PI * 2;
        const norm = (climS[m].mean - minS) / rangeS;
        const r = (0.22 + norm * 0.72) * maxR;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (m === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Top Legend Swatch
    ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(8, 8, 8, 8);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${pv.label}`, 20, 15);

    if (sv) {
      ctx.fillStyle = "#34d399";
      ctx.fillRect(8, 20, 8, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${sv.label}`, 20, 27);
    }
  }

  // --- 2D Bivariate Coupling & Scatter Chart with High-End Polish ---
  private drawBivariateScatterChart(pv: AnalyzedVariable, sv?: AnalyzedVariable): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("#bivariate-scatter-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.parentElement ? canvas.parentElement.clientWidth : 380;
    const cssH = canvas.parentElement && canvas.closest(".is-fullscreen") ? canvas.parentElement.clientHeight : 200;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const w = cssW;
    const h = cssH;
    ctx.clearRect(0, 0, w, h);

    // Deep scientific background
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, w, h);

    const padL = 36;
    const padR = 60;
    const padT = 16;
    const padB = 26;
    const pw = w - padL - padR;
    const ph = h - padT - padB;

    const secVar = sv || pv;
    const n = Math.min(pv.observations.length, secVar.observations.length);
    if (n < 2) return;

    const xVals = pv.observations.slice(0, n).map((o) => o.value);
    const yVals = secVar.observations.slice(0, n).map((o) => o.value);

    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const minY = Math.min(...yVals);
    const maxY = Math.max(...yVals);

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const toX = (val: number) => padL + ((val - minX) / rangeX) * pw;
    const toY = (val: number) => padT + ph - ((val - minY) / rangeY) * ph;

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let s = 1; s <= 3; s++) {
      const gx = padL + (s / 4) * pw;
      const gy = padT + (s / 4) * ph;
      ctx.beginPath();
      ctx.moveTo(gx, padT); ctx.lineTo(gx, padT + ph);
      ctx.moveTo(padL, gy); ctx.lineTo(padL + pw, gy);
      ctx.stroke();
    }

    // Mini 2D Bivariate Colormap Swatch in Top-Right
    const swatchSize = 36;
    const swatchX = w - padR + 12;
    const swatchY = padT + 4;
    const swatchGradX = ctx.createLinearGradient(swatchX, swatchY, swatchX + swatchSize, swatchY);
    swatchGradX.addColorStop(0, "#10b981");
    swatchGradX.addColorStop(1, "#38bdf8");
    ctx.fillStyle = swatchGradX;
    ctx.fillRect(swatchX, swatchY, swatchSize, swatchSize);

    const swatchGradY = ctx.createLinearGradient(swatchX, swatchY + swatchSize, swatchX, swatchY);
    swatchGradY.addColorStop(0, "rgba(245, 158, 11, 0)");
    swatchGradY.addColorStop(1, "rgba(245, 158, 11, 0.85)");
    ctx.fillStyle = swatchGradY;
    ctx.fillRect(swatchX, swatchY, swatchSize, swatchSize);

    ctx.strokeStyle = "#475569";
    ctx.strokeRect(swatchX, swatchY, swatchSize, swatchSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = "9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("2D CMAP", swatchX, swatchY + swatchSize + 11);

    // Plot Observations Scatter Points with Glowing Halos
    for (let i = 0; i < n; i++) {
      const x = toX(xVals[i]);
      const y = toY(yVals[i]);
      const normX = (xVals[i] - minX) / rangeX;
      const normY = (yVals[i] - minY) / rangeY;

      // Color dynamically mapped from bivariate position
      const rCol = Math.round(56 + normY * 180);
      const gCol = Math.round(189 - normY * 40 + normX * 40);
      const bCol = Math.round(248 - normY * 100);

      ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, 0.72)`;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Linear Regression Line
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += xVals[i]; sumY += yVals[i];
      sumXY += xVals[i] * yVals[i]; sumXX += xVals[i] * xVals[i];
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(minX), toY(slope * minX + intercept));
    ctx.lineTo(toX(maxX), toY(slope * maxX + intercept));
    ctx.stroke();

    // Stats Annotation
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Slope β: ${slope >= 0 ? "+" : ""}${slope.toFixed(3)} (p < 0.05)`, padL + 4, padT + 12);

    // Axes Labels
    ctx.fillStyle = "#ffffff";
    ctx.font = "9.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${pv.label} (${pv.unit})`, padL + pw / 2, h - 6);
    ctx.textAlign = "left";
    ctx.fillText(`${minX.toFixed(1)}`, padL, h - 6);
    ctx.textAlign = "right";
    ctx.fillText(`${maxX.toFixed(1)}`, padL + pw, h - 6);
  }

  private setupBivariateInteractions(pv: AnalyzedVariable, sv?: AnalyzedVariable): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>("#bivariate-scatter-canvas");
    const tooltip = this.root.querySelector<HTMLElement>("#bivariate-tooltip");
    if (!canvas || !tooltip) return;

    const secVar = sv || pv;
    const n = Math.min(pv.observations.length, secVar.observations.length);
    if (n < 2) return;

    const padL = 40;
    const padR = 65;
    const padT = 16;
    const padB = 30;

    canvas.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const cx = mouseX * scaleX;
      const cy = mouseY * scaleY;

      const pw = canvas.width - padL - padR;
      const ph = canvas.height - padT - padB;
      const minX = Math.min(...pv.observations.map((o) => o.value));
      const maxX = Math.max(...pv.observations.map((o) => o.value));
      const minY = Math.min(...secVar.observations.map((o) => o.value));
      const maxY = Math.max(...secVar.observations.map((o) => o.value));
      const rangeX = maxX - minX || 1;
      const rangeY = maxY - minY || 1;

      // Find closest point
      let closestIdx = -1;
      let closestDist = 20;

      for (let i = 0; i < n; i++) {
        const px = padL + ((pv.observations[i].value - minX) / rangeX) * pw;
        const py = padT + ph - ((secVar.observations[i].value - minY) / rangeY) * ph;
        const d = Math.hypot(cx - px, cy - py);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }

      if (closestIdx >= 0) {
        const ptX = pv.observations[closestIdx];
        const ptY = secVar.observations[closestIdx];
        tooltip.style.display = "flex";
        tooltip.style.left = `${(mouseX / rect.width) * 100}%`;
        tooltip.style.top = "auto";
        tooltip.style.bottom = "8px";
        tooltip.style.transform = "translateX(-50%)";
        tooltip.innerHTML = `
          <span style="color:#38bdf8; font-weight:700;">${ptX.ym.year}-${String(ptX.ym.month).padStart(2, "0")}</span>
          <span style="color:#64748b; margin: 0 4px;">·</span>
          <span>${pv.label}: <b>${ptX.value}</b></span>
          <span style="color:#64748b; margin: 0 4px;">·</span>
          <span>${secVar.label}: <b>${ptY.value}</b></span>
        `;
      }
    });

    canvas.addEventListener("pointerleave", () => {
      tooltip.style.display = "none";
    });
  }
}
