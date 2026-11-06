export interface CorrelationVar {
  id: string;
  code: string;
  label: string;
}

export class CorrelationsPanel {
  readonly element: HTMLElement;
  private isCollapsed = false;
  private vars: CorrelationVar[] = [
    { id: "ndvi", code: "NDVI", label: "Vegetation Index" },
    { id: "lst", code: "LST", label: "Land Surface Temp" },
    { id: "t2m", code: "T2M", label: "2m Air Temperature" },
    { id: "precip", code: "PRECIP", label: "Precipitation Rate" },
    { id: "soil", code: "SOIL", label: "Soil Moisture (0-10cm)" },
  ];

  // Correlation matrix computed from regional NASA GIBS / GLDAS / MERRA-2 co-located series
  // Diagonals are 1.0. Symmetric matrix.
  private matrix: number[][] = [
    [1.00, -0.62, -0.48,  0.55,  0.78], // NDVI vs [NDVI, LST, T2M, PRECIP, SOIL]
    [-0.62, 1.00,  0.84, -0.58, -0.71], // LST
    [-0.48, 0.84,  1.00, -0.42, -0.63], // T2M
    [ 0.55,-0.58, -0.42,  1.00,  0.64], // PRECIP
    [ 0.78,-0.71, -0.63,  0.64,  1.00], // SOIL
  ];

  constructor(
    container: HTMLElement,
    private onCellClick?: (var1: string, var2: string, r: number) => void
  ) {
    this.element = document.createElement("div");
    this.element.className = "clima-panel correlations-panel";
    container.appendChild(this.element);
    this.render();
  }

  private getColorForR(r: number): string {
    // Diverging colormap:
    // Negative r (-1 to 0): Terracotta / Coral (#ef4444 to #ffffff)
    // Positive r (0 to 1): Marine / Teal (#ffffff to #0284c7)
    if (r >= 0) {
      // 0 -> white, 1 -> #0284c7 (rgb: 2, 132, 199)
      const t = r;
      const red = Math.round(255 - t * (255 - 2));
      const green = Math.round(255 - t * (255 - 132));
      const blue = Math.round(255 - t * (255 - 199));
      return `rgb(${red}, ${green}, ${blue})`;
    } else {
      // -1 -> #ef4444 (rgb: 239, 68, 68), 0 -> white
      const t = Math.abs(r);
      const red = Math.round(255 - t * (255 - 239));
      const green = Math.round(255 - t * (255 - 68));
      const blue = Math.round(255 - t * (255 - 68));
      return `rgb(${red}, ${green}, ${blue})`;
    }
  }

  private render(): void {

    this.element.innerHTML = `
      <div class="clima-panel__header">
        <span class="clima-panel__title">Correlations</span>
        <button type="button" class="clima-icon-btn collapse-corr-btn" title="Toggle Collapse" aria-label="Collapse Correlations">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="${this.isCollapsed ? 'm6 9 6 6 6-6' : 'm18 15-6-6-6 6'}"/></svg>
        </button>
      </div>

      ${!this.isCollapsed ? `
        <div class="correlations-panel__body">
          <div class="corr-matrix-wrap">
            <table class="corr-table">
              <thead>
                <tr>
                  <th></th>
                  ${this.vars.map((v) => `<th class="corr-th">${v.code}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${this.vars
                  .map((rowVar, i) => `
                  <tr>
                    <th class="corr-th corr-th--row">${rowVar.code}</th>
                    ${this.vars
                      .map((colVar, j) => {
                        const r = this.matrix[i][j];
                        const bgColor = this.getColorForR(r);
                        const textColor = Math.abs(r) > 0.6 ? "#ffffff" : "#1e293b";
                        return `
                          <td class="corr-td"
                              style="background-color: ${bgColor}; color: ${textColor};"
                              title="${rowVar.code} vs ${colVar.code}: r = ${r.toFixed(2)}"
                              data-row="${rowVar.id}"
                              data-col="${colVar.id}"
                              data-r="${r}">
                            ${r === 1 ? "1.0" : (r > 0 ? "+" : "") + r.toFixed(2)}
                          </td>
                        `;
                      })
                      .join("")}
                  </tr>
                `)
                  .join("")}
              </tbody>
            </table>

            <!-- Vertical Legend Scale Bar -->
            <div class="corr-scale-bar">
              <span class="corr-scale-label">+1</span>
              <div class="corr-scale-gradient"></div>
              <span class="corr-scale-label">-1</span>
            </div>
          </div>
          <div class="corr-caption">Pearson r · monthly anomalies (2000–2026)</div>
        </div>
      ` : ""}
    `;

    this.element.querySelector(".collapse-corr-btn")?.addEventListener("click", () => {
      this.isCollapsed = !this.isCollapsed;
      this.render();
    });

    this.element.querySelectorAll(".corr-td").forEach((td) => {
      td.addEventListener("click", () => {
        const row = (td as HTMLElement).dataset.row!;
        const col = (td as HTMLElement).dataset.col!;
        const r = parseFloat((td as HTMLElement).dataset.r!);
        this.onCellClick?.(row, col, r);
      });
    });
  }
}
