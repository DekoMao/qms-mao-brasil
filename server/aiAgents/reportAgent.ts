/**
 * Report Agent — Automated daily digests, executive summaries, natural language queries
 */
import { AgentBase, AgentDecision } from "./agentBase";
import { getDb } from "../db";
import { defects } from "../../drizzle/schema";
import { sql, and, gte, isNull, eq, ne, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export class ReportAgent extends AgentBase {
  constructor() {
    super("report");
  }

  async execute(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const eventType = payload._eventType as string;

    switch (eventType) {
      case "report.daily_digest":
        return this.generateDailyDigest();
      case "report.weekly_summary":
        return this.generateWeeklySummary();
      default:
        if (payload.query) {
          return this.naturalLanguageQuery(payload.query as string);
        }
        return { skipped: true };
    }
  }

  // =====================================================
  // DAILY DIGEST
  // =====================================================
  async generateDailyDigest(): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const yesterday = new Date(Date.now() - 86400000);

    const [newDefects, closedDefects, openTotal, delayedTotal] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(defects)
        .where(and(gte(defects.createdAt, yesterday), isNull(defects.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(defects)
        .where(and(eq(defects.step, "CLOSED"), gte(defects.updatedAt, yesterday), isNull(defects.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(defects)
        .where(and(ne(defects.step, "CLOSED"), isNull(defects.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(defects)
        .where(and(eq(defects.status, "DELAYED"), isNull(defects.deletedAt))),
    ]);

    // Step distribution
    const stepDist = await db.select({
      step: defects.step,
      count: sql<number>`count(*)`,
    }).from(defects)
      .where(and(ne(defects.step, "CLOSED"), isNull(defects.deletedAt)))
      .groupBy(defects.step);

    // Top suppliers by open defects
    const topSuppliers = await db.select({
      supplier: defects.supplier,
      count: sql<number>`count(*)`,
    }).from(defects)
      .where(and(ne(defects.step, "CLOSED"), isNull(defects.deletedAt)))
      .groupBy(defects.supplier)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    const digest: Record<string, unknown> = {
      date: new Date().toISOString().slice(0, 10),
      newDefects: newDefects[0]?.count || 0,
      closedDefects: closedDefects[0]?.count || 0,
      openTotal: openTotal[0]?.count || 0,
      delayedTotal: delayedTotal[0]?.count || 0,
      stepDistribution: stepDist,
      topSuppliers,
    };

    // Generate narrative summary
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a quality management report writer. Generate a concise daily digest in Portuguese (BR). Use professional tone. Max 200 words." },
          { role: "user", content: `Generate daily quality digest for ${digest.date}:\n${JSON.stringify(digest, null, 2)}` },
        ],
      });

      const content = response.choices[0].message.content;
      digest.narrative = typeof content === "string" ? content : "";
    } catch {
      digest.narrative = `Resumo: ${digest.newDefects} novos defeitos, ${digest.closedDefects} fechados. ${digest.openTotal} em aberto (${digest.delayedTotal} atrasados).`;
    }

    const decision: AgentDecision = {
      decisionType: "daily_digest",
      input: { date: digest.date },
      output: digest,
      confidence: 0.95,
    };
    await this.recordDecision(decision);

    return digest;
  }

  // =====================================================
  // WEEKLY SUMMARY
  // =====================================================
  async generateWeeklySummary(): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [created, closed, severityDist] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(defects)
        .where(and(gte(defects.createdAt, weekAgo), isNull(defects.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(defects)
        .where(and(eq(defects.step, "CLOSED"), gte(defects.updatedAt, weekAgo), isNull(defects.deletedAt))),
      db.select({
        mg: defects.mg,
        count: sql<number>`count(*)`,
      }).from(defects)
        .where(and(gte(defects.createdAt, weekAgo), isNull(defects.deletedAt)))
        .groupBy(defects.mg),
    ]);

    const summary: Record<string, unknown> = {
      period: `${weekAgo.toISOString().slice(0, 10)} to ${new Date().toISOString().slice(0, 10)}`,
      created: created[0]?.count || 0,
      closed: closed[0]?.count || 0,
      netChange: (created[0]?.count || 0) - (closed[0]?.count || 0),
      severityDistribution: severityDist,
    };

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a quality management executive report writer. Generate a concise weekly executive summary in Portuguese (BR). Include trends and recommendations. Max 300 words." },
          { role: "user", content: `Generate weekly executive summary:\n${JSON.stringify(summary, null, 2)}` },
        ],
      });
      const content = response.choices[0].message.content;
      summary.executiveSummary = typeof content === "string" ? content : "";
    } catch {
      const nc = summary.netChange as number;
      summary.executiveSummary = `Semana: ${summary.created} criados, ${summary.closed} fechados. Saldo: ${nc > 0 ? "+" : ""}${nc}.`;
    }

    const decision: AgentDecision = {
      decisionType: "weekly_summary",
      input: { period: summary.period },
      output: summary,
      confidence: 0.95,
    };
    await this.recordDecision(decision);

    return summary;
  }

  // =====================================================
  // NATURAL LANGUAGE QUERY
  // =====================================================
  async naturalLanguageQuery(query: string): Promise<Record<string, unknown>> {
    const db = await getDb();
    if (!db) return { error: "DB not available" };

    // Get summary stats for context
    const [total, open, closed] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(defects).where(isNull(defects.deletedAt)),
      db.select({ count: sql<number>`count(*)` }).from(defects).where(and(ne(defects.step, "CLOSED"), isNull(defects.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(defects).where(and(eq(defects.step, "CLOSED"), isNull(defects.deletedAt))),
    ]);

    const recentDefects = await db.select({
      id: defects.id,
      docNumber: defects.docNumber,
      supplier: defects.supplier,
      symptom: defects.symptom,
      mg: defects.mg,
      step: defects.step,
      status: defects.status,
      model: defects.model,
    }).from(defects)
      .where(isNull(defects.deletedAt))
      .orderBy(desc(defects.createdAt))
      .limit(50);

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a quality data analyst. Answer questions about manufacturing defects in Portuguese (BR). Use the provided data context. Be precise with numbers.
Context: Total: ${total[0]?.count || 0}, Open: ${open[0]?.count || 0}, Closed: ${closed[0]?.count || 0}`
          },
          {
            role: "user",
            content: `Question: ${query}\n\nRecent defects data:\n${JSON.stringify(recentDefects.slice(0, 20), null, 2)}`
          },
        ],
      });

      const content = response.choices[0].message.content;
      return {
        query,
        answer: typeof content === "string" ? content : "Não foi possível processar a consulta.",
        dataContext: { total: total[0]?.count, open: open[0]?.count, closed: closed[0]?.count },
      };
    } catch (error) {
      return { query, error: "Failed to process natural language query" };
    }
  }
}

// Singleton
export const reportAgent = new ReportAgent();
