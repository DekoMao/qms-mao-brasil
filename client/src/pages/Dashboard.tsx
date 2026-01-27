import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Package, Users } from "lucide-react";

const COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6"];
const BUCKET_COLORS = {
  "<=4": "#22c55e",
  "5-14": "#3b82f6", 
  "15-29": "#f59e0b",
  "30-59": "#f97316",
  ">60": "#ef4444"
};

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.defect.stats.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-64 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>;
  }

  // Prepare chart data
  const statusData = Object.entries(stats.byStatus || {}).map(([name, value]) => ({ name, value }));
  const bucketData = Object.entries(stats.byBucketAging || {}).map(([name, value]) => ({ name, value }));
  const stepData = Object.entries(stats.byStep || {}).map(([name, value]) => ({ 
    name: name.replace("Aguardando ", "").substring(0, 15), 
    value 
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registros no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Casos Fechados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.byStatus?.CLOSED || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round(((stats.byStatus?.CLOSED || 0) / stats.total) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.byStatus?.ONGOING || 0}</div>
            <p className="text-xs text-muted-foreground">Casos ativos</p>
          </CardContent>
        </Card>

        <Card className={stats.criticalCases > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Casos Críticos</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.criticalCases > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.criticalCases > 0 ? "text-red-600" : ""}`}>
              {stats.criticalCases}
            </div>
            <p className="text-xs text-muted-foreground">DELAYED ou Aging &gt; 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Visão geral dos casos por status atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Aging Buckets */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Aging</CardTitle>
            <CardDescription>Faixas de tempo de vida dos casos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bucketData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Casos">
                  {bucketData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BUCKET_COLORS[entry.name as keyof typeof BUCKET_COLORS] || "#8884d8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Symptoms */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Sintomas</CardTitle>
            <CardDescription>Sintomas mais frequentes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.topSymptoms} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Ocorrências" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Fornecedores</CardTitle>
            <CardDescription>Fornecedores com mais ocorrências</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.topSuppliers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Ocorrências" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      {stats.weeklyTrend && stats.weeklyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência Semanal
            </CardTitle>
            <CardDescription>Evolução dos casos por semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.weeklyTrend.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekKey" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8884d8" name="Total" strokeWidth={2} />
                <Line type="monotone" dataKey="closed" stroke="#22c55e" name="Fechados" />
                <Line type="monotone" dataKey="ongoing" stroke="#3b82f6" name="Em Andamento" />
                <Line type="monotone" dataKey="delayed" stroke="#ef4444" name="Atrasados" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Critical Cases List */}
      {stats.criticalCasesList && stats.criticalCasesList.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Casos Críticos (Top 10)
            </CardTitle>
            <CardDescription>Casos que requerem atenção imediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doc Number</th>
                    <th>Fornecedor</th>
                    <th>Sintoma</th>
                    <th>Status</th>
                    <th>Aging Total</th>
                    <th>Dias Atrasado</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.criticalCasesList.map((defect: any) => (
                    <tr key={defect.id}>
                      <td className="font-medium">{defect.docNumber}</td>
                      <td>{defect.supplier || "-"}</td>
                      <td className="max-w-[200px] truncate">{defect.symptom || "-"}</td>
                      <td>
                        <Badge variant={defect.status === "DELAYED" ? "destructive" : "secondary"}>
                          {defect.status}
                        </Badge>
                      </td>
                      <td className="font-medium">{defect.agingTotal} dias</td>
                      <td className={defect.daysLate > 0 ? "text-red-600 font-medium" : ""}>
                        {defect.daysLate > 0 ? `${defect.daysLate} dias` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Steps Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Etapa do Workflow</CardTitle>
          <CardDescription>Casos em cada etapa do processo 8D</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stepData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" name="Casos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
