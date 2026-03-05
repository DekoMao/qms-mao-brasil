/**
 * Workflow Agent — Auto-advance steps, SLA monitoring, escalation, auto-close
 * Manages the 8D workflow lifecycle autonomously
 */
import { AgentBase, AgentDecision } from "./agentBase";
import { getDb } from "../db";
import { defects, auditLogs } from "../../drizzle/schema";
import { eq, and, sql, ne, isNull } from "drizzle-orm";

// =====================================================
// 8D STEP DEFINITIONS
// =====================================================
const STEP_ORDER = [
  "Aguardando Disposição",
  "Aguardando Análise Técnica",
  "Aguardando Causa Raiz",
  "Aguardando Ação Corretiva",
  "Aguardando Validação de Ação Corretiva",
  "CLOSED",
] as const;

// Fields required to advance from each step
const STEP_REQUIREMENTS: Record<string, string[]> = {
  "Aguardando Disposição": ["dateDisposition"],
  "Aguardando Análise Técnica": ["dateTechAnalysis"],
  "Aguardando Causa Raiz": ["dateRootCause", "cause"],
  "Aguardando Ação Corretiva": ["dateCorrectiveAction", "correctiveActions"],
  "Aguardando Validação de Ação Corretiva": ["dateValidation", "checkSolution"],
};

// SLA limits in days per step
const SLA_LIMITS: Record<string, number> = {
  "Aguardando Disposição": 3,
  "Aguardando Análise Técnica": 7,
  "Aguardando Causa Raiz": 14,
  "Aguardando Ação Corretiva": 21,
  "Aguardando Validação de Ação Corretiva": 30,
};

// =====================================================
// WORKFLOW AGENT CLASS
// =====================================================
export class WorkflowAgent extends AgentBase {
  constructor() {
    super("workflow");
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const eventType = payload._eventType as string;

    switch (eventType) {
      case "defect.updated":
      case "defect.step_changed":
        return this.checkAutoAdvance(payload.defectId as number);
      case "defect.sla_warning":
      case "defect.sla_violated":
        return this.handleSlaEvent(payload);
      default:
        // Periodic check — scan all open defects
        return this.periodicScan();
    }
  }

  // =====================================================
  // AUTO-ADVANCE — Check if defect can move to next step
  // =====================================================
  async checkAutoAdvance(defectId: number): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const rows = await db.select().from(defects)
      .where(eq(defects.id, defectId)).limit(1);

    if (rows.length === 0) return { error: "Defect not found" };
    const defect = rows[0];

    if (defect.step === "CLOSED") return { skipped: true, reason: "Already closed" };

    const currentStep = defect.step || "Aguardando Disposição";
    const requirements = STEP_REQUIREMENTS[currentStep] || [];

    // Check if all requirements are met
    const met: string[] = [];
    const missing: string[] = [];

    for (const field of requirements) {
      const value = (defect as any)[field];
      if (value !== null && value !== undefined && value !== "" && value !== false) {
        met.push(field);
      } else {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return { defectId, currentStep, canAdvance: false, missing };
    }

    // All requirements met — determine next step
    const currentIndex = STEP_ORDER.indexOf(currentStep as any);
    if (currentIndex === -1 || currentIndex >= STEP_ORDER.length - 1) {
      return { defectId, currentStep, canAdvance: false, reason: "No next step" };
    }

    const nextStep = STEP_ORDER[currentIndex + 1];
    const confidence = 0.92; // High confidence for rule-based advance

    const decision: AgentDecision = {
      decisionType: "auto_advance",
      defectId,
      input: { currentStep, met },
      output: { nextStep },
      confidence,
    };

    const recorded = await this.recordDecision(decision);

    if (recorded.autonomyLevel === "auto") {
      const updates: Record<string, unknown> = { step: nextStep };
      if (nextStep === "CLOSED") {
        updates.status = "CLOSED";
        const now = new Date();
        const weekNum = getWeekNumber(now);
        updates.closeWeekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
      }

      await db.update(defects)
        .set(updates as any)
        .where(eq(defects.id, defectId));

      await db.insert(auditLogs).values({
        defectId,
        action: "AI_AUTO_ADVANCE",
        fieldName: "step",
        oldValue: currentStep,
        newValue: nextStep,
        userId: null,
        metadata: { details: `AI auto-advanced: all requirements met (${met.join(", ")})` },
      } as any);
    }

    return { defectId, currentStep, nextStep, advanced: recorded.autonomyLevel === "auto", autonomyLevel: recorded.autonomyLevel };
  }

  // =====================================================
  // SLA MONITORING
  // =====================================================
  async handleSlaEvent(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const defectId = payload.defectId as number;
    const slaType = payload._eventType as string;

    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const rows = await db.select().from(defects)
      .where(eq(defects.id, defectId)).limit(1);

    if (rows.length === 0) return { error: "Defect not found" };
    const defect = rows[0];

    if (slaType === "defect.sla_violated") {
      // Auto-escalate: mark as DELAYED
      const decision: AgentDecision = {
        decisionType: "auto_escalate",
        defectId,
        input: { step: defect.step, status: defect.status },
        output: { newStatus: "DELAYED" },
        confidence: 0.95,
      };

      const recorded = await this.recordDecision(decision);

      if (recorded.autonomyLevel === "auto" && defect.status !== "DELAYED") {
        await db.update(defects)
          .set({ status: "DELAYED" } as any)
          .where(eq(defects.id, defectId));

        await db.insert(auditLogs).values({
          defectId,
          action: "AI_AUTO_ESCALATE",
          fieldName: "status",
          oldValue: defect.status,
          newValue: "DELAYED",
          userId: null,
          metadata: { details: `AI auto-escalated: SLA violated at step "${defect.step}"` },
        } as any);
      }

      return { defectId, escalated: true, newStatus: "DELAYED" };
    }

    return { defectId, slaWarning: true, step: defect.step };
  }

  // =====================================================
  // PERIODIC SCAN — Check all open defects for SLA and auto-advance
  // =====================================================
  async periodicScan(): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const openDefects = await db.select().from(defects)
      .where(and(
        ne(defects.step, "CLOSED"),
        isNull(defects.deletedAt)
      ))
      .limit(500);

    let advanced = 0;
    let slaWarnings = 0;
    let slaViolations = 0;

    for (const defect of openDefects) {
      // Check auto-advance
      const advResult = await this.checkAutoAdvance(defect.id);
      if (advResult.advanced) advanced++;

      // Check SLA
      const slaResult = this.checkSla(defect);
      if (slaResult.violated) {
        slaViolations++;
        await this.handleSlaEvent({
          defectId: defect.id,
          _eventType: "defect.sla_violated",
        });
      } else if (slaResult.warning) {
        slaWarnings++;
      }
    }

    return {
      scanned: openDefects.length,
      advanced,
      slaWarnings,
      slaViolations,
    };
  }

  // =====================================================
  // SLA CHECK HELPER
  // =====================================================
  private checkSla(defect: Record<string, unknown>): { warning: boolean; violated: boolean; daysInStep: number } {
    const step = defect.step as string;
    const slaLimit = SLA_LIMITS[step];
    if (!slaLimit) return { warning: false, violated: false, daysInStep: 0 };

    const updatedAt = defect.updatedAt as Date;
    if (!updatedAt) return { warning: false, violated: false, daysInStep: 0 };

    const daysInStep = Math.floor((Date.now() - updatedAt.getTime()) / 86400000);

    return {
      warning: daysInStep >= slaLimit * 0.8,
      violated: daysInStep >= slaLimit,
      daysInStep,
    };
  }
}

// =====================================================
// HELPER
// =====================================================
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Singleton
export const workflowAgent = new WorkflowAgent();
