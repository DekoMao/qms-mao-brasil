/**
 * Predict Agent — Multi-hypothesis RCA, anomaly detection, trend analysis, risk scoring
 * Provides predictive intelligence for quality management
 */
import { AgentBase, AgentDecision } from "./agentBase";
import { getDb } from "../db";
import { defects } from "../../drizzle/schema";
import { eq, and, sql, desc, gte, ne, isNull } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// =====================================================
// PREDICT AGENT CLASS
// =====================================================
export class PredictAgent extends AgentBase {
  constructor() {
    super("predict");
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const eventType = payload._eventType as string;

    switch (eventType) {
      case "defect.created":
      case "defect.step_changed":
        return this.generateRCA(payload.defectId as number);
      case "system.metrics_collect":
        return this.detectAnomalies();
      default:
        return this.generateRiskScores();
    }
  }

  // =====================================================
  // MULTI-HYPOTHESIS ROOT CAUSE ANALYSIS
  // =====================================================
  async generateRCA(defectId: number): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const rows = await db.select().from(defects)
      .where(eq(defects.id, defectId)).limit(1);

    if (rows.length === 0) return { error: "Defect not found" };
    const defect = rows[0];

    // Get historical similar defects for context
    const history = await db.select({
      symptom: defects.symptom,
      description: defects.description,
      cause: defects.cause,
      correctiveActions: defects.correctiveActions,
      supplier: defects.supplier,
      model: defects.model,
      category: defects.category,
    }).from(defects)
      .where(and(
        ne(defects.id, defectId),
        isNull(defects.deletedAt),
        sql`${defects.cause} IS NOT NULL AND ${defects.cause} != ''`
      ))
      .orderBy(desc(defects.createdAt))
      .limit(30);

    const historyContext = history.map(h =>
      `Symptom: ${h.symptom || "N/A"} | Cause: ${h.cause || "N/A"} | Action: ${h.correctiveActions || "N/A"} | Supplier: ${h.supplier || "N/A"}`
    ).join("\n");

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert quality engineer performing Root Cause Analysis (RCA) for manufacturing defects. Generate 3 hypotheses ranked by probability. Use 5-Why methodology. Respond with JSON:
{
  "hypotheses": [
    {
      "rank": 1,
      "rootCause": "...",
      "probability": 0.0-1.0,
      "fiveWhys": ["Why 1", "Why 2", "Why 3", "Why 4", "Why 5"],
      "suggestedActions": ["Action 1", "Action 2"],
      "category": "Method|Machine|Material|Man|Measurement|Environment"
    }
  ],
  "riskScore": 0-100,
  "recurrenceProbability": 0.0-1.0
}`
          },
          {
            role: "user",
            content: `Analyze this defect:
Symptom: ${defect.symptom || "N/A"}
Description: ${defect.description || "N/A"}
Supplier: ${defect.supplier || "N/A"}
Model: ${defect.model || "N/A"}
Category: ${defect.category || "N/A"}
Severity: ${defect.mg || "N/A"}

Historical similar defects:
${historyContext || "No history available"}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "rca_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                hypotheses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      rank: { type: "integer" },
                      rootCause: { type: "string" },
                      probability: { type: "number" },
                      fiveWhys: { type: "array", items: { type: "string" } },
                      suggestedActions: { type: "array", items: { type: "string" } },
                      category: { type: "string" },
                    },
                    required: ["rank", "rootCause", "probability", "fiveWhys", "suggestedActions", "category"],
                    additionalProperties: false,
                  },
                },
                riskScore: { type: "integer" },
                recurrenceProbability: { type: "number" },
              },
              required: ["hypotheses", "riskScore", "recurrenceProbability"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");

      const topConfidence = parsed.hypotheses?.[0]?.probability || 0.5;

      const decision: AgentDecision = {
        decisionType: "rca_prediction",
        defectId,
        input: { symptom: defect.symptom, description: defect.description },
        output: parsed,
        confidence: topConfidence,
      };

      await this.recordDecision(decision);

      return {
        defectId,
        hypotheses: parsed.hypotheses,
        riskScore: parsed.riskScore,
        recurrenceProbability: parsed.recurrenceProbability,
      };
    } catch (error) {
      console.error("[PredictAgent] RCA error:", error);
      return { defectId, error: "RCA generation failed" };
    }
  }

  // =====================================================
  // ANOMALY DETECTION
  // =====================================================
  async detectAnomalies(): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    // Get defect counts per week for last 30 days
    const monthlyStats = await db.select({
      count: sql<number>`count(*)`,
    }).from(defects)
      .where(and(
        gte(defects.createdAt, thirtyDaysAgo),
        isNull(defects.deletedAt)
      ));

    const weeklyStats = await db.select({
      count: sql<number>`count(*)`,
    }).from(defects)
      .where(and(
        gte(defects.createdAt, sevenDaysAgo),
        isNull(defects.deletedAt)
      ));

    const monthlyAvg = (monthlyStats[0]?.count || 0) / 4;
    const weeklyCount = weeklyStats[0]?.count || 0;

    // Supplier anomalies - sudden spike from a supplier
    const supplierSpikes = await db.select({
      supplier: defects.supplier,
      count: sql<number>`count(*)`,
    }).from(defects)
      .where(and(
        gte(defects.createdAt, sevenDaysAgo),
        isNull(defects.deletedAt)
      ))
      .groupBy(defects.supplier)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const anomalies: Array<{ type: string; severity: string; description: string; value: number }> = [];

    // Check for volume spike (>2x average)
    if (weeklyCount > monthlyAvg * 2 && monthlyAvg > 0) {
      anomalies.push({
        type: "volume_spike",
        severity: "high",
        description: `Weekly defects (${weeklyCount}) are ${(weeklyCount / monthlyAvg).toFixed(1)}x the monthly average (${monthlyAvg.toFixed(0)})`,
        value: weeklyCount,
      });
    }

    // Check for supplier concentration
    for (const s of supplierSpikes) {
      if (s.count >= 5 && s.supplier) {
        anomalies.push({
          type: "supplier_concentration",
          severity: s.count >= 10 ? "high" : "medium",
          description: `Supplier "${s.supplier}" has ${s.count} defects in the last 7 days`,
          value: s.count,
        });
      }
    }

    if (anomalies.length > 0) {
      const decision: AgentDecision = {
        decisionType: "anomaly_detection",
        input: { weeklyCount, monthlyAvg, supplierSpikes: supplierSpikes.length },
        output: { anomalies },
        confidence: 0.80,
      };
      await this.recordDecision(decision);
    }

    return { anomalies, weeklyCount, monthlyAvg: Math.round(monthlyAvg) };
  }

  // =====================================================
  // RISK SCORING
  // =====================================================
  async generateRiskScores(): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    // Get open defects with their aging
    const openDefects = await db.select({
      id: defects.id,
      supplier: defects.supplier,
      mg: defects.mg,
      step: defects.step,
      status: defects.status,
      createdAt: defects.createdAt,
    }).from(defects)
      .where(and(
        ne(defects.step, "CLOSED"),
        isNull(defects.deletedAt)
      ))
      .limit(200);

    const riskScores = openDefects.map(d => {
      let score = 0;

      // Severity weight
      const severityWeight: Record<string, number> = { S: 40, A: 30, B: 20, C: 10 };
      score += severityWeight[d.mg || "C"] || 10;

      // Aging weight (days open)
      const daysOpen = Math.floor((Date.now() - (d.createdAt?.getTime() || Date.now())) / 86400000);
      score += Math.min(30, daysOpen);

      // Status weight
      if (d.status === "DELAYED") score += 20;

      // Step weight (later steps = more invested, higher risk)
      const stepIndex = STEP_ORDER_SIMPLE.indexOf(d.step || "");
      if (stepIndex >= 3) score += 10;

      return {
        defectId: d.id,
        supplier: d.supplier,
        riskScore: Math.min(100, score),
        severity: d.mg,
        daysOpen,
        step: d.step,
      };
    });

    // Sort by risk score descending
    riskScores.sort((a, b) => b.riskScore - a.riskScore);

    return {
      totalAssessed: riskScores.length,
      highRisk: riskScores.filter(r => r.riskScore >= 70).length,
      mediumRisk: riskScores.filter(r => r.riskScore >= 40 && r.riskScore < 70).length,
      lowRisk: riskScores.filter(r => r.riskScore < 40).length,
      topRisks: riskScores.slice(0, 10),
    };
  }
}

const STEP_ORDER_SIMPLE = [
  "Aguardando Disposição",
  "Aguardando Análise Técnica",
  "Aguardando Causa Raiz",
  "Aguardando Ação Corretiva",
  "Aguardando Validação de Ação Corretiva",
  "CLOSED",
];

// Singleton
export const predictAgent = new PredictAgent();
