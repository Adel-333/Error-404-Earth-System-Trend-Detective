import type { InvestigationGeometry } from "./context";
import { geometryCenter } from "./context";

export class RegionalMap {
  readonly canvas: HTMLCanvasElement;
  private readonly context2d: CanvasRenderingContext2D;
  private zoom = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dragStart: { x: number; y: number; offsetX: number; offsetY: number } | null = null;
  private onInspect: (lat: number, lon: number) => void;

  constructor(
    parent: HTMLElement,
    private readonly geometry: InvestigationGeometry,
    onInspect: (lat: number, lon: number) => void
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "investigation-map__canvas";
    this.canvas.width = 1200;
    this.canvas.height = 620;
    this.context2d = this.canvas.getContext("2d")!;
    this.onInspect = onInspect;
    parent.append(this.canvas);
    this.bind();
    this.draw();
  }

  destroy(): void {
    this.canvas.remove();
  }

  public zoomIn(): void {
    this.zoom = Math.min(8, this.zoom * 1.35);
    this.draw();
  }

  public zoomOut(): void {
    this.zoom = Math.max(0.7, this.zoom / 1.35);
    this.draw();
  }

  public resetView(): void {
    this.zoom = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.draw();
  }

  private bind(): void {
    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const next = this.zoom * (event.deltaY < 0 ? 1.15 : 0.87);
        this.zoom = Math.min(8, Math.max(0.7, next));
        this.draw();
      },
      { passive: false }
    );
    this.canvas.addEventListener("pointerdown", (event) => {
      this.canvas.setPointerCapture(event.pointerId);
      this.dragStart = { x: event.offsetX, y: event.offsetY, offsetX: this.offsetX, offsetY: this.offsetY };
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.dragStart) return;
      this.offsetX = this.dragStart.offsetX + event.offsetX - this.dragStart.x;
      this.offsetY = this.dragStart.offsetY + event.offsetY - this.dragStart.y;
      this.draw();
    });
    this.canvas.addEventListener("pointerup", (event) => {
      const start = this.dragStart;
      this.dragStart = null;
      if (!start) return;
      const travel = Math.hypot(event.offsetX - start.x, event.offsetY - start.y);
      if (travel < 5) {
        const location = this.toGeo(event.offsetX, event.offsetY);
        this.onInspect(location.lat, location.lon);
      }
    });
  }

  private viewport(): { centerLat: number; centerLon: number; degreesPerPixel: number } {
    const center = geometryCenter(this.geometry);
    return { centerLat: center.lat, centerLon: center.lon, degreesPerPixel: 0.11 / this.zoom };
  }

  private toScreen(lat: number, lon: number): { x: number; y: number } {
    const { centerLat, centerLon, degreesPerPixel } = this.viewport();
    return {
      x: this.canvas.width / 2 + (lon - centerLon) / degreesPerPixel + this.offsetX,
      y: this.canvas.height / 2 - (lat - centerLat) / degreesPerPixel + this.offsetY,
    };
  }

  private toGeo(x: number, y: number): { lat: number; lon: number } {
    const { centerLat, centerLon, degreesPerPixel } = this.viewport();
    return {
      lat: centerLat - (y - this.canvas.height / 2 - this.offsetY) * degreesPerPixel,
      lon: centerLon + (x - this.canvas.width / 2 - this.offsetX) * degreesPerPixel,
    };
  }

  private draw(): void {
    const ctx = this.context2d;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);

    // Deep Mission Radar Canvas Gradient
    const gradient = ctx.createRadialGradient(
      width / 2 + this.offsetX,
      height / 2 + this.offsetY,
      20,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    gradient.addColorStop(0, "#0a192f");
    gradient.addColorStop(0.65, "#06101e");
    gradient.addColorStop(1, "#020712");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const { centerLat, centerLon, degreesPerPixel } = this.viewport();
    const step = this.zoom > 3 ? 0.5 : this.zoom > 1.4 ? 1 : 2.5;
    const minLon = centerLon - (width / 2) * degreesPerPixel;
    const maxLon = centerLon + (width / 2) * degreesPerPixel;
    const minLat = centerLat - (height / 2) * degreesPerPixel;
    const maxLat = centerLat + (height / 2) * degreesPerPixel;

    // Draw Graticule Coordinate Grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
    ctx.fillStyle = "rgba(148, 163, 184, 0.65)";
    ctx.font = "14px 'Geist Mono', monospace";

    for (let lon = Math.floor(minLon / step) * step; lon <= maxLon; lon += step) {
      const point = this.toScreen(centerLat, lon);
      ctx.beginPath();
      ctx.moveTo(point.x, 0);
      ctx.lineTo(point.x, height);
      ctx.stroke();

      const label = lon < 0 ? `${Math.abs(lon).toFixed(1)}°W` : `${lon.toFixed(1)}°E`;
      ctx.fillText(label, point.x + 6, 22);
    }

    for (let lat = Math.floor(minLat / step) * step; lat <= maxLat; lat += step) {
      const point = this.toScreen(lat, centerLon);
      ctx.beginPath();
      ctx.moveTo(0, point.y);
      ctx.lineTo(width, point.y);
      ctx.stroke();

      const label = lat < 0 ? `${Math.abs(lat).toFixed(1)}°S` : `${lat.toFixed(1)}°N`;
      ctx.fillText(label, 8, point.y - 6);
    }

    // Grid Intersection Crosshairs
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    for (let lon = Math.floor(minLon / step) * step; lon <= maxLon; lon += step) {
      for (let lat = Math.floor(minLat / step) * step; lat <= maxLat; lat += step) {
        const p = this.toScreen(lat, lon);
        ctx.beginPath();
        ctx.moveTo(p.x - 4, p.y);
        ctx.lineTo(p.x + 4, p.y);
        ctx.moveTo(p.x, p.y - 4);
        ctx.lineTo(p.x, p.y + 4);
        ctx.stroke();
      }
    }

    // Target Center Reticle & Concentric Range Rings
    const centerPoint = this.toScreen(centerLat, centerLon);

    // Range Rings
    const ringRadii = [60, 130, 210];
    ctx.lineWidth = 1;
    ringRadii.forEach((r, idx) => {
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.25 - idx * 0.06})`;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(centerPoint.x, centerPoint.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const kmDist = Math.round(r * degreesPerPixel * 111.32);
      ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
      ctx.font = "11px 'Geist Mono', monospace";
      ctx.fillText(`${kmDist}km`, centerPoint.x + r + 4, centerPoint.y - 4);
    });

    // High-Tech Reticle Target Geometry
    ctx.strokeStyle = "#38bdf8";
    ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
    ctx.lineWidth = 2;

    if (this.geometry.kind === "point") {
      const point = this.toScreen(this.geometry.lat, this.geometry.lon);

      // Core pulsating glow circle
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer targeting brackets
      const bSize = 18;
      ctx.lineWidth = 2.5;
      // Top Left
      ctx.beginPath();
      ctx.moveTo(point.x - bSize, point.y - bSize + 8);
      ctx.lineTo(point.x - bSize, point.y - bSize);
      ctx.lineTo(point.x - bSize + 8, point.y - bSize);
      ctx.stroke();
      // Top Right
      ctx.beginPath();
      ctx.moveTo(point.x + bSize - 8, point.y - bSize);
      ctx.lineTo(point.x + bSize, point.y - bSize);
      ctx.lineTo(point.x + bSize, point.y - bSize + 8);
      ctx.stroke();
      // Bottom Left
      ctx.beginPath();
      ctx.moveTo(point.x - bSize, point.y + bSize - 8);
      ctx.lineTo(point.x - bSize, point.y + bSize);
      ctx.lineTo(point.x - bSize + 8, point.y + bSize);
      ctx.stroke();
      // Bottom Right
      ctx.beginPath();
      ctx.moveTo(point.x + bSize - 8, point.y + bSize);
      ctx.lineTo(point.x + bSize, point.y + bSize);
      ctx.lineTo(point.x + bSize, point.y + bSize - 8);
      ctx.stroke();

      // Center crosshair spikes
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(point.x - 28, point.y);
      ctx.lineTo(point.x - 12, point.y);
      ctx.moveTo(point.x + 12, point.y);
      ctx.lineTo(point.x + 28, point.y);
      ctx.moveTo(point.x, point.y - 28);
      ctx.lineTo(point.x, point.y - 12);
      ctx.moveTo(point.x, point.y + 12);
      ctx.lineTo(point.x, point.y + 28);
      ctx.stroke();

      // Target Coordinate Label
      ctx.fillStyle = "#e0f2fe";
      ctx.font = "bold 13px 'Geist Mono', monospace";
      const latStr = `${this.geometry.lat >= 0 ? this.geometry.lat.toFixed(2) + "°N" : Math.abs(this.geometry.lat).toFixed(2) + "°S"}`;
      const lonStr = `${this.geometry.lon >= 0 ? this.geometry.lon.toFixed(2) + "°E" : Math.abs(this.geometry.lon).toFixed(2) + "°W"}`;
      ctx.fillText(`${latStr}, ${lonStr}`, point.x + bSize + 8, point.y + 4);
    } else {
      const northWest = this.toScreen(this.geometry.north, this.geometry.west);
      const southEast = this.toScreen(this.geometry.south, this.geometry.east);
      const w = southEast.x - northWest.x;
      const h = southEast.y - northWest.y;

      ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
      ctx.fillRect(northWest.x, northWest.y, w, h);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(northWest.x, northWest.y, w, h);
    }

    // Scale reference bar in lower right
    const refPixels = 120;
    const refKm = Math.round(refPixels * degreesPerPixel * 111.32);
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 1;
    ctx.fillRect(width - 150, height - 36, 138, 26);
    ctx.strokeRect(width - 150, height - 36, 138, 26);

    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(width - 142, height - 26, 40, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(width - 102, height - 26, 40, 3);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px 'Geist Mono', monospace";
    ctx.fillText(`${refKm} km`, width - 58, height - 20);
  }
}
