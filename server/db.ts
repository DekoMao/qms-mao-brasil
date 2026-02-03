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
  dateFrom?: string;
  dateTo?: string;
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
  
  // Date range filter
  if (filters?.dateFrom) {
    enrichedResults = enrichedResults.filter(d => {
      if (!d.openDate) return false;
      const defectDate = d.openDate.split('/').reverse().join('-'); // Convert DD.MM.YY to YYYY-MM-DD
      return defectDate >= filters.dateFrom!;
    });
  }
  if (filters?.dateTo) {
    enrichedResults = enrichedResults.filter(d => {
      if (!d.openDate) return false;
      const defectDate = d.openDate.split('/').reverse().join('-'); // Convert DD.MM.YY to YYYY-MM-DD
      return defectDate <= filters.dateTo!;
    });
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
  
  // Get suppliers from suppliers table (source of truth) instead of defects
  const allSuppliers = await getSuppliers();
  const supplierNames = allSuppliers.map(s => s.name).sort();

  const years = Array.from(new Set(allDefects.map(d => d.year).filter((y): y is number => y !== null))).sort((a, b) => b - a);
  const months = Array.from(new Set(allDefects.map(d => d.monthName).filter((m): m is string => m !== null)));
  const weekKeys = Array.from(new Set(allDefects.map(d => d.weekKey).filter((w): w is string => w !== null))).sort().reverse();
  const symptoms = Array.from(new Set(allDefects.map(d => d.symptom).filter((s): s is string => s !== null))).sort();

  return {
    years,
    months,
    weekKeys,
    suppliers: supplierNames,
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


// =====================================================
// SUPPLIER FUNCTIONS (Portal do Fornecedor)
// =====================================================
import { 
  suppliers, InsertSupplier, Supplier,
  slaConfigs, InsertSlaConfig,
  notifications, InsertNotification,
  notificationRecipients, InsertNotificationRecipient,
  rootCauseCategories, InsertRootCauseCategory
} from "../drizzle/schema";

export async function getSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).orderBy(suppliers.name);
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getSupplierByAccessCode(accessCode: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliers)
    .where(and(eq(suppliers.accessCode, accessCode), eq(suppliers.isActive, true)))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getSupplierByName(name: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(suppliers).where(eq(suppliers.name, name)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate unique access code
  const accessCode = `SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  const result = await db.insert(suppliers).values({ ...data, accessCode });
  return getSupplierById(result[0].insertId);
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current supplier to check if name is changing
  const currentSupplier = await getSupplierById(id);
  if (!currentSupplier) {
    throw new Error("Fornecedor não encontrado");
  }
  
  // Check if name is being updated and if it already exists for another supplier
  if (data.name && data.name !== currentSupplier.name) {
    const existingSupplier = await getSupplierByName(data.name);
    if (existingSupplier && existingSupplier.id !== id) {
      throw new Error(`Já existe um fornecedor com o nome "${data.name}". Por favor, escolha outro nome ou exclua o fornecedor duplicado.`);
    }
    
    // Update supplier name in all related defects
    await db.update(defects)
      .set({ supplier: data.name })
      .where(eq(defects.supplier, currentSupplier.name));
  }
  
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
  return getSupplierById(id);
}

export async function getDefectsForSupplier(supplierName: string) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select().from(defects)
    .where(eq(defects.supplier, supplierName))
    .orderBy(desc(defects.openDate));
  
  return result.map(enrichDefect);
}

// =====================================================
// SLA CONFIGURATION FUNCTIONS
// =====================================================
export async function getSlaConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(slaConfigs).where(eq(slaConfigs.isActive, true));
}

export async function createSlaConfig(data: InsertSlaConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(slaConfigs).values(data);
  return result[0].insertId;
}

export async function updateSlaConfig(id: number, data: Partial<InsertSlaConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(slaConfigs).set(data).where(eq(slaConfigs.id, id));
}

export async function getDefaultSlaForStep(step: string, severity?: string) {
  const configs = await getSlaConfigs();
  
  // Try to find specific config for step + severity
  let config = configs.find(c => c.step === step && c.severityMg === severity);
  
  // Fallback to step-only config
  if (!config) {
    config = configs.find(c => c.step === step && !c.severityMg);
  }
  
  // Default SLA values
  return config || { maxDays: 7, warningDays: 5 };
}

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getNotifications(defectId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  if (defectId) {
    return db.select().from(notifications)
      .where(eq(notifications.defectId, defectId))
      .orderBy(desc(notifications.createdAt));
  }
  
  return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
}

export async function updateNotificationStatus(id: number, status: "SENT" | "FAILED" | "READ" | "DELETED", errorMessage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status };
  if (status === "SENT") {
    updateData.sentAt = new Date();
  }
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }
  
  await db.update(notifications).set(updateData).where(eq(notifications.id, id));
}

export async function getPendingNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.status, "PENDING"));
}

// =====================================================
// NOTIFICATION RECIPIENTS FUNCTIONS
// =====================================================
export async function getNotificationRecipients(type?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (type) {
    return db.select().from(notificationRecipients)
      .where(and(
        eq(notificationRecipients.isActive, true),
        or(eq(notificationRecipients.notificationType, type as any), eq(notificationRecipients.notificationType, "ALL"))
      ));
  }
  
  return db.select().from(notificationRecipients).where(eq(notificationRecipients.isActive, true));
}

export async function createNotificationRecipient(data: InsertNotificationRecipient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notificationRecipients).values(data);
  return result[0].insertId;
}

export async function deleteNotificationRecipient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notificationRecipients).set({ isActive: false }).where(eq(notificationRecipients.id, id));
}

// =====================================================
// ROOT CAUSE ANALYSIS FUNCTIONS
// =====================================================
export async function getRootCauseCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rootCauseCategories).where(eq(rootCauseCategories.isActive, true));
}

export async function createRootCauseCategory(data: InsertRootCauseCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(rootCauseCategories).values(data);
  return result[0].insertId;
}

export async function getRootCauseAnalysis() {
  const allDefects = await getDefects();
  
  // Extract and categorize root causes
  const causeCounts: Record<string, { count: number; defects: typeof allDefects }> = {};
  
  allDefects.forEach(d => {
    if (d.cause) {
      // Simple categorization - extract first sentence or key phrase
      const causeKey = extractCauseCategory(d.cause);
      if (!causeCounts[causeKey]) {
        causeCounts[causeKey] = { count: 0, defects: [] };
      }
      causeCounts[causeKey].count++;
      causeCounts[causeKey].defects.push(d);
    }
  });
  
  // Sort by count (Pareto)
  const sortedCauses = Object.entries(causeCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([cause, data], index) => ({
      rank: index + 1,
      cause,
      count: data.count,
      percentage: (data.count / allDefects.length * 100).toFixed(1),
      defectIds: data.defects.map(d => d.id),
      suppliers: Array.from(new Set(data.defects.map(d => d.supplier).filter(Boolean))),
      symptoms: Array.from(new Set(data.defects.map(d => d.symptom).filter(Boolean))),
    }));
  
  // Calculate cumulative percentage for Pareto
  let cumulative = 0;
  const paretoData = sortedCauses.map(item => {
    cumulative += parseFloat(item.percentage);
    return { ...item, cumulativePercentage: cumulative.toFixed(1) };
  });
  
  return {
    totalWithCause: allDefects.filter(d => d.cause).length,
    totalWithoutCause: allDefects.filter(d => !d.cause).length,
    topCauses: paretoData.slice(0, 10),
    allCauses: paretoData,
  };
}

// Helper to extract category from cause text
function extractCauseCategory(cause: string): string {
  // Common root cause categories in manufacturing
  const categories = [
    { keywords: ["material", "matéria-prima", "componente", "peça"], category: "Material/Componente" },
    { keywords: ["processo", "procedimento", "método"], category: "Processo/Método" },
    { keywords: ["máquina", "equipamento", "ferramenta"], category: "Máquina/Equipamento" },
    { keywords: ["operador", "mão de obra", "treinamento"], category: "Mão de Obra" },
    { keywords: ["medição", "inspeção", "teste"], category: "Medição/Inspeção" },
    { keywords: ["ambiente", "temperatura", "umidade"], category: "Meio Ambiente" },
    { keywords: ["fornecedor", "supplier"], category: "Fornecedor" },
    { keywords: ["design", "projeto", "especificação"], category: "Design/Projeto" },
  ];
  
  const causeLower = cause.toLowerCase();
  
  for (const cat of categories) {
    if (cat.keywords.some(kw => causeLower.includes(kw))) {
      return cat.category;
    }
  }
  
  // If no category matches, use first 50 chars as identifier
  return cause.substring(0, 50).trim() + (cause.length > 50 ? "..." : "");
}

// =====================================================
// SLA CHECK FUNCTIONS
// =====================================================
export async function checkSlaViolations() {
  const allDefects = await getDefects();
  const slaConfigs = await getSlaConfigs();
  
  const violations: Array<{
    defect: ReturnType<typeof enrichDefect>;
    slaConfig: { maxDays: number; warningDays: number };
    daysInStep: number;
    violationType: "WARNING" | "EXCEEDED";
  }> = [];
  
  for (const defect of allDefects) {
    if (defect.status === "CLOSED") continue;
    
    const sla = await getDefaultSlaForStep(defect.step, defect.mg || undefined);
    const daysInStep = defect.agingByStep;
    
    if (daysInStep >= sla.maxDays) {
      violations.push({
        defect,
        slaConfig: sla,
        daysInStep,
        violationType: "EXCEEDED",
      });
    } else if (daysInStep >= sla.warningDays) {
      violations.push({
        defect,
        slaConfig: sla,
        daysInStep,
        violationType: "WARNING",
      });
    }
  }
  
  return violations;
}
