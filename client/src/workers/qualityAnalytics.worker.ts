/// <reference lib="webworker" />

import { analyzeLocalQualityQuestion, type LocalAnalyticsSnapshot, type LocalInsightIntent } from "@/lib/localQualityAnalytics";

type AnalyzeMessage = {
  type: "analyze";
  requestId: string;
  question: string;
  snapshot: LocalAnalyticsSnapshot;
  forcedIntent?: LocalInsightIntent;
};

type ClearMessage = { type: "clear-cache" };
type WorkerMessage = AnalyzeMessage | ClearMessage;

const cache = new Map<string, ReturnType<typeof analyzeLocalQualityQuestion>>();
const MAX_CACHE_ITEMS = 100;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type === "clear-cache") {
    cache.clear();
    return;
  }

  const { requestId, question, snapshot, forcedIntent } = event.data;
  const key = `${snapshot.id}:${forcedIntent ?? "auto"}:${question.trim().toLocaleLowerCase("pt-BR")}`;
  try {
    const cached = cache.get(key);
    if (cached) {
      self.postMessage({ type: "result", requestId, result: { ...cached, latencyMs: 0 }, cached: true });
      return;
    }
    const result = analyzeLocalQualityQuestion(question, snapshot, forcedIntent);
    cache.set(key, result);
    if (cache.size > MAX_CACHE_ITEMS) cache.delete(cache.keys().next().value as string);
    self.postMessage({ type: "result", requestId, result, cached: false });
  } catch (error) {
    self.postMessage({ type: "error", requestId, error: error instanceof Error ? error.message : "Falha no analytics local." });
  }
};

export {};
