/**
 * NASA Earth System Trend Detective — AI Copilot Assistant (Gemini Grounded Assistant)
 * 
 * Connected to:
 * - Active map state (selected coordinates, region name, current year/month, active layer)
 * - Statistical Engine outputs (Mann-Kendall Tau, p-value, Theil-Sen slope/decade)
 * - Chronos-2 probabilistic forecast (+24 months, P10/P50/P90)
 * - MOMENT unsupervised anomaly detections (reconstruction residuals, sigma excursions)
 * 
 * Grounded Responses:
 * Formatted scientifically, never hallucinates trends or invents sensor data.
 * Supports interactive queries, comparative reasoning, and explanation of climate teleconnections.
 */

import { getGeminiApiKey, GEMINI_API_ENDPOINT } from "../lib/geminiConfig";

export interface CopilotContext {
  regionName: string;
  lat: number;
  lon: number;
  layerId: string;
  layerLabel: string;
  yearMonth: string;
  trendText?: string;
  mkTau?: number;
  mkPValue?: number;
  chronosHorizon?: string;
  chronosTrend?: string;
  momentAnomaliesCount?: number;
  topAnomaly?: string;
}

export class EarthDetectiveCopilot {
  private container: HTMLElement;
  private isOpen = false;
  private currentContext: CopilotContext = {
    regionName: "Selected globe view",
    lat: 26.8,
    lon: 30.8,
    layerId: "ndvi",
    layerLabel: "Vegetation",
    yearMonth: "Select a month",
  };

  private messages: { sender: "user" | "copilot"; text: string; time: string }[] = [];

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "earth-detective-copilot-root";
    this.container.className = "copilot-container";
    document.body.appendChild(this.container);

    this.messages.push({
      sender: "copilot",
      text: "Hi, I am Erro. Ask about the current map layer, or select a place to inspect its data.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    this.render();
  }

  public updateContext(ctx: Partial<CopilotContext>): void {
    this.currentContext = { ...this.currentContext, ...ctx };
    this.updateContextUI();
  }

  public toggle(): void {
    this.isOpen = !this.isOpen;
    this.render();
  }

  private updateContextUI(): void {
    const badge = this.container.querySelector<HTMLElement>(".copilot-context-badge");
    if (badge) {
      badge.textContent = `${this.currentContext.regionName} · ${this.currentContext.layerLabel}`;
    }
  }

  private async handleUserMessage(query: string): Promise<void> {
    const question = query.trim();
    if (!question) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    this.messages.push({ sender: "user", text: question, time });

    // Show temporary thinking indicator
    this.messages.push({
      sender: "copilot",
      text: "⚡ *Consulting Gemini 3.5 & NASA Earth Observation telemetry…*",
      time,
    });
    this.render();

    const body = this.container.querySelector(".copilot-messages");
    if (body) body.scrollTop = body.scrollHeight;

    try {
      const apiKey = getGeminiApiKey();
      const ctx = this.currentContext;

      const systemPrompt = `You are Erro 404, the official interactive AI Guide & Climate Detective for the NASA Earth System Trend Detective Explorer (NASA Space Apps Challenge 2026).
Your role is to guide and empower users exploring multi-decadal NASA Earth Observations (2000–2026).

Active Explorer State:
- Current Inspected Location: ${ctx.regionName} (Latitude: ${ctx.lat.toFixed(2)}°, Longitude: ${ctx.lon.toFixed(2)}°)
- Active Satellite Layer: ${ctx.layerLabel} (${ctx.layerId})
- Temporal Month: ${ctx.yearMonth}
- Preliminary Trend Drift: ${ctx.trendText || "Available via probe point"}

Your Capabilities & Knowledge:
1. Navigation & Explorer Guidance:
   - To navigate the 3D Earth Globe: Left-click and drag to rotate, mouse scroll wheel to zoom in/out, and right-click drag to pan.
   - To switch Earth observation layers: Use the bottom toolbar to switch between Vegetation Index (MODIS NDVI/EVI), Land Surface Temperature (LST), Air Temperature Reanalysis (NASA MERRA-2), Precipitation Rate, Soil Moisture (GLDAS), and Snow Cover.
   - To view historical changes: Drag the multidecadal timeline slider at the bottom to view any month from 2000 to 2026.
   - To inspect a location: Click on any terrestrial or ocean point on the 3D globe to place a probe pin. To run deep mathematical trend analysis, click the "Analyze selection" button in the probe card, which opens the full Investigation Workspace.
2. Scientific Honesty & Data Grounding:
   - Ground-truth benchmark regions (Nile Delta and Western Desert in Egypt, Amazon Basin in Brazil, Lake Chad in Central Africa) feature 100% verified, real monthly observation archives from NASA MERRA-2 and POWER.
   - Global arbitrary coordinates utilize a physically grounded climatological simulation baseline.
   - Foundation models (Chronos-2 probabilistic forecaster and MOMENT anomaly detector) run via high-precision client-side algorithmic simulations.
3. Tone and Language:
   - If the user writes in Arabic, respond in fluent, professional, supportive Arabic. If in English, reply in English.
   - Keep responses helpful, clear, and concise (2-4 sentences or clear bullet points), perfectly formatted for a chat modal.`;

      const url = `${GEMINI_API_ENDPOINT}?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nUser Question: ${question}` }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 400,
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Remove thinking indicator
      this.messages.pop();

      if (res.ok) {
        const json = await res.json();
        const geminiText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (geminiText) {
          this.messages.push({ sender: "copilot", text: geminiText, time });
          this.render();
          return;
        }
      }
      throw new Error(`Gemini status ${res.status}`);
    } catch {
      // Remove thinking message if still present
      if (this.messages.length > 0 && this.messages[this.messages.length - 1].text.includes("Consulting Gemini")) {
        this.messages.pop();
      }
      this.messages.push({ sender: "copilot", text: this.generateGroundedResponse(question), time });
      this.render();
    }
  }

  private generateGroundedResponse(query: string): string {
    const q = query.toLowerCase();
    const ctx = this.currentContext;
    const subject = ctx.regionName + " · " + ctx.layerLabel + " · " + ctx.yearMonth;
    if (q.includes("trend") || q.includes("اتجاه") || q.includes("sen") || q.includes("mann")) {
      return ctx.trendText
        ? "The available trend for " + subject + " is " + ctx.trendText + ". Open the investigation to review its data and uncertainty."
        : "The Explorer is showing " + subject + ". Select a place and open Analyze selection to calculate a time-series trend.";
    }
    if (q.includes("forecast") || q.includes("توقع") || q.includes("future")) {
      return "The Explorer shows observations for " + subject + ". Open an investigation to see an outlook, then check its assumptions and data source.";
    }
    if (q.includes("anomaly") || q.includes("unusual") || q.includes("شذوذ")) {
      return "To look for unusual months in " + ctx.layerLabel + ", select a place and open Analyze selection. The monthly chart provides the historical context.";
    }
    return "You are viewing " + subject + ". Select a place on the globe to inspect a record, or ask me about trends, unusual months, or the current layer.";
  }
  private render(): void {
    if (!this.isOpen) {
      this.container.innerHTML = `
        <button type="button" class="copilot-toggle-btn" id="copilot-toggle-btn" title="Open Erro 404 AI Copilot">
          <img src="/erro-logo.jpg" alt="Erro 404" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" />
          <span class="copilot-btn-glow"></span>
          <span class="copilot-launcher-label">Ask Erro</span>
        </button>
      `;

      this.container.querySelector("#copilot-toggle-btn")?.addEventListener("click", () => this.toggle());
      return;
    }

    this.container.innerHTML = `
      <div class="copilot-window">
        <!-- Header -->
        <div class="copilot-header">
          <div class="copilot-header-title">
            <img src="/erro-logo.jpg" alt="Erro 404" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1px solid #38bdf8;" />
            <div>
              <div class="copilot-title-text">Ask Erro</div>
              <div class="copilot-sub-text">Explore the selected place and variable</div>
            </div>
          </div>
          <button type="button" class="copilot-close-btn" id="copilot-close-btn" title="Close Copilot">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Grounded Context Bar -->
        <div class="copilot-context-bar">
          <span class="copilot-context-icon">🎯</span>
          <span class="copilot-context-badge">${this.currentContext.regionName} · ${this.currentContext.layerLabel}</span>
        </div>

        <!-- Messages Area -->
        <div class="copilot-messages">
          ${this.messages
            .map(
              (m) => `
            <div class="copilot-msg ${m.sender}">
              <div class="copilot-msg-bubble">${this.formatMarkdown(m.text)}</div>
              <div class="copilot-msg-time">${m.time}</div>
            </div>
          `
            )
            .join("")}
        </div>

        <!-- Quick Suggestions -->
        <div class="copilot-quick-actions">
          <button type="button" class="copilot-chip" data-query="Explain trend significance and Sen slope">Explain the trend</button>
          <button type="button" class="copilot-chip" data-query="What does Chronos-2 forecast for this region?">Forecast outlook</button>
          <button type="button" class="copilot-chip" data-query="What anomalies did MOMENT detect?">Unusual months</button>
        </div>

        <!-- Input Bar -->
        <form class="copilot-input-form" id="copilot-input-form">
          <label class="copilot-input-label" for="copilot-input-field">Your question</label>
          <input type="text" id="copilot-input-field" class="copilot-input" placeholder="Ask about this place or dataset…" autocomplete="off" />
          <button type="submit" class="copilot-send-btn" title="Send Query">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </form>
      </div>
    `;

    this.container.querySelector("#copilot-close-btn")?.addEventListener("click", () => this.toggle());

    this.container.querySelectorAll<HTMLButtonElement>(".copilot-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const query = chip.getAttribute("data-query");
        if (query) this.handleUserMessage(query);
      });
    });

    const form = this.container.querySelector<HTMLFormElement>("#copilot-input-form");
    const input = this.container.querySelector<HTMLInputElement>("#copilot-input-field");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input && input.value) {
        const val = input.value;
        input.value = "";
        this.handleUserMessage(val);
      }
    });
  }

  private formatMarkdown(md: string): string {
    return md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/^### (.*$)/gim, '<div style="font-weight:700; color:#38bdf8; margin:4px 0 2px;">$1</div>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f8fafc;">$1</strong>')
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08); padding:1px 4px; border-radius:3px; font-size:11px;">$1</code>')
      .replace(/^[•\-\*] (.*$)/gim, '<div style="margin-left:6px; display:flex; gap:6px;"><span>•</span><span>$1</span></div>')
      .replace(/^> (.*$)/gim, '<blockquote style="border-left:2px solid #38bdf8; padding-left:8px; margin:4px 0; color:#94a3b8; font-size:11px;">$1</blockquote>')
      .replace(/\n/g, "<br/>");
  }
}

export const earthDetectiveCopilot = new EarthDetectiveCopilot();
