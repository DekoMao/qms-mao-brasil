import { useEffect, useState } from "react";
import { Bot, ChevronDown, Cpu, LockKeyhole, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { analyzeLocalQualityQuestion, type LocalChartSpec, type LocalInsightResult } from "@/lib/localQualityAnalytics";
import { detectLocalRuntime, type LocalRuntimeStatus } from "@/lib/localRuntime";

type Props = {
  stats: any;
  accuracyTrend?: any;
  onFocus: (focusIds: string[]) => void;
};

const PROMPTS = ["Qual é o panorama geral?", "Quais fornecedores concentram mais defeitos?", "Onde o SLA está mais ameaçado?", "Como está a acurácia do Triage Agent?"];

function LocalChartRenderer({ spec }: { spec: LocalChartSpec }) {
  const max = Math.max(...spec.data.map((item) => item.value), 1);
  const color = { violet: "#A78BFA", teal: "#00D4AA", gold: "#F5A623", red: "#F87171" }[spec.color];
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <p className="mb-3 text-xs font-semibold text-slate-300">{spec.title}</p>
      {spec.type === "kpi" ? <div className="text-3xl font-bold" style={{ color }}>{Math.round(spec.data[0]?.value ?? 0)}%</div> : <div className="space-y-2">{spec.data.map((item) => <div key={item.label}><div className="mb-1 flex justify-between gap-2 text-[11px] text-slate-400"><span className="truncate">{item.label}</span><span>{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, background: color }} /></div></div>)}</div>}
    </div>
  );
}

export function LocalInsightDock({ stats, accuracyTrend, onFocus }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<LocalInsightResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [runtime, setRuntime] = useState<LocalRuntimeStatus | null>(null);

  useEffect(() => {
    void detectLocalRuntime().then(setRuntime);
  }, []);

  const ask = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const nextResult = analyzeLocalQualityQuestion(trimmed, stats, accuracyTrend);
    setResult(nextResult);
    setQuestion("");
    setExpanded(false);
    onFocus(nextResult.focusIds);
  };

  return (
    <>
      {!open && (
        <Button onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 h-12 rounded-full bg-[#8B5CF6] px-5 text-white shadow-[0_0_28px_rgba(139,92,246,0.38)] hover:bg-[#7C3AED]">
          <Sparkles className="mr-2 h-4 w-4" /> Insight local
        </Button>
      )}
      {open && (
        <aside className="fixed bottom-5 right-5 z-40 flex w-[min(420px,calc(100vw-2rem))] max-h-[min(720px,calc(100vh-2rem))] flex-col overflow-hidden rounded-2xl border border-violet-400/30 bg-[#0B172B]/95 shadow-[0_20px_70px_rgba(0,0,0,0.55),0_0_28px_rgba(139,92,246,0.14)] backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15"><Bot className="h-5 w-5 text-violet-300" /></div><div><p className="text-sm font-semibold">QTrack Insight</p><p className="text-[11px] text-slate-400">Pergunte sobre seus dados de qualidade</p></div></div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8 text-slate-400 hover:text-white"><X className="h-4 w-4" /></Button>
          </header>
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-[11px] text-slate-400"><Cpu className="h-3.5 w-3.5 text-emerald-400" /> {runtime?.label ?? "Detectando runtime local..."}<LockKeyhole className="ml-auto h-3.5 w-3.5 text-emerald-400" /> Dados não enviados nesta fase</div>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {!result ? <div className="space-y-4"><div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4"><MessageSquare className="mb-2 h-5 w-5 text-violet-300" /><p className="text-sm text-slate-200">Analiso os indicadores já carregados no Dashboard usando regras locais. Nenhuma chamada externa é feita nesta fase.</p></div><div className="flex flex-wrap gap-2">{PROMPTS.map((prompt) => <button key={prompt} onClick={() => ask(prompt)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-violet-400/50 hover:bg-violet-500/10">{prompt}</button>)}</div></div> : <div className="space-y-4"><div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-4"><div className="mb-2 flex items-center gap-2 text-xs text-violet-200"><Sparkles className="h-3.5 w-3.5" /> Análise local · {Math.round(result.confidence * 100)}% confiança</div><p className="text-sm leading-relaxed text-slate-100">{result.answer}</p><p className="mt-2 text-[11px] text-slate-400">Fonte: {result.sourceLabel}</p></div>{result.chart && <LocalChartRenderer spec={result.chart} />}<div className="grid grid-cols-2 gap-2">{(expanded ? result.cards : result.cards.slice(0, 3)).map((card) => <div key={card.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><p className="truncate text-xs text-slate-400">{card.title}</p><p className="mt-1 text-xl font-bold text-violet-200">{card.value}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{card.explanation}</p></div>)}</div>{result.cards.length > 3 && <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="w-full text-xs text-violet-300">{expanded ? "Recolher" : "Desmembrar análise"}<ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition", expanded && "rotate-180")} /></Button>}<Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/5 text-[11px] text-emerald-300">Processamento local · regras determinísticas</Badge></div>}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); ask(question); }} className="flex gap-2 border-t border-white/10 p-3"><Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte sobre qualidade..." className="border-white/10 bg-white/[0.04] text-sm" /><Button type="submit" size="icon" className="shrink-0 bg-violet-600 hover:bg-violet-500"><Send className="h-4 w-4" /></Button></form>
        </aside>
      )}
    </>
  );
}
