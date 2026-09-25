import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";

export const LOCAL_PHI_MODEL = "Phi-3.5-mini-instruct-q4f16_1-MLC-1k";
export type PhiProgress = { progress: number; text: string };

let enginePromise: Promise<WebWorkerMLCEngine> | null = null;
let activeEngine: WebWorkerMLCEngine | null = null;
let phiWorker: Worker | null = null;

async function getAppConfig() {
  const { prebuiltAppConfig } = await import("@mlc-ai/web-llm");
  return { ...prebuiltAppConfig, cacheBackend: "indexeddb" as const };
}

export async function hasLocalPhiCache() {
  const { hasModelInCache } = await import("@mlc-ai/web-llm");
  return hasModelInCache(LOCAL_PHI_MODEL, await getAppConfig());
}

export async function loadLocalPhiModel(onProgress?: (progress: PhiProgress) => void) {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) throw new Error("WebGPU não está disponível neste navegador.");
  if (!enginePromise) {
    const startedAt = performance.now();
    phiWorker = new Worker(new URL("../workers/phi.worker.ts", import.meta.url), { type: "module" });
    enginePromise = import("@mlc-ai/web-llm").then(async ({ CreateWebWorkerMLCEngine }) => {
      const engine = await CreateWebWorkerMLCEngine(phiWorker!, LOCAL_PHI_MODEL, {
        initProgressCallback: (progress) => onProgress?.({ progress: Math.max(0, Math.min(1, progress.progress ?? 0)), text: progress.text ?? "Carregando modelo local..." }),
        appConfig: await getAppConfig(),
      });
      activeEngine = engine;
      onProgress?.({ progress: 1, text: `Modelo pronto em ${Math.round(performance.now() - startedAt)} ms` });
      return engine;
    }).catch((error) => {
      phiWorker?.terminate();
      phiWorker = null;
      enginePromise = null;
      throw error;
    });
  }
  return enginePromise;
}

export async function askLocalPhi(engine: WebWorkerMLCEngine, context: string, question: string) {
  const startedAt = performance.now();
  const response = await engine.chat.completions.create({
    temperature: 0.2,
    max_tokens: 220,
    messages: [
      { role: "system", content: "Você é o QTrack Insight, um analista de qualidade industrial. Responda em português, seja objetivo e use somente o contexto agregado fornecido. Não invente números, não peça dados externos e deixe claro quando o contexto não for suficiente." },
      { role: "user", content: `Contexto agregado calculado localmente:\n${context}\n\nPergunta:\n${question}` },
    ],
  });
  return {
    text: response.choices?.[0]?.message?.content?.trim() || "O modelo local não retornou uma análise.",
    latencyMs: Math.round((performance.now() - startedAt) * 10) / 10,
  };
}

export async function resetLocalPhiConversation() {
  await activeEngine?.resetChat();
}

export async function unloadLocalPhiModel() {
  await activeEngine?.unload();
  activeEngine = null;
  enginePromise = null;
  phiWorker?.terminate();
  phiWorker = null;
}

export async function removeLocalPhiModel() {
  await unloadLocalPhiModel();
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  await deleteModelAllInfoInCache(LOCAL_PHI_MODEL, await getAppConfig());
}
