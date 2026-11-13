import { LAYERS, type LayerConfig, type LayerId, type YearMonth } from "../lib/timeline";
import { doiResolverUrl } from "../lib/doiLink";
import type { InvestigationContext } from "./context";
import { geometryCenter } from "./context";

export interface InvestigationDataset {
  id: LayerId;
  label: string;
  provider: string;
  productId: string | null;
  collection: string | null;
  units: string | null;
  spatialResolution: string;
  temporalResolution: "monthly" | "annual" | "static";
  coverage: string;
  sourceUrl: string | null;
  quantitativeObservations: "available" | "unavailable";
}

export interface MonthlyObservationPoint {
  ym: YearMonth;
  t: number; // continuous fractional year: year + (month - 1) / 12
  value: number;
  uncertainty: number;
  isValid: boolean;
}

export interface MonthlyObservationSeries {
  layerId: LayerId;
  label: string;
  unit: string;
  points: MonthlyObservationPoint[];
  isSimulated: boolean;
  disclaimer: string;
}

export interface InvestigationDataProvider {
  readonly id: string;
  readonly name: string;
  readonly availability: "catalog-only" | "simulated-model" | "live-nasa-api";
  getDatasets(context: InvestigationContext): InvestigationDataset[];
  fetchSeries(
    context: InvestigationContext,
    layerId: LayerId,
    signal?: AbortSignal
  ): Promise<MonthlyObservationSeries>;
}

function datasetFromLayer(layer: LayerConfig, quantitativeAvailable: boolean): InvestigationDataset {
  const dataset = layer.dataset;
  return {
    id: layer.id,
    label: layer.label,
    provider: dataset?.title ?? "NASA Earth Science Data / GIBS",
    productId: dataset?.shortName ?? null,
    collection: dataset?.version ?? null,
    units: getLayerUnits(layer.id),
    spatialResolution: "1 km - 0.25 deg grid",
    temporalResolution: layer.static ? "static" : layer.cadence === "annual" ? "annual" : "monthly",
    coverage: `${layer.start.year}-${String(layer.start.month).padStart(2, "0")} to present`,
    sourceUrl: dataset ? doiResolverUrl(dataset.doi) : null,
    quantitativeObservations: quantitativeAvailable ? "available" : "unavailable",
  };
}

export function getLayerUnits(layerId: LayerId): string {
  switch (layerId) {
    case "ndvi":
      return "NDVI [-1 to +1]";
    case "evi":
      return "EVI [-1 to +1]";
    case "lst":
      return "°C (LST)";
    case "airtemp":
      return "°C (T2M)";
    case "precip":
      return "mm / month";
    case "soil":
      return "m³ / m³ (0-10cm)";
    case "aerosol":
      return "Optical Depth (AOD)";
    case "snow":
      return "% Snow Fraction";
    case "sst":
      return "°C (SST)";
    default:
      return "Index / Value";
  }
}

/**
 * High-fidelity Earth System Simulation Provider.
 * Synthesizes realistic multidecadal climatological time series based on:
 * - Selected geographic coordinates (latitude, longitude, hemisphere, continentality)
 * - Annual cycles with proper seasonal phase
 * - Known global climate teleconnections & warming trends
 * - Realistic red-noise autoregression and observation uncertainties
 * 
 * Explicitly labeled as DEMO / SIMULATED to guarantee scientific transparency
 * until official challenge NASA APIs are connected on event day.
 */
export class ScientificSimulationEarthDataProvider implements InvestigationDataProvider {
  readonly id = "scientific-sim-provider";
  readonly name = "NASA Earth System Synthesized Observation Provider";
  readonly availability = "simulated-model" as const;

  getDatasets(context: InvestigationContext): InvestigationDataset[] {
    return context.layerIds.map((id) => datasetFromLayer(LAYERS[id], true));
  }

  async fetchSeries(
    context: InvestigationContext,
    layerId: LayerId,
    signal?: AbortSignal
  ): Promise<MonthlyObservationSeries> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const center = geometryCenter(context.geometry);
    const startYear = context.start.year;
    const startMonth = context.start.month;
    const endYear = context.end.year;
    const endMonth = context.end.month;

    const points: MonthlyObservationPoint[] = [];

    // Climatology parameters based on latitude and longitude
    const lat = center.lat;
    const lon = center.lon;
    const isNH = lat >= 0;
    const absLat = Math.abs(lat);

    // Is Nile Delta or Egyptian agricultural corridor?
    const isNileValley = (lat >= 24 && lat <= 31.8 && lon >= 29.5 && lon <= 32.5);
    const isSahara = (lat >= 18 && lat <= 33 && lon >= -15 && lon <= 35 && !isNileValley);

    // Baseline characteristics
    let baseline = 0.4;
    let amplitude = 0.2;
    let decadalTrend = 0.01;
    let noiseStd = 0.03;
    let seasonalPhaseShift = isNH ? 0 : 6; // southern hemisphere peak is shifted 6 months
    let unit = getLayerUnits(layerId);

    switch (layerId) {
      case "ndvi":
      case "evi": {
        if (isNileValley) {
          baseline = 0.58;
          amplitude = 0.22;
          decadalTrend = +0.024; // positive greening in agricultural corridor
          noiseStd = 0.025;
        } else if (isSahara) {
          baseline = 0.09;
          amplitude = 0.03;
          decadalTrend = +0.002;
          noiseStd = 0.012;
        } else {
          baseline = Math.max(0.12, 0.7 - absLat * 0.008);
          amplitude = Math.min(0.35, 0.1 + absLat * 0.004);
          decadalTrend = +0.015;
          noiseStd = 0.03;
        }
        break;
      }
      case "lst":
      case "airtemp": {
        // Temperature profiles (°C)
        if (isSahara || isNileValley) {
          baseline = 27.5;
          amplitude = 12.0;
          decadalTrend = +0.28; // ~0.28°C per decade warming
          noiseStd = 0.75;
        } else {
          baseline = 28 - absLat * 0.55;
          amplitude = 3 + absLat * 0.35;
          decadalTrend = +0.22;
          noiseStd = 0.85;
        }
        break;
      }
      case "precip": {
        unit = "mm / month";
        if (isSahara) {
          baseline = 3.5;
          amplitude = 2.0;
          decadalTrend = -0.15;
          noiseStd = 3.0;
        } else if (isNileValley) {
          baseline = 12.0;
          amplitude = 14.0;
          decadalTrend = -0.4;
          noiseStd = 6.0;
        } else {
          baseline = Math.max(10, 110 - absLat * 1.2);
          amplitude = 45;
          decadalTrend = -0.5;
          noiseStd = 18;
        }
        break;
      }
      case "soil": {
        unit = "m³ / m³";
        if (isNileValley) {
          baseline = 0.32;
          amplitude = 0.08;
          decadalTrend = -0.006;
          noiseStd = 0.018;
        } else if (isSahara) {
          baseline = 0.04;
          amplitude = 0.015;
          decadalTrend = -0.001;
          noiseStd = 0.006;
        } else {
          baseline = 0.22;
          amplitude = 0.06;
          decadalTrend = -0.004;
          noiseStd = 0.02;
        }
        break;
      }
      default: {
        baseline = 0.3;
        amplitude = 0.15;
        decadalTrend = 0.01;
        noiseStd = 0.03;
      }
    }

    // Deterministic pseudo-random seed based on coordinates and layer
    let seed = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233 + layerId.length)) * 43758.5453;
    const pseudoRand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // Red-noise state for AR(1) autoregression
    let ar1State = 0;

    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd = y === endYear ? endMonth : 12;

      for (let m = mStart; m <= mEnd; m++) {
        const ym: YearMonth = { year: y, month: m };
        const t = y + (m - 1) / 12;
        const elapsedYears = t - 2000;

        // Seasonal cycle (peak summer month = July (m=7) for NH)
        const adjustedMonth = (m - 1 - seasonalPhaseShift + 12) % 12;
        const seasonalHarmonic = -Math.cos((adjustedMonth / 12) * 2 * Math.PI);

        // Long-term linear warming/change trend
        const trendVal = (decadalTrend / 10) * elapsedYears;

        // Known climate anomalies (e.g. 2010 Russian/Mediterranean heatwave, 2015-16 El Niño, 2023 heat surge)
        let extremeAnomaly = 0;
        if (y === 2010 && (m >= 6 && m <= 9)) {
          extremeAnomaly = (layerId.includes("temp") ? 2.1 : -0.08);
        } else if (y === 2015 && (m >= 7 && m <= 11)) {
          extremeAnomaly = (layerId.includes("temp") ? 1.6 : -0.06);
        } else if (y === 2023 && (m >= 5 && m <= 10)) {
          extremeAnomaly = (layerId.includes("temp") ? 2.4 : -0.05);
        }

        // AR(1) Red noise
        const gaussianNoise = (pseudoRand() + pseudoRand() + pseudoRand() - 1.5) * 2 * noiseStd;
        ar1State = 0.45 * ar1State + 0.55 * gaussianNoise;

        let val = baseline + amplitude * seasonalHarmonic + trendVal + extremeAnomaly + ar1State;

        // Boundary clamping for bounded metrics
        if (layerId === "ndvi" || layerId === "evi") {
          val = Math.max(0.01, Math.min(0.95, val));
        } else if (layerId === "soil") {
          val = Math.max(0.01, Math.min(0.55, val));
        } else if (layerId === "precip") {
          val = Math.max(0, val);
        }

        // Round to 3 decimals
        val = Math.round(val * 1000) / 1000;
        const uncertainty = Math.round(noiseStd * 0.4 * 1000) / 1000;

        points.push({
          ym,
          t,
          value: val,
          uncertainty,
          isValid: true,
        });
      }
    }

    return {
      layerId,
      label: LAYERS[layerId]?.label ?? layerId,
      unit,
      points,
      isSimulated: true,
      disclaimer: "DEMO DATA — NOT REAL NASA OBSERVATIONS. Synthesized climatology model for testing analysis pipelines pending official challenge API activation.",
    };
  }
}

/** Active provider instance */
export const investigationProvider: InvestigationDataProvider =
  new ScientificSimulationEarthDataProvider();
