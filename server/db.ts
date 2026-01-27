import { eq, desc, and, like, or, sql, inArray, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  defects, InsertDefect, Defect,
  auditLogs, InsertAuditLog,
  comments, InsertComment,
  attachments, InsertAttachment,
  importLogs, InsertImportLog
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { 
  calculateStep, calculateResponsible, calculateAging, 
  calculateYear, calculateWeekKey, calculateMonthName,
  type DefectDates, type StatusType
} from "../shared/defectLogic";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// =====================================================
// USER FUNCTIONS
// =====================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// =====================================================
// DEFECT FUNCTIONS
// =====================================================

// Helper to enrich defect with calculated fields
function enrichDefect(defect: Defect) {
  const dates: DefectDates = {
    openDate: defect.openDate,
    dateDisposition: defect.dateDisposition,
    dateTechAnalysis: defect.dateTechAnalysis,
    dateRootCause: defect.dateRootCause,
    dateCorrectiveAction: defect.dateCorrectiveAction,
    dateValidation: defect.dateValidation,
    targetDate: defect.targetDate,
  };

  const step = calculateStep(dates);
  const currentResponsible = calculateResponsible(step);
  const status = defect.status || (step === "CLOSED" ? "CLOSED" : "ONGOING") as StatusType;
  const aging = calculateAging(dates, step, status);

  return {
    ...defect,
    step,
    currentResponsible,
    year: calculateYear(defect.openDate),
    weekKey: calculateWeekKey(defect.openDate),
    monthName: calculateMonthName(defect.openDate),
    ...aging,
  };
}

export interface DefectFilters {
  year?: number;
  month?: string;
  weekKey?: string;
  supplier?: string;
  symptom?: string;
  status?: string;
  step?: string;
  bucketAging?: string;
  search?: string;
}

export async function getDefects(filters?: DefectFilters) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(defects);
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters?.supplier) {
    conditions.push(eq(defects.supplier, filters.supplier));
  }
  if (filters?.status) {
    conditions.push(eq(defects.status, filters.status as any));
  }
  if (filters?.step) {
    conditions.push(eq(defects.step, filters.step as any));
  }

  const result = conditions.length > 0 
    ? await db.select().from(defects).where(and(...conditions)).orderBy(desc(defects.openDate))
    : await db.select().from(defects).orderBy(desc(defects.openDate));

  // Enrich with calculated fields and apply client-side filters
  let enrichedResults = result.map(enrichDefect);

  // Apply filters that need calculated fields
  if (filters?.year) {
    enrichedResults = enrichedResults.filter(d => d.year === filters.year);
  }
  if (filters?.month) {
    enrichedResults = enrichedResults.filter(d => d.monthName === filters.month);
  }
  if (filters?.weekKey) {
    enrichedResults = enrichedResults.filter(d => d.weekKey === filters.weekKey);
  }
  if (filters?.bucketAging) {
    enrichedResults = enrichedResults.filter(d => d.bucketAging === filters.bucketAging);
  }
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    enrichedResults = enrichedResults.filter(d => 
      d.docNumber?.toLowerCase().includes(searchLower) ||
      d.pn?.toLowerCase().includes(searchLower) ||
      d.description?.toLowerCase().includes(searchLower) ||
      d.symptom?.toLowerCase().includes(searchLower)
    );
  }

  return enrichedResults;
}

export async function getDefectById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(defects).where(eq(defects.id, id)).limit(1);
  if (result.length === 0) return null;

  return enrichDefect(result[0]);
}

export async function getDefectByDocNumber(docNumber: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(defects).where(eq(defects.docNumber, docNumber)).limit(1);
  if (result.length === 0) return null;

  return enrichDefect(result[0]);
}

export async function createDefect(data: InsertDefect, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate derived fields
  const year = calculateYear(data.openDate);
  const weekKey = calculateWeekKey(data.openDate);
  const monthName = calculateMonthName(data.openDate);

  const insertData = {
    ...data,
    year,
    weekKey,
    monthName,
    createdBy: userId,
    updatedBy: userId,
  };

  const result = await db.insert(defects).values(insertData);
  const insertId = result[0].insertId;

  return getDefectById(insertId);
}

export async function updateDefect(id: number, data: Partial<InsertDefect>, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Recalculate derived fields if openDate changed
  const updateData: any = { ...data, updatedBy: userId };
  if (data.openDate) {
    updateData.year = calculateYear(data.openDate);
    updateData.weekKey = calculateWeekKey(data.openDate);
    updateData.monthName = calculateMonthName(data.openDate);
  }

  await db.update(defects).set(updateData).where(eq(defects.id, id));
  return getDefectById(id);
}

export async function deleteDefect(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(defects).where(eq(defects.id, id));
  return true;
}

// =====================================================
// AUDIT LOG FUNCTIONS
// =====================================================
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;

  await db.insert(auditLogs).values(data);
}

export async function getAuditLogsForDefect(defectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(auditLogs)
    .where(eq(auditLogs.defectId, defectId))
    .orderBy(desc(auditLogs.timestamp));
}

// =====================================================
// COMMENT FUNCTIONS
// =====================================================
export async function createComment(data: InsertComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(comments).values(data);
  return result[0].insertId;
}

export async function getCommentsForDefect(defectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(comments)
    .where(eq(comments.defectId, defectId))
    .orderBy(desc(comments.createdAt));
}

// =====================================================
// ATTACHMENT FUNCTIONS
// =====================================================
export async function createAttachment(data: InsertAttachment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(attachments).values(data);
  return result[0].insertId;
}

export async function getAttachmentsForDefect(defectId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(attachments)
    .where(eq(attachments.defectId, defectId))
    .orderBy(desc(attachments.createdAt));
}

export async function deleteAttachment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(attachments).where(eq(attachments.id, id));
  return true;
}

// =====================================================
// IMPORT LOG FUNCTIONS
// =====================================================
export async function createImportLog(data: InsertImportLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(importLogs).values(data);
  return result[0].insertId;
}

export async function getImportLogs() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(importLogs).orderBy(desc(importLogs.createdAt));
}

// =====================================================
// STATISTICS FUNCTIONS
// =====================================================
export async function getDefectStats() {
  const db = await getDb();
  if (!db) return null;

  const allDefects = await getDefects();

  // Count by status
  const byStatus = allDefects.reduce((acc, d) => {
    const status = d.status || "ONGOING";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by step
  const byStep = allDefects.reduce((acc, d) => {
    acc[d.step] = (acc[d.step] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count by bucket aging
  const byBucketAging = allDefects.reduce((acc, d) => {
    acc[d.bucketAging] = (acc[d.bucketAging] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top 5 symptoms
  const symptomCounts = allDefects.reduce((acc, d) => {
    if (d.symptom) {
      acc[d.symptom] = (acc[d.symptom] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Top 5 suppliers
  const supplierCounts = allDefects.reduce((acc, d) => {
    if (d.supplier) {
      acc[d.supplier] = (acc[d.supplier] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topSuppliers = Object.entries(supplierCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Critical cases (DELAYED or aging > 30)
  const criticalCases = allDefects.filter(d => 
    d.status === "DELAYED" || d.agingTotal > 30
  );

  // Weekly trend
  const weeklyTrend = allDefects.reduce((acc, d) => {
    if (d.weekKey) {
      if (!acc[d.weekKey]) {
        acc[d.weekKey] = { weekKey: d.weekKey, total: 0, closed: 0, ongoing: 0, delayed: 0 };
      }
      acc[d.weekKey].total++;
      if (d.status === "CLOSED") acc[d.weekKey].closed++;
      else if (d.status === "DELAYED") acc[d.weekKey].delayed++;
      else acc[d.weekKey].ongoing++;
    }
    return acc;
  }, {} as Record<string, { weekKey: string; total: number; closed: number; ongoing: number; delayed: number }>);

  return {
    total: allDefects.length,
    byStatus,
    byStep,
    byBucketAging,
    topSymptoms,
    topSuppliers,
    criticalCases: criticalCases.length,
    criticalCasesList: criticalCases.slice(0, 10),
    weeklyTrend: Object.values(weeklyTrend).sort((a, b) => a.weekKey.localeCompare(b.weekKey)),
  };
}

// =====================================================
// FILTER OPTIONS
// =====================================================
export async function getFilterOptions() {
  const db = await getDb();
  if (!db) return null;

  const allDefects = await getDefects();

  const years = Array.from(new Set(allDefects.map(d => d.year).filter((y): y is number => y !== null))).sort((a, b) => b - a);
  const months = Array.from(new Set(allDefects.map(d => d.monthName).filter((m): m is string => m !== null)));
  const weekKeys = Array.from(new Set(allDefects.map(d => d.weekKey).filter((w): w is string => w !== null))).sort().reverse();
  const suppliers = Array.from(new Set(allDefects.map(d => d.supplier).filter((s): s is string => s !== null))).sort();
  const symptoms = Array.from(new Set(allDefects.map(d => d.symptom).filter((s): s is string => s !== null))).sort();

  return {
    years,
    months,
    weekKeys,
    suppliers,
    symptoms,
    statuses: ["CLOSED", "ONGOING", "DELAYED", "Waiting for CHK Solution"],
    steps: [
      "Aguardando Disposição",
      "Aguardando Análise Técnica",
      "Aguardando Causa Raiz",
      "Aguardando Ação Corretiva",
      "Aguardando Validação de Ação Corretiva",
      "CLOSED"
    ],
    bucketAgings: ["<=4", "5-14", "15-29", "30-59", ">60"],
  };
}
