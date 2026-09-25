import type { LocalInsightIntent } from "./localQualityAnalytics";

export const LOCAL_SEMANTIC_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
export type SemanticProgress = { progress: number; text: string };
type Pending = { resolve: (value: any) => void; reject: (error: Error) => void };

let worker: Worker | null = null;
const pending = new Map<string, Pending>();
let progressListener: ((progress: SemanticProgress) => void) | undefined;

function getWorker() {
  if (typeof Worker === "undefined") throw new Error("Web Worker não está disponível neste navegador.");
  if (!worker) {
    worker = new Worker(new URL("../workers/semanticIntent.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<any>) => {
      if (event.data.type === "progress") {
        progressListener?.({ progress: event.data.progress ?? 0, text: event.data.text ?? "Carregando modelo WASM..." });
        return;
      }
      const request = pending.get(event.data.requestId);
      if (!request) return;
      pending.delete(event.data.requestId);
      if (event.data.type === "error") request.reject(new Error(event.data.error));
      else request.resolve(event.data);
    };
    worker.onerror = () => {
      pending.forEach((request) => request.reject(new Error("O Worker semântico WASM foi interrompido.")));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function request<T>(message: Record<string, unknown>) {
  const semanticWorker = getWorker();
  const requestId = crypto.randomUUID();
  return new Promise<T>((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    semanticWorker.postMessage({ ...message, requestId });
  });
}

export async function loadLocalSemanticModel(onProgress?: (progress: SemanticProgress) => void) {
  progressListener = onProgress;
  const startedAt = performance.now();
  const response = await request<{ modelId: string }>({ type: "load" });
  return { modelId: response.modelId, loadTimeMs: Math.round(performance.now() - startedAt) };
}

export async function classifyIntentLocally(question: string) {
  const startedAt = performance.now();
  const response = await request<{ intent: LocalInsightIntent; confidence: number; modelId: string }>({ type: "classify", question });
  return { ...response, latencyMs: Math.round((performance.now() - startedAt) * 10) / 10 };
}

export function unloadLocalSemanticModel() {
  worker?.terminate();
  worker = null;
  pending.clear();
  progressListener = undefined;
}
