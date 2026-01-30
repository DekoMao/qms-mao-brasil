import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import { AlertTriangle, MoreHorizontal, RefreshCw, CheckCircle, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useCallback } from "react";

// SDD-LOCK-UX: Visual/UX refactor only. No data/API/calculation changes.

const STATUS_COLORS = {
  CLOSED: "#22c55e",
  ONGOING: "#3b82f6",
  DELAYED: "#ef4444",
  WAITING: "#f59e0b",
} as const;

const BUCKET_COLORS = {
  "<=4": "#3b82f6",
  "5-14": "#f59e0b",
  "15-29": "#f97316",
  "30-59": "#ef4444",
  ">60": "#ef4444",
} as const;

type StatusKey = keyof typeof STATUS_COLORS;

// Card Loading Skeleton Component
function CardSkeleton({ type }: { type: "kpi" | "chart" | "table" }) {
  if (type === "kpi") {
    return (
      <Card className="kpi-card animate-pulse">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </Card>
    );
  }
  if (type === "chart") {
    return (
      <Card className="chart-container animate-pulse">
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </div>
      </Card>
    );
  }
  return (
    <Card className="chart-container animate-pulse">
      <div className="space-y-4">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </Card>
  );
}

// Status Row with Tooltip
function StatusRow({
  label,
  valuePct,
  count,
  total,
  color,
  variant,
}: {
  label: string;
  valuePct: number;
  count: number;
  total: number;
  color: string;
  variant: "default" | "alert";
}) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <div
            className={`
              cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md
              ${variant === "alert"
                ? "flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 shadow-sm hover:bg-rose-100/60"
                : "flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm hover:bg-muted/50"
              }
            `}
          >
            <div className="flex items-center gap-3">
              {variant === "alert" ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white">
                  <span className="text-xs font-bold">!</span>
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full" style={{ backgroundColor: color }} />
              )}
              <span className="text-sm font-semibold tracking-wide text-foreground">{label}</span>
            </div>
            <span
              className={
                variant === "alert"
                  ? "text-lg font-bold text-rose-600"
                  : "text-lg font-bold text-foreground"
              }
            >
              {valuePct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-slate-900 text-white border-slate-800">
          <div className="space-y-1 p-1">
            <p className="font-semibold">{label}</p>
            <p className="text-sm">
              <span className="text-emerald-400 font-bold">{count}</span> casos de {total} total
            </p>
            <p className="text-sm text-slate-300">
              Representa <span className="font-bold text-amber-400">{valuePct}%</span> do total
            </p>
          </div>
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}

// Critical Cases Carousel Component
function CriticalCasesCarousel({ 
  cases, 
  onCaseClick 
}: { 
  cases: any[]; 
  onCaseClick: (id: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const nextSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cases.length);
      setIsTransitioning(false);
    }, 300);
  }, [cases.length]);

  const prevSlide = useCallback(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cases.length) % cases.length);
      setIsTransitioning(false);
    }, 300);
  }, [cases.length]);

  useEffect(() => {
    if (!isPlaying || cases.length <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, cases.length, nextSlide]);

  if (cases.length === 0) return null;

  const currentCase = cases[currentIndex];

  return (
    <div className="space-y-4">
      {/* Carousel Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={prevSlide}
            disabled={cases.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={nextSlide}
            disabled={cases.length <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {cases.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsTransitioning(true);
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setIsTransitioning(false);
                }, 300);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? "w-6 bg-rose-500" 
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
          {cases.length > 5 && (
            <span className="text-xs text-muted-foreground ml-2">+{cases.length - 5}</span>
          )}
        </div>
      </div>

      {/* Carousel Card */}
      <div 
        className={`
          relative overflow-hidden rounded-xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 
          cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-rose-300
          ${isTransitioning ? "opacity-0 transform scale-95" : "opacity-100 transform scale-100"}
        `}
        onClick={() => onCaseClick(currentCase.id)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/50 rounded-full -mr-16 -mt-16" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wider mb-1">
                Caso Crítico #{currentIndex + 1} de {cases.length}
              </p>
              <h4 className="text-xl font-bold text-slate-800">{currentCase.docNumber}</h4>
            </div>
            <Badge
              className={
                currentCase.status === "DELAYED"
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                  : currentCase.status === "ONGOING"
                    ? "bg-sky-100 text-sky-700 border-sky-200"
                    : "bg-emerald-100 text-emerald-700 border-emerald-200"
              }
            >
              {currentCase.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Fornecedor</p>
              <p className="font-semibold text-slate-700">{currentCase.supplier || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Sintoma</p>
              <p className="font-semibold text-slate-700 truncate">{currentCase.symptom || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Sistema</p>
              <p className="font-semibold text-slate-700">{currentCase.system || currentCase.area || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Aging</p>
              <p className="font-bold text-rose-600 text-lg">{currentCase.agingTotal || 0} dias</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-rose-100">
            <p className="text-sm text-slate-500">Clique para ver detalhes</p>
            <ChevronRight className="h-5 w-5 text-rose-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, isFetching, refetch } = trpc.defect.stats.useQuery();
  const { data: rcaData, isLoading: rcaLoading } = trpc.rca.analysis.useQuery();
  const [, setLocation] = useLocation();

  // Individual loading states for each section
  const showKpiLoading = isLoading;
  const showChartLoading = isLoading;
  const showTableLoading = isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton type="kpi" />
          <CardSkeleton type="kpi" />
          <CardSkeleton type="kpi" />
        </div>

        {/* Chart Row 1 Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton type="chart" />
          <CardSkeleton type="chart" />
        </div>

        {/* Chart Row 2 Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton type="chart" />
          <CardSkeleton type="chart" />
        </div>

        {/* Table Skeleton */}
        <CardSkeleton type="table" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Nenhum dado disponível</p>
      </div>
    );
  }

  const total = stats.total || 0;
  const closed = stats.byStatus?.CLOSED || 0;
  const ongoing = stats.byStatus?.ONGOING || 0;
  const delayed = stats.byStatus?.DELAYED || 0;
  const waiting = (stats.byStatus as any)?.WAITING || 0;
  const critical = stats.criticalCases || 0;

  const statusData = Object.entries(stats.byStatus || {}).map(([name, value]) => ({
    name,
    value,
    percentage: total > 0 ? Math.round(((value as number) / total) * 100) : 0,
  }));

  const closedPct = total > 0 ? Math.round((closed / total) * 100) : 0;
  const ongoingPct = total > 0 ? Math.round((ongoing / total) * 100) : 0;
  const delayedPct = total > 0 ? Math.round((delayed / total) * 100) : 0;
  const waitingPct = total > 0 ? Math.round((waiting / total) * 100) : 0;

  const bucketData = Object.entries(stats.byBucketAging || {}).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            className={isFetching ? "animate-pulse" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Atualizando..." : "Atualizar"}
          </Button>
          <Button size="sm" onClick={() => setLocation("/defects")}>
            View Details
          </Button>
        </div>
      </div>

      {/* Top Summary Row with individual loading */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={`kpi-card transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className={isFetching ? "animate-pulse" : ""}>
            <div className="text-lg font-semibold">Lista de Defectes</div>
            <div className="kpi-card-label">
              Total defects in the list, Defeitos ou qualificador
            </div>
          </div>
        </Card>

        <Card className={`kpi-card transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className={`flex items-start justify-between ${isFetching ? "animate-pulse" : ""}`}>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Defects
              </p>
              <p className="kpi-card-value mt-2 text-emerald-600">{total}</p>
            </div>
          </div>
        </Card>

        <Card className={`kpi-card transition-opacity duration-300 ${critical > 0 ? "border-rose-200" : ""} ${isFetching ? "opacity-60" : ""}`}>
          <div className={`flex items-start justify-between ${isFetching ? "animate-pulse" : ""}`}>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${critical > 0 ? "text-rose-500" : ""}`} />
                Criticas
              </p>
              <p className={`kpi-card-value mt-2 ${critical > 0 ? "text-rose-600" : ""}`}>
                {critical}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Overview */}
        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Status Overview</h3>
              <p className="text-sm text-muted-foreground">
                Last update: {new Date().toLocaleDateString('pt-BR')} · Total items: {total}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-center ${isFetching ? "animate-pulse" : ""}`}>
            <div className="relative">
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={96}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="transparent"
                    >
                      {statusData.map((entry, index) => {
                        const key = entry.name as StatusKey;
                        const fill = STATUS_COLORS[key] || "#8b5cf6";
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Center KPI */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-extrabold tracking-tight text-foreground">
                    {closedPct}%
                  </div>
                  <div className="mt-1 text-sm font-semibold tracking-widest text-muted-foreground">
                    CLOSED
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <StatusRow 
                label="ONGOING" 
                valuePct={ongoingPct} 
                count={ongoing}
                total={total}
                color={STATUS_COLORS.ONGOING} 
                variant="default" 
              />
              <StatusRow 
                label="DELAYED" 
                valuePct={delayedPct} 
                count={delayed}
                total={total}
                color={STATUS_COLORS.DELAYED} 
                variant="alert" 
              />
              <StatusRow 
                label="WAITING FOR CHK" 
                valuePct={waitingPct} 
                count={waiting}
                total={total}
                color={STATUS_COLORS.WAITING} 
                variant="default" 
              />
            </div>
          </div>
        </Card>

        {/* Aging per Phase */}
        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Aging per Phase</h3>
              <p className="text-sm text-muted-foreground">Distribution of defects by time in days</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className={isFetching ? "animate-pulse" : ""}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bucketData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis axisLine={false} tickLine={false} dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10)",
                  }}
                />
                <Bar dataKey="value" name="Cases" radius={[6, 6, 0, 0]}>
                  {bucketData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BUCKET_COLORS[entry.name as keyof typeof BUCKET_COLORS] || "#f59e0b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Top Systems</h3>
              <p className="text-sm text-muted-foreground">Top percentage of defects by system</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className={`space-y-3 ${isFetching ? "animate-pulse" : ""}`}>
            {(stats.topSymptoms || []).slice(0, 5).map((item: any, index: number) => {
              const maxCount = Math.max(...(stats.topSymptoms || []).map((s: any) => s.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[260px]">{item.name}</span>
                    <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Top Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Suppliers with the highest percentage of defects</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className={`space-y-3 ${isFetching ? "animate-pulse" : ""}`}>
            {(stats.topSuppliers || []).slice(0, 5).map((item: any, index: number) => {
              const maxCount = Math.max(...(stats.topSuppliers || []).map((s: any) => s.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[260px]">{item.name}</span>
                    <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Critical Cases Carousel */}
      {stats.criticalCasesList && stats.criticalCasesList.length > 0 && (
        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Critical Cases
              </h3>
              <p className="text-sm text-muted-foreground">Critical systems that require immediate attention</p>
            </div>
          </div>

          <CriticalCasesCarousel 
            cases={stats.criticalCasesList} 
            onCaseClick={(id) => setLocation(`/defects/${id}`)}
          />
        </Card>
      )}

      {/* Pareto RCA - Non Compliance Cases */}
      {rcaData && rcaData.topCauses && rcaData.topCauses.length > 0 && (
        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Non Compliance Cases</h3>
              <p className="text-sm text-muted-foreground">Vieesty breakdown since April 24</p>
            </div>
          </div>

          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${isFetching ? "animate-pulse" : ""}`}>
            {/* Gráfico de Barras + Linha à esquerda */}
            <div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart
                  data={rcaData.topCauses.slice(0, 7).map((item: any, idx: number) => ({
                    category: `Vicod ${idx + 1}`,
                    count: item.count,
                    percentage: parseFloat(item.percentage || "0"),
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 11, fill: "#6b7280" }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 40]}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10)",
                    }}
                    formatter={(value: any, name: string) => [
                      name === "count" ? value : `${value}%`,
                      name === "count" ? "Qtd" : "% do Total"
                    ]}
                  />
                  <Bar 
                    dataKey="percentage" 
                    fill="#3b82f6" 
                    name="Percentual" 
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                    name="Tendência"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela de dados à direita */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Tnenala</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Qai</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">% voda</th>
                  </tr>
                </thead>
                <tbody>
                  {rcaData.topCauses.slice(0, 5).map((item: any, index: number) => {
                    const totalCount = rcaData.topCauses.reduce((sum: number, i: any) => sum + i.count, 0);
                    const pct = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={index} className="border-b last:border-b-0 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-800">{item.cause}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{item.count}</td>
                        <td className="py-3 px-4 text-right font-semibold text-sky-600">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
