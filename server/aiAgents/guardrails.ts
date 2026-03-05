/**
 * Guardrails Engine — Safety layer for AI agent decisions
 * Enforces confidence thresholds, rate limits, HITL escalation, and critical action blocking
 */
import { getDb } from "../db";
import { aiAgentDecisions, aiAutonomyConfig } from "../../drizzle/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import type { AgentDecision, AutonomyLevel, AgentConfig } from "./agentBase";

// =====================================================
// SAFETY RULES
// =====================================================

// MG "S" (Safety) defects ALWAYS require human approval
const SAFETY_SEVERITY_CODES = ["S"];

// Actions that are always critical regardless of confidence
const ALWAYS_CRITICAL_ACTIONS = [
  "auto_close_safety_defect",
  "delete_defect",
  "change_severity_to_lower",
  "override_supplier_response",
];

export interface GuardrailResult {
  allowed: boolean;
  autonomyLevel: AutonomyLevel;
  reason: string;
  requiresApproval: boolean;
}

// =====================================================
// CHECK — Evaluate a decision against guardrails
// =====================================================
export async function checkGuardrails(
  agentName: string,
  decision: AgentDecision,
  config: AgentConfig
): Promise<GuardrailResult> {
  // Rule 1: Agent disabled
  if (!config.enabled) {
    return {
      allowed: false,
      autonomyLevel: "blocked",
      reason: `Agent ${agentName} is disabled`,
      requiresApproval: false,
    };
  }

  // Rule 2: Safety severity always HITL
  const severity = (decision.input as Record<string, unknown>).severity as string | undefined;
  if (severity && SAFETY_SEVERITY_CODES.includes(severity.toUpperCase())) {
    return {
      allowed: true,
      autonomyLevel: "hitl",
      reason: "Safety severity (MG S) requires human approval",
      requiresApproval: true,
    };
  }

  // Rule 3: Always-critical actions
  if (ALWAYS_CRITICAL_ACTIONS.includes(decision.decisionType)) {
    return {
      allowed: true,
      autonomyLevel: "hitl",
      reason: `Action "${decision.decisionType}" is always critical`,
      requiresApproval: true,
    };
  }

  // Rule 4: Configured critical actions
  if (config.criticalActions.includes(decision.decisionType)) {
    return {
      allowed: true,
      autonomyLevel: "hitl",
      reason: `Action "${decision.decisionType}" is configured as critical`,
      requiresApproval: true,
    };
  }

  // Rule 5: Rate limit
  const rateLimitResult = await checkRateLimit(agentName, config.maxAutoDecisionsPerHour);
  if (rateLimitResult.exceeded) {
    return {
      allowed: true,
      autonomyLevel: "review",
      reason: `Rate limit reached (${rateLimitResult.current}/${config.maxAutoDecisionsPerHour}/hour)`,
      requiresApproval: true,
    };
  }

  // Rule 6: Confidence-based autonomy
  if (decision.confidence >= config.autoThreshold) {
    return {
      allowed: true,
      autonomyLevel: "auto",
      reason: `High confidence (${(decision.confidence * 100).toFixed(1)}% >= ${(config.autoThreshold * 100).toFixed(1)}%)`,
      requiresApproval: false,
    };
  }

  if (decision.confidence >= config.reviewThreshold) {
    return {
      allowed: true,
      autonomyLevel: "review",
      reason: `Medium confidence (${(decision.confidence * 100).toFixed(1)}%) — execute but notify for review`,
      requiresApproval: true,
    };
  }

  // Low confidence — requires human approval
  return {
    allowed: true,
    autonomyLevel: "hitl",
    reason: `Low confidence (${(decision.confidence * 100).toFixed(1)}% < ${(config.reviewThreshold * 100).toFixed(1)}%)`,
    requiresApproval: true,
  };
}

// =====================================================
// RATE LIMIT CHECK
// =====================================================
async function checkRateLimit(
  agentName: string,
  maxPerHour: number
): Promise<{ exceeded: boolean; current: number }> {
  const db = await getDb();
  if (!db) return { exceeded: false, current: 0 };

  const hourAgo = new Date(Date.now() - 3600000);
  const result = await db.select({
    count: sql<number>`count(*)`,
  }).from(aiAgentDecisions)
    .where(and(
      eq(aiAgentDecisions.agentName, agentName),
      eq(aiAgentDecisions.autonomyLevel, "auto"),
      gte(aiAgentDecisions.createdAt, hourAgo)
    ));

  const current = result[0]?.count ?? 0;
  return { exceeded: current >= maxPerHour, current };
}

// =====================================================
// APPROVE / REJECT — Human review actions
// =====================================================
export async function approveDecision(decisionId: number, reviewerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(aiAgentDecisions)
    .set({
      status: "APPROVED",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      executedAt: new Date(),
    })
    .where(and(
      eq(aiAgentDecisions.id, decisionId),
      eq(aiAgentDecisions.status, "PENDING")
    ));

  return (result[0].affectedRows ?? 0) > 0;
}

export async function rejectDecision(decisionId: number, reviewerId: number, reason?: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(aiAgentDecisions)
    .set({
      status: "REJECTED",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      humanOverride: reason ? { reason } : null,
    })
    .where(and(
      eq(aiAgentDecisions.id, decisionId),
      eq(aiAgentDecisions.status, "PENDING")
    ));

  return (result[0].affectedRows ?? 0) > 0;
}

export async function overrideDecision(
  decisionId: number,
  reviewerId: number,
  overrideData: Record<string, unknown>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.update(aiAgentDecisions)
    .set({
      status: "OVERRIDDEN",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      humanOverride: overrideData,
    })
    .where(and(
      eq(aiAgentDecisions.id, decisionId),
      eq(aiAgentDecisions.status, "PENDING")
    ));

  return (result[0].affectedRows ?? 0) > 0;
}
