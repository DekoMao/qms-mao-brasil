import { analyzeLocalQualityQuestion, type LocalAnalyticsSnapshot, type LocalInsightIntent, type LocalInsightResult } from "./localQualityAnalytics";

type PendingRequest = { resolve: (result: LocalInsightResult) => void; reject: (error: Error) => void };
let worker: Worker | null = null;
const pending = new Map<string, PendingRequest>();

function getWorker() {
  if (typeof Worker === "undefined") return null;
  if (!worker) {
    worker = new Worker(new URL("../workers/qualityAnalytics.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ type: "result" | "error"; requestId: string; result?: LocalInsightResult; error?: string }>) => {
      const request = pending.get(event.data.requestId);
      if (!request) return;
      pending.delete(event.data.requestId);
      if (event.data.type === "result" && event.data.result) request.resolve(event.data.result);
      else request.reject(new Error(event.data.error ?? "Falha no analytics local."));
    };
    worker.onerror = () => {
      pending.forEach((request) => request.reject(new Error("O Web Worker analítico foi interrompido.")));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

export async function analyzeInLocalWorker(question: string, snapshot: LocalAnalyticsSnapshot, forcedIntent?: LocalInsightIntent) {
  const analyticsWorker = getWorker();
  if (!analyticsWorker) return analyzeLocalQualityQuestion(question, snapshot, forcedIntent);
  const requestId = crypto.randomUUID();
  return new Promise<LocalInsightResult>((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    analyticsWorker.postMessage({ type: "analyze", requestId, question, snapshot, forcedIntent });
  });
}

export function clearLocalAnalyticsCache() {
  worker?.postMessage({ type: "clear-cache" });
}

export function disposeLocalAnalyticsWorker() {
  worker?.terminate();
  worker = null;
  pending.clear();
}
