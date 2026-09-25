export type LocalInsightIntent =
  | "overview"
  | "supplier_aging"
  | "sla"
  | "triage_accuracy"
  | "trend"
  | "unsupported";

export type LocalInsightCard = {
  id: string;
  title: string;
  value: string;
  explanation: string;
  focusId?: string;
};

export type LocalChartSpec = {
  type: "bar" | "kpi";
  title: string;
  data: Array<{ label: string; value: number }>;
  color: "violet" | "teal" | "gold" | "red";
};

export type LocalInsightResult = {
  answer: string;
  intent: LocalInsightIntent;
  cards: LocalInsightCard[];
  chart?: LocalChartSpec;
  focusIds: string[];
  execution: "rules";
  confidence: number;
  sourceLabel: string;
};

type DashboardStats = {
  total?: number;
  criticalCases?: number;
  byStatus?: Record<string, number>;
  topSuppliers?: Array<{ name: string; count: number }>;
  weeklyTrend?: Array<{ weekKey: string; total: number; closed: number; delayed: number }>;
};

type AccuracyPoint = { accuracy?: number; week?: string; weekKey?: string };

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const percent = (value: number) => `${Math.round(value)}%`;

export function analyzeLocalQualityQuestion(question: string, stats?: DashboardStats | null, accuracyTrend?: AccuracyPoint[] | null): LocalInsightResult {
  const text = normalize(question);
  const total = stats?.total ?? 0;
  const delayed = stats?.byStatus?.DELAYED ?? 0;
  const closed = stats?.byStatus?.CLOSED ?? 0;
  const critical = stats?.criticalCases ?? 0;
  const delayedPct = total > 0 ? (delayed / total) * 100 : 0;
  const closedPct = total > 0 ? (closed / total) * 100 : 0;
  const latestAccuracy = accuracyTrend?.at(-1)?.accuracy;

  if (text.includes("fornecedor") || text.includes("supplier")) {
    const suppliers = [...(stats?.topSuppliers ?? [])].sort((a, b) => b.count - a.count).slice(0, 5);
    const leader = suppliers[0];
    return {
      answer: leader ? `O fornecedor com maior concentração de defeitos é ${leader.name}, com ${leader.count} ocorrência(s).` : "Não há dados de fornecedores suficientes para esta análise.",
      intent: "supplier_aging",
      cards: suppliers.map((supplier) => ({ id: `supplier-${supplier.name}`, title: supplier.name, value: String(supplier.count), explanation: "Ocorrências no período selecionado.", focusId: "top-suppliers" })),
      chart: suppliers.length > 0 ? { type: "bar", title: "Concentração por fornecedor", data: suppliers.map((supplier) => ({ label: supplier.name, value: supplier.count })), color: "gold" } : undefined,
      focusIds: ["top-suppliers"], execution: "rules", confidence: suppliers.length > 0 ? 0.98 : 0.4, sourceLabel: "Top fornecedores do Dashboard",
    };
  }

  if (text.includes("acuracia") || text.includes("triage") || text.includes("classificacao")) {
    return {
      answer: latestAccuracy === undefined ? "Ainda não há uma medição semanal de acurácia disponível." : `A acurácia mais recente do Triage Agent está em ${percent(latestAccuracy)}. A meta operacional é 90%.`,
      intent: "triage_accuracy",
      cards: [{ id: "triage-accuracy", title: "Acurácia Triage Agent", value: latestAccuracy === undefined ? "—" : percent(latestAccuracy), explanation: "Último ponto disponível na tendência semanal.", focusId: "triage-accuracy" }],
      chart: latestAccuracy === undefined ? undefined : { type: "kpi", title: "Última acurácia semanal", data: [{ label: "Acurácia", value: latestAccuracy }], color: latestAccuracy < 75 ? "red" : latestAccuracy < 90 ? "gold" : "teal" },
      focusIds: ["triage-accuracy"], execution: "rules", confidence: latestAccuracy === undefined ? 0.6 : 0.99, sourceLabel: "Tendência semanal de acurácia",
    };
  }

  if (text.includes("sla") || text.includes("atras") || text.includes("delayed")) {
    return {
      answer: `Existem ${delayed} caso(s) atrasado(s), representando ${percent(delayedPct)} do total.`,
      intent: "sla",
      cards: [
        { id: "delayed-cases", title: "Casos atrasados", value: String(delayed), explanation: "Status DELAYED no período.", focusId: "status-overview" },
        { id: "critical-cases", title: "Casos críticos", value: String(critical), explanation: "Aging elevado ou status atrasado.", focusId: "critical-kpi" },
      ],
      chart: { type: "bar", title: "Risco operacional", data: [{ label: "Atrasados", value: delayed }, { label: "Críticos", value: critical }], color: "red" },
      focusIds: ["status-overview", "critical-kpi"], execution: "rules", confidence: 0.98, sourceLabel: "Status e aging do Dashboard",
    };
  }

  if (text.includes("evolucao") || text.includes("tendencia") || text.includes("semanal")) {
    const recent = stats?.weeklyTrend?.at(-1);
    return {
      answer: recent ? `Na última semana disponível foram registrados ${recent.total} defeito(s), com ${recent.closed} encerrado(s) e ${recent.delayed} atrasado(s).` : "Ainda não há dados semanais suficientes para identificar uma tendência.",
      intent: "trend",
      cards: [{ id: "weekly-trend", title: "Tendência semanal", value: recent ? String(recent.total) : "—", explanation: "Total de defeitos na última semana disponível.", focusId: "weekly-trend" }],
      chart: recent ? { type: "bar", title: "Última semana", data: [{ label: "Total", value: recent.total }, { label: "Encerrados", value: recent.closed }, { label: "Atrasados", value: recent.delayed }], color: "teal" } : undefined,
      focusIds: ["weekly-trend"], execution: "rules", confidence: recent ? 0.95 : 0.5, sourceLabel: "Série semanal do Dashboard",
    };
  }

  return {
    answer: `Panorama atual: ${total} defeito(s), ${closed} encerrado(s) (${percent(closedPct)}) e ${critical} caso(s) crítico(s). Posso detalhar fornecedores, SLA, tendência semanal ou acurácia do Triage Agent.`,
    intent: "overview",
    cards: [
      { id: "total-defects", title: "Total de defeitos", value: String(total), explanation: "Registros no período selecionado.", focusId: "total-defects" },
      { id: "closed-defects", title: "Encerrados", value: percent(closedPct), explanation: "Proporção de defeitos com status CLOSED.", focusId: "status-overview" },
      { id: "critical-defects", title: "Críticos", value: String(critical), explanation: "Casos com aging elevado ou atraso.", focusId: "critical-kpi" },
    ],
    chart: { type: "kpi", title: "Resumo do período", data: [{ label: "Total", value: total }, { label: "Críticos", value: critical }], color: "violet" },
    focusIds: ["total-defects", "status-overview", "critical-kpi"], execution: "rules", confidence: 0.94, sourceLabel: "KPIs do Dashboard",
  };
}
