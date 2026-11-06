export interface BivariateLegendOptions {
  onClose?: () => void;
}

export class BivariateLegend {
  readonly element: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private varX = "NDVI (Vegetation Index)";
  private varY = "LST (°C Surface Temp)";

  constructor(container: HTMLElement, private opts?: BivariateLegendOptions) {
    this.element = document.createElement("div");
    this.element.className = "clima-bivariate-legend";
    this.element.innerHTML = `
      <div class="bivariate-header">
        <span class="bivariate-title">2D Bivariate Colormap</span>
        <button type="button" class="clima-icon-btn close-bivariate-btn" title="Close Bivariate Legend">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="bivariate-container">
        <!-- Vertical Y Marginal Histogram -->
        <div class="bivariate-y-axis">
          <span class="bivariate-label bivariate-label--y">${this.varY}</span>
          <canvas class="bivariate-hist-y" width="30" height="90"></canvas>
        </div>

        <div class="bivariate-matrix-wrap">
          <!-- 2D Color Square -->
          <canvas class="bivariate-matrix-canvas" width="90" height="90"></canvas>
          
          <!-- Horizontal X Marginal Histogram -->
          <div class="bivariate-x-axis">
            <canvas class="bivariate-hist-x" width="90" height="30"></canvas>
            <span class="bivariate-label bivariate-label--x">${this.varX}</span>
          </div>
        </div>
      </div>
    `;
    container.appendChild(this.element);

    this.canvas = this.element.querySelector(".bivariate-matrix-canvas")!;
    this.ctx = this.canvas.getContext("2d")!;
    this.draw();

    this.element.querySelector(".close-bivariate-btn")?.addEventListener("click", () => {
      this.opts?.onClose?.();
    });
  }

  setVariables(xName: string, yName: string): void {
    this.varX = xName;
    this.varY = yName;
    const lx = this.element.querySelector(".bivariate-label--x");
    const ly = this.element.querySelector(".bivariate-label--y");
    if (lx) lx.textContent = xName;
    if (ly) ly.textContent = yName;
    this.draw();
  }

  private draw(): void {
    const size = 90;
    const imgData = this.ctx.createImageData(size, size);
    const data = imgData.data;

    // Generate scientific bivariate colormap:
    for (let py = 0; py < size; py++) {
      const ny = 1 - py / size; // Y from 0 (bottom) to 1 (top)
      for (let px = 0; px < size; px++) {
        const nx = px / size; // X from 0 (left) to 1 (right)
        const idx = (py * size + px) * 4;

        const r = Math.round(148 * (1 - nx) * (1 - ny) + 245 * (1 - nx) * ny + 4 * nx * (1 - ny) + 16 * nx * ny);
        const g = Math.round(163 * (1 - nx) * (1 - ny) + 158 * (1 - nx) * ny + 120 * nx * (1 - ny) + 185 * nx * ny);
        const b = Math.round(184 * (1 - nx) * (1 - ny) + 11 * (1 - nx) * ny + 87 * nx * (1 - ny) + 129 * nx * ny);

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 240;
      }
    }
    this.ctx.putImageData(imgData, 0, 0);

    // Draw marginal distribution curve for X
    const histX = this.element.querySelector<HTMLCanvasElement>(".bivariate-hist-x");
    if (histX) {
      const cx = histX.getContext("2d");
      if (cx) {
        cx.clearRect(0, 0, 90, 30);
        cx.fillStyle = "#1e293b";
        cx.beginPath();
        cx.moveTo(0, 30);
        for (let x = 0; x <= 90; x++) {
          const t = x / 90;
          const y = 28 * Math.pow(t, 1.8) * Math.pow(1 - t, 0.8) * 3.2;
          cx.lineTo(x, 30 - Math.min(28, y));
        }
        cx.lineTo(90, 30);
        cx.closePath();
        cx.fill();
      }
    }

    // Draw marginal distribution curve for Y
    const histY = this.element.querySelector<HTMLCanvasElement>(".bivariate-hist-y");
    if (histY) {
      const cy = histY.getContext("2d");
      if (cy) {
        cy.clearRect(0, 0, 30, 90);
        cy.fillStyle = "#1e293b";
        cy.beginPath();
        cy.moveTo(30, 90);
        for (let y = 0; y <= 90; y++) {
          const t = (90 - y) / 90;
          const x = 28 * Math.exp(-Math.pow((t - 0.55) / 0.25, 2));
          cy.lineTo(30 - Math.min(28, x), y);
        }
        cy.lineTo(30, 0);
        cy.closePath();
        cy.fill();
      }
    }
  }
}
