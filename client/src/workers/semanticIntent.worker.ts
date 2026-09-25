/// <reference lib="webworker" />

import type { LocalInsightIntent } from "@/lib/localQualityAnalytics";

const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const exemplars: Array<{ intent: Exclude<LocalInsightIntent, "unsupported">; text: string }> = [
  { intent: "overview", text: "resumo geral panorama dos defeitos e indicadores de qualidade" },
  { intent: "supplier_aging", text: "fornecedores com maior aging tempo médio e casos críticos" },
  { intent: "sla", text: "risco de SLA casos atrasados e prazos ameaçados" },
  { intent: "triage_accuracy", text: "acurácia precisão do agente de triagem e classificação" },
  { intent: "trend", text: "evolução semanal tendência de defeitos e atrasos ao longo do tempo" },
  { intent: "severity_supplier", text: "comparar severidade alta dos defeitos por fornecedor" },
  { intent: "root_cause", text: "causas raiz mais frequentes e principais motivos dos defeitos" },
  { intent: "pareto", text: "gráfico de Pareto das causas e ocorrências acumuladas" },
];

type Extractor = (input: string | string[], options: { pooling: "mean"; normalize: true }) => Promise<{ tolist: () => number[][] }>;
let extractorPromise: Promise<Extractor> | null = null;
let exemplarVectors: number[][] | null = null;

function dot(a: number[], b: number[]) {
  return a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
}

async function loadExtractor() {
  if (!extractorPromise) {
    extractorPromise = import("@huggingface/transformers").then(async ({ pipeline }) => {
      const loaded = await pipeline("feature-extraction", MODEL_ID, {
        device: "wasm",
        dtype: "q8",
        progress_callback: (progress: { progress?: number; status?: string; file?: string }) => {
          const raw = progress.progress ?? 0;
          const normalized = raw > 1 ? raw / 100 : raw;
          self.postMessage({ type: "progress", progress: Math.max(0, Math.min(1, normalized)), text: progress.file || progress.status || "Carregando classificador semântico..." });
        },
      });
      return loaded as unknown as Extractor;
    });
  }
  const extractor = await extractorPromise;
  if (!exemplarVectors) {
    const output = await extractor(exemplars.map((item) => item.text), { pooling: "mean", normalize: true });
    exemplarVectors = output.tolist();
  }
  return extractor;
}

self.onmessage = async (event: MessageEvent<{ type: "load" | "classify"; requestId: string; question?: string }>) => {
  try {
    const extractor = await loadExtractor();
    if (event.data.type === "load") {
      self.postMessage({ type: "ready", requestId: event.data.requestId, modelId: MODEL_ID });
      return;
    }
    const output = await extractor(event.data.question ?? "", { pooling: "mean", normalize: true });
    const vector = output.tolist()[0] ?? [];
    const scores = (exemplarVectors ?? []).map((candidate, index) => ({ intent: exemplars[index].intent, score: dot(vector, candidate) })).sort((a, b) => b.score - a.score);
    const best = scores[0];
    self.postMessage({ type: "classified", requestId: event.data.requestId, intent: best?.score >= 0.38 ? best.intent : "unsupported", confidence: best?.score ?? 0, modelId: MODEL_ID });
  } catch (error) {
    self.postMessage({ type: "error", requestId: event.data.requestId, error: error instanceof Error ? error.message : "Falha no classificador WASM." });
  }
};

export {};
