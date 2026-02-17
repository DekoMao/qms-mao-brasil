import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, TrendingUp, AlertTriangle, Repeat, BarChart3 } from "lucide-react";

export default function AiPrediction() {
  const { data: patterns, isLoading: patternsLoading } = trpc.prediction.recurrencePatterns.useQuery();
  const { data: heatmap, isLoading: heatmapLoading } = trpc.prediction.heatmap.useQuery();

  if (patternsLoading || heatmapLoading) return (
    <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  const riskColor = (risk: string) => {
    if (risk === "HIGH") return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    if (risk === "MEDIUM") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6" /> IA — Predição de Recorrência</h1>
        <p className="text-muted-foreground mt-1">Análise de padrões de recorrência e heatmap de defeitos por fornecedor/sintoma</p>
      </div>

      {/* Recurrence Patterns */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Repeat className="h-5 w-5" /> Padrões de Recorrência</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns && (patterns as any[]).length > 0 ? (patterns as any[]).map((p: any, idx: number) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.supplier}</CardTitle>
                  <Badge className={riskColor(p.riskLevel)}>{p.riskLevel}</Badge>
                </div>
                <CardDescription>{p.symptom}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Ocorrências:</span> <span className="font-semibold">{p.count}</span></div>
                  <div><span className="text-muted-foreground">Recorrência:</span> <span className="font-semibold">{p.recurrenceRate}%</span></div>
                </div>
                {p.suggestion && (
                  <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                    <AlertTriangle className="h-3 w-3 inline mr-1 text-yellow-500" />
                    {p.suggestion}
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">
              Nenhum padrão de recorrência detectado. Dados insuficientes para análise.
            </CardContent></Card>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Heatmap: Fornecedor × Sintoma</h2>
        <Card>
          <CardContent className="p-0 overflow-auto">
            {heatmap && (heatmap as any[]).length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Fornecedor</th>
                    <th className="p-3 text-left font-medium">Sintoma</th>
                    <th className="p-3 text-center font-medium">Qtd</th>
                    <th className="p-3 text-center font-medium">Intensidade</th>
                  </tr>
                </thead>
                <tbody>
                  {(heatmap as any[]).map((cell: any, idx: number) => {
                    const intensity = Math.min(cell.count / 5, 1);
                    const bgOpacity = Math.round(intensity * 100);
                    return (
                      <tr key={idx} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{cell.supplier}</td>
                        <td className="p-3">{cell.symptom}</td>
                        <td className="p-3 text-center font-semibold">{cell.count}</td>
                        <td className="p-3 text-center">
                          <div className="w-full h-6 rounded" style={{
                            background: `rgba(239, 68, 68, ${intensity * 0.7})`,
                          }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Dados insuficientes para gerar o heatmap.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
