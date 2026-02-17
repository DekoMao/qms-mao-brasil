import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle, PieChart, BarChart3, LineChart } from "lucide-react";
import {
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart as RechartsLine, Line,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  INTERNAL_FAILURE: "#ef4444",
  EXTERNAL_FAILURE: "#f97316",
  APPRAISAL: "#3b82f6",
  PREVENTION: "#22c55e",
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  pt: {
    INTERNAL_FAILURE: "Falha Interna",
    EXTERNAL_FAILURE: "Falha Externa",
    APPRAISAL: "Avaliação",
    PREVENTION: "Prevenção",
  },
  en: {
    INTERNAL_FAILURE: "Internal Failure",
    EXTERNAL_FAILURE: "External Failure",
    APPRAISAL: "Appraisal",
    PREVENTION: "Prevention",
  },
};

function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export default function CopqDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "pt";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [supplierId, setSupplierId] = useState<number | undefined>(undefined);

  const { data: dashboard, isLoading } = trpc.copq.dashboard.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    supplierId,
  });

  const { data: suppliers } = trpc.supplier.list.useQuery();

  const catLabels = CATEGORY_LABELS[lang] || CATEGORY_LABELS.pt;

  const donutData = useMemo(() => {
    if (!dashboard) return [];
    return Object.entries(dashboard.totalByCategory)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: catLabels[key] || key,
        value,
        color: CATEGORY_COLORS[key] || "#94a3b8",
      }));
  }, [dashboard, catLabels]);

  const paretoData = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.topSuppliers.map((s: any) => ({
      name: s.name.length > 15 ? s.name.substring(0, 15) + "..." : s.name,
      total: s.total,
    }));
  }, [dashboard]);

  const trendData = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.monthlyTrend.map((m: any) => ({
      label: m.label,
      total: m.total,
      internalFailure: m.byCategory.INTERNAL_FAILURE || 0,
      externalFailure: m.byCategory.EXTERNAL_FAILURE || 0,
      appraisal: m.byCategory.APPRAISAL || 0,
      prevention: m.byCategory.PREVENTION || 0,
    }));
  }, [dashboard]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
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
          <h1 className="text-2xl font-bold">{lang === "pt" ? "Custo de Não-Qualidade (COPQ)" : "Cost of Poor Quality (COPQ)"}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {lang === "pt" ? "Análise financeira do impacto de defeitos" : "Financial impact analysis of defects"}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" placeholder="Data início" />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" placeholder="Data fim" />
          <Select value={supplierId ? String(supplierId) : "all"} onValueChange={(v) => setSupplierId(v === "all" ? undefined : Number(v))}>
            <SelectTrigger className="w-48"><SelectValue placeholder={lang === "pt" ? "Fornecedor" : "Supplier"} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === "pt" ? "Todos" : "All"}</SelectItem>
              {suppliers?.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10"><DollarSign className="h-5 w-5 text-red-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{lang === "pt" ? "COPQ Total" : "Total COPQ"}</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.totalCost || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10"><TrendingDown className="h-5 w-5 text-orange-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{catLabels.INTERNAL_FAILURE}</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.totalByCategory?.INTERNAL_FAILURE || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-5 w-5 text-yellow-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{catLabels.EXTERNAL_FAILURE}</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.totalByCategory?.EXTERNAL_FAILURE || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><TrendingUp className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-sm text-muted-foreground">{lang === "pt" ? "Custo Médio/Defeito" : "Avg Cost/Defect"}</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.avgCostPerDefect || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart - Distribution by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" />
              {lang === "pt" ? "Distribuição por Categoria" : "Distribution by Category"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {lang === "pt" ? "Nenhum custo registrado" : "No costs recorded"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pareto - Top 10 Suppliers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              {lang === "pt" ? "Top 10 Fornecedores por Custo" : "Top 10 Suppliers by Cost"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paretoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={paretoData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {lang === "pt" ? "Nenhum custo registrado" : "No costs recorded"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChart className="h-4 w-4" />
            {lang === "pt" ? "Tendência Mensal COPQ (12 meses)" : "Monthly COPQ Trend (12 months)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <RechartsLine data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="internalFailure" name={catLabels.INTERNAL_FAILURE} stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="externalFailure" name={catLabels.EXTERNAL_FAILURE} stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="appraisal" name={catLabels.APPRAISAL} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="prevention" name={catLabels.PREVENTION} stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </RechartsLine>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{lang === "pt" ? "Defeitos com Custo" : "Defects with Cost"}</p>
            <p className="text-3xl font-bold text-primary">{dashboard?.defectsWithCost || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{lang === "pt" ? "Defeitos sem Custo" : "Defects without Cost"}</p>
            <p className="text-3xl font-bold text-muted-foreground">{dashboard?.defectsWithoutCost || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{lang === "pt" ? "% Cobertos" : "% Covered"}</p>
            <p className="text-3xl font-bold text-green-500">
              {dashboard && (dashboard.defectsWithCost + dashboard.defectsWithoutCost) > 0
                ? ((dashboard.defectsWithCost / (dashboard.defectsWithCost + dashboard.defectsWithoutCost)) * 100).toFixed(1)
                : "0"}%
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
