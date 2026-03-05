/**
 * Feedback Agent — Learning from human overrides, accuracy tracking, threshold tuning
 */
import { AgentBase, AgentDecision } from "./agentBase";
import { getDb } from "../db";
import { aiAgentDecisions, aiAutonomyConfig } from "../../drizzle/schema";
import { sql, and, gte, eq, desc } from "drizzle-orm";

export class FeedbackAgent extends AgentBase {
  constructor() {
    super("feedback");
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const eventType = payload._eventType as string;

    switch (eventType) {
      case "feedback.override":
        return this.recordOverride(payload);
      case "feedback.analyze":
        return this.analyzeAccuracy();
      default:
        return this.analyzeAccuracy();
    }
  }

  // =====================================================
  // RECORD HUMAN OVERRIDE
  // =====================================================
  async recordOverride(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const decisionId = payload.decisionId as number;
    const humanValue = payload.humanValue as string;
    const reason = payload.reason as string;

    if (!decisionId) return { error: "No decisionId" };

    // Update the decision with human feedback
    await db.update(aiAgentDecisions)
      .set({
        humanOverride: humanValue,
        feedbackNote: reason,
        status: "overridden",
      } as any)
      .where(eq(aiAgentDecisions.id, decisionId));

    return { decisionId, overridden: true, humanValue };
  }

  // =====================================================
  // ANALYZE ACCURACY
  // =====================================================
  async analyzeAccuracy(): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    // Get per-agent accuracy stats
    const stats = await db.select({
      agentName: aiAgentDecisions.agentName,
      decisionType: aiAgentDecisions.decisionType,
      total: sql<number>`count(*)`,
      overridden: sql<number>`sum(case when ${aiAgentDecisions.humanOverride} is not null then 1 else 0 end)`,
      avgConfidence: sql<number>`avg(${aiAgentDecisions.confidence})`,
    }).from(aiAgentDecisions)
      .where(gte(aiAgentDecisions.createdAt, thirtyDaysAgo))
      .groupBy(aiAgentDecisions.agentName, aiAgentDecisions.decisionType);

    const accuracyReport = stats.map(s => ({
      agentName: s.agentName,
      decisionType: s.decisionType,
      total: s.total,
      overridden: s.overridden || 0,
      accuracy: s.total > 0 ? Math.round(((s.total - (s.overridden || 0)) / s.total) * 100) : 100,
      avgConfidence: Math.round((s.avgConfidence || 0) * 100),
    }));

    // Check if any agent needs threshold adjustment
    const recommendations: Array<{ agent: string; action: string; reason: string }> = [];

    for (const stat of accuracyReport) {
      if (stat.accuracy < 80 && stat.total >= 10) {
        recommendations.push({
          agent: stat.agentName,
          action: "increase_threshold",
          reason: `Accuracy ${stat.accuracy}% is below 80% target (${stat.overridden}/${stat.total} overridden)`,
        });
      }
      if (stat.accuracy > 95 && stat.avgConfidence > 90 && stat.total >= 20) {
        recommendations.push({
          agent: stat.agentName,
          action: "decrease_threshold",
          reason: `High accuracy ${stat.accuracy}% with ${stat.avgConfidence}% avg confidence — can safely lower threshold`,
        });
      }
    }

    const decision: AgentDecision = {
      decisionType: "accuracy_analysis",
      input: { period: "30d", statsCount: stats.length },
      output: { accuracyReport, recommendations },
      confidence: 0.90,
    };
    await this.recordDecision(decision);

    return { accuracyReport, recommendations };
  }
}

// Singleton
export const feedbackAgent = new FeedbackAgent();
