/**
 * Health Agent — System monitoring, self-healing, performance tracking
 */
import { AgentBase, AgentDecision } from "./agentBase";
import { getDb } from "../db";
import { aiAgentDecisions, aiAgentMetrics, aiAgentJobs } from "../../drizzle/schema";
import { sql, and, gte, desc, eq } from "drizzle-orm";

export class HealthAgent extends AgentBase {
  constructor() {
    super("health");
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const eventType = payload._eventType as string;

    switch (eventType) {
      case "system.health_check":
        return this.performHealthCheck();
      case "system.metrics_collect":
        return this.collectMetrics();
      default:
        return this.performHealthCheck();
    }
  }

  // =====================================================
  // HEALTH CHECK
  // =====================================================
  async performHealthCheck(): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { status: "down", error: "DB not available" };

    const oneHourAgo = new Date(Date.now() - 3600000);

    // Check recent decisions
    const recentDecisions = await db.select({
      count: sql<number>`count(*)`,
    }).from(aiAgentDecisions)
      .where(gte(aiAgentDecisions.createdAt, oneHourAgo));

    // Check error rate
    const errorDecisions = await db.select({
      count: sql<number>`count(*)`,
    }).from(aiAgentDecisions)
      .where(and(
        gte(aiAgentDecisions.createdAt, oneHourAgo),
        sql`${aiAgentDecisions.status} = 'error'`
      ));

    // Check pending jobs
    const pendingJobs = await db.select({
      count: sql<number>`count(*)`,
    }).from(aiAgentJobs)
      .where(sql`${aiAgentJobs.status} = 'QUEUED'`);

    const totalRecent = recentDecisions[0]?.count || 0;
    const errorCount = errorDecisions[0]?.count || 0;
    const errorRate = totalRecent > 0 ? errorCount / totalRecent : 0;
    const pendingCount = pendingJobs[0]?.count || 0;

    let status: "healthy" | "degraded" | "down" = "healthy";
    const issues: string[] = [];

    if (errorRate > 0.3) {
      status = "degraded";
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    }
    if (pendingCount > 50) {
      status = "degraded";
      issues.push(`Job queue backlog: ${pendingCount} pending`);
    }

    const decision: AgentDecision = {
      decisionType: "health_check",
      input: { totalRecent, errorCount, pendingCount },
      output: { status, issues, errorRate },
      confidence: 0.99,
    };
    await this.recordDecision(decision);

    return {
      status,
      issues,
      metrics: {
        decisionsLastHour: totalRecent,
        errorsLastHour: errorCount,
        errorRate: Math.round(errorRate * 100),
        pendingJobs: pendingCount,
      },
    };
  }

  // =====================================================
  // COLLECT METRICS
  // =====================================================
  async collectMetrics(): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const oneDayAgo = new Date(Date.now() - 86400000);

    // Get per-agent stats
    const agentStats = await db.select({
      agentName: aiAgentDecisions.agentName,
      totalDecisions: sql<number>`count(*)`,
      avgConfidence: sql<number>`avg(${aiAgentDecisions.confidence})`,
      autoCount: sql<number>`sum(case when ${aiAgentDecisions.autonomyLevel} = 'auto' then 1 else 0 end)`,
      reviewCount: sql<number>`sum(case when ${aiAgentDecisions.autonomyLevel} = 'review' then 1 else 0 end)`,
      hitlCount: sql<number>`sum(case when ${aiAgentDecisions.autonomyLevel} = 'hitl' then 1 else 0 end)`,
    }).from(aiAgentDecisions)
      .where(gte(aiAgentDecisions.createdAt, oneDayAgo))
      .groupBy(aiAgentDecisions.agentName);

    // Store metrics
    for (const stat of agentStats) {
      await db.insert(aiAgentMetrics).values({
        agentName: stat.agentName,
        metricType: "daily_summary",
        value: stat.totalDecisions,
        metadata: {
          avgConfidence: stat.avgConfidence,
          autoCount: stat.autoCount,
          reviewCount: stat.reviewCount,
          hitlCount: stat.hitlCount,
        },
      } as any);
    }

    return {
      agentStats,
      collectedAt: new Date().toISOString(),
    };
  }
}

// Singleton
export const healthAgent = new HealthAgent();
