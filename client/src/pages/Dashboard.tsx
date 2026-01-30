import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, MoreHorizontal, RefreshCw, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

// SDD-LOCK-UX: Visual/UX refactor only. No data/API/calculation changes.

const STATUS_COLORS = {
  CLOSED: "#22c55e",   // baseline
  ONGOING: "#3b82f6",
  DELAYED: "#ef4444",  // strong red only for delayed
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

function StatusRow({
  label,
  valuePct,
  color,
  variant,
}: {
  label: string;
  valuePct: number;
  color: string;
  variant: "default" | "alert";
}) {
  return (
    <div
      className={
        variant === "alert"
          ? "flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 shadow-sm"
          : "flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm"
      }
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
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, refetch } = trpc.defect.stats.useQuery();
  const { data: rcaData } = trpc.rca.analysis.useQuery();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="kpi-card">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-10 w-20" />
            </Card>
          ))}
        </div>
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
  const waiting = (stats.byStatus as any)?.WAITING || 0; // mantém estrutura existente
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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setLocation("/defects")}>
            View Details
          </Button>
        </div>
      </div>

      {/* Top Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="kpi-card">
          <div>
            <div className="text-lg font-semibold">Lista de Defectes</div>
            <div className="kpi-card-label">
              Total defects in the list, Defeitos ou qualificador
            </div>
          </div>
        </Card>

        <Card className="kpi-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Defects
              </p>
              <p className="kpi-card-value mt-2 text-emerald-600">{total}</p>
            </div>
          </div>
        </Card>

        <Card className={`kpi-card ${critical > 0 ? "border-rose-200" : ""}`}>
          <div className="flex items-start justify-between">
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
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Status Overview</h3>
              <p className="text-sm text-muted-foreground">
                Last update: 24/04/2024 · Total items: {total}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
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
              <StatusRow label="ONGOING" valuePct={ongoingPct} color={STATUS_COLORS.ONGOING} variant="default" />
              <StatusRow label="DELAYED" valuePct={delayedPct} color={STATUS_COLORS.DELAYED} variant="alert" />
              <StatusRow label="WAITING FOR CHK" valuePct={waitingPct} color={STATUS_COLORS.WAITING} variant="default" />
            </div>
          </div>
        </Card>

        {/* Aging per Phase */}
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Aging per Phase</h3>
              <p className="text-sm text-muted-foreground">Distribution of defects by time in days</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

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
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Top Systems</h3>
              <p className="text-sm text-muted-foreground">Top percentage of defects by system</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
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

        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Top Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Suppliers with the highest percentage of defects</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
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
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Critical Cases</h3>
              <p className="text-sm text-muted-foreground">Critical systems that require immediate attention</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>INSTALAÇÃO</th>
                  <th>ENSAIAMENTO</th>
                  <th>TIPO VIRUS</th>
                  <th>DETALHE</th>
                  <th>SISTEMA</th>
                  <th>STATUS</th>
                  <th>TEMPO ATRÁS</th>
                </tr>
              </thead>
              <tbody>
                {stats.criticalCasesList.slice(0, 5).map((defect: any) => (
                  <tr key={defect.id} className="cursor-pointer" onClick={() => setLocation(`/defects/${defect.id}`)}>
                    <td className="font-medium">{defect.docNumber}</td>
                    <td>{defect.supplier || "-"}</td>
                    <td>{defect.symptom || "-"}</td>
                    <td>{defect.description || defect.detail || "-"}</td>
                    <td>{defect.system || defect.area || "-"}</td>
                    <td>
                      <Badge
                        className={
                          defect.status === "DELAYED"
                            ? "bg-rose-100 text-rose-700 border-rose-200"
                            : defect.status === "ONGOING"
                              ? "bg-sky-100 text-sky-700 border-sky-200"
                              : "bg-emerald-100 text-emerald-700 border-emerald-200"
                        }
                      >
                        {defect.status}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">{defect.agingTotal || 0} days ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Mantém RCA existente (não faz parte do request de “igual imagem”) */}
      {rcaData && rcaData.topCauses && rcaData.topCauses.length > 0 && (
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Pareto RCA</h3>
              <p className="text-sm text-muted-foreground">Análise de causa raiz - Princípio 80/20</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={rcaData.topCauses.slice(0, 8).map((item: any) => ({
                category: item.cause,
                count: item.count,
                cumulativePercentage: parseFloat(item.cumulativePercentage),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10)",
                }}
              />
              <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Ocorrências" radius={[6, 6, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativePercentage"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: "#f59e0b", strokeWidth: 2 }}
                name="% Acumulado"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
