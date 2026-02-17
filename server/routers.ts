import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getDefects,
  getDefectById,
  getDefectByDocNumber,
  createDefect,
  updateDefect,
  deleteDefect,
  createAuditLog,
  getAuditLogsForDefect,
  createComment,
  getCommentsForDefect,
  createAttachment,
  getAttachmentsForDefect,
  deleteAttachment,
  createImportLog,
  getImportLogs,
  getDefectStats,
  getFilterOptions,
  // Supplier Portal
  getSuppliers,
  getSupplierById,
  getSupplierByAccessCode,
  getSupplierByName,
  createSupplier,
  updateSupplier,
  getDefectsForSupplier,
  // SLA & Notifications
  getSlaConfigs,
  createSlaConfig,
  updateSlaConfig,
  getDefaultSlaForStep,
  createNotification,
  getNotifications,
  updateNotificationStatus,
  getPendingNotifications,
  getNotificationRecipients,
  createNotificationRecipient,
  deleteNotificationRecipient,
  checkSlaViolations,
  // RCA Analysis
  getRootCauseCategories,
  createRootCauseCategory,
  getRootCauseAnalysis,
  // Supplier Merge
  mergeSuppliers,
  // COPQ
  getCostsByDefect,
  addDefectCost,
  updateDefectCost,
  softDeleteDefectCost,
  getCopqDashboard,
  getCostDefaults,
  inferCostCategory,
  // Scorecard
  getAllSupplierScores,
  calculateSupplierScore,
  getScoreConfigs,
  updateScoreConfig,
  getScoreHistory,
  saveScoreHistory,
  initializeScoreConfigs,
  // AI
  getAiSuggestions,
  createAiSuggestion,
  updateAiSuggestion,
  getSimilarDefects,
} from "./db";
import { calculateStep, calculateResponsible } from "../shared/defectLogic";
import { notifyOwner } from "./_core/notification";

// =====================================================
// DEFECT ROUTER
// =====================================================
const defectRouter = router({
  // List all defects with filters
  list: publicProcedure
    .input(z.object({
      year: z.number().optional(),
      month: z.string().optional(),
      weekKey: z.string().optional(),
      supplier: z.string().optional(),
      symptom: z.string().optional(),
      status: z.string().optional(),
      step: z.string().optional(),
      bucketAging: z.string().optional(),
      search: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      mg: z.string().optional(),
      model: z.string().optional(),
      customer: z.string().optional(),
      owner: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return getDefects(input);
    }),

  // Get single defect by ID
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const defect = await getDefectById(input.id);
      if (!defect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }
      return defect;
    }),

  // Get defect by docNumber
  byDocNumber: publicProcedure
    .input(z.object({ docNumber: z.string() }))
    .query(async ({ input }) => {
      const defect = await getDefectByDocNumber(input.docNumber);
      if (!defect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }
      return defect;
    }),

  // Create new defect
  create: protectedProcedure
    .input(z.object({
      docNumber: z.string().min(1),
      openDate: z.string(),
      mg: z.enum(["S", "A", "B", "C"]).optional(),
      defectsSeverity: z.string().optional(),
      category: z.string().optional(),
      model: z.string().optional(),
      customer: z.string().optional(),
      pn: z.string().optional(),
      material: z.string().optional(),
      symptom: z.string().optional(),
      detection: z.string().optional(),
      rate: z.string().optional(),
      qty: z.number().optional(),
      description: z.string().optional(),
      evidence: z.string().optional(),
      supplier: z.string().optional(),
      owner: z.string().optional(),
      targetDate: z.string().optional(),
      qcrNumber: z.string().optional(),
      occurrence: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check for duplicate docNumber
      const existing = await getDefectByDocNumber(input.docNumber);
      if (existing) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: `Defect with docNumber ${input.docNumber} already exists` 
        });
      }

      const defect = await createDefect({
        ...input,
        openDate: input.openDate,
        targetDate: input.targetDate || null,
        occurrence: input.occurrence || null,
        rate: input.rate || null,
      }, ctx.user.id);

      // Create audit log
      await createAuditLog({
        defectId: defect!.id,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "CREATE",
        newValue: JSON.stringify(input),
      });

      return defect;
    }),

  // Update defect
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      docNumber: z.string().optional(),
      openDate: z.string().optional(),
      mg: z.enum(["S", "A", "B", "C"]).nullable().optional(),
      defectsSeverity: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
      model: z.string().nullable().optional(),
      customer: z.string().nullable().optional(),
      pn: z.string().nullable().optional(),
      material: z.string().nullable().optional(),
      symptom: z.string().nullable().optional(),
      detection: z.string().nullable().optional(),
      rate: z.string().nullable().optional(),
      qty: z.number().nullable().optional(),
      description: z.string().nullable().optional(),
      evidence: z.string().nullable().optional(),
      cause: z.string().nullable().optional(),
      correctiveActions: z.string().nullable().optional(),
      trackingProgress: z.string().nullable().optional(),
      supplier: z.string().nullable().optional(),
      supplyFeedback: z.string().nullable().optional(),
      statusSupplyFB: z.enum(["On Time", "Late Replay", "DELAYED", "ONGOING"]).nullable().optional(),
      owner: z.string().nullable().optional(),
      targetDate: z.string().nullable().optional(),
      checkSolution: z.boolean().nullable().optional(),
      qcrNumber: z.string().nullable().optional(),
      occurrence: z.string().nullable().optional(),
      dateDisposition: z.string().nullable().optional(),
      dateTechAnalysis: z.string().nullable().optional(),
      dateRootCause: z.string().nullable().optional(),
      dateCorrectiveAction: z.string().nullable().optional(),
      dateValidation: z.string().nullable().optional(),
      status: z.enum(["CLOSED", "ONGOING", "DELAYED", "Waiting for CHK Solution"]).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      // Get current defect for audit log
      const currentDefect = await getDefectById(id);
      if (!currentDefect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }

      // Track changed fields for audit
      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          const oldValue = (currentDefect as any)[key];
          if (oldValue !== value) {
            changes.push({ field: key, oldValue, newValue: value });
          }
        }
      }

      const defect = await updateDefect(id, updateData as any, ctx.user.id);

      // Create audit logs for each changed field
      for (const change of changes) {
        await createAuditLog({
          defectId: id,
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "UPDATE",
          fieldName: change.field,
          oldValue: String(change.oldValue ?? ""),
          newValue: String(change.newValue ?? ""),
        });
      }

      return defect;
    }),

  // Advance workflow step
  advanceStep: protectedProcedure
    .input(z.object({
      id: z.number(),
      step: z.enum([
        "Aguardando Disposição",
        "Aguardando Análise Técnica",
        "Aguardando Causa Raiz",
        "Aguardando Ação Corretiva",
        "Aguardando Validação de Ação Corretiva",
        "CLOSED"
      ]),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, step } = input;
      const currentDefect = await getDefectById(id);
      if (!currentDefect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }

      const today = new Date().toISOString().split("T")[0];
      const updateData: Record<string, any> = {};

      // Set the appropriate date based on the step being completed
      switch (step) {
        case "Aguardando Análise Técnica":
          updateData.dateDisposition = today;
          break;
        case "Aguardando Causa Raiz":
          updateData.dateTechAnalysis = today;
          break;
        case "Aguardando Ação Corretiva":
          updateData.dateRootCause = today;
          break;
        case "Aguardando Validação de Ação Corretiva":
          updateData.dateCorrectiveAction = today;
          break;
        case "CLOSED":
          updateData.dateValidation = today;
          updateData.status = "CLOSED";
          break;
      }

      const defect = await updateDefect(id, updateData, ctx.user.id);

      // Create audit log
      await createAuditLog({
        defectId: id,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "ADVANCE_STEP",
        fieldName: "step",
        oldValue: currentDefect.step,
        newValue: step,
      });

      return defect;
    }),

  // Delete defect
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const defect = await getDefectById(input.id);
      if (!defect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Defect not found" });
      }

      // Create audit log before deletion
      await createAuditLog({
        defectId: input.id,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "DELETE",
        oldValue: JSON.stringify(defect),
      });

      await deleteDefect(input.id);
      return { success: true };
    }),

  // Get audit logs for a defect
  auditLogs: publicProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getAuditLogsForDefect(input.defectId);
    }),

  // Get statistics (with optional period filter)
  stats: publicProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return getDefectStats(input);
    }),

  // Get filter options
  filterOptions: publicProcedure.query(async () => {
    return getFilterOptions();
  }),

  // Export filtered defects to Excel (base64)
  exportExcel: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      month: z.string().optional(),
      weekKey: z.string().optional(),
      supplier: z.string().optional(),
      symptom: z.string().optional(),
      status: z.string().optional(),
      step: z.string().optional(),
      bucketAging: z.string().optional(),
      search: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      mg: z.string().optional(),
      model: z.string().optional(),
      customer: z.string().optional(),
      owner: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const { data } = await getDefects({ ...input, pageSize: 10000 });
      const XLSX = await import("xlsx");
      const rows = data.map((d: any) => ({
        "Doc N\u00ba": d.docNumber,
        "Data Abertura": d.openDate,
        "Ano": d.year,
        "Semana": d.weekKey,
        "Severidade": d.mg,
        "Categoria": d.category,
        "Modelo": d.model,
        "Cliente": d.customer,
        "PN": d.pn,
        "Material": d.material,
        "Sintoma": d.symptom,
        "Detec\u00e7\u00e3o": d.detection,
        "Qtd": d.qty,
        "Descri\u00e7\u00e3o": d.description,
        "Fornecedor": d.supplier,
        "Status": d.status,
        "Etapa": d.step,
        "Respons\u00e1vel": d.currentResponsible,
        "Aging (dias)": d.aging,
        "Dias Atraso": d.daysLate,
        "Bucket Aging": d.bucketAging,
        "Causa": d.cause,
        "A\u00e7\u00f5es Corretivas": d.correctiveActions,
        "Owner": d.owner,
        "Data Alvo": d.targetDate,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Defeitos");
      const buf = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return { base64: buf, filename: `QTrack_Defeitos_${new Date().toISOString().slice(0,10)}.xlsx` };
    }),
});

// =====================================================
// COMMENT ROUTER
// =====================================================
const commentRouter = router({
  list: publicProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getCommentsForDefect(input.defectId);
    }),

  create: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createComment({
        defectId: input.defectId,
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        content: input.content,
      });
      return { id };
    }),
});

// =====================================================
// ATTACHMENT ROUTER
// =====================================================
const attachmentRouter = router({
  list: publicProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getAttachmentsForDefect(input.defectId);
    }),

  create: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      fileName: z.string(),
      fileUrl: z.string(),
      fileKey: z.string(),
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createAttachment({
        ...input,
        uploadedBy: ctx.user.id,
        uploadedByName: ctx.user.name || "Unknown",
      });
      return { id };
    }),

  // Upload file (base64) to S3 and create attachment record
  upload: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      fileName: z.string(),
      fileData: z.string(), // base64 encoded
      mimeType: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { defectId, fileName, fileData, mimeType, fileSize } = input;
      
      // Max 10MB
      if (fileSize > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Arquivo muito grande (max 10MB)" });
      }
      
      const { storagePut } = await import("./storage");
      
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `defects/${defectId}/evidence/${timestamp}-${randomSuffix}-${sanitizedFileName}`;
      
      const fileBuffer = Buffer.from(fileData, 'base64');
      const { url } = await storagePut(fileKey, fileBuffer, mimeType);
      
      const id = await createAttachment({
        defectId,
        fileName,
        fileUrl: url,
        fileKey,
        mimeType,
        fileSize,
        uploadedBy: ctx.user.id,
        uploadedByName: ctx.user.name || "Unknown",
      });

      await createAuditLog({
        defectId,
        userName: ctx.user.name || "System",
        action: "UPDATE",
        fieldName: "evidence_upload",
        newValue: fileName,
      });

      return { id, fileName, fileUrl: url, fileKey, mimeType, fileSize };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAttachment(input.id);
      return { success: true };
    }),
});

// =====================================================
// IMPORT ROUTER
// =====================================================
const importRouter = router({
  logs: publicProcedure.query(async () => {
    return getImportLogs();
  }),

  importData: protectedProcedure
    .input(z.object({
      data: z.array(z.record(z.string(), z.any())),
    }))
    .mutation(async ({ input, ctx }) => {
      const results: { row: number; status: "OK" | "ERROR"; message?: string }[] = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];
        try {
          // Check for duplicate
          if (row.docNumber) {
            const existing = await getDefectByDocNumber(String(row.docNumber));
            if (existing) {
              results.push({ row: i + 1, status: "ERROR", message: `Duplicate docNumber: ${row.docNumber}` });
              errorCount++;
              continue;
            }
          }

          // Create defect
          await createDefect({
            docNumber: String(row.docNumber || `AUTO-${Date.now()}-${i}`),
            openDate: String(row.openDate || new Date().toISOString().split("T")[0]),
            mg: row.mg as "S" | "A" | "B" | "C" | null,
            defectsSeverity: row.defectsSeverity as string | null,
            category: row.category as string | null,
            model: row.model as string | null,
            customer: row.customer as string | null,
            pn: row.pn as string | null,
            material: row.material as string | null,
            symptom: row.symptom as string | null,
            detection: row.detection as string | null,
            rate: row.rate as string | null,
            qty: row.qty ? parseInt(String(row.qty)) : null,
            description: row.description as string | null,
            evidence: row.evidence as string | null,
            cause: row.cause as string | null,
            correctiveActions: row.correctiveActions as string | null,
            trackingProgress: row.trackingProgress as string | null,
            supplier: row.supplier as string | null,
            supplyFeedback: row.supplyFeedback as string | null,
            statusSupplyFB: row.statusSupplyFB as "On Time" | "Late Replay" | "DELAYED" | "ONGOING" | null,
            owner: row.owner as string | null,
            targetDate: row.targetDate as string | null,
            checkSolution: row.checkSolution === "true" || row.checkSolution === true,
            qcrNumber: row.qcrNumber as string | null,
            occurrence: row.occurrence as string | null,
            dateDisposition: row.dateDisposition as string | null,
            dateTechAnalysis: row.dateTechAnalysis as string | null,
            dateRootCause: row.dateRootCause as string | null,
            dateCorrectiveAction: row.dateCorrectiveAction as string | null,
            dateValidation: row.dateValidation as string | null,
            status: row.status as "CLOSED" | "ONGOING" | "DELAYED" | "Waiting for CHK Solution" | null,
          }, ctx.user.id);

          results.push({ row: i + 1, status: "OK" });
          successCount++;
        } catch (error: any) {
          results.push({ row: i + 1, status: "ERROR", message: error.message });
          errorCount++;
        }
      }

      // Create import log
      await createImportLog({
        fileName: "Manual Import",
        totalRows: input.data.length,
        successRows: successCount,
        errorRows: errorCount,
        errors: results.filter(r => r.status === "ERROR"),
        importedBy: ctx.user.id,
        importedByName: ctx.user.name || "Unknown",
      });

      return { results, successCount, errorCount };
    }),
});

// =====================================================
// SUPPLIER ROUTER (Portal do Fornecedor)
// =====================================================
const supplierRouter = router({
  // List all suppliers (admin only)
  list: protectedProcedure.query(async () => {
    return getSuppliers();
  }),

  // Get supplier by ID
  byId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const supplier = await getSupplierById(input.id);
      if (!supplier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      }
      return supplier;
    }),

  // Supplier login with access code
  loginWithCode: publicProcedure
    .input(z.object({ accessCode: z.string() }))
    .mutation(async ({ input }) => {
      const supplier = await getSupplierByAccessCode(input.accessCode);
      if (!supplier) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid access code" });
      }
      return { supplier, token: `supplier-${supplier.id}-${Date.now()}` };
    }),

  // Get defects for supplier (supplier portal)
  myDefects: publicProcedure
    .input(z.object({ supplierName: z.string() }))
    .query(async ({ input }) => {
      return getDefectsForSupplier(input.supplierName);
    }),

  // Create new supplier
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      code: z.string().optional(),
      email: z.string().email().optional(),
      contactName: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Check for duplicate name
      const existing = await getSupplierByName(input.name);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Supplier already exists" });
      }
      return createSupplier(input);
    }),

  // Update supplier
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      code: z.string().optional(),
      email: z.string().email().optional(),
      contactName: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateSupplier(id, data);
    }),

  // Regenerate access code
  regenerateAccessCode: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const newCode = `SUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      return updateSupplier(input.id, { accessCode: newCode } as any);
    }),

  // Supplier updates defect (limited fields)
  updateDefect: publicProcedure
    .input(z.object({
      defectId: z.number(),
      supplierName: z.string(),
      cause: z.string().optional(),
      correctiveActions: z.string().optional(),
      supplyFeedback: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { defectId, supplierName, ...updateData } = input;
      
      // Verify supplier owns this defect
      const defect = await getDefectById(defectId);
      if (!defect || defect.supplier !== supplierName) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const updated = await updateDefect(defectId, updateData);

      // Create audit log
      await createAuditLog({
        defectId,
        userName: `Supplier: ${supplierName}`,
        action: "UPDATE",
        fieldName: "supplier_update",
        newValue: JSON.stringify(updateData),
      });

      return updated;
    }),

  // Merge suppliers (consolidate duplicates)
  merge: protectedProcedure
    .input(z.object({
      targetId: z.number(),
      sourceIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await mergeSuppliers(input.targetId, input.sourceIds, ctx.user.id);
      
      // Create audit log for each merged supplier
      await createAuditLog({
        defectId: 0,
        userName: ctx.user.name || "System",
        action: "UPDATE",
        fieldName: "supplier_merge",
        newValue: JSON.stringify(result),
      });
      
      return result;
    }),

  // Supplier uploads attachment
  uploadAttachment: publicProcedure
    .input(z.object({
      defectId: z.number(),
      supplierName: z.string(),
      fileName: z.string(),
      fileData: z.string(), // base64 encoded
      mimeType: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { defectId, supplierName, fileName, fileData, mimeType, fileSize } = input;
      
      // Verify supplier owns this defect
      const defect = await getDefectById(defectId);
      if (!defect || defect.supplier !== supplierName) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Import storage helper
      const { storagePut } = await import("./storage");
      
      // Generate unique file key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `defects/${defectId}/supplier-attachments/${timestamp}-${randomSuffix}-${sanitizedFileName}`;
      
      // Convert base64 to buffer
      const fileBuffer = Buffer.from(fileData, 'base64');
      
      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, mimeType);
      
      // Save attachment record to database
      const attachmentId = await createAttachment({
        defectId,
        fileName,
        fileUrl: url,
        fileKey,
        mimeType,
        fileSize,
        uploadedByName: `Supplier: ${supplierName}`,
      });

      // Create audit log
      await createAuditLog({
        defectId,
        userName: `Supplier: ${supplierName}`,
        action: "UPDATE",
        fieldName: "attachment_upload",
        newValue: fileName,
      });

      return {
        id: attachmentId,
        fileName,
        fileUrl: url,
        fileKey,
        mimeType,
        fileSize,
      };
    }),
});

// =====================================================
// SLA ROUTER
// =====================================================
const slaRouter = router({
  // Get all SLA configs
  list: protectedProcedure.query(async () => {
    return getSlaConfigs();
  }),

  // Create SLA config
  create: protectedProcedure
    .input(z.object({
      step: z.enum([
        "Aguardando Disposição",
        "Aguardando Análise Técnica",
        "Aguardando Causa Raiz",
        "Aguardando Ação Corretiva",
        "Aguardando Validação de Ação Corretiva"
      ]),
      severityMg: z.enum(["S", "A", "B", "C"]).optional(),
      maxDays: z.number().min(1),
      warningDays: z.number().min(1),
    }))
    .mutation(async ({ input }) => {
      return createSlaConfig(input);
    }),

  // Update SLA config
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      maxDays: z.number().min(1).optional(),
      warningDays: z.number().min(1).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSlaConfig(id, data);
      return { success: true };
    }),

  // Check SLA violations
  checkViolations: protectedProcedure.query(async () => {
    return checkSlaViolations();
  }),
});

// =====================================================
// NOTIFICATION ROUTER
// =====================================================
const notificationRouter = router({
  // Get notifications
  list: protectedProcedure
    .input(z.object({ defectId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getNotifications(input?.defectId);
    }),

  // Get pending notifications
  pending: protectedProcedure.query(async () => {
    return getPendingNotifications();
  }),

  // Get recipients
  recipients: protectedProcedure.query(async () => {
    return getNotificationRecipients();
  }),

  // Add recipient
  addRecipient: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      notificationType: z.enum(["SLA_WARNING", "SLA_EXCEEDED", "STEP_CHANGE", "SUPPLIER_UPDATE", "ALL"]),
    }))
    .mutation(async ({ input }) => {
      return createNotificationRecipient(input);
    }),

  // Remove recipient
  removeRecipient: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteNotificationRecipient(input.id);
      return { success: true };
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateNotificationStatus(input.id, "READ");
      return { success: true };
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async () => {
    const notifications = await getNotifications();
    for (const n of notifications) {
      if (n.status !== "READ") {
        await updateNotificationStatus(n.id, "READ");
      }
    }
    return { success: true };
  }),

  // Delete notification
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await updateNotificationStatus(input.id, "DELETED");
      return { success: true };
    }),

   // Send SLA notifications (called by cron job or manually)
  sendSlaAlerts: protectedProcedure.mutation(async () => {
    const violations = await checkSlaViolations();
    const recipients = await getNotificationRecipients();
    const sentNotifications: number[] = [];
    const ownerNotifications: string[] = [];
    for (const violation of violations) {
      const notificationType = violation.violationType === "EXCEEDED" ? "SLA_EXCEEDED" : "SLA_WARNING";
      const relevantRecipients = recipients.filter(
        (r: any) => r.notificationType === notificationType || r.notificationType === "ALL"
      );
      const subject = violation.violationType === "EXCEEDED"
        ? `[URGENTE] SLA Excedido - Caso ${violation.defect.docNumber}`
        : `[AVISO] SLA Próximo do Limite - Caso ${violation.defect.docNumber}`;
      const body = [
        `Caso: ${violation.defect.docNumber}`,
        `Fornecedor: ${violation.defect.supplier || "N/A"}`,
        `Etapa Atual: ${violation.defect.step}`,
        `Dias na Etapa: ${violation.daysInStep}`,
        `SLA Máximo: ${violation.slaConfig.maxDays} dias`,
        `Status: ${violation.violationType === "EXCEEDED" ? "EXCEDIDO" : "AVISO"}`,
        `Por favor, tome as ações necessárias.`,
      ].join("\n");
      for (const recipient of relevantRecipients) {
        const notificationId = await createNotification({
          defectId: violation.defect.id,
          type: notificationType,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject,
          body,
        });
        sentNotifications.push(notificationId);
        // Mark as SENT
        await updateNotificationStatus(notificationId, "SENT");
      }
      ownerNotifications.push(`${subject}\n${body}`);
    }
    // Dispatch aggregated notification to project owner
    if (ownerNotifications.length > 0) {
      try {
        await notifyOwner({
          title: `QTrack: ${violations.length} violações de SLA detectadas`,
          content: ownerNotifications.slice(0, 10).join("\n\n---\n\n"),
        });
      } catch (_e) { /* notifyOwner is best-effort */ }
    }
    return {
      violationsFound: violations.length,
      notificationsCreated: sentNotifications.length,
    };
  }),

  // Send notification on step change
  notifyStepChange: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      docNumber: z.string(),
      oldStep: z.string(),
      newStep: z.string(),
      supplier: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const recipients = await getNotificationRecipients();
      const stepRecipients = recipients.filter(
        (r: any) => r.notificationType === "STEP_CHANGE" || r.notificationType === "ALL"
      );
      const subject = `[QTrack] Avanço de Etapa - Caso ${input.docNumber}`;
      const body = [
        `Caso: ${input.docNumber}`,
        `Fornecedor: ${input.supplier || "N/A"}`,
        `Etapa Anterior: ${input.oldStep}`,
        `Nova Etapa: ${input.newStep}`,
      ].join("\n");
      for (const recipient of stepRecipients) {
        const nId = await createNotification({
          defectId: input.defectId,
          type: "STEP_CHANGE",
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject,
          body,
        });
        await updateNotificationStatus(nId, "SENT");
      }
      try {
        await notifyOwner({ title: subject, content: body });
      } catch (_e) { /* best-effort */ }
      return { sent: stepRecipients.length };
    }),

  // Send notification on supplier feedback update
  notifySupplierUpdate: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      docNumber: z.string(),
      supplier: z.string().optional(),
      updateType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const recipients = await getNotificationRecipients();
      const relevantRecipients = recipients.filter(
        (r: any) => r.notificationType === "SUPPLIER_UPDATE" || r.notificationType === "ALL"
      );
      const subject = `[QTrack] Atualização do Fornecedor - Caso ${input.docNumber}`;
      const body = [
        `Caso: ${input.docNumber}`,
        `Fornecedor: ${input.supplier || "N/A"}`,
        `Tipo de Atualização: ${input.updateType}`,
      ].join("\n");
      for (const recipient of relevantRecipients) {
        const nId = await createNotification({
          defectId: input.defectId,
          type: "SUPPLIER_UPDATE",
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject,
          body,
        });
        await updateNotificationStatus(nId, "SENT");
      }
      try {
        await notifyOwner({ title: subject, content: body });
      } catch (_e) { /* best-effort */ }
      return { sent: relevantRecipients.length };
    }),
});

// =====================================================
// RCA (Root Cause Analysis) ROUTER
// =====================================================
const rcaRouter = router({
  // Get RCA analysis data (with optional period filter)
  analysis: publicProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return getRootCauseAnalysis(input);
    }),

  // Get categories
  categories: publicProcedure.query(async () => {
    return getRootCauseCategories();
  }),

  // Create category
  createCategory: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return createRootCauseCategory(input);
    }),
});

/// =====================================================
// COPQ (Cost of Poor Quality) ROUTER
// =====================================================
const copqRouter = router({
  byDefect: protectedProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getCostsByDefect(input.defectId);
    }),

  addCost: protectedProcedure
    .input(z.object({
      defectId: z.number(),
      costType: z.enum(["SCRAP","REWORK","REINSPECTION","DOWNTIME","WARRANTY","RETURN","RECALL","COMPLAINT","INSPECTION","TESTING","AUDIT","TRAINING","PLANNING","QUALIFICATION","OTHER"]),
      amount: z.number().positive(),
      currency: z.string().length(3).default("BRL"),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const costCategory = inferCostCategory(input.costType) as any;
      const id = await addDefectCost({
        defectId: input.defectId,
        costType: input.costType,
        costCategory,
        amount: input.amount.toFixed(2),
        currency: input.currency,
        description: input.description || null,
        createdBy: ctx.user?.id || null,
      });
      await createAuditLog({
        defectId: input.defectId,
        userId: ctx.user?.id || null,
        userName: ctx.user?.name || "Sistema",
        action: "CREATE",
        fieldName: "cost",
        oldValue: null,
        newValue: `${input.costType}: R$ ${input.amount.toFixed(2)}`,
      });
      return { id };
    }),

  updateCost: protectedProcedure
    .input(z.object({
      id: z.number(),
      amount: z.number().positive().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const data: any = {};
      if (input.amount !== undefined) data.amount = input.amount.toFixed(2);
      if (input.description !== undefined) data.description = input.description;
      await updateDefectCost(input.id, data);
      return { success: true };
    }),

  deleteCost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await softDeleteDefectCost(input.id);
      return { success: true };
    }),

  dashboard: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      supplierId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return getCopqDashboard(input);
    }),

  defaults: protectedProcedure.query(async () => {
    return getCostDefaults();
  }),
});

// =====================================================
// SUPPLIER SCORECARD ROUTER
// =====================================================
const scorecardRouter = router({
  list: protectedProcedure.query(async () => {
    await initializeScoreConfigs();
    return getAllSupplierScores();
  }),

  bySupplier: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      const current = await calculateSupplierScore(input.supplierId);
      const history = await getScoreHistory(input.supplierId, 12);
      const historyScores = history.map((h: any) => parseFloat(h.overallScore));
      const avgLast3 = historyScores.length >= 3
        ? historyScores.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / 3
        : null;
      let trend: "UP" | "DOWN" | "STABLE" = "STABLE";
      if (avgLast3 !== null) {
        if (current.overallScore > avgLast3 + 5) trend = "UP";
        else if (current.overallScore < avgLast3 - 5) trend = "DOWN";
      }
      return { current, history, trend };
    }),

  recalculate: protectedProcedure.mutation(async () => {
    const allSuppliers = await getSuppliers();
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    for (const supplier of allSuppliers) {
      const score = await calculateSupplierScore(supplier.id);
      await saveScoreHistory({
        supplierId: supplier.id,
        periodKey,
        overallScore: score.overallScore.toFixed(2),
        grade: score.grade,
        metrics: score.metrics,
      });
    }
    return { recalculated: allSuppliers.length };
  }),

  configs: protectedProcedure.query(async () => {
    await initializeScoreConfigs();
    return getScoreConfigs();
  }),

  updateConfig: protectedProcedure
    .input(z.object({ id: z.number(), weight: z.number().min(0).max(10) }))
    .mutation(async ({ input }) => {
      await updateScoreConfig(input.id, { weight: input.weight.toFixed(2) });
      return { success: true };
    }),
});

// =====================================================
// AI ROUTER
// =====================================================
const aiRouter = router({
  suggestRootCause: protectedProcedure
    .input(z.object({ defectId: z.number(), force: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Check cache (RN-IA-05)
      if (!input.force) {
        const existing = await getAiSuggestions(input.defectId);
        const rootCauseSuggestion = existing.find((s: any) => s.type === "ROOT_CAUSE");
        if (rootCauseSuggestion) return rootCauseSuggestion;
      }
      // Get defect data
      const defect = await getDefectById(input.defectId);
      if (!defect) throw new TRPCError({ code: "NOT_FOUND", message: "Defeito não encontrado" });
      // Get categories and similar defects
      const categories = await getRootCauseCategories();
      const similar = await getSimilarDefects({
        supplier: defect.supplier || undefined,
        model: defect.model || undefined,
      });
      try {
        const { invokeLLM } = await import("./_core/llm");
        const response = await Promise.race([
          invokeLLM({
            messages: [
              {
                role: "system",
                content: `Você é um engenheiro de qualidade especialista em análise de causa raiz (RCA) para defeitos de fornecedores na indústria de manufatura. Analise o defeito descrito e:\n1. Sugira a categoria de causa raiz mais provável\n2. Explique seu raciocínio em 2-3 frases\n3. Sugira 2-3 ações corretivas baseadas em defeitos similares\n4. Avalie sua confiança de 0.0 a 1.0\nResponda APENAS em JSON válido.`
              },
              {
                role: "user",
                content: JSON.stringify({
                  defect: { description: defect.description, symptom: defect.symptom, model: defect.model, supplier: defect.supplier },
                  availableCategories: categories.map((c: any) => c.name),
                  historicalDefects: similar.slice(0, 10),
                })
              }
            ],
            response_format: {
              type: "json_schema" as const,
              json_schema: {
                name: "root_cause_suggestion",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    confidence: { type: "number" },
                    reasoning: { type: "string" },
                    suggestedActions: { type: "array", items: { type: "string" } },
                    similarDefectIds: { type: "array", items: { type: "number" } },
                  },
                  required: ["category","confidence","reasoning","suggestedActions","similarDefectIds"],
                  additionalProperties: false,
                }
              }
            }
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("LLM timeout")), 30000)),
        ]) as any;
        const parsed = JSON.parse(response.choices[0].message.content);
        const suggestionId = await createAiSuggestion({
          defectId: input.defectId,
          type: "ROOT_CAUSE",
          suggestion: parsed.reasoning,
          confidence: String(parsed.confidence),
          suggestedCategory: parsed.category,
          metadata: {
            suggestedActions: parsed.suggestedActions,
            similarDefectIds: parsed.similarDefectIds,
            promptVersion: "1.0",
          },
        });
        const suggestions = await getAiSuggestions(input.defectId);
        return suggestions[0];
      } catch (_err) {
        return { error: "timeout", suggestion: null };
      }
    }),

  respondToSuggestion: protectedProcedure
    .input(z.object({ suggestionId: z.number(), accepted: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      await updateAiSuggestion(input.suggestionId, {
        accepted: input.accepted,
        acceptedBy: ctx.user?.id || null,
        acceptedAt: new Date(),
      });
      return { success: true };
    }),

  byDefect: protectedProcedure
    .input(z.object({ defectId: z.number() }))
    .query(async ({ input }) => {
      return getAiSuggestions(input.defectId);
    }),
});

// =====================================================
// MAIN ROUTER
// =====================================================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  defect: defectRouter,
  comment: commentRouter,
  attachment: attachmentRouter,
  import: importRouter,
  supplier: supplierRouter,
  sla: slaRouter,
  notification: notificationRouter,
  rca: rcaRouter,
  copq: copqRouter,
  scorecard: scorecardRouter,
  ai: aiRouter,
});
export type AppRouter = typeof appRouter;
