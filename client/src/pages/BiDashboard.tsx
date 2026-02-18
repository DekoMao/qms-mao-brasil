import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Trash2, LayoutDashboard, BarChart3, PieChart, TrendingUp,
  Activity, Target, Gauge, Table2, Grid3X3, Share2, Edit, Save, X, RefreshCw
} from "lucide-react";

// ─── Widget Type & DataSource Definitions ──────────────────────
const WIDGET_TYPES = [
  { value: "KPI_CARD", label: "KPI Card", icon: Target },
  { value: "BAR_CHART", label: "Gráfico de Barras", icon: BarChart3 },
  { value: "LINE_CHART", label: "Gráfico de Linha", icon: TrendingUp },
  { value: "PIE_CHART", label: "Gráfico de Pizza", icon: PieChart },
  { value: "DONUT_CHART", label: "Gráfico Donut", icon: PieChart },
  { value: "GAUGE", label: "Gauge", icon: Gauge },
  { value: "TABLE", label: "Tabela", icon: Table2 },
  { value: "HEATMAP", label: "Heatmap", icon: Grid3X3 },
] as const;

const DATA_SOURCES = [
  { value: "DEFECT_COUNT", label: "Contagem de Defeitos", category: "Defeitos" },
  { value: "DEFECT_BY_STATUS", label: "Defeitos por Status", category: "Defeitos" },
  { value: "DEFECT_BY_SEVERITY", label: "Defeitos por Severidade", category: "Defeitos" },
  { value: "DEFECT_BY_SUPPLIER", label: "Defeitos por Fornecedor", category: "Defeitos" },
  { value: "DEFECT_BY_PLANT", label: "Defeitos por Planta", category: "Defeitos" },
  { value: "DEFECT_TREND", label: "Tendência de Defeitos", category: "Defeitos" },
  { value: "OPEN_VS_CLOSED", label: "Abertos vs Fechados", category: "Defeitos" },
  { value: "MONTHLY_COMPARISON", label: "Comparação Mensal", category: "Defeitos" },
  { value: "COPQ_TOTAL", label: "COPQ Total", category: "Custos" },
  { value: "COPQ_BY_CATEGORY", label: "COPQ por Categoria", category: "Custos" },
  { value: "COPQ_TREND", label: "Tendência COPQ", category: "Custos" },
  { value: "SLA_COMPLIANCE", label: "Compliance SLA", category: "SLA" },
  { value: "SLA_VIOLATIONS", label: "Violações SLA", category: "SLA" },
  { value: "SUPPLIER_SCORES", label: "Scores Fornecedores", category: "Fornecedores" },
  { value: "SUPPLIER_RANKING", label: "Ranking Fornecedores", category: "Fornecedores" },
  { value: "RESOLUTION_TIME", label: "Tempo de Resolução", category: "Performance" },
  { value: "RECURRENCE_RATE", label: "Taxa de Recorrência", category: "Performance" },
  { value: "TOP_ROOT_CAUSES", label: "Top Causas Raiz", category: "Performance" },
] as const;

// ─── Color Palette ─────────────────────────────────────────────
const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

// ─── Widget Renderer ───────────────────────────────────────────
function WidgetRenderer({ widget, onDelete }: { widget: any; onDelete: () => void }) {
  const { data, isLoading } = trpc.bi.resolveData.useQuery(
    { dataSource: widget.dataSource },
    { refetchInterval: (widget.refreshInterval || 300) * 1000 }
  );

  if (isLoading) {
    return (
      <Card className="h-full animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{widget.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full group relative">
      <Button
        variant="ghost" size="icon"
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
        onClick={onDelete}
      >
        <X className="h-3 w-3" />
      </Button>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        <CardDescription className="text-xs">
          {DATA_SOURCES.find(d => d.value === widget.dataSource)?.label}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {widget.widgetType === "KPI_CARD" && <KpiCard data={data} dataSource={widget.dataSource} />}
        {widget.widgetType === "BAR_CHART" && <BarChartWidget data={data} />}
        {widget.widgetType === "LINE_CHART" && <LineChartWidget data={data} />}
        {widget.widgetType === "PIE_CHART" && <PieChartWidget data={data} />}
        {widget.widgetType === "DONUT_CHART" && <DonutChartWidget data={data} />}
        {widget.widgetType === "GAUGE" && <GaugeWidget data={data} dataSource={widget.dataSource} />}
        {widget.widgetType === "TABLE" && <TableWidget data={data} />}
        {widget.widgetType === "HEATMAP" && <HeatmapWidget data={data} />}
      </CardContent>
    </Card>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────
function KpiCard({ data, dataSource }: { data: any; dataSource: string }) {
  if (!data) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  // Handle array vs single object
  const d = Array.isArray(data) ? data[0] : data;
  if (!d) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  const mainValue = d.total ?? d.count ?? d.entries ?? Object.values(d)[0];
  const secondaryEntries = Object.entries(d).filter(([k]) => k !== "total" && k !== "count" && k !== "entries");

  return (
    <div className="space-y-2">
      <div className="text-3xl font-bold text-primary">
        {typeof mainValue === "number" ? mainValue.toLocaleString("pt-BR") : String(mainValue)}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {secondaryEntries.slice(0, 4).map(([key, val]) => (
          <div key={key} className="text-xs">
            <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}: </span>
            <span className="font-medium">{typeof val === "number" ? val.toLocaleString("pt-BR") : String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bar Chart (CSS-based) ─────────────────────────────────────
function BarChartWidget({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (items.length === 0) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  const maxVal = Math.max(...items.map((d: any) => Number(d.count || d.total || d.defect_count || 0)));

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {items.slice(0, 10).map((item: any, i: number) => {
        const label = item.status || item.severity || item.supplier || item.plant || item.month || item.category || item.name || `Item ${i + 1}`;
        const value = Number(item.count || item.total || item.defect_count || 0);
        const pct = maxVal > 0 ? (value / maxVal) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20 truncate">{label}</span>
            <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
              />
            </div>
            <span className="text-xs font-medium w-10 text-right">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Line Chart (CSS-based sparkline) ──────────────────────────
function LineChartWidget({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (items.length === 0) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  const values = items.map((d: any) => Number(d.count || d.total || d.violations || 0));
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-32">
        {items.map((item: any, i: number) => {
          const value = Number(item.count || item.total || item.violations || 0);
          const height = maxVal > minVal ? ((value - minVal) / (maxVal - minVal)) * 100 : 50;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              <span className="text-[9px] font-medium">{value}</span>
              <div
                className="w-full rounded-t transition-all bg-primary/80 hover:bg-primary min-h-[2px]"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${item.month || i}: ${value}`}
              />
              <span className="text-[8px] text-muted-foreground truncate w-full text-center">
                {(item.month || "").slice(-2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pie Chart (CSS-based) ─────────────────────────────────────
function PieChartWidget({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (items.length === 0) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  const total = items.reduce((sum: number, d: any) => sum + Number(d.count || d.total || 0), 0);

  return (
    <div className="space-y-2">
      {items.slice(0, 6).map((item: any, i: number) => {
        const label = item.status || item.severity || item.category || item.name || `Item ${i + 1}`;
        const value = Number(item.count || item.total || 0);
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-xs flex-1 truncate">{label}</span>
            <span className="text-xs font-medium">{pct}%</span>
            <span className="text-xs text-muted-foreground">({value})</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Donut Chart ───────────────────────────────────────────────
function DonutChartWidget({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (items.length === 0) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  const total = items.reduce((sum: number, d: any) => sum + Number(d.count || d.total || 0), 0);
  let cumulativePct = 0;

  // Build conic gradient
  const gradientParts = items.slice(0, 8).map((item: any, i: number) => {
    const value = Number(item.count || item.total || 0);
    const pct = total > 0 ? (value / total) * 100 : 0;
    const start = cumulativePct;
    cumulativePct += pct;
    return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${cumulativePct}%`;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-24 h-24 rounded-full flex-shrink-0 relative"
        style={{
          background: `conic-gradient(${gradientParts.join(", ")})`,
        }}
      >
        <div className="absolute inset-3 bg-card rounded-full flex items-center justify-center">
          <span className="text-sm font-bold">{total}</span>
        </div>
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        {items.slice(0, 5).map((item: any, i: number) => {
          const label = item.status || item.severity || item.category || item.name || `Item ${i + 1}`;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-[10px] truncate">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Gauge Widget ──────────────────────────────────────────────
function GaugeWidget({ data, dataSource }: { data: any; dataSource: string }) {
  const d = Array.isArray(data) ? data[0] : data;
  if (!d) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  let percentage = 0;
  let label = "";

  if (dataSource === "SLA_COMPLIANCE") {
    const total = Number(d.total || 0);
    const onTime = Number(d.on_time || 0);
    percentage = total > 0 ? (onTime / total) * 100 : 0;
    label = `${percentage.toFixed(1)}% On-Time`;
  } else {
    const mainVal = Number(d.total ?? d.count ?? Object.values(d)[0] ?? 0);
    percentage = Math.min(mainVal, 100);
    label = String(mainVal);
  }

  const rotation = (percentage / 100) * 180;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <div className="absolute w-32 h-32 rounded-full border-8 border-muted" style={{ borderTopColor: "transparent", borderRightColor: "transparent" }} />
        <div
          className="absolute w-32 h-32 rounded-full border-8 border-transparent"
          style={{
            borderBottomColor: percentage > 80 ? "#22c55e" : percentage > 50 ? "#f59e0b" : "#ef4444",
            borderLeftColor: percentage > 50 ? (percentage > 80 ? "#22c55e" : "#f59e0b") : "transparent",
            transform: `rotate(${rotation}deg)`,
            transition: "transform 0.5s ease",
          }}
        />
      </div>
      <span className="text-lg font-bold mt-1">{label}</span>
    </div>
  );
}

// ─── Table Widget ──────────────────────────────────────────────
function TableWidget({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : data ? [data] : [];
  if (items.length === 0) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  const columns = Object.keys(items[0]);

  return (
    <div className="overflow-auto max-h-48">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b">
            {columns.map(col => (
              <th key={col} className="text-left py-1 px-1.5 font-medium capitalize text-muted-foreground">
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 10).map((row: any, i: number) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/50">
              {columns.map(col => (
                <td key={col} className="py-1 px-1.5">
                  {typeof row[col] === "number" ? row[col].toLocaleString("pt-BR") : String(row[col] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Heatmap Widget ────────────────────────────────────────────
function HeatmapWidget({ data }: { data: any }) {
  const items = Array.isArray(data) ? data : [];
  if (items.length === 0) return <p className="text-muted-foreground text-sm">Sem dados</p>;

  const maxVal = Math.max(...items.map((d: any) => Number(d.count || d.total || 0)), 1);

  return (
    <div className="grid grid-cols-4 gap-1">
      {items.slice(0, 12).map((item: any, i: number) => {
        const value = Number(item.count || item.total || 0);
        const intensity = value / maxVal;
        const label = item.month || item.symptom || item.category || `${i + 1}`;
        return (
          <div
            key={i}
            className="p-1.5 rounded text-center text-[10px]"
            style={{
              backgroundColor: `rgba(239, 68, 68, ${0.1 + intensity * 0.8})`,
              color: intensity > 0.5 ? "white" : "inherit",
            }}
            title={`${label}: ${value}`}
          >
            <div className="truncate">{label}</div>
            <div className="font-bold">{value}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Widget Dialog ─────────────────────────────────────────
function AddWidgetDialog({
  dashboardId,
  onAdded,
  widgetCount,
}: {
  dashboardId: number;
  onAdded: () => void;
  widgetCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [widgetType, setWidgetType] = useState("KPI_CARD");
  const [dataSource, setDataSource] = useState("DEFECT_COUNT");

  const createWidget = trpc.bi.createWidget.useMutation({
    onSuccess: () => {
      toast.success("Widget adicionado!");
      setOpen(false);
      setTitle("");
      onAdded();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAdd = () => {
    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    // Auto-position: 2 columns layout
    const col = widgetCount % 2;
    const row = Math.floor(widgetCount / 2);
    createWidget.mutate({
      dashboardId,
      widgetType,
      title: title.trim(),
      dataSource,
      position: { x: col * 6, y: row * 4, w: 6, h: 4 },
    });
  };

  const groupedSources = useMemo(() => {
    const groups: Record<string, typeof DATA_SOURCES[number][]> = {};
    DATA_SOURCES.forEach(ds => {
      if (!groups[ds.category]) groups[ds.category] = [];
      groups[ds.category].push(ds);
    });
    return groups;
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Widget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Total de Defeitos Abertos" />
          </div>
          <div>
            <Label>Tipo de Visualização</Label>
            <Select value={widgetType} onValueChange={setWidgetType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WIDGET_TYPES.map(wt => (
                  <SelectItem key={wt.value} value={wt.value}>
                    <div className="flex items-center gap-2">
                      <wt.icon className="h-4 w-4" />
                      {wt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fonte de Dados</Label>
            <Select value={dataSource} onValueChange={setDataSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(groupedSources).map(([group, sources]) => (
                  <div key={group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>
                    {sources.map(ds => (
                      <SelectItem key={ds.value} value={ds.value}>{ds.label}</SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={createWidget.isPending}>
            {createWidget.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main BI Dashboard Page ────────────────────────────────────
export default function BiDashboard() {
  const { user } = useAuth();
  const [selectedDashboard, setSelectedDashboard] = useState<number | null>(null);
  const [newDashName, setNewDashName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const dashboardsQuery = trpc.bi.dashboards.useQuery();
  const widgetsQuery = trpc.bi.widgets.useQuery(
    { dashboardId: selectedDashboard! },
    { enabled: !!selectedDashboard }
  );

  const createDashboard = trpc.bi.createDashboard.useMutation({
    onSuccess: (data) => {
      toast.success("Dashboard criado!");
      dashboardsQuery.refetch();
      setSelectedDashboard(data.id);
      setCreateOpen(false);
      setNewDashName("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteDashboard = trpc.bi.deleteDashboard.useMutation({
    onSuccess: () => {
      toast.success("Dashboard removido");
      setSelectedDashboard(null);
      dashboardsQuery.refetch();
    },
  });

  const deleteWidget = trpc.bi.deleteWidget.useMutation({
    onSuccess: () => {
      toast.success("Widget removido");
      widgetsQuery.refetch();
    },
  });

  const dashboards = dashboardsQuery.data || [];

  // Auto-select first dashboard
  if (dashboards.length > 0 && selectedDashboard === null) {
    setSelectedDashboard(dashboards[0].id);
  }

  const activeDash = dashboards.find(d => d.id === selectedDashboard);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            BI Embeddido
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dashboards customizáveis com widgets de dados em tempo real
          </p>
        </div>
      </div>

      {/* Dashboard Tabs + Create */}
      <div className="flex items-center gap-2 flex-wrap">
        {dashboards.map(dash => (
          <Button
            key={dash.id}
            variant={selectedDashboard === dash.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDashboard(dash.id)}
            className="gap-1.5"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            {dash.name}
            {dash.isShared && <Share2 className="h-3 w-3 text-blue-400" />}
          </Button>
        ))}

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 border-dashed">
              <Plus className="h-4 w-4" /> Novo Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input
                  value={newDashName}
                  onChange={e => setNewDashName(e.target.value)}
                  placeholder="Ex: Visão Geral Qualidade"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => createDashboard.mutate({ name: newDashName })}
                disabled={!newDashName.trim() || createDashboard.isPending}
              >
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Dashboard */}
      {activeDash ? (
        <div className="space-y-4">
          {/* Dashboard Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{activeDash.name}</h2>
              {activeDash.description && (
                <p className="text-sm text-muted-foreground">{activeDash.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <AddWidgetDialog
                dashboardId={activeDash.id}
                onAdded={() => widgetsQuery.refetch()}
                widgetCount={widgetsQuery.data?.length || 0}
              />
              <Button
                variant="outline" size="sm"
                onClick={() => widgetsQuery.refetch()}
                className="gap-1.5"
              >
                <RefreshCw className="h-4 w-4" /> Atualizar
              </Button>
              <Button
                variant="destructive" size="sm"
                onClick={() => {
                  if (confirm("Remover este dashboard?")) {
                    deleteDashboard.mutate({ id: activeDash.id });
                  }
                }}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Remover
              </Button>
            </div>
          </div>

          {/* Widget Grid */}
          {widgetsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="h-48 animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                    <div className="h-24 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (widgetsQuery.data?.length || 0) === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Dashboard vazio</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Adicione widgets para visualizar seus dados de qualidade
                </p>
                <AddWidgetDialog
                  dashboardId={activeDash.id}
                  onAdded={() => widgetsQuery.refetch()}
                  widgetCount={0}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgetsQuery.data?.map((widget: any) => (
                <WidgetRenderer
                  key={widget.id}
                  widget={widget}
                  onDelete={() => deleteWidget.mutate({ id: widget.id })}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Bem-vindo ao BI Embeddido</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Crie dashboards personalizados com widgets de KPI, gráficos, tabelas e heatmaps
              para monitorar seus indicadores de qualidade em tempo real.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Criar Primeiro Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
