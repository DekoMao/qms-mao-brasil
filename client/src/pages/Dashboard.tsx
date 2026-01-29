import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart, Area
} from "recharts";
import { 
  AlertTriangle, CheckCircle, Clock, TrendingUp, Package, 
  ArrowUpRight, RefreshCw 
} from "lucide-react";
import { useLocation } from "wouter";

// Professional color palette - SDD-UX compliant
const STATUS_COLORS = {
  CLOSED: "#4ade80",      // Muted green - baseline, not alert
  ONGOING: "#3b82f6",     // Blue
  DELAYED: "#ef4444",     // Strong red - highest visual priority
  "Waiting for CHK Solution": "#f59e0b"  // Orange/amber
};

const BUCKET_COLORS = {
  "<=4": "#22c55e",
  "5-14": "#3b82f6", 
  "15-29": "#f59e0b",
  "30-59": "#f97316",
  ">60": "#ef4444"
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6"];

export default function Dashboard() {
  const { data: stats, isLoading, refetch } = trpc.defect.stats.useQuery();
  const { data: rcaData, isLoading: rcaLoading } = trpc.rca.analysis.useQuery();
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p>Nenhum dado disponível</p>
      </div>
    );
  }

  // Prepare chart data
  const statusData = Object.entries(stats.byStatus || {}).map(([name, value]) => ({ 
    name, 
    value,
    percentage: stats.total > 0 ? Math.round((value as number / stats.total) * 100) : 0
  }));
  
  const bucketData = Object.entries(stats.byBucketAging || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lista de Defeitos</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema de qualidade</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setLocation("/defects/new")}>
            Novo Defeito
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <Card className="kpi-card card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Total
              </p>
              <p className="kpi-card-value mt-2">{stats.total}</p>
            </div>
          </div>
        </Card>

        {/* Fechados */}
        <Card className="kpi-card card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Fechados
              </p>
              <p className="kpi-card-value mt-2 text-emerald-600">{stats.byStatus?.CLOSED || 0}</p>
            </div>
          </div>
        </Card>

        {/* Em Andamento */}
        <Card className="kpi-card card-hover">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-sky-500" />
                Em Andamento
              </p>
              <p className="kpi-card-value mt-2 text-sky-600">{stats.byStatus?.ONGOING || 0}</p>
            </div>
          </div>
        </Card>

        {/* Críticos */}
        <Card className={`kpi-card card-hover ${stats.criticalCases > 0 ? "border-rose-200 bg-rose-50/50" : ""}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${stats.criticalCases > 0 ? "text-rose-500" : ""}`} />
                Críticos
              </p>
              <p className={`kpi-card-value mt-2 ${stats.criticalCases > 0 ? "text-rose-600" : ""}`}>
                {stats.criticalCases}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution - SDD-UX Design */}
        <Card className="chart-container bg-slate-50/50">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Status Overview</h3>
            <p className="text-sm text-slate-500">
              Last update: {new Date().toLocaleDateString('pt-BR')} · Total items: {stats.total}
            </p>
          </div>
          <div className="flex items-center gap-8">
            {/* Donut Chart with Center KPI */}
            <div className="relative">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || PIE_COLORS[index % PIE_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, 'Casos']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center KPI - CLOSED percentage */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-700">
                  {statusData.find(s => s.name === 'CLOSED')?.percentage || 0}%
                </span>
                <span className="text-sm font-medium text-slate-500">CLOSED</span>
              </div>
            </div>
            
            {/* Status Cards - Replace traditional legend */}
            <div className="flex-1 space-y-3">
              {statusData
                .filter(item => item.name !== 'CLOSED')
                .sort((a, b) => {
                  // DELAYED first (highest priority)
                  if (a.name === 'DELAYED') return -1;
                  if (b.name === 'DELAYED') return 1;
                  return 0;
                })
                .map((item) => {
                  const isDelayed = item.name === 'DELAYED';
                  const isOngoing = item.name === 'ONGOING';
                  const bgColor = isDelayed ? 'bg-red-50' : isOngoing ? 'bg-white' : 'bg-white';
                  const borderColor = isDelayed ? 'border-red-200' : 'border-slate-200';
                  const iconColor = STATUS_COLORS[item.name as keyof typeof STATUS_COLORS] || '#6b7280';
                  
                  return (
                    <div 
                      key={item.name} 
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border ${bgColor} ${borderColor} cursor-pointer hover:shadow-sm transition-shadow`}
                      onClick={() => setLocation(`/defects?status=${item.name}`)}
                    >
                      <div className="flex items-center gap-3">
                        {isDelayed ? (
                          <AlertTriangle className="w-5 h-5" style={{ color: iconColor }} />
                        ) : (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: iconColor }}
                          />
                        )}
                        <span className={`text-sm font-medium ${isDelayed ? 'text-red-700' : 'text-slate-700'}`}>
                          {item.name === 'Waiting for CHK Solution' ? 'WAITING FOR CHK' : item.name}
                        </span>
                      </div>
                      <span className={`text-lg font-semibold ${isDelayed ? 'text-red-600' : 'text-slate-600'}`}>
                        {item.percentage}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>

        {/* Aging por Faixa - Bar Chart */}
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Aging por Faixa</h3>
              <p className="text-sm text-muted-foreground">Distribuição por tempo de vida</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bucketData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              />
              <Bar dataKey="value" name="Casos" radius={[4, 4, 0, 0]}>
                {bucketData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={BUCKET_COLORS[entry.name as keyof typeof BUCKET_COLORS] || "#8884d8"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 - Horizontal Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Symptoms */}
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Top Sintomas</h3>
              <p className="text-sm text-muted-foreground">Sintomas mais frequentes</p>
            </div>
          </div>
          <div className="space-y-3">
            {(stats.topSymptoms || []).slice(0, 5).map((item: any, index: number) => {
              const maxCount = Math.max(...(stats.topSymptoms || []).map((s: any) => s.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]">{item.name}</span>
                    <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Suppliers */}
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Top Fornecedores</h3>
              <p className="text-sm text-muted-foreground">Fornecedores com mais ocorrências</p>
            </div>
          </div>
          <div className="space-y-3">
            {(stats.topSuppliers || []).slice(0, 5).map((item: any, index: number) => {
              const maxCount = Math.max(...(stats.topSuppliers || []).map((s: any) => s.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]">{item.name}</span>
                    <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Critical Cases Table */}
      {stats.criticalCasesList && stats.criticalCasesList.length > 0 && (
        <Card className="chart-container border-rose-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                Casos Críticos
              </h3>
              <p className="text-sm text-muted-foreground">Casos que requerem atenção imediata</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Série de Ocorrência</th>
                  <th>Fornecedor</th>
                  <th>Modelo</th>
                  <th>Sintoma</th>
                  <th>Status</th>
                  <th>Aging</th>
                </tr>
              </thead>
              <tbody>
                {stats.criticalCasesList.slice(0, 5).map((defect: any) => (
                  <tr 
                    key={defect.id} 
                    className="cursor-pointer"
                    onClick={() => setLocation(`/defects/${defect.id}`)}
                  >
                    <td className="font-medium">{defect.docNumber}</td>
                    <td>{defect.supplier || "-"}</td>
                    <td className="text-muted-foreground">{defect.model || "-"}</td>
                    <td className="max-w-[200px] truncate">{defect.symptom || "-"}</td>
                    <td>
                      <Badge className={`
                        ${defect.status === 'DELAYED' ? 'bg-rose-100 text-rose-700 border-rose-200' : ''}
                        ${defect.status === 'ONGOING' ? 'bg-sky-100 text-sky-700 border-sky-200' : ''}
                        ${defect.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}
                      `}>
                        {defect.status}
                      </Badge>
                    </td>
                    <td>
                      <span className="days-late-badge">{defect.agingTotal || 0} Dias</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* RCA Pareto Section */}
      {rcaData && rcaData && rcaData.topCauses && rcaData.topCauses.length > 0 && (
        <Card className="chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="chart-title">Pareto RCA</h3>
              <p className="text-sm text-muted-foreground">Análise de causa raiz - Princípio 80/20</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={rcaData.topCauses.slice(0, 8).map((item: any) => ({ category: item.cause, count: item.count, cumulativePercentage: parseFloat(item.cumulativePercentage) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Ocorrências" radius={[4, 4, 0, 0]} />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="cumulativePercentage" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                    name="% Acumulado"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm mb-3">Resumo</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Sintoma</th>
                    <th className="text-right py-2 font-medium">Qtd</th>
                    <th className="text-right py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rcaData.topCauses.slice(0, 5).map((item: any, index: number) => (
                    <tr key={index} className="border-b border-muted">
                      <td className="py-2 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          index === 0 ? 'bg-sky-500' : 
                          index === 1 ? 'bg-amber-500' : 
                          'bg-rose-500'
                        }`} />
                        <span className="truncate max-w-[100px]">{item.cause}</span>
                      </td>
                      <td className="text-right py-2">{item.count}</td>
                      <td className="text-right py-2">{item.cumulativePercentage}%</td>
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
