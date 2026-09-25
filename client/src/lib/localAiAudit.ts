import type { LocalExecution, LocalInsightIntent } from "./localQualityAnalytics";

export type LocalAiAuditRecord = {
  id: string;
  timestamp: string;
  execution: LocalExecution;
  intent: LocalInsightIntent;
  confidence: number;
  latencyMs: number;
  snapshotId: string;
  filterLabel: string;
  modelName?: string;
};

const STORAGE_KEY = "qtrack.localAi.audit.v1";
const MAX_RECORDS = 50;

export function readLocalAiAudit(): LocalAiAuditRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECORDS) : [];
  } catch {
    return [];
  }
}

export function appendLocalAiAudit(record: LocalAiAuditRecord) {
  if (typeof localStorage === "undefined") return;
  const next = [record, ...readLocalAiAudit()].slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearLocalAiAudit() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

export function formatFilterLabel(filters: { dateFrom?: string; dateTo?: string }) {
  if (!filters.dateFrom && !filters.dateTo) return "Todo o período";
  return `${filters.dateFrom || "início"} → ${filters.dateTo || "hoje"}`;
}
