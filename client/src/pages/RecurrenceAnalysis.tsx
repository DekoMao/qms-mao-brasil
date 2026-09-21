import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Repeat, ShieldCheck } from "lucide-react";

export default function RecurrenceAnalysis() {
  const { data, isLoading } = trpc.prediction.recurrenceAnalysis.useQuery();
  const analysis = data as { patterns?: any[]; totalPatterns?: number; highRiskPatterns?: number } | undefined;
  const patterns = analysis?.patterns ?? [];

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Repeat className="h-6 w-6 text-violet-400" /> Análise de Recorrência</h1>
        <p className="mt-1 text-muted-foreground">Padrões repetitivos identificados pelo Predict Agent para priorização preventiva.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Padrões identificados</p><p className="mt-1 text-3xl font-bold text-violet-400">{analysis?.totalPatterns ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Alto risco</p><p className="mt-1 text-3xl font-bold text-red-400">{analysis?.highRiskPatterns ?? 0}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Sinais de recorrência</CardTitle></CardHeader>
        <CardContent>
          {patterns.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum padrão suficiente para análise.</p> : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {patterns.map((pattern: any, index: number) => (
                <div key={`${pattern.supplier ?? "unknown"}-${pattern.symptom ?? "unknown"}-${index}`} className="rounded-lg border border-border/60 bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{pattern.supplier || "Fornecedor não informado"}</p><p className="text-xs text-muted-foreground">{pattern.symptom || "Sintoma não informado"}</p></div><Badge className={pattern.riskLevel === "HIGH" ? "bg-red-500/20 text-red-400" : pattern.riskLevel === "MEDIUM" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}>{pattern.riskLevel}</Badge></div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><span className="text-muted-foreground">Ocorrências</span><strong>{pattern.count ?? 0}</strong><span className="text-muted-foreground">Recorrência</span><strong>{pattern.recurrenceRate ?? 0}%</strong></div>
                  {pattern.suggestion && <p className="mt-3 text-xs text-amber-300"><AlertTriangle className="mr-1 inline h-3 w-3" />{pattern.suggestion}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
