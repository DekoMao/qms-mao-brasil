import { z } from "zod";

export const chartPointSchema = z.object({
  label: z.string().min(1).max(100),
  value: z.number().finite(),
  secondaryValue: z.number().finite().optional(),
});

export const localChartSpecSchema = z.object({
  type: z.enum(["bar", "line", "area", "pie", "kpi", "table"]),
  title: z.string().min(1).max(120),
  data: z.array(chartPointSchema).max(30),
  color: z.enum(["violet", "teal", "gold", "red"]),
  valueLabel: z.string().max(60).optional(),
  secondaryLabel: z.string().max(60).optional(),
  unit: z.string().max(12).optional(),
});

export type LocalChartSpec = z.infer<typeof localChartSpecSchema>;
export type LocalInsightIntent = "overview" | "supplier_aging" | "sla" | "triage_accuracy" | "trend" | "severity_supplier" | "root_cause" | "pareto" | "unsupported";
export type LocalExecution = "rules" | "local-wasm" | "local-webgpu";

export type LocalInsightCard = {
  id: string;
  title: string;
  value: string;
  explanation: string;
  focusId?: string;
};

export type InsightEvidence = {
  label: string;
  value: string;
  calculation: string;
};

export type DashboardStats = {
  total?: number;
  criticalCases?: number;
  byStatus?: Record<string, number>;
  topSuppliers?: Array<{ name: string; count: number }>;
  supplierMetrics?: Array<{ name: string; total: number; averageAging: number; critical: number; severities: Record<string, number> }>;
  weeklyTrend?: Array<{ weekKey: string; total: number; closed: number; ongoing?: number; delayed: number }>;
};

export type AccuracyPoint = { accuracy?: number; week?: string; weekKey?: string };
export type RootCausePoint = { cause: string; count: number; cumulativePercentage?: string | number };

export type LocalAnalyticsSnapshot = {
  id: string;
  capturedAt: string;
  tenantId?: number | null;
  filters: { dateFrom?: string; dateTo?: string };
  stats?: DashboardStats | null;
  accuracyTrend?: AccuracyPoint[] | null;
  topCauses?: RootCausePoint[] | null;
};

export type LocalInsightResult = {
  answer: string;
  intent: LocalInsightIntent;
  cards: LocalInsightCard[];
  chart?: LocalChartSpec;
  focusIds: string[];
  execution: LocalExecution;
  confidence: number;
  sourceLabel: string;
  modelName?: string;
  evidence: InsightEvidence[];
  snapshot: Pick<LocalAnalyticsSnapshot, "id" | "capturedAt" | "filters">;
  latencyMs: number;
  suggestions?: string[];
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const percent = (value: number) => `${Math.round(value)}%`;
const snapshotMeta = (snapshot: LocalAnalyticsSnapshot) => ({ id: snapshot.id, capturedAt: snapshot.capturedAt, filters: snapshot.filters });

export function detectIntent(question: string): LocalInsightIntent {
  const text = normalize(question);
  if ((text.includes("causa") && text.includes("raiz")) || text.includes("root cause")) return "root_cause";
  if (text.includes("pareto")) return "pareto";
  if (text.includes("severidade") && (text.includes("fornecedor") || text.includes("supplier"))) return "severity_supplier";
  if ((text.includes("fornecedor") || text.includes("supplier")) && (text.includes("aging") || text.includes("idade") || text.includes("tempo"))) return "supplier_aging";
  if (text.includes("fornecedor") || text.includes("supplier")) return "supplier_aging";
  if (text.includes("acuracia") || text.includes("triage") || text.includes("classificacao")) return "triage_accuracy";
  if (text.includes("sla") || text.includes("atras") || text.includes("delayed")) return "sla";
  if (text.includes("evolucao") || text.includes("tendencia") || text.includes("semanal")) return "trend";
  if (text.includes("panorama") || text.includes("resumo") || text.includes("geral") || text.includes("defeito")) return "overview";
  return "unsupported";
}

export function analyzeLocalQualityQuestion(question: string, snapshot: LocalAnalyticsSnapshot, forcedIntent?: LocalInsightIntent): LocalInsightResult {
  const startedAt = performance.now();
  const intent = forcedIntent && forcedIntent !== "unsupported" ? forcedIntent : detectIntent(question);
  const stats = snapshot.stats;
  const total = stats?.total ?? 0;
  const delayed = stats?.byStatus?.DELAYED ?? 0;
  const closed = stats?.byStatus?.CLOSED ?? 0;
  const critical = stats?.criticalCases ?? 0;
  const delayedPct = total > 0 ? (delayed / total) * 100 : 0;
  const closedPct = total > 0 ? (closed / total) * 100 : 0;
  const latestAccuracy = snapshot.accuracyTrend?.at(-1)?.accuracy;
  const base = { execution: "rules" as const, snapshot: snapshotMeta(snapshot), latencyMs: 0 };
  const done = (result: Omit<LocalInsightResult, keyof typeof base>): LocalInsightResult => ({ ...result, ...base, latencyMs: Math.round((performance.now() - startedAt) * 10) / 10 });

  if (intent === "supplier_aging") {
    const suppliers = [...(stats?.supplierMetrics ?? [])].sort((a, b) => b.averageAging - a.averageAging).slice(0, 5);
    const leader = suppliers[0];
    return done({
      answer: leader ? `${leader.name} apresenta o maior aging médio: ${leader.averageAging} dias em ${leader.total} ocorrência(s).` : "Não há dados de aging por fornecedor suficientes para esta análise.",
      intent,
      cards: suppliers.map((item) => ({ id: `supplier-${item.name}`, title: item.name, value: `${item.averageAging} dias`, explanation: `${item.total} ocorrência(s), ${item.critical} crítica(s).`, focusId: "top-suppliers" })),
      chart: suppliers.length ? localChartSpecSchema.parse({ type: "bar", title: "Aging médio por fornecedor", data: suppliers.map((item) => ({ label: item.name, value: item.averageAging })), color: "gold", valueLabel: "Aging médio", unit: "dias" }) : undefined,
      focusIds: ["top-suppliers"], confidence: suppliers.length ? 0.99 : 0.35, sourceLabel: "Agregação local por fornecedor",
      evidence: leader ? [{ label: "Maior aging médio", value: `${leader.averageAging} dias`, calculation: `Soma do aging ÷ ${leader.total} ocorrência(s) de ${leader.name}` }] : [],
    });
  }

  if (intent === "severity_supplier") {
    const suppliers = (stats?.supplierMetrics ?? []).slice(0, 8);
    const rows = suppliers.map((item) => ({ label: item.name, value: (item.severities.S ?? 0) + (item.severities.A ?? 0), secondaryValue: item.total }));
    const leader = [...rows].sort((a, b) => b.value - a.value)[0];
    return done({
      answer: leader ? `${leader.label} concentra ${leader.value} ocorrência(s) de severidade S/A entre ${leader.secondaryValue} registro(s).` : "Não há severidade por fornecedor suficiente para comparação.",
      intent, cards: rows.slice(0, 4).map((row) => ({ id: `severity-${row.label}`, title: row.label, value: String(row.value), explanation: `Severidade S/A de ${row.secondaryValue} ocorrência(s).`, focusId: "top-suppliers" })),
      chart: rows.length ? localChartSpecSchema.parse({ type: "bar", title: "Severidade alta por fornecedor", data: rows, color: "red", valueLabel: "S/A", secondaryLabel: "Total" }) : undefined,
      focusIds: ["top-suppliers"], confidence: rows.length ? 0.96 : 0.35, sourceLabel: "Severidade agregada por fornecedor",
      evidence: leader ? [{ label: "Maior concentração S/A", value: `${leader.value}`, calculation: "Contagem de registros classificados como S ou A" }] : [],
    });
  }

  if (intent === "root_cause" || intent === "pareto") {
    const causes = (snapshot.topCauses ?? []).slice(0, intent === "pareto" ? 10 : 5);
    const leader = causes[0];
    return done({
      answer: leader ? `${leader.cause} é a causa raiz mais frequente, com ${leader.count} ocorrência(s).` : "Não há causas raiz classificadas no período.",
      intent, cards: causes.slice(0, 4).map((item) => ({ id: `cause-${item.cause}`, title: item.cause, value: String(item.count), explanation: `${item.cumulativePercentage ?? 0}% acumulado.`, focusId: "pareto-rca" })),
      chart: causes.length ? localChartSpecSchema.parse({ type: intent === "pareto" ? "bar" : "pie", title: intent === "pareto" ? "Pareto de causas raiz" : "Causas raiz mais frequentes", data: causes.map((item) => ({ label: item.cause, value: item.count })), color: intent === "pareto" ? "violet" : "teal", valueLabel: "Ocorrências" }) : undefined,
      focusIds: ["pareto-rca"], confidence: causes.length ? 0.98 : 0.4, sourceLabel: "Análise local de causa raiz",
      evidence: leader ? [{ label: "Causa principal", value: `${leader.count} ocorrência(s)`, calculation: "Contagem de causas classificadas no período" }] : [],
    });
  }

  if (intent === "triage_accuracy") {
    return done({
      answer: latestAccuracy === undefined ? "Ainda não há uma medição semanal de acurácia disponível." : `A acurácia mais recente do Triage Agent está em ${percent(latestAccuracy)}. A meta operacional é 90%.`,
      intent, cards: [{ id: "triage-accuracy", title: "Acurácia Triage Agent", value: latestAccuracy === undefined ? "—" : percent(latestAccuracy), explanation: "Último ponto disponível na tendência semanal.", focusId: "triage-accuracy" }],
      chart: latestAccuracy === undefined ? undefined : localChartSpecSchema.parse({ type: "kpi", title: "Última acurácia semanal", data: [{ label: "Acurácia", value: latestAccuracy }], color: latestAccuracy < 75 ? "red" : latestAccuracy < 90 ? "gold" : "teal", unit: "%" }),
      focusIds: ["triage-accuracy"], confidence: latestAccuracy === undefined ? 0.6 : 0.99, sourceLabel: "Tendência semanal de acurácia",
      evidence: latestAccuracy === undefined ? [] : [{ label: "Acurácia", value: percent(latestAccuracy), calculation: "Decisões de triagem aprovadas ÷ decisões avaliadas" }],
    });
  }

  if (intent === "sla") {
    return done({
      answer: `Existem ${delayed} caso(s) atrasado(s), representando ${percent(delayedPct)} do total.`, intent,
      cards: [{ id: "delayed-cases", title: "Casos atrasados", value: String(delayed), explanation: "Status DELAYED no período.", focusId: "status-overview" }, { id: "critical-cases", title: "Casos críticos", value: String(critical), explanation: "Aging elevado ou status atrasado.", focusId: "critical-kpi" }],
      chart: localChartSpecSchema.parse({ type: "bar", title: "Risco operacional", data: [{ label: "Atrasados", value: delayed }, { label: "Críticos", value: critical }], color: "red" }),
      focusIds: ["status-overview", "critical-kpi"], confidence: 0.98, sourceLabel: "Status e aging do Dashboard",
      evidence: [{ label: "Taxa de atraso", value: percent(delayedPct), calculation: `${delayed} atrasados ÷ ${total} defeitos` }],
    });
  }

  if (intent === "trend") {
    const weeks = stats?.weeklyTrend ?? [];
    const recent = weeks.at(-1);
    return done({
      answer: recent ? `Na última semana disponível foram registrados ${recent.total} defeito(s), com ${recent.closed} encerrado(s) e ${recent.delayed} atrasado(s).` : "Ainda não há dados semanais suficientes para identificar uma tendência.", intent,
      cards: [{ id: "weekly-trend", title: "Última semana", value: recent ? String(recent.total) : "—", explanation: "Total de defeitos na última semana disponível.", focusId: "status-overview" }],
      chart: weeks.length ? localChartSpecSchema.parse({ type: "line", title: "Evolução semanal", data: weeks.slice(-12).map((week) => ({ label: week.weekKey, value: week.total, secondaryValue: week.delayed })), color: "teal", valueLabel: "Defeitos", secondaryLabel: "Atrasados" }) : undefined,
      focusIds: ["status-overview"], confidence: recent ? 0.97 : 0.45, sourceLabel: "Série semanal do Dashboard",
      evidence: recent ? [{ label: "Semana analisada", value: recent.weekKey, calculation: "Último ponto cronológico disponível" }] : [],
    });
  }

  if (intent === "overview") {
    return done({
      answer: `Panorama atual: ${total} defeito(s), ${closed} encerrado(s) (${percent(closedPct)}) e ${critical} caso(s) crítico(s).`, intent,
      cards: [{ id: "total-defects", title: "Total de defeitos", value: String(total), explanation: "Registros no período selecionado.", focusId: "total-defects" }, { id: "closed-defects", title: "Encerrados", value: percent(closedPct), explanation: "Proporção com status CLOSED.", focusId: "status-overview" }, { id: "critical-defects", title: "Críticos", value: String(critical), explanation: "Casos com aging elevado ou atraso.", focusId: "critical-kpi" }],
      chart: localChartSpecSchema.parse({ type: "kpi", title: "Resumo do período", data: [{ label: "Total", value: total }, { label: "Críticos", value: critical }], color: "violet" }),
      focusIds: ["total-defects", "status-overview", "critical-kpi"], confidence: 0.98, sourceLabel: "KPIs do Dashboard",
      evidence: [{ label: "Taxa de encerramento", value: percent(closedPct), calculation: `${closed} encerrados ÷ ${total} defeitos` }],
    });
  }

  return done({
    answer: "Não encontrei uma intenção segura no catálogo local. Reformule a pergunta usando fornecedores, aging, SLA, tendência, severidade, causa raiz, Pareto ou acurácia.", intent: "unsupported", cards: [], focusIds: [], confidence: 0.2, sourceLabel: "Catálogo local de intenções", evidence: [],
    suggestions: ["Qual é o panorama geral?", "Quais fornecedores têm maior aging?", "Gere um Pareto das causas raiz."],
  });
}
