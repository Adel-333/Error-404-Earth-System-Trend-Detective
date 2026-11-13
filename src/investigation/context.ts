import type { LayerId, YearMonth } from "../lib/timeline";

export type InvestigationGeometry =
  | { kind: "point"; lat: number; lon: number }
  | {
      kind: "bounds";
      north: number;
      south: number;
      east: number;
      west: number;
    };

export interface InvestigationComparisonTarget {
  name: string;
  geometry: InvestigationGeometry;
}

export interface InvestigationEpochTarget {
  start: YearMonth;
  end: YearMonth;
  label: string;
}

export interface InvestigationComparison {
  enabled: boolean;
  mode: "spatial" | "temporal";
  targetB?: InvestigationComparisonTarget;
  epochB?: InvestigationEpochTarget;
}

export interface InvestigationContext {
  id: string;
  name: string;
  geometry: InvestigationGeometry;
  layerIds: LayerId[];
  start: YearMonth;
  end: YearMonth;
  temporalResolution: "monthly";
  createdAt: string;
  explorerUrl: string;
  comparison?: InvestigationComparison;
}

const STORAGE_PREFIX = "earth-trend-investigation:";

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

export function newInvestigationId(): string {
  return `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveInvestigationContext(context: InvestigationContext): void {
  try {
    window.localStorage.setItem(storageKey(context.id), JSON.stringify(context));
  } catch {
    // Navigation can still proceed; the receiving page presents a recoverable state.
  }
}

export function loadInvestigationContext(id: string): InvestigationContext | null {
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    if (raw) {
      const value = JSON.parse(raw) as Partial<InvestigationContext>;
      if (value.geometry && value.start && value.end && Array.isArray(value.layerIds)) {
        return value as InvestigationContext;
      }
    }
  } catch {
    // fallback to default
  }

  // Create default fallback context for Egypt Nile Delta investigation
  const defaultContext: InvestigationContext = {
    id: id || newInvestigationId(),
    name: "Nile Delta Agro-Hydrological System",
    geometry: { kind: "point", lat: 30.55, lon: 31.25 },
    layerIds: ["ndvi", "lst", "soil", "precip"] as LayerId[],
    start: { year: 2000, month: 1 },
    end: { year: 2026, month: 10 },
    temporalResolution: "monthly",
    createdAt: new Date().toISOString(),
    explorerUrl: "/",
  };
  saveInvestigationContext(defaultContext);
  return defaultContext;
}

export function formatGeometry(geometry: InvestigationGeometry): string {
  if (geometry.kind === "point") {
    return `${geometry.lat.toFixed(3)}°, ${geometry.lon.toFixed(3)}°`;
  }
  return `${geometry.south.toFixed(2)}–${geometry.north.toFixed(2)}° N · ${geometry.west.toFixed(2)}–${geometry.east.toFixed(2)}° E`;
}

export function geometryCenter(geometry: InvestigationGeometry): { lat: number; lon: number } {
  if (geometry.kind === "point") return geometry;
  return {
    lat: (geometry.north + geometry.south) / 2,
    lon: (geometry.east + geometry.west) / 2,
  };
}
