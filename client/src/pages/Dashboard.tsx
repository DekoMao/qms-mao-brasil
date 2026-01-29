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
  ArrowUpRight, RefreshCw, Info
} from "lucide-react";
import { useLocation } from "wouter";

// Professional color palette - SDD-UX compliant
const STATUS_COLORS = {
  CLOSED: "#4ade80",
  ONGOING: "#3b82f6",
  DELAYED: "#ef4444",
  "Waiting for CHK Solution": "#f59e0b"
};

const AGING_COLORS = {
  "<1 day": "#3b82f6",
  "1-7 days": "#f59e0b",
  "8-14 days": "#f97316",
  ">14d": "#ef4444",
  "<=4": "#3b82f6",
  "5-14": "#f59e0b", 
  "15-29": "#f97316",
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
    <div className="space-y-6 animate-fade-in bg-slate-50/30 min-h-screen -m-6 p-6">
      {/* Header Row - KPI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Lista de Defeitos Card */}
        <Card className="lg:col-span-5 bg-white border-0 shadow-sm">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-slate-800">Lista de Defectes</h2>
            <p className="text-sm text-slate-500 mt-1">Total defects in the list, Defeitos ou qualificador</p>
          </div>
        </Card>

        {/* Defects KPI */}
        <Card className="lg:col-span-2 bg-white border-0 shadow-sm">
          <div className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Defects
            </div>
            <p className="text-3xl font-bold text-sky-600 mt-2">{stats.byStatus?.CLOSED || 0}</p>
          </div>
        </Card>

        {/* Criticas KPI */}
        <Card className="lg:col-span-2 bg-white border-0 shadow-sm">
          <div className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Criticas
            </div>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{stats.criticalCases}</p>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="lg:col-span-3 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setLocation("/defects")} className="bg-blue-600 hover:bg-blue-700">
            View Details
          </Button>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Overview - SDD-UX Design */}
        <Card className="bg-white border-0 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800">Status Overview</h3>
            <p className="text-sm text-slate-500">
              Last update: {new Date().toLocaleDateString('pt-BR')} · Total items: {stats.total}
            </p>
          </div>
          <div className="px-6 pb-6 flex items-center gap-8">
            {/* Donut Chart with Center KPI */}
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
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
            
            {/* Status Cards */}
            <div className="flex-1 space-y-3">
              {statusData
                .filter(item => item.name !== 'CLOSED')
                .sort((a, b) => {
                  if (a.name === 'ONGOING') return -1;
                  if (b.name === 'ONGOING') return 1;
                  if (a.name === 'DELAYED') return -1;
                  if (b.name === 'DELAYED') return 1;
                  return 0;
                })
                .map((item) => {
                  const isDelayed = item.name === 'DELAYED';
                  const bgColor = isDelayed ? 'bg-red-50' : 'bg-white';
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
                          <Info className="w-5 h-5 text-red-500" />
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

        {/* Aging per Phase - Bar Chart */}
        <Card className="bg-white border-0 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800">Aging per Phase</h3>
            <p className="text-sm text-slate-500">Distribution of defects by time in days</p>
          </div>
          <div className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bucketData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value}%`}
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
                      fill={AGING_COLORS[entry.name as keyof typeof AGING_COLORS] || "#f97316"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts Row 2 - Top Systems & Top Fornecedores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sintomas */}
        <Card className="bg-white border-0 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800">Top Systems</h3>
            <p className="text-sm text-slate-500">Top percentage of defects by system</p>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {(stats.topSymptoms || []).slice(0, 5).map((item: any, index: number) => {
              const maxCount = Math.max(...(stats.topSymptoms || []).map((s: any) => s.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]">{item.name}</span>
                    <span className="text-slate-500 font-medium">{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: index === 0 ? '#3b82f6' : index === 1 ? '#22c55e' : index === 2 ? '#f97316' : index === 3 ? '#06b6d4' : '#8b5cf6'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Fornecedores */}
        <Card className="bg-white border-0 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800">Top Fornecedores</h3>
            <p className="text-sm text-slate-500">Suppliers with the highest percentage of defects</p>
          </div>
          <div className="px-6 pb-6 space-y-4">
            {(stats.topSuppliers || []).slice(0, 5).map((item: any, index: number) => {
              const maxCount = Math.max(...(stats.topSuppliers || []).map((s: any) => s.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 truncate max-w-[200px]">{item.name}</span>
                    <span className="text-slate-500 font-medium">{Math.round(percentage)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
        <Card className="bg-white border-0 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800">Critical Cases</h3>
            <p className="text-sm text-slate-500">Critical systems that require immediate attention</p>
          </div>
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 font-medium text-slate-500 uppercase text-xs">Instalação</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-500 uppercase text-xs">Equipamento</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-500 uppercase text-xs">Tipo Virus</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-500 uppercase text-xs">Detalhe</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-500 uppercase text-xs">Sistema</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-500 uppercase text-xs">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-500 uppercase text-xs">Tempo Atrás</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.criticalCasesList.slice(0, 5).map((defect: any) => (
                    <tr 
                      key={defect.id} 
                      className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setLocation(`/defects/${defect.id}`)}
                    >
                      <td className="py-3 px-2 font-medium text-slate-700">{defect.docNumber}</td>
                      <td className="py-3 px-2 text-slate-600">{defect.model || "N/A"}</td>
                      <td className="py-3 px-2 text-slate-600">{defect.symptom?.split(' ')[0] || "N/A"}</td>
                      <td className="py-3 px-2 text-slate-600">{defect.symptom?.split(' ').slice(1).join(' ') || "N/A"}</td>
                      <td className="py-3 px-2 text-slate-600">{defect.supplier || "N/A"}</td>
                      <td className="py-3 px-2">
                        <Badge className={`text-xs font-medium ${
                          defect.status === 'DELAYED' ? 'bg-rose-500 text-white hover:bg-rose-500' : 
                          defect.status === 'CLOSED' ? 'bg-amber-500 text-white hover:bg-amber-500' : 
                          'bg-sky-500 text-white hover:bg-sky-500'
                        }`}>
                          {defect.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-slate-500">{defect.agingTotal || 0} dias ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* RCA Pareto Section */}
      {rcaData && rcaData.topCauses && rcaData.topCauses.length > 0 && (
        <Card className="bg-white border-0 shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-800">Non Compliance Cases</h3>
            <p className="text-sm text-slate-500">Non compliant cases - Weekly breakdown since April 24</p>
          </div>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={250}>
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
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 font-medium text-slate-500 text-xs">Tnenala</th>
                      <th className="text-right py-2 font-medium text-slate-500 text-xs">Qai</th>
                      <th className="text-right py-2 font-medium text-slate-500 text-xs">% voda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rcaData.topCauses.slice(0, 5).map((item: any, index: number) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="py-2 text-slate-700">{item.cause}</td>
                        <td className="text-right py-2 text-slate-600">{item.count}</td>
                        <td className="text-right py-2 text-slate-600">{item.cumulativePercentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
