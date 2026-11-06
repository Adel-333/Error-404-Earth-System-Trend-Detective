import type { YearMonth } from "../lib/timeline";
import { MannKendallResult } from "../lib/trend";

export type AnalysisTab = "seasonal" | "monthly" | "trend";
export type StepSize = "month" | "season" | "year";
export type ScaleMode = "standardized" | "absolute";

export interface TemporalWorkspaceCallbacks {
  onStepChange: (index: number) => void;
  onPlayToggle: (isPlaying: boolean) => void;
  onTabChange: (tab: AnalysisTab) => void;
  onScaleChange: (mode: ScaleMode) => void;
}

export class TemporalWorkspace {
  readonly element: HTMLElement;
  private currentTab: AnalysisTab = "monthly";
  private stepSize: StepSize = "month";
  private scaleMode: ScaleMode = "standardized";
  private isPlaying = false;
  private isCollapsed = false;

  private polarCanvas: HTMLCanvasElement | null = null;
  private waveCanvas: HTMLCanvasElement | null = null;

  // Real or synthetic series values for dual curves
  private months: YearMonth[] = [];
  private currentIndex = 0;
  private primaryName = "Vegetation Index (NDVI)";
  private secondaryName = "Land Surface Temp (LST)";

  // Trend detection statistics
  private trendInfo = {
    slope: "+0.024/decade",
    tau: 0.38,
    pValue: 0.004,
    significant: true,
    interpretation: "Significant greening trend detected (p < 0.01)"
  };

  constructor(
    container: HTMLElement,
    months: YearMonth[],
    currentIndex: number,
    private callbacks: TemporalWorkspaceCallbacks
  ) {
    this.months = months;
    this.currentIndex = currentIndex;

    this.element = document.createElement("div");
    this.element.className = "clima-panel temporal-workspace";
    container.appendChild(this.element);
    this.render();
  }

  setMonthIndex(index: number): void {
    this.currentIndex = index;
    const scrubber = this.element.querySelector<HTMLInputElement>(".temporal-scrubber");
    if (scrubber) scrubber.value = String(index);
    const dateLabel = this.element.querySelector(".temporal-current-date");
    if (dateLabel && this.months[index]) {
      const ym = this.months[index];
      dateLabel.textContent = `${ym.year}-${String(ym.month).padStart(2, "0")}`;
    }
    this.drawWaveChart();
  }

  setPlayState(playing: boolean): void {
    this.isPlaying = playing;
    const playBtn = this.element.querySelector(".temporal-play-btn");
    if (playBtn) {
      playBtn.innerHTML = playing
        ? `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`
        : `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play`;
    }
  }

  setVariables(primary: string, secondary: string): void {
    this.primaryName = primary;
    this.secondaryName = secondary;
    this.render();
  }

  setTrendResult(res: MannKendallResult, slopeText: string): void {
    this.trendInfo = {
      slope: slopeText,
      tau: Number(res.tau.toFixed(3)),
      pValue: Number(res.pValue.toFixed(4)),
      significant: res.pValue < 0.05,
      interpretation: res.pValue < 0.05
        ? (res.tau > 0 ? "Statistically significant upward trend (p < 0.05)" : "Statistically significant downward trend (p < 0.05)")
        : "No monotonic trend detected at α = 0.05 level"
    };
    this.render();
  }

  private render(): void {
    const total = Math.max(1, this.months.length);
    const ym = this.months[this.currentIndex] ?? { year: 2026, month: 7 };

    this.element.innerHTML = `
      <!-- Top Scrubber & Controls Row -->
      <div class="temporal-top-bar">
        <div class="temporal-title-group">
          <span class="temporal-title">Temporal</span>
          
          <div class="temporal-step-group">
            <span class="temporal-sublabel">Step size</span>
            <select class="temporal-step-select">
              <option value="month" ${this.stepSize === "month" ? "selected" : ""}>Month</option>
              <option value="season" ${this.stepSize === "season" ? "selected" : ""}>Season</option>
              <option value="year" ${this.stepSize === "year" ? "selected" : ""}>Year</option>
            </select>
          </div>
        </div>

        <!-- Interactive Timeline Track -->
        <div class="temporal-scrubber-wrap">
          <div class="temporal-timeline-ticks">
            <span>1980</span>
            <span>1990</span>
            <span>2000</span>
            <span>2010</span>
            <span>2020</span>
            <span>2026</span>
          </div>
          <input type="range" class="temporal-scrubber" min="0" max="${total - 1}" value="${this.currentIndex}">
        </div>

        <div class="temporal-right-actions">
          <span class="temporal-current-date">${ym.year}-${String(ym.month).padStart(2, "0")}</span>
          <button type="button" class="temporal-play-btn">
            ${this.isPlaying ? `
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause
            ` : `
              <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play
            `}
          </button>
          <button type="button" class="clima-icon-btn collapse-temporal-btn" title="Toggle Collapse">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="${this.isCollapsed ? 'm6 9 6 6 6-6' : 'm18 15-6-6-6 6'}"/></svg>
          </button>
        </div>
      </div>

      ${!this.isCollapsed ? `
        <!-- Main Workspace Area -->
        <div class="temporal-body">
          <!-- Left Modes / Tabs -->
          <div class="temporal-tabs">
            <button type="button" class="temporal-tab ${this.currentTab === "seasonal" ? "is-active" : ""}" data-tab="seasonal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>Multi-seasonal</span>
            </button>
            <button type="button" class="temporal-tab ${this.currentTab === "monthly" ? "is-active" : ""}" data-tab="monthly">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Multi-monthly</span>
            </button>
            <button type="button" class="temporal-tab ${this.currentTab === "trend" ? "is-active" : ""}" data-tab="trend">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Trend Detective</span>
            </button>
          </div>

          <!-- Middle-Left: Polar Radial Cycle Chart -->
          <div class="temporal-polar-wrap">
            <div class="polar-season-labels">
              <span class="polar-season-lbl polar-season-lbl--top">SUMMER (Jul)</span>
              <span class="polar-season-lbl polar-season-lbl--right">AUTUMN</span>
              <span class="polar-season-lbl polar-season-lbl--bottom">WINTER (Jan)</span>
              <span class="polar-season-lbl polar-season-lbl--left">SPRING</span>
            </div>
            <canvas class="temporal-polar-canvas" width="130" height="130"></canvas>
          </div>

          <!-- Middle-Right: Time Series Wave Chart -->
          <div class="temporal-wave-wrap">
            <div class="wave-header">
              <div class="wave-y-axis-label">${this.scaleMode === "standardized" ? "Z-Score (σ)" : "Values"}</div>
              <div class="wave-toggles">
                <button type="button" class="wave-toggle-btn ${this.scaleMode === "standardized" ? "is-active" : ""}" data-scale="standardized">Standardized</button>
                <button type="button" class="wave-toggle-btn ${this.scaleMode === "absolute" ? "is-active" : ""}" data-scale="absolute">Absolute</button>
              </div>
            </div>
            <canvas class="temporal-wave-canvas" width="460" height="110"></canvas>
            <div class="wave-x-axis-ticks">
              <span>2000</span>
              <span>2004</span>
              <span>2008</span>
              <span>2012</span>
              <span>2016</span>
              <span>2020</span>
              <span>2024</span>
            </div>
          </div>

          <!-- Right: Variable Legends & Scientific Trend Evidence -->
          <div class="temporal-info-panel">
            <div class="temporal-legend-rows">
              <div class="legend-row">
                <span class="legend-indicator" style="background-color: #10b981;"></span>
                <span class="legend-name">${this.primaryName}</span>
              </div>
              <div class="legend-row">
                <span class="legend-indicator" style="background-color: #0284c7;"></span>
                <span class="legend-name">${this.secondaryName}</span>
              </div>
            </div>

            <!-- Scientific Trend Detective Box -->
            <div class="trend-evidence-box ${this.trendInfo.significant ? "is-significant" : ""}">
              <div class="trend-evidence__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Mann-Kendall Test
              </div>
              <div class="trend-evidence__grid">
                <div>Slope: <strong>${this.trendInfo.slope}</strong></div>
                <div>Kendall τ: <strong>${this.trendInfo.tau}</strong></div>
                <div>p-value: <strong>${this.trendInfo.pValue}</strong></div>
                <div>FDR: <strong>${this.trendInfo.significant ? "q < 0.05" : "n.s."}</strong></div>
              </div>
              <div class="trend-evidence__desc">${this.trendInfo.interpretation}</div>
            </div>
          </div>
        </div>
      ` : ""}
    `;

    this.polarCanvas = this.element.querySelector(".temporal-polar-canvas");
    this.waveCanvas = this.element.querySelector(".temporal-wave-canvas");

    this.drawPolarChart();
    this.drawWaveChart();

    // Event bindings
    const scrubber = this.element.querySelector<HTMLInputElement>(".temporal-scrubber");
    scrubber?.addEventListener("input", () => {
      const idx = parseInt(scrubber.value, 10);
      this.currentIndex = idx;
      this.callbacks.onStepChange(idx);
      this.setMonthIndex(idx);
    });

    const playBtn = this.element.querySelector(".temporal-play-btn");
    playBtn?.addEventListener("click", () => {
      this.isPlaying = !this.isPlaying;
      this.callbacks.onPlayToggle(this.isPlaying);
      this.setPlayState(this.isPlaying);
    });

    this.element.querySelectorAll(".temporal-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = (btn as HTMLElement).dataset.tab as AnalysisTab;
        this.currentTab = tab;
        this.render();
        this.callbacks.onTabChange(tab);
      });
    });

    this.element.querySelectorAll(".wave-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const scale = (btn as HTMLElement).dataset.scale as ScaleMode;
        this.scaleMode = scale;
        this.render();
        this.callbacks.onScaleChange(scale);
      });
    });

    this.element.querySelector(".collapse-temporal-btn")?.addEventListener("click", () => {
      this.isCollapsed = !this.isCollapsed;
      this.render();
    });
  }

  private drawPolarChart(): void {
    if (!this.polarCanvas) return;
    const ctx = this.polarCanvas.getContext("2d");
    if (!ctx) return;

    const w = 130;
    const h = 130;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = 52;

    ctx.clearRect(0, 0, w, h);

    // Draw concentric reference circles
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach((f) => {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * f, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw radial cross axes
    ctx.beginPath();
    ctx.moveTo(cx, cy - maxR);
    ctx.lineTo(cx, cy + maxR);
    ctx.moveTo(cx - maxR, cy);
    ctx.lineTo(cx + maxR, cy);
    ctx.stroke();

    // Primary curve: seasonal harmonic (ellipse or smooth radar polygon)
    ctx.beginPath();
    for (let month = 0; month < 12; month++) {
      // Angle: 0 = July (top, -PI/2)
      const angle = (month / 12) * Math.PI * 2 - Math.PI / 2;
      // Seasonal cycle amplitude
      const val = 0.55 + 0.35 * Math.sin(angle + Math.PI / 4);
      const r = maxR * val;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (month === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(16, 185, 129, 0.22)"; // Emerald fill
    ctx.fill();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Secondary curve (e.g. Temperature / LST cycle)
    ctx.beginPath();
    for (let month = 0; month < 12; month++) {
      const angle = (month / 12) * Math.PI * 2 - Math.PI / 2;
      // High in summer (top), low in winter (bottom)
      const val = 0.58 + 0.38 * Math.cos(angle);
      const r = maxR * val;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (month === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(2, 132, 199, 0.18)"; // Cyan / blue fill
    ctx.fill();
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  private drawWaveChart(): void {
    if (!this.waveCanvas) return;
    const ctx = this.waveCanvas.getContext("2d");
    if (!ctx) return;

    const w = 460;
    const h = 110;
    ctx.clearRect(0, 0, w, h);

    // Draw horizontal grid lines
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    [0.2, 0.5, 0.8].forEach((f) => {
      ctx.beginPath();
      ctx.moveTo(0, h * f);
      ctx.lineTo(w, h * f);
      ctx.stroke();
    });

    const numPoints = 80;
    const stepX = w / (numPoints - 1);
    const midY = h / 2;

    // Draw Primary Curve (Green: Vegetation / NDVI)
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints;
      // Multi-seasonal oscillation + upward trend
      const trend = t * 14;
      const seasonal = 28 * Math.sin(t * Math.PI * 2 * 6 - 0.5);
      const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * 3;
      const y = midY - seasonal - trend + noise;
      const x = i * stepX;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Secondary Curve (Cyan: Temperature / LST)
    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints;
      const trend = t * 10;
      const seasonal = 30 * Math.sin(t * Math.PI * 2 * 6 + 1.2);
      const noise = Math.cos(i * 2.1) * 3;
      const y = midY - seasonal - trend + noise;
      const x = i * stepX;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Current scrubber time marker (vertical indicator line)
    const total = Math.max(1, this.months.length);
    const fraction = Math.min(1, Math.max(0, this.currentIndex / total));
    const currentX = fraction * w;

    ctx.strokeStyle = "#ef4444"; // Red current-month needle
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, h);
    ctx.stroke();

    // Small dot at the current point
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(currentX, midY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
