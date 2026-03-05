/**
 * Triage Agent — Auto-classification, NLP severity, auto-assignment, duplicate detection
 * Processes new defects and enriches them with AI-driven metadata
 */
import { AgentBase, AgentDecision } from "./agentBase";
import { getDb } from "../db";
import { defects, auditLogs } from "../../drizzle/schema";
import { eq, and, sql, desc, like, or } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// =====================================================
// CATEGORY MAPPING
// =====================================================
const DEFECT_CATEGORIES = [
  "Dimensional", "Visual", "Structural", "Functional", "Material",
  "Assembly", "Packaging", "Labeling", "Contamination", "Electrical",
  "Chemical", "Mechanical", "Surface Finish", "Color", "Other"
];

const SEVERITY_MAP: Record<string, string> = {
  "safety": "S",
  "critical": "A",
  "major": "B",
  "minor": "C",
};

// Assignment rules based on defect type/category
const ASSIGNMENT_RULES: Record<string, string> = {
  "Dimensional": "SQA",
  "Visual": "SQA",
  "Structural": "SQA",
  "Functional": "Fornecedor",
  "Material": "Fornecedor",
  "Assembly": "SQA",
  "Packaging": "Fornecedor",
  "Electrical": "SQA",
  "Chemical": "SQA",
  "Mechanical": "SQA",
};

// =====================================================
// TRIAGE AGENT CLASS
// =====================================================
export class TriageAgent extends AgentBase {
  constructor() {
    super("triage");
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const eventType = payload._eventType as string;
    const defectId = payload.defectId as number;

    if (!defectId) {
      return { error: "No defectId provided" };
    }

    switch (eventType) {
      case "defect.created":
        return this.triageNewDefect(defectId);
      default:
        return { skipped: true, reason: `Unhandled event: ${eventType}` };
    }
  }

  // =====================================================
  // MAIN TRIAGE FLOW
  // =====================================================
  async triageNewDefect(defectId: number): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const defectRows = await db.select().from(defects)
      .where(eq(defects.id, defectId)).limit(1);

    if (defectRows.length === 0) return { error: "Defect not found" };
    const defect = defectRows[0];

    const results: Record<string, unknown> = { defectId };

    // 1. Auto-classify category
    const classifyResult = await this.autoClassify(defect);
    results.classification = classifyResult;

    // 2. Auto-severity via NLP
    const severityResult = await this.autoSeverity(defect);
    results.severity = severityResult;

    // 3. Auto-assign responsible
    const assignResult = await this.autoAssign(defect, classifyResult.category);
    results.assignment = assignResult;

    // 4. Duplicate detection
    const duplicateResult = await this.detectDuplicates(defect);
    results.duplicates = duplicateResult;

    return results;
  }

  // =====================================================
  // AUTO-CLASSIFY
  // =====================================================
  async autoClassify(defect: Record<string, unknown>): Promise<{ category: string; confidence: number }> {
    try {
      const description = `${defect.defectDescription || ""} ${defect.symptom || ""} ${defect.partName || ""}`.trim();

      if (!description) {
        return { category: "Other", confidence: 0.3 };
      }

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a quality defect classifier for industrial manufacturing. Classify the defect into exactly ONE category from this list: ${DEFECT_CATEGORIES.join(", ")}. Respond with JSON: {"category": "...", "confidence": 0.0-1.0, "reasoning": "..."}`
          },
          {
            role: "user",
            content: `Classify this defect:\nDescription: ${description}\nPart: ${defect.partName || "N/A"}\nSupplier: ${defect.supplierName || "N/A"}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "defect_classification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                category: { type: "string", description: "Defect category" },
                confidence: { type: "number", description: "Confidence 0-1" },
                reasoning: { type: "string", description: "Brief reasoning" },
              },
              required: ["category", "confidence", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0].message.content;
      const parsed = JSON.parse(typeof rawContent === "string" ? rawContent : "{}");
      const category = DEFECT_CATEGORIES.includes(parsed.category) ? parsed.category : "Other";
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

      // Record decision through guardrails
      const decision: AgentDecision = {
        decisionType: "auto_classify",
        defectId: defect.id as number,
        input: { description, partName: defect.partName },
        output: { category, reasoning: parsed.reasoning },
        confidence,
      };

      const recorded = await this.recordDecision(decision);

      // If auto-approved, apply the classification
      if (recorded.autonomyLevel === "auto") {
        const db = await getDb();
        if (db) {
          await db.update(defects)
            .set({ defectType: category } as any)
            .where(eq(defects.id, defect.id as number));

          await db.insert(auditLogs).values({
            defectId: defect.id as number,
            action: "AI_AUTO_CLASSIFY",
            fieldName: "defectType",
            newValue: category,
            userId: null,
            metadata: { details: `AI auto-classified with ${(confidence * 100).toFixed(1)}% confidence: ${parsed.reasoning}` },
          } as any);
        }
      }

      return { category, confidence };
    } catch (error) {
      console.error("[TriageAgent] Auto-classify error:", error);
      return { category: "Other", confidence: 0.1 };
    }
  }

  // =====================================================
  // AUTO-SEVERITY (NLP)
  // =====================================================
  async autoSeverity(defect: Record<string, unknown>): Promise<{ severity: string; confidence: number }> {
    try {
      // If severity is already set and not empty, skip
      if (defect.mg && defect.mg !== "") {
        return { severity: defect.mg as string, confidence: 1.0 };
      }

      const description = `${defect.defectDescription || ""} ${defect.symptom || ""}`.trim();
      if (!description) {
        return { severity: "C", confidence: 0.3 };
      }

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a quality severity assessor. Classify the severity of this manufacturing defect:
- "safety" (S): Risk to human safety, regulatory non-compliance
- "critical" (A): Product cannot function, customer impact is severe
- "major" (B): Product works but with significant quality issues
- "minor" (C): Cosmetic or minor issues, no functional impact
Respond with JSON: {"severity": "safety|critical|major|minor", "confidence": 0.0-1.0, "reasoning": "..."}`
          },
          {
            role: "user",
            content: `Assess severity:\nDescription: ${description}\nPart: ${defect.partName || "N/A"}\nQuantity affected: ${defect.defectQty || "N/A"}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "severity_assessment",
            strict: true,
            schema: {
              type: "object",
              properties: {
                severity: { type: "string", description: "safety, critical, major, or minor" },
                confidence: { type: "number", description: "Confidence 0-1" },
                reasoning: { type: "string", description: "Brief reasoning" },
              },
              required: ["severity", "confidence", "reasoning"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0].message.content;
      const parsed = JSON.parse(typeof rawContent === "string" ? rawContent : "{}");
      const severityCode = SEVERITY_MAP[parsed.severity] || "C";
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

      const decision: AgentDecision = {
        decisionType: "auto_severity",
        defectId: defect.id as number,
        input: { description },
        output: { severity: severityCode, reasoning: parsed.reasoning },
        confidence,
      };

      const recorded = await this.recordDecision(decision);

      if (recorded.autonomyLevel === "auto") {
        const db = await getDb();
        if (db) {
          await db.update(defects)
            .set({ mg: severityCode } as any)
            .where(eq(defects.id, defect.id as number));

          await db.insert(auditLogs).values({
            defectId: defect.id as number,
            action: "AI_AUTO_SEVERITY",
            fieldName: "mg",
            newValue: severityCode,
            userId: null,
            metadata: { details: `AI auto-severity ${severityCode} with ${(confidence * 100).toFixed(1)}% confidence: ${parsed.reasoning}` },
          } as any);
        }
      }

      return { severity: severityCode, confidence };
    } catch (error) {
      console.error("[TriageAgent] Auto-severity error:", error);
      return { severity: "C", confidence: 0.1 };
    }
  }

  // =====================================================
  // AUTO-ASSIGN
  // =====================================================
  async autoAssign(defect: Record<string, unknown>, category: string): Promise<{ responsible: string; confidence: number }> {
    const responsible = ASSIGNMENT_RULES[category] || "SQA";
    const confidence = ASSIGNMENT_RULES[category] ? 0.90 : 0.60;

    const decision: AgentDecision = {
      decisionType: "auto_assign",
      defectId: defect.id as number,
      input: { category, currentResponsible: defect.responsible },
      output: { responsible },
      confidence,
    };

    const recorded = await this.recordDecision(decision);

    if (recorded.autonomyLevel === "auto" && defect.responsible !== responsible) {
      const db = await getDb();
      if (db) {
        await db.update(defects)
          .set({ responsible } as any)
          .where(eq(defects.id, defect.id as number));

        await db.insert(auditLogs).values({
          defectId: defect.id as number,
          action: "AI_AUTO_ASSIGN",
          fieldName: "responsible",
          newValue: responsible,
          userId: null,
          metadata: { details: `AI auto-assigned to ${responsible} based on category ${category}` },
        } as any);
      }
    }

    return { responsible, confidence };
  }

  // =====================================================
  // DUPLICATE DETECTION
  // =====================================================
  async detectDuplicates(defect: Record<string, unknown>): Promise<{ duplicates: Array<{ id: number; similarity: number }>; hasDuplicates: boolean }> {
    try {
      const db = await getDb();
      if (!db) return { duplicates: [], hasDuplicates: false };

      // Find similar defects from same supplier, same part, last 90 days
      const cutoff = new Date(Date.now() - 90 * 86400000);
      const candidates = await db.select({
        id: defects.id,
        docNumber: defects.docNumber,
        description: defects.description,
        symptom: defects.symptom,
        model: defects.model,
        supplier: defects.supplier,
      }).from(defects)
        .where(and(
          eq(defects.supplier, (defect.supplierName || defect.supplier) as string),
          sql`${defects.id} != ${defect.id}`,
          sql`${defects.createdAt} >= ${cutoff}`
        ))
        .orderBy(desc(defects.createdAt))
        .limit(20);

      if (candidates.length === 0) return { duplicates: [], hasDuplicates: false };

      // Use LLM to assess similarity
      const currentDesc = `${defect.description || ""} ${defect.symptom || ""} ${defect.model || ""}`;
      const candidateDescs = candidates.map(c =>
        `ID:${c.id} Doc:${c.docNumber} - ${c.description || ""} ${c.symptom || ""} Model:${c.model || ""}`
      ).join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a duplicate defect detector. Compare the new defect against candidates and identify potential duplicates (similarity > 0.7). Respond with JSON: {"duplicates": [{"id": number, "similarity": 0.0-1.0}]}`
          },
          {
            role: "user",
            content: `New defect: ${currentDesc}\n\nCandidates:\n${candidateDescs}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "duplicate_detection",
            strict: true,
            schema: {
              type: "object",
              properties: {
                duplicates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer", description: "Defect ID" },
                      similarity: { type: "number", description: "Similarity score 0-1" },
                    },
                    required: ["id", "similarity"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["duplicates"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : '{"duplicates":[]}');
      const highSimilarity = (parsed.duplicates || []).filter((d: any) => d.similarity >= 0.7);

      return {
        duplicates: highSimilarity,
        hasDuplicates: highSimilarity.length > 0,
      };
    } catch (error) {
      console.error("[TriageAgent] Duplicate detection error:", error);
      return { duplicates: [], hasDuplicates: false };
    }
  }
}

// Singleton
export const triageAgent = new TriageAgent();
