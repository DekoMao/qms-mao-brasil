import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Award, TrendingUp, TrendingDown, Minus, RefreshCw, Settings, ChevronRight } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, LineChart, Line,
} from "recharts";
import { toast } from "sonner";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-yellow-500",
  D: "bg-red-500",
};

const GRADE_TEXT_COLORS: Record<string, string> = {
  A: "text-green-500",
  B: "text-blue-500",
  C: "text-yellow-500",
  D: "text-red-500",
};

const METRIC_LABELS: Record<string, Record<string, string>> = {
  pt: {
    ppm: "PPM",
    slaCompliance: "Conformidade SLA",
    correctiveEffectiveness: "Eficácia AC",
    resolutionTime: "Tempo Resolução",
    responseRate: "Taxa Resposta",
  },
  en: {
    ppm: "PPM",
    slaCompliance: "SLA Compliance",
    correctiveEffectiveness: "CA Effectiveness",
    resolutionTime: "Resolution Time",
    responseRate: "Response Rate",
  },
};

export default function SupplierScorecard() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "pt";

  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const { data: scores, isLoading, refetch } = trpc.scorecard.list.useQuery();
  const { data: configs } = trpc.scorecard.configs.useQuery();
  const { data: supplierDetail } = trpc.scorecard.bySupplier.useQuery(
    { supplierId: selectedSupplier! },
    { enabled: !!selectedSupplier }
  );

  const recalculate = trpc.scorecard.recalculate.useMutation({
    onSuccess: (data) => {
      toast.success(lang === "pt" ? `Scores recalculados: ${data.recalculated} fornecedores` : `Scores recalculated: ${data.recalculated} suppliers`);
      refetch();
    },
  });

  const updateConfig = trpc.scorecard.updateConfig.useMutation({
    onSuccess: () => {
      toast.success(lang === "pt" ? "Peso atualizado" : "Weight updated");
      refetch();
    },
  });

  const metricLabels = METRIC_LABELS[lang] || METRIC_LABELS.pt;

  const radarData = supplierDetail?.current?.metrics
    ? Object.entries(supplierDetail.current.metrics).map(([key, value]) => ({
        metric: metricLabels[key] || key,
        score: Math.round(value as number),
        fullMark: 100,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            {lang === "pt" ? "Scorecard de Fornecedores" : "Supplier Scorecard"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "pt" ? "Avaliação quantitativa de performance" : "Quantitative performance assessment"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4 mr-1" />
            {lang === "pt" ? "Configurar Pesos" : "Configure Weights"}
          </Button>
          <Button size="sm" onClick={() => recalculate.mutate()} disabled={recalculate.isPending}>
            <RefreshCw className={`h-4 w-4 mr-1 ${recalculate.isPending ? "animate-spin" : ""}`} />
            {lang === "pt" ? "Recalcular" : "Recalculate"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["A", "B", "C", "D"].map((grade) => {
          const count = scores?.filter((s: any) => s.grade === grade).length || 0;
          return (
            <Card key={grade}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{lang === "pt" ? "Classificação" : "Grade"} {grade}</p>
                  <p className={`text-3xl font-bold ${GRADE_TEXT_COLORS[grade]}`}>{count}</p>
                </div>
                <div className={`w-12 h-12 rounded-full ${GRADE_COLORS[grade]} flex items-center justify-center text-white text-xl font-bold`}>
                  {grade}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Scorecard Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "pt" ? "Fornecedor" : "Supplier"}</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">{lang === "pt" ? "Classificação" : "Grade"}</TableHead>
                {Object.entries(metricLabels).map(([key, label]) => (
                  <TableHead key={key} className="text-center hidden lg:table-cell">{label}</TableHead>
                ))}
                <TableHead className="text-center">{lang === "pt" ? "Tendência" : "Trend"}</TableHead>
                <TableHead className="text-center">{lang === "pt" ? "Defeitos" : "Defects"}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores?.map((supplier: any) => (
                <TableRow key={supplier.supplierId} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSupplier(supplier.supplierId)}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${GRADE_TEXT_COLORS[supplier.grade]}`}>
                      {supplier.overallScore.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${GRADE_COLORS[supplier.grade]} text-white`}>{supplier.grade}</Badge>
                  </TableCell>
                  {Object.keys(metricLabels).map((key) => (
                    <TableCell key={key} className="text-center hidden lg:table-cell">
                      <span className={`text-sm ${(supplier.metrics?.[key] || 0) >= 80 ? "text-green-500" : (supplier.metrics?.[key] || 0) >= 60 ? "text-yellow-500" : "text-red-500"}`}>
                        {Math.round(supplier.metrics?.[key] || 0)}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {supplier.trend === "UP" && <TrendingUp className="h-4 w-4 text-green-500 mx-auto" />}
                    {supplier.trend === "DOWN" && <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />}
                    {supplier.trend === "STABLE" && <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center text-sm">{supplier.totalDefects}</TableCell>
                  <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
              {(!scores || scores.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {lang === "pt" ? "Nenhum fornecedor encontrado" : "No suppliers found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Supplier Detail Dialog */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {scores?.find((s: any) => s.supplierId === selectedSupplier)?.name || ""} — {lang === "pt" ? "Detalhes" : "Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div>
              <h3 className="text-sm font-medium mb-2">{lang === "pt" ? "Métricas" : "Metrics"}</h3>
              {radarData.length > 0 && (
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Score Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-16 h-16 rounded-full ${GRADE_COLORS[supplierDetail?.current?.grade || "D"]} flex items-center justify-center text-white text-2xl font-bold`}>
                  {supplierDetail?.current?.grade || "-"}
                </div>
                <div>
                  <p className="text-3xl font-bold">{supplierDetail?.current?.overallScore?.toFixed(1) || "-"}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {supplierDetail?.trend === "UP" && <><TrendingUp className="h-3 w-3 text-green-500" /> {lang === "pt" ? "Em alta" : "Trending up"}</>}
                    {supplierDetail?.trend === "DOWN" && <><TrendingDown className="h-3 w-3 text-red-500" /> {lang === "pt" ? "Em queda" : "Trending down"}</>}
                    {supplierDetail?.trend === "STABLE" && <><Minus className="h-3 w-3" /> {lang === "pt" ? "Estável" : "Stable"}</>}
                  </p>
                </div>
              </div>
              {supplierDetail?.current?.metrics && Object.entries(supplierDetail.current.metrics).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{metricLabels[key] || key}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, value as number)}%`,
                        backgroundColor: (value as number) >= 80 ? "#22c55e" : (value as number) >= 60 ? "#eab308" : "#ef4444",
                      }} />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{Math.round(value as number)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* History Sparkline */}
          {supplierDetail?.history && supplierDetail.history.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">{lang === "pt" ? "Histórico (últimos 12 meses)" : "History (last 12 months)"}</h3>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={supplierDetail.history.map((h: any) => ({ period: h.periodKey, score: parseFloat(h.overallScore) })).reverse()}>
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Tooltip />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "pt" ? "Configuração de Pesos" : "Weight Configuration"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {configs?.map((config: any) => (
              <div key={config.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{config.metricName}</span>
                  <span className="text-sm text-muted-foreground">{parseFloat(config.weight).toFixed(1)}</span>
                </div>
                <Slider
                  defaultValue={[parseFloat(config.weight)]}
                  min={0}
                  max={10}
                  step={0.5}
                  onValueCommit={(value) => updateConfig.mutate({ id: config.id, weight: value[0] })}
                />
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
