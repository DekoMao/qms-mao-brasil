export type LocalRuntime = "webgpu" | "wasm" | "rules";

export type LocalRuntimeStatus = {
  runtime: LocalRuntime;
  webgpuAvailable: boolean;
  wasmAvailable: boolean;
  modelLoaded: boolean;
  externalCallsAllowed: false;
  label: string;
};

export async function detectLocalRuntime(): Promise<LocalRuntimeStatus> {
  let webgpuAvailable = false;
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
      webgpuAvailable = Boolean(await gpu?.requestAdapter());
    } catch {
      webgpuAvailable = false;
    }
  }
  const wasmAvailable = typeof WebAssembly !== "undefined";
  const runtime: LocalRuntime = webgpuAvailable ? "webgpu" : wasmAvailable ? "wasm" : "rules";
  return {
    runtime,
    webgpuAvailable,
    wasmAvailable,
    modelLoaded: false,
    externalCallsAllowed: false,
    label: runtime === "webgpu" ? "WebGPU disponível · regras locais ativas" : runtime === "wasm" ? "WASM disponível · regras locais ativas" : "Regras locais ativas",
  };
}

export function isLocalOnly(status: LocalRuntimeStatus) {
  return status.externalCallsAllowed === false;
}
