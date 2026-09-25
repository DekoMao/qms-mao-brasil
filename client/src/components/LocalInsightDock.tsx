import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bot, ChevronDown, Clipboard, Cpu, Database, Download, Eraser, Eye, Gauge, LockKeyhole, MessageSquare, Send, Sparkles, Trash2, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type LocalChartSpec, type LocalInsightResult, type RootCausePoint } from "@/lib/localQualityAnalytics";
import { analyzeInLocalWorker, clearLocalAnalyticsCache } from "@/lib/localAnalyticsWorkerClient";
import { createLocalAnalyticsSnapshot } from "@/lib/localAnalyticsSnapshot";
import { detectLocalRuntime, type LocalRuntimeStatus } from "@/lib/localRuntime";
import { askLocalPhi, hasLocalPhiCache, loadLocalPhiModel, LOCAL_PHI_MODEL, removeLocalPhiModel, resetLocalPhiConversation, type PhiProgress } from "@/lib/localPhiModel";
import { classifyIntentLocally, loadLocalSemanticModel, LOCAL_SEMANTIC_MODEL, unloadLocalSemanticModel, type SemanticProgress } from "@/lib/localSemanticModel";
import { appendLocalAiAudit, clearLocalAiAudit, formatFilterLabel, readLocalAiAudit } from "@/lib/localAiAudit";
import { loadLocalAiMode, resolveLocalExecution, saveLocalAiMode, type LocalAiMode } from "@/lib/localAiPreferences";

type Props = {
  stats: any;
  accuracyTrend?: any;
  topCauses?: RootCausePoint[] | null;
  tenantId?: number | null;
  dateFrom?: string;
  dateTo?: string;
  onFocus: (focusIds: string[]) => void;
};

type ModelState = "idle" | "loading" | "ready" | "error";
const PROMPTS = [
  "Qual é o panorama geral?",
  "Quais fornecedores têm maior aging?",
  "Onde o SLA está mais ameaçado?",
  "Como está a acurácia do Triage Agent?",
  "Compare severidade por fornecedor.",
  "Gere um Pareto das causas raiz.",
];
const CHART_COLORS = ["#A78BFA", "#00D4AA", "#F5A623", "#F87171", "#60A5FA"];
const TOOLTIP_STYLE = { backgroundColor: "#111F35", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, color: "#E2E8F0", fontSize: 12 };

function LocalChartRenderer({ spec }: { spec: LocalChartSpec }) {
  const color = { violet: "#A78BFA", teal: "#00D4AA", gold: "#F5A623", red: "#F87171" }[spec.color];
  const value = (number: number) => `${Math.round(number * 10) / 10}${spec.unit ?? ""}`;

  if (spec.type === "kpi") {
    return <div className="grid grid-cols-2 gap-2">{spec.data.map((item) => <div key={item.label} className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="text-[11px] text-slate-400">{item.label}</p><p className="mt-1 text-2xl font-bold" style={{ color }}>{value(item.value)}</p></div>)}</div>;
  }
  if (spec.type === "table") {
    return <div className="overflow-hidden rounded-xl border border-white/10"><table className="w-full text-xs"><thead className="bg-white/5 text-slate-400"><tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">{spec.valueLabel ?? "Valor"}</th>{spec.secondaryLabel && <th className="px-3 py-2 text-right">{spec.secondaryLabel}</th>}</tr></thead><tbody>{spec.data.map((item) => <tr key={item.label} className="border-t border-white/5"><td className="max-w-48 truncate px-3 py-2 text-slate-300">{item.label}</td><td className="px-3 py-2 text-right font-semibold" style={{ color }}>{value(item.value)}</td>{spec.secondaryLabel && <td className="px-3 py-2 text-right text-slate-400">{item.secondaryValue ?? 0}</td>}</tr>)}</tbody></table></div>;
  }
  if (spec.type === "pie") {
    return <div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="mb-1 text-xs font-semibold text-slate-300">{spec.title}</p><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={spec.data} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={42} outerRadius={72}>{spec.data.map((item, index) => <Cell key={item.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={TOOLTIP_STYLE} /></PieChart></ResponsiveContainer></div>;
  }

  const chart = <><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,.08)" /><XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={TOOLTIP_STYLE} />{spec.type === "bar" && <Bar dataKey="value" name={spec.valueLabel ?? "Valor"} fill={color} radius={[5, 5, 0, 0]} />}{spec.type === "line" && <><Line type="monotone" dataKey="value" name={spec.valueLabel ?? "Valor"} stroke={color} strokeWidth={2} dot={{ r: 3 }} />{spec.secondaryLabel && <Line type="monotone" dataKey="secondaryValue" name={spec.secondaryLabel} stroke="#F87171" strokeWidth={2} dot={{ r: 3 }} />}</>}{spec.type === "area" && <Area type="monotone" dataKey="value" name={spec.valueLabel ?? "Valor"} stroke={color} fill={color} fillOpacity={0.2} />}</>;
  return <div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="mb-3 text-xs font-semibold text-slate-300">{spec.title}</p><ResponsiveContainer width="100%" height={190}>{spec.type === "bar" ? <BarChart data={spec.data}>{chart}</BarChart> : spec.type === "area" ? <AreaChart data={spec.data}>{chart}</AreaChart> : <LineChart data={spec.data}>{chart}</LineChart>}</ResponsiveContainer></div>;
}

export function LocalInsightDock({ stats, accuracyTrend, topCauses, tenantId, dateFrom, dateTo, onFocus }: Props) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<LocalInsightResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [runtime, setRuntime] = useState<LocalRuntimeStatus | null>(null);
  const [mode, setMode] = useState<LocalAiMode>(() => loadLocalAiMode());
  const [phiEngine, setPhiEngine] = useState<any>(null);
  const [phiState, setPhiState] = useState<ModelState>("idle");
  const [wasmState, setWasmState] = useState<ModelState>("idle");
  const [progress, setProgress] = useState<PhiProgress | SemanticProgress | null>(null);
  const [modelError, setModelError] = useState("");
  const [asking, setAsking] = useState(false);
  const [phiCached, setPhiCached] = useState(false);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const [auditRecords, setAuditRecords] = useState(() => readLocalAiAudit());

  const snapshot = useMemo(() => createLocalAnalyticsSnapshot({ tenantId, dateFrom, dateTo, stats, accuracyTrend, topCauses }), [tenantId, dateFrom, dateTo, stats, accuracyTrend, topCauses]);
  const execution = resolveLocalExecution(mode, { phiReady: phiState === "ready", semanticReady: wasmState === "ready" });

  useEffect(() => {
    void detectLocalRuntime().then(setRuntime);
  }, []);

  useEffect(() => {
    if (open) void hasLocalPhiCache().then(setPhiCached).catch(() => setPhiCached(false));
  }, [open]);

  const updateMode = (value: LocalAiMode) => { setMode(value); saveLocalAiMode(value); setModelError(""); };

  const loadPhi = async () => {
    setPhiState("loading"); setModelError(""); setProgress(null);
    const startedAt = performance.now();
    try {
      const engine = await loadLocalPhiModel(setProgress);
      setPhiEngine(engine); setPhiState("ready"); setPhiCached(true); setLoadTimeMs(Math.round(performance.now() - startedAt));
    } catch (error) {
      setPhiState("error"); setModelError(error instanceof Error ? error.message : "Não foi possível carregar o Phi-3 local.");
    }
  };

  const loadWasm = async () => {
    setWasmState("loading"); setModelError(""); setProgress(null);
    try {
      const loaded = await loadLocalSemanticModel(setProgress);
      setWasmState("ready"); setLoadTimeMs(loaded.loadTimeMs);
    } catch (error) {
      setWasmState("error"); setModelError(error instanceof Error ? error.message : "Não foi possível carregar o classificador WASM.");
    }
  };

  const activateSelectedMode = () => {
    if (mode === "webgpu" || (mode === "auto" && runtime?.webgpuAvailable)) void loadPhi();
    else if (mode === "wasm" || mode === "auto") void loadWasm();
  };

  const removePhi = async () => {
    setModelError("");
    try {
      await removeLocalPhiModel();
      setPhiEngine(null); setPhiState("idle"); setPhiCached(false); setLoadTimeMs(null);
      toast.success("Phi-3 e cache local removidos");
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "Falha ao remover o cache local.");
    }
  };

  const clearSession = async () => {
    await resetLocalPhiConversation().catch(() => undefined);
    clearLocalAnalyticsCache();
    setResult(null); setQuestion(""); setExpanded(false); setShowChart(true); onFocus([]);
    toast.success("Contexto local da sessão limpo");
  };

  const ask = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || asking) return;
    setAsking(true); setModelError("");
    try {
      let nextResult: LocalInsightResult;
      if (execution === "local-wasm") {
        const semantic = await classifyIntentLocally(trimmed);
        const deterministic = await analyzeInLocalWorker(trimmed, snapshot, semantic.intent);
        nextResult = { ...deterministic, execution: "local-wasm", confidence: Math.round(Math.min(deterministic.confidence, semantic.confidence) * 100) / 100, modelName: semantic.modelId, latencyMs: deterministic.latencyMs + semantic.latencyMs, sourceLabel: `${deterministic.sourceLabel} · intenção interpretada em WASM` };
      } else {
        const deterministic = await analyzeInLocalWorker(trimmed, snapshot);
        if (execution === "local-webgpu" && phiEngine) {
          const context = JSON.stringify({ snapshot: { id: snapshot.id, capturedAt: snapshot.capturedAt, filters: snapshot.filters }, answer: deterministic.answer, cards: deterministic.cards, evidence: deterministic.evidence, chart: deterministic.chart });
          const generated = await askLocalPhi(phiEngine, context, trimmed);
          nextResult = { ...deterministic, answer: generated.text, execution: "local-webgpu", modelName: LOCAL_PHI_MODEL, latencyMs: deterministic.latencyMs + generated.latencyMs, sourceLabel: `${deterministic.sourceLabel} · interpretado pelo Phi-3 local` };
        } else nextResult = deterministic;
      }
      setResult(nextResult); setQuestion(""); setExpanded(false); setShowChart(true); onFocus(nextResult.focusIds);
      appendLocalAiAudit({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), execution: nextResult.execution, intent: nextResult.intent, confidence: nextResult.confidence, latencyMs: nextResult.latencyMs, snapshotId: nextResult.snapshot.id, filterLabel: formatFilterLabel(nextResult.snapshot.filters), modelName: nextResult.modelName });
      setAuditRecords(readLocalAiAudit());
    } catch (error) {
      setModelError(error instanceof Error ? error.message : "Falha na análise local.");
    } finally { setAsking(false); }
  };

  const copySummary = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.answer);
    toast.success("Resumo copiado");
  };

  const modelReady = execution !== "rules";
  const selectedState = mode === "wasm" ? wasmState : mode === "rules" ? "ready" : mode === "auto" && runtime?.webgpuAvailable === false ? wasmState : phiState;

  return <>
    {!open && <Button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 h-12 rounded-full bg-[#8B5CF6] px-5 text-white shadow-[0_0_28px_rgba(139,92,246,0.38)] hover:bg-[#7C3AED]"><Sparkles className="mr-2 h-4 w-4" /> Insight local</Button>}
    {open && <aside className="fixed bottom-4 right-4 z-40 flex w-[min(460px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-violet-400/30 bg-[#0B172B]/95 shadow-[0_20px_70px_rgba(0,0,0,0.55),0_0_28px_rgba(139,92,246,0.14)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15"><Bot className="h-5 w-5 text-violet-300" /></div><div><p className="text-sm font-semibold">QTrack Insight</p><p className="text-[11px] text-slate-400">Pergunte, explique, aponte e desdobre</p></div></div><Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 text-slate-400 hover:text-white"><X className="h-4 w-4" /></Button></header>

      <div className="space-y-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-400"><Cpu className="h-3.5 w-3.5 text-emerald-400" /> {runtime?.label ?? "Detectando runtime local..."}<LockKeyhole className="ml-auto h-3.5 w-3.5 text-emerald-400" /> Sem envio ao servidor</div>
        <div className="flex items-center justify-between gap-3"><Select value={mode} onValueChange={(value) => updateMode(value as LocalAiMode)}><SelectTrigger size="sm" className="w-[185px] border-white/10 bg-white/[0.03] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Automático</SelectItem><SelectItem value="rules">Regras locais</SelectItem><SelectItem value="webgpu" disabled={!runtime?.webgpuAvailable}>Phi-3 · WebGPU</SelectItem><SelectItem value="wasm" disabled={!runtime?.wasmAvailable}>Semântico · WASM</SelectItem></SelectContent></Select><div className="flex items-center gap-2">{modelReady ? <Badge className="bg-emerald-500/15 text-emerald-300">{execution === "local-webgpu" ? "Phi-3 ativo" : "WASM ativo"}</Badge> : mode !== "rules" && <Button size="sm" variant="outline" onClick={activateSelectedMode} disabled={selectedState === "loading"} className="border-violet-400/40 bg-transparent text-xs text-violet-200 hover:bg-violet-500/10"><Download className="mr-1.5 h-3.5 w-3.5" />{selectedState === "loading" ? "Carregando" : phiCached && mode !== "wasm" ? "Carregar cache" : "Ativar modelo"}</Button>}</div></div>
        {mode === "webgpu" && phiState === "idle" && <p className="text-[10px] text-amber-300/80">Phi-3.5 1k requer aproximadamente 2,5 GB de memória gráfica. O download só começa ao ativar.</p>}
        {(phiState === "loading" || wasmState === "loading") && <div><div className="mb-1 flex justify-between gap-2 text-[10px] text-slate-500"><span className="truncate">{progress?.text ?? "Preparando modelo..."}</span><span>{Math.round((progress?.progress ?? 0) * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-violet-400 transition-all" style={{ width: `${Math.max(2, (progress?.progress ?? 0) * 100)}%` }} /></div></div>}
        {modelError && <p className="rounded-lg bg-red-500/10 px-2.5 py-2 text-[11px] text-red-300">{modelError}</p>}
        {(phiState === "ready" || wasmState === "ready") && <div className="flex items-center justify-between text-[10px] text-slate-500"><span>{loadTimeMs ? `Inicialização: ${loadTimeMs} ms` : "Modelo pronto"}</span><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={clearSession} className="h-6 px-2 text-[10px] text-slate-400"><Eraser className="mr-1 h-3 w-3" />Limpar sessão</Button>{phiState === "ready" && <Button variant="ghost" size="sm" onClick={() => void removePhi()} className="h-6 px-2 text-[10px] text-red-300"><Trash2 className="mr-1 h-3 w-3" />Remover Phi-3</Button>}{wasmState === "ready" && <Button variant="ghost" size="sm" onClick={() => { unloadLocalSemanticModel(); setWasmState("idle"); }} className="h-6 px-2 text-[10px] text-slate-400">Descarregar WASM</Button>}</div></div>}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {!result ? <div className="space-y-4"><div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4"><MessageSquare className="mb-2 h-5 w-5 text-violet-300" /><p className="text-sm text-slate-200">O cálculo roda em Worker local. Ative um modelo apenas se quiser interpretação semântica; as métricas continuam determinísticas.</p><p className="mt-2 text-[11px] text-slate-500">Snapshot {snapshot.id} · {formatFilterLabel(snapshot.filters)}</p></div><div className="flex flex-wrap gap-2">{PROMPTS.map((prompt) => <button key={prompt} onClick={() => void ask(prompt)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-violet-400/50 hover:bg-violet-500/10">{prompt}</button>)}</div></div> : <div className="space-y-3"><div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4"><div className="mb-2 flex items-center gap-2 text-xs text-violet-200"><Sparkles className="h-3.5 w-3.5" /> {result.execution === "local-webgpu" ? "Phi-3 · WebGPU" : result.execution === "local-wasm" ? "Semântico · WASM" : "Regras · Worker"} · {Math.round(result.confidence * 100)}%</div><p className="text-sm leading-relaxed text-slate-100">{result.answer}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-400"><span>Snapshot: {new Date(result.snapshot.capturedAt).toLocaleString("pt-BR")}</span><span className="text-right">Latência: {result.latencyMs} ms</span><span className="col-span-2">Filtro: {formatFilterLabel(result.snapshot.filters)}</span></div></div>
          {result.evidence.length > 0 && <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3"><p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-cyan-200"><Eye className="h-3.5 w-3.5" /> Evidências do cálculo</p>{result.evidence.map((item) => <div key={item.label} className="flex items-start justify-between gap-3 border-t border-white/5 py-2 text-[11px] first:border-0"><div><p className="text-slate-300">{item.label}</p><p className="text-slate-500">{item.calculation}</p></div><strong className="shrink-0 text-cyan-200">{item.value}</strong></div>)}</div>}
          {showChart && result.chart && <LocalChartRenderer spec={result.chart} />}
          <div className="grid grid-cols-2 gap-2">{(expanded ? result.cards : result.cards.slice(0, 1)).map((card) => <div key={card.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="truncate text-xs text-slate-400">{card.title}</p><p className="mt-1 text-xl font-bold text-violet-200">{card.value}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{card.explanation}</p></div>)}</div>
          {result.suggestions?.length ? <div className="flex flex-wrap gap-2">{result.suggestions.map((suggestion) => <button key={suggestion} onClick={() => void ask(suggestion)} className="rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-violet-200">{suggestion}</button>)}</div> : null}
          <div className="flex flex-wrap gap-1.5"><Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} disabled={result.cards.length <= 1} className="h-7 border-white/10 bg-transparent px-2 text-[10px]"><ChevronDown className={cn("mr-1 h-3 w-3 transition", expanded && "rotate-180")} />Desmembrar</Button><Button variant="outline" size="sm" onClick={() => setShowChart(!showChart)} disabled={!result.chart} className="h-7 border-white/10 bg-transparent px-2 text-[10px]"><Gauge className="mr-1 h-3 w-3" />{showChart ? "Ocultar gráfico" : "Gerar gráfico"}</Button><Button variant="outline" size="sm" onClick={() => setLocation("/defects")} className="h-7 border-white/10 bg-transparent px-2 text-[10px]"><Database className="mr-1 h-3 w-3" />Ver defeitos</Button><Button variant="outline" size="sm" onClick={() => void copySummary()} className="h-7 border-white/10 bg-transparent px-2 text-[10px]"><Clipboard className="mr-1 h-3 w-3" />Copiar</Button><Button variant="ghost" size="sm" onClick={() => onFocus([])} className="h-7 px-2 text-[10px] text-slate-400">Limpar foco</Button></div>
          <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/5 text-[11px] text-emerald-300">Nenhuma pergunta ou resposta é gravada na auditoria</Badge>
        </div>}

        <div className="rounded-xl border border-white/10 bg-white/[0.02]"><button onClick={() => setShowAudit(!showAudit)} className="flex w-full items-center justify-between px-3 py-2 text-[11px] text-slate-400"><span>Auditoria local · {auditRecords.length} registro(s)</span><ChevronDown className={cn("h-3.5 w-3.5 transition", showAudit && "rotate-180")} /></button>{showAudit && <div className="border-t border-white/5 px-3 py-2"><div className="max-h-28 space-y-2 overflow-y-auto">{auditRecords.slice(0, 8).map((record) => <div key={record.id} className="flex justify-between gap-3 text-[10px] text-slate-500"><span>{new Date(record.timestamp).toLocaleTimeString("pt-BR")} · {record.intent} · {record.execution}</span><span>{record.latencyMs} ms</span></div>)}{auditRecords.length === 0 && <p className="text-[10px] text-slate-500">Nenhuma análise nesta sessão.</p>}</div>{auditRecords.length > 0 && <Button variant="ghost" size="sm" onClick={() => { clearLocalAiAudit(); setAuditRecords([]); }} className="mt-1 h-6 px-1 text-[10px] text-red-300">Limpar auditoria</Button>}</div>}</div>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void ask(question); }} className="flex gap-2 border-t border-white/10 p-3"><Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte sobre qualidade..." className="border-white/10 bg-white/[0.04] text-sm" disabled={asking} /><Button type="submit" size="icon" className="shrink-0 bg-violet-600 hover:bg-violet-500" disabled={asking}><Send className={cn("h-4 w-4", asking && "animate-pulse")} /></Button></form>
    </aside>}
  </>;
}
