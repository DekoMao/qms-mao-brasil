import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date, boolean, json } from "drizzle-orm/mysql-core";

// =====================================================
// USERS TABLE (Core auth)
// =====================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "sqa", "supplier", "viewer"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// =====================================================
// DEFECTS TABLE (Main entity)
// =====================================================
export const defects = mysqlTable("defects", {
  // Identification
  id: int("id").autoincrement().primaryKey(),
  docNumber: varchar("docNumber", { length: 20 }).notNull().unique(),
  openDate: varchar("openDate", { length: 20 }).notNull(),
  year: int("year"),
  weekKey: varchar("weekKey", { length: 10 }),
  monthName: varchar("monthName", { length: 20 }),

  // Classification
  mg: mysqlEnum("mg", ["S", "A", "B", "C"]),
  defectsSeverity: varchar("defectsSeverity", { length: 100 }),
  category: varchar("category", { length: 100 }),

  // Product
  model: varchar("model", { length: 100 }),
  customer: varchar("customer", { length: 100 }),
  pn: varchar("pn", { length: 100 }),
  material: varchar("material", { length: 200 }),

  // Defect
  symptom: varchar("symptom", { length: 500 }),
  detection: varchar("detection", { length: 200 }),
  rate: decimal("rate", { precision: 10, scale: 4 }),
  qty: int("qty"),

  // Description
  description: text("description"),
  evidence: text("evidence"),

  // 8D Process
  cause: text("cause"),
  correctiveActions: text("correctiveActions"),
  trackingProgress: text("trackingProgress"),

  // Supplier
  supplier: varchar("supplier", { length: 200 }),
  supplyFeedback: text("supplyFeedback"),
  statusSupplyFB: mysqlEnum("statusSupplyFB", ["On Time", "Late Replay", "DELAYED", "ONGOING"]),

  // Governance
  owner: varchar("owner", { length: 100 }),
  targetDate: varchar("targetDate", { length: 20 }),
  checkSolution: boolean("checkSolution").default(false),
  qcrNumber: varchar("qcrNumber", { length: 50 }),
  occurrence: varchar("occurrence", { length: 20 }),

  // 8D Dates
  dateDisposition: varchar("dateDisposition", { length: 20 }),
  dateTechAnalysis: varchar("dateTechAnalysis", { length: 20 }),
  dateRootCause: varchar("dateRootCause", { length: 20 }),
  dateCorrectiveAction: varchar("dateCorrectiveAction", { length: 20 }),
  dateValidation: varchar("dateValidation", { length: 20 }),

  // Workflow
  step: mysqlEnum("step", [
    "Aguardando Disposição",
    "Aguardando Análise Técnica",
    "Aguardando Causa Raiz",
    "Aguardando Ação Corretiva",
    "Aguardando Validação de Ação Corretiva",
    "CLOSED"
  ]).default("Aguardando Disposição"),
  status: mysqlEnum("status", ["CLOSED", "ONGOING", "DELAYED", "Waiting for CHK Solution"]).default("ONGOING"),
  closeWeekKey: varchar("closeWeekKey", { length: 10 }),

  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy"),
  updatedBy: int("updatedBy"),
});

export type Defect = typeof defects.$inferSelect;
export type InsertDefect = typeof defects.$inferInsert;

// =====================================================
// AUDIT LOG TABLE (Immutable history)
// =====================================================
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  userId: int("userId"),
  userName: varchar("userName", { length: 100 }),
  action: mysqlEnum("action", ["CREATE", "UPDATE", "DELETE", "ADVANCE_STEP"]).notNull(),
  fieldName: varchar("fieldName", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata"),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// =====================================================
// COMMENTS TABLE (Collaboration)
// =====================================================
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  userId: int("userId"),
  userName: varchar("userName", { length: 100 }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// =====================================================
// ATTACHMENTS TABLE (Evidence files)
// =====================================================
export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  defectId: int("defectId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  uploadedBy: int("uploadedBy"),
  uploadedByName: varchar("uploadedByName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

// =====================================================
// IMPORT LOGS TABLE (Data import tracking)
// =====================================================
export const importLogs = mysqlTable("import_logs", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  totalRows: int("totalRows").notNull(),
  successRows: int("successRows").notNull(),
  errorRows: int("errorRows").notNull(),
  errors: json("errors"),
  importedBy: int("importedBy"),
  importedByName: varchar("importedByName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = typeof importLogs.$inferInsert;
