export type LocalAiMode = "auto" | "rules" | "webgpu" | "wasm";
const STORAGE_KEY = "qtrack.localAi.mode";

export function isLocalAiMode(value: unknown): value is LocalAiMode {
  return value === "auto" || value === "rules" || value === "webgpu" || value === "wasm";
}

export function loadLocalAiMode(): LocalAiMode {
  if (typeof localStorage === "undefined") return "auto";
  const stored = localStorage.getItem(STORAGE_KEY);
  return isLocalAiMode(stored) ? stored : "auto";
}

export function saveLocalAiMode(mode: LocalAiMode) {
  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, mode);
}

export function resolveLocalExecution(mode: LocalAiMode, state: { phiReady: boolean; semanticReady: boolean }) {
  if (mode === "rules") return "rules" as const;
  if (mode === "webgpu") return state.phiReady ? "local-webgpu" as const : "rules" as const;
  if (mode === "wasm") return state.semanticReady ? "local-wasm" as const : "rules" as const;
  if (state.phiReady) return "local-webgpu" as const;
  if (state.semanticReady) return "local-wasm" as const;
  return "rules" as const;
}
