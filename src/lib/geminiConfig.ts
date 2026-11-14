/**
 * NASA Earth System Trend Detective — Gemini Intelligence Configuration
 */
const DEFAULT_KEY_B64 = "QVEuQWI4Uk42SnZNV2YwWl9zbE1MV1ZWZlptMVBNQzdPUGtQcUVKRXVSTzUtVGJ1U215SHc=";

export function getGeminiApiKey(): string {
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }
  try {
    return atob(DEFAULT_KEY_B64);
  } catch {
    return "";
  }
}

export const GEMINI_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
