/**
 * Agent Base Class — Foundation for all AI agents in QTrack
 * Provides lifecycle management, heartbeat, error handling, and guardrails integration
 */
import { getDb } from "../db";
import { aiAgentDecisions, aiAgentMetrics, aiAutonomyConfig, aiAgentJobs } from "../../drizzle/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";

// =====================================================
// TYPES
// =====================================================
export interface AgentDecision {
  decisionType: string;
  defectId?: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number;
  tenantId?: number;
}

export interface AgentConfig {
  enabled: boolean;
  autoThreshold: number;
  reviewThreshold: number;
  maxAutoDecisionsPerHour: number;
  criticalActions: string[];
}

export type AutonomyLevel = "auto" | "review" | "hitl" | "blocked";

export interface AgentHealthStatus {
  agentName: string;
  status: "healthy" | "degraded" | "down";
  lastHeartbeat: Date;
  uptime: number;
  totalDecisions: number;
  avgConfidence: number;
  errorRate: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  enabled: true,
  autoThreshold: 0.85,
  reviewThreshold: 0.60,
  maxAutoDecisionsPerHour: 100,
  criticalActions: [],
};

// =====================================================
// AGENT BASE CLASS
// =====================================================
export abstract class AgentBase {
  readonly agentName: string;
  protected config: AgentConfig = DEFAULT_CONFIG;
  protected startTime: Date = new Date();
  protected heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  protected decisionCount = 0;
  protected errorCount = 0;

  constructor(agentName: string) {
    this.agentName = agentName;
  }

  // --- Lifecycle ---
  async initialize(): Promise<void> {
    await this.loadConfig();
    console.log(`[AI:${this.agentName}] Initialized (enabled=${this.config.enabled})`);
  }

  async loadConfig(tenantId?: number): Promise<AgentConfig> {
    try {
      const db = await getDb();
      if (!db) return this.config;
      const rows = await db.select().from(aiAutonomyConfig)
        .where(and(
          eq(aiAutonomyConfig.agentName, this.agentName),
          tenantId ? eq(aiAutonomyConfig.tenantId, tenantId) : sql`${aiAutonomyConfig.tenantId} IS NULL`
        ))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        this.config = {
          enabled: row.enabled ?? true,
          autoThreshold: Number(row.autoThreshold) || 0.85,
          reviewThreshold: Number(row.reviewThreshold) || 0.60,
          maxAutoDecisionsPerHour: row.maxAutoDecisionsPerHour ?? 100,
          criticalActions: (row.criticalActions as string[]) || [],
        };
      }
    } catch (e) {
      console.warn(`[AI:${this.agentName}] Config load failed, using defaults`, e);
    }
    return this.config;
  }

  // --- Guardrails ---
  async determineAutonomyLevel(decision: AgentDecision): Promise<AutonomyLevel> {
    if (!this.config.enabled) return "blocked";

    // Critical actions always require HITL
    if (this.config.criticalActions.includes(decision.decisionType)) {
      return "hitl";
    }

    // Rate limit check
    const hourAgo = new Date(Date.now() - 3600000);
    const db = await getDb();
    if (!db) return "review";
    const recentCount = await db.select({ count: sql<number>`count(*)` })
      .from(aiAgentDecisions)
      .where(and(
        eq(aiAgentDecisions.agentName, this.agentName),
        eq(aiAgentDecisions.autonomyLevel, "auto"),
        gte(aiAgentDecisions.createdAt, hourAgo)
      ));

    if ((recentCount[0]?.count ?? 0) >= this.config.maxAutoDecisionsPerHour) {
      return "review";
    }

    // Confidence-based
    if (decision.confidence >= this.config.autoThreshold) return "auto";
    if (decision.confidence >= this.config.reviewThreshold) return "review";
    return "hitl";
  }

  // --- Decision Recording ---
  async recordDecision(decision: AgentDecision): Promise<{ id: number; autonomyLevel: AutonomyLevel }> {
    const autonomyLevel = await this.determineAutonomyLevel(decision);
    const status = autonomyLevel === "auto" ? "EXECUTED" : "PENDING";

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(aiAgentDecisions).values({
      agentName: this.agentName,
      defectId: decision.defectId ?? null,
      decisionType: decision.decisionType,
      input: decision.input,
      output: decision.output,
      confidence: String(decision.confidence),
      autonomyLevel,
      status,
      executedAt: autonomyLevel === "auto" ? new Date() : null,
      tenantId: decision.tenantId ?? null,
    });

    this.decisionCount++;
    return { id: Number(result[0].insertId), autonomyLevel };
  }

  // --- Metrics ---
  async recordMetrics(tenantId?: number): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(today + "T00:00:00Z");

    const db = await getDb();
    if (!db) return;
    const stats = await db.select({
      total: sql<number>`count(*)`,
      autoExec: sql<number>`SUM(CASE WHEN autonomyLevel = 'auto' THEN 1 ELSE 0 END)`,
      approved: sql<number>`SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END)`,
      rejected: sql<number>`SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END)`,
      overridden: sql<number>`SUM(CASE WHEN status = 'OVERRIDDEN' THEN 1 ELSE 0 END)`,
      avgConf: sql<number>`AVG(confidence)`,
    }).from(aiAgentDecisions)
      .where(and(
        eq(aiAgentDecisions.agentName, this.agentName),
        gte(aiAgentDecisions.createdAt, todayStart),
        tenantId ? eq(aiAgentDecisions.tenantId, tenantId) : sql`1=1`
      ));

    const s = stats[0];
    if (!s || s.total === 0) return;

    // Upsert metrics
    const existing = await db.select().from(aiAgentMetrics)
      .where(and(
        eq(aiAgentMetrics.agentName, this.agentName),
        eq(aiAgentMetrics.metricDate, today)
      )).limit(1);

    const values = {
      agentName: this.agentName,
      metricDate: today,
      totalDecisions: s.total,
      autoExecuted: s.autoExec ?? 0,
      humanApproved: s.approved ?? 0,
      humanRejected: s.rejected ?? 0,
      humanOverridden: s.overridden ?? 0,
      avgConfidence: s.avgConf ? String(s.avgConf) : null,
      tenantId: tenantId ?? null,
    };

    if (existing.length > 0) {
      await db.update(aiAgentMetrics)
        .set(values)
        .where(eq(aiAgentMetrics.id, existing[0].id));
    } else {
      await db.insert(aiAgentMetrics).values(values);
    }
  }

  // --- Health ---
  getHealthStatus(): AgentHealthStatus {
    const uptimeMs = Date.now() - this.startTime.getTime();
    return {
      agentName: this.agentName,
      status: this.config.enabled ? (this.errorCount > 10 ? "degraded" : "healthy") : "down",
      lastHeartbeat: new Date(),
      uptime: Math.floor(uptimeMs / 1000),
      totalDecisions: this.decisionCount,
      avgConfidence: 0,
      errorRate: this.decisionCount > 0 ? this.errorCount / this.decisionCount : 0,
    };
  }

  // --- Abstract methods for subclasses ---
  abstract execute(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}
