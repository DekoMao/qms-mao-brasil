import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AlertTriangle, RefreshCw, CheckCircle, ChevronLeft, ChevronRight, Pause, Play, Calendar, X, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

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

function StatusRow({
  label, valuePct, count, total, color, variant,
}: {
  label: string; valuePct: number; count: number; total: number; color: string; variant: "default" | "alert";
}) {
  const { t } = useTranslation();
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <div className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
            variant === "alert"
              ? "flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 shadow-sm hover:bg-rose-100/60"
              : "flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm hover:bg-muted/50"
          }`}>
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
            <span className={variant === "alert" ? "text-lg font-bold text-rose-600" : "text-lg font-bold text-foreground"}>
              {valuePct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-slate-900 text-white border-slate-800">
          <div className="space-y-1 p-1">
            <p className="font-semibold">{label}</p>
            <p className="text-sm">
              <span className="text-emerald-400 font-bold">{count}</span> {t('dashboard.cases')} de {total} total
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

function CriticalCasesCarousel({ cases, onCaseClick }: { cases: any[]; onCaseClick: (id: string) => void }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cases.length);
      setSlideDirection(null);
      setIsAnimating(false);
    }, 400);
  }, [cases.length, isAnimating]);

  const prevSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cases.length) % cases.length);
      setSlideDirection(null);
      setIsAnimating(false);
    }, 400);
  }, [cases.length, isAnimating]);

  const goToSlide = useCallback((idx: number) => {
    if (isAnimating || idx === currentIndex) return;
    setIsAnimating(true);
    setSlideDirection(idx > currentIndex ? 'left' : 'right');
    setTimeout(() => {
      setCurrentIndex(idx);
      setSlideDirection(null);
      setIsAnimating(false);
    }, 400);
  }, [currentIndex, isAnimating]);

  useEffect(() => {
    if (!isPlaying || cases.length <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, cases.length, nextSlide]);

  if (cases.length === 0) return null;
  const currentCase = cases[currentIndex];

  const getSlideClasses = () => {
    if (slideDirection === 'left') return 'animate-slide-out-left';
    if (slideDirection === 'right') return 'animate-slide-out-right';
    return 'animate-slide-in';
  };

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes slideOutLeft { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(-100%); opacity: 0; } }
        @keyframes slideOutRight { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
        @keyframes slideIn { 0% { transform: translateX(30px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        .animate-slide-out-left { animation: slideOutLeft 0.4s ease-in-out forwards; }
        .animate-slide-out-right { animation: slideOutRight 0.4s ease-in-out forwards; }
        .animate-slide-in { animation: slideIn 0.3s ease-out forwards; }
      `}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevSlide} disabled={cases.length <= 1 || isAnimating}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextSlide} disabled={cases.length <= 1 || isAnimating}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {cases.slice(0, 5).map((_, idx) => (
            <button key={idx} onClick={() => goToSlide(idx)} disabled={isAnimating}
              className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-6 bg-rose-500" : "w-2 bg-slate-300 hover:bg-slate-400"}`} />
          ))}
          {cases.length > 5 && <span className="text-xs text-muted-foreground ml-2">+{cases.length - 5}</span>}
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div className={`relative rounded-xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 cursor-pointer transition-shadow duration-300 hover:shadow-lg hover:border-rose-300 ${getSlideClasses()}`}
          onClick={() => onCaseClick(currentCase.id)}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-100/50 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge variant="destructive" className="mb-2 text-xs font-bold px-3 py-1">
                  {t('dashboard.criticalCase')} #{currentIndex + 1}
                </Badge>
                <h4 className="text-lg font-bold text-slate-900">{currentCase.docNumber}</h4>
                <p className="text-sm text-slate-600 mt-1">{currentCase.supplier}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-rose-600">{currentCase.agingTotal}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">{t('dashboard.days')}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">{t('dashboard.symptom')}</p>
                <p className="text-sm font-medium text-slate-800 truncate">{currentCase.symptom || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">{t('defect.model')}</p>
                <p className="text-sm font-medium text-slate-800 truncate">{currentCase.model || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">{t('defect.step')}</p>
                <p className="text-sm font-medium text-slate-800 truncate">{currentCase.step}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-rose-100">
              <p className="text-sm text-slate-500">{t('dashboard.clickForDetails')}</p>
              <ChevronRight className="h-5 w-5 text-rose-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PeriodFilter({ dateFrom, dateTo, onDateFromChange, onDateToChange, onClear, hasFilter }: {
  dateFrom: string; dateTo: string; onDateFromChange: (v: string) => void; onDateToChange: (v: string) => void; onClear: () => void; hasFilter: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">{t('dashboard.periodFilter')}:</span>
      </div>
      <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="h-8 w-36 text-sm" />
      <span className="text-muted-foreground text-sm">{t('dashboard.to')}</span>
      <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="h-8 w-36 text-sm" />
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-8 px-2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4 mr-1" />
          {t('dashboard.clearFilter')}
        </Button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const statsInput = useMemo(() => {
    const input: { dateFrom?: string; dateTo?: string } = {};
    if (dateFrom) input.dateFrom = dateFrom;
    if (dateTo) input.dateTo = dateTo;
    return Object.keys(input).length > 0 ? input : undefined;
  }, [dateFrom, dateTo]);

  const { data: stats, isLoading, isFetching, refetch } = trpc.defect.stats.useQuery(statsInput);
  const { data: rcaData } = trpc.rca.analysis.useQuery(statsInput);
  const [, setLocation] = useLocation();
  const hasDateFilter = dateFrom !== "" || dateTo !== "";

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-3"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-28" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton type="kpi" /><CardSkeleton type="kpi" /><CardSkeleton type="kpi" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton type="chart" /><CardSkeleton type="chart" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton type="chart" /><CardSkeleton type="chart" />
        </div>
        <CardSkeleton type="table" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>{t('common.noData')}</p>
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
    name, value,
    percentage: total > 0 ? Math.round(((value as number) / total) * 100) : 0,
  }));

  const closedPct = total > 0 ? Math.round((closed / total) * 100) : 0;
  const ongoingPct = total > 0 ? Math.round((ongoing / total) * 100) : 0;
  const delayedPct = total > 0 ? Math.round((delayed / total) * 100) : 0;
  const waitingPct = total > 0 ? Math.round((waiting / total) * 100) : 0;

  const bucketData = Object.entries(stats.byBucketAging || {}).map(([name, value]) => ({ name, value }));

  const handleParetoClick = (cause: string) => {
    setLocation(`/defects?search=${encodeURIComponent(cause)}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className={isFetching ? "animate-pulse" : ""}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              {isFetching ? t('common.refreshing') : t('common.refresh')}
            </Button>
            <Button size="sm" onClick={() => setLocation("/defects")}>
              {t('common.viewDetails')}
            </Button>
          </div>
        </div>

        <PeriodFilter dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo}
          onClear={() => { setDateFrom(""); setDateTo(""); }} hasFilter={hasDateFilter} />

        {hasDateFilter && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
            <Filter className="h-4 w-4" />
            <span>{t('dashboard.periodFilter')}: {dateFrom || '...'} → {dateTo || '...'}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className={`kpi-card transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className={isFetching ? "animate-pulse" : ""}>
            <div className="text-lg font-semibold">{t('dashboard.defectList')}</div>
            <div className="kpi-card-label">{t('dashboard.totalDefects')}</div>
          </div>
        </Card>
        <Card className={`kpi-card transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className={`flex items-start justify-between ${isFetching ? "animate-pulse" : ""}`}>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />{t('dashboard.defects')}
              </p>
              <p className="kpi-card-value mt-2 text-emerald-600">{total}</p>
            </div>
          </div>
        </Card>
        <Card className={`kpi-card transition-opacity duration-300 ${critical > 0 ? "border-rose-200" : ""} ${isFetching ? "opacity-60" : ""}`}>
          <div className={`flex items-start justify-between ${isFetching ? "animate-pulse" : ""}`}>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${critical > 0 ? "text-rose-500" : ""}`} />{t('dashboard.critical')}
              </p>
              <p className={`kpi-card-value mt-2 ${critical > 0 ? "text-rose-600" : ""}`}>{critical}</p>
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
              <h3 className="chart-title">{t('dashboard.statusOverview')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.lastUpdate')}: {new Date().toLocaleDateString('pt-BR')} · {t('dashboard.totalItems')}: {total}
              </p>
            </div>
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-center ${isFetching ? "animate-pulse" : ""}`}>
            <div className="relative">
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={68} outerRadius={96} paddingAngle={2} dataKey="value" stroke="transparent">
                      {statusData.map((entry, index) => {
                        const key = entry.name as StatusKey;
                        return <Cell key={`cell-${index}`} fill={STATUS_COLORS[key] || "#8b5cf6"} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-extrabold tracking-tight text-foreground">{closedPct}%</div>
                  <div className="mt-1 text-sm font-semibold tracking-widest text-muted-foreground">CLOSED</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <StatusRow label="ONGOING" valuePct={ongoingPct} count={ongoing} total={total} color={STATUS_COLORS.ONGOING} variant="default" />
              <StatusRow label="DELAYED" valuePct={delayedPct} count={delayed} total={total} color={STATUS_COLORS.DELAYED} variant="alert" />
              <StatusRow label="WAITING FOR CHK" valuePct={waitingPct} count={waiting} total={total} color={STATUS_COLORS.WAITING} variant="default" />
            </div>
          </div>
        </Card>

        {/* Aging per Phase */}
        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">{t('dashboard.agingPerPhase')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.agingDistribution')}</p>
            </div>
          </div>
          <div className={isFetching ? "animate-pulse" : ""}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bucketData} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis axisLine={false} tickLine={false} dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10)" }} />
                <Bar dataKey="value" name={t('dashboard.cases')} radius={[6, 6, 0, 0]}>
                  {bucketData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BUCKET_COLORS[entry.name as keyof typeof BUCKET_COLORS] || "#f59e0b"} />
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
          <div className="mb-4">
            <h3 className="chart-title">{t('dashboard.topSystems')}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.topSystemsDesc')}</p>
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
          <div className="mb-4">
            <h3 className="chart-title">{t('dashboard.topSuppliers')}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.topSuppliersDesc')}</p>
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

      {/* Critical Cases */}
      {stats.criticalCasesList && stats.criticalCasesList.length > 0 && (
        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                {t('dashboard.criticalCases')}
              </h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.criticalCasesDesc')}</p>
            </div>
          </div>
          <CriticalCasesCarousel cases={stats.criticalCasesList} onCaseClick={(id) => setLocation(`/defects/${id}`)} />
        </Card>
      )}

      {/* Pareto RCA - Interactive */}
      {rcaData && rcaData.topCauses && rcaData.topCauses.length > 0 && (
        <Card className={`chart-container transition-opacity duration-300 ${isFetching ? "opacity-60" : ""}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">{t('dashboard.paretoRca')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.paretoRcaDesc')}</p>
            </div>
          </div>
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${isFetching ? "animate-pulse" : ""}`}>
            <div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart
                  data={rcaData.topCauses.slice(0, 7).map((item: any) => ({
                    category: item.cause.length > 15 ? item.cause.substring(0, 15) + "..." : item.cause,
                    fullCause: item.cause,
                    count: item.count,
                    cumulativePercentage: parseFloat(item.cumulativePercentage || "0"),
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10)" }}
                    formatter={(value: any, name: string) => [name === t('dashboard.occurrences') ? value : `${value}%`, name]} />
                  <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name={t('dashboard.occurrences')} radius={[4, 4, 0, 0]} barSize={35} cursor="pointer"
                    onClick={(data: any) => { if (data?.fullCause) handleParetoClick(data.fullCause); }} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#f59e0b" strokeWidth={2}
                    dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }} name={t('dashboard.cumPercentage')} />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground text-center mt-2 italic">{t('dashboard.clickForDetails')}</p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">{t('dashboard.rootCause')}</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">{t('dashboard.qty')}</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">{t('dashboard.cumPct')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rcaData.topCauses.slice(0, 5).map((item: any, index: number) => (
                    <tr key={index} className="border-b last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => handleParetoClick(item.cause)}>
                      <td className="py-3 px-4 font-medium text-slate-800 truncate max-w-[200px]" title={item.cause}>{item.cause}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{item.count}</td>
                      <td className="py-3 px-4 text-right font-semibold text-sky-600">{item.cumulativePercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
