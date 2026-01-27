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
} from "./db";
import { calculateStep, calculateResponsible } from "../shared/defectLogic";

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

  // Get statistics
  stats: publicProcedure.query(async () => {
    return getDefectStats();
  }),

  // Get filter options
  filterOptions: publicProcedure.query(async () => {
    return getFilterOptions();
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

  // Send SLA notifications (called by cron job or manually)
  sendSlaAlerts: protectedProcedure.mutation(async () => {
    const violations = await checkSlaViolations();
    const recipients = await getNotificationRecipients();
    const sentNotifications: number[] = [];

    for (const violation of violations) {
      const notificationType = violation.violationType === "EXCEEDED" ? "SLA_EXCEEDED" : "SLA_WARNING";
      const relevantRecipients = recipients.filter(
        r => r.notificationType === notificationType || r.notificationType === "ALL"
      );

      for (const recipient of relevantRecipients) {
        const subject = violation.violationType === "EXCEEDED"
          ? `[URGENTE] SLA Excedido - Caso ${violation.defect.docNumber}`
          : `[AVISO] SLA Próximo do Limite - Caso ${violation.defect.docNumber}`;

        const body = `
Caso: ${violation.defect.docNumber}
Fornecedor: ${violation.defect.supplier || "N/A"}
Etapa Atual: ${violation.defect.step}
Dias na Etapa: ${violation.daysInStep}
SLA Máximo: ${violation.slaConfig.maxDays} dias
Status: ${violation.violationType === "EXCEEDED" ? "EXCEDIDO" : "AVISO"}

Por favor, tome as ações necessárias.
        `.trim();

        const notificationId = await createNotification({
          defectId: violation.defect.id,
          type: notificationType,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          subject,
          body,
        });

        sentNotifications.push(notificationId);
      }
    }

    return { 
      violationsFound: violations.length, 
      notificationsCreated: sentNotifications.length 
    };
  }),
});

// =====================================================
// RCA (Root Cause Analysis) ROUTER
// =====================================================
const rcaRouter = router({
  // Get RCA analysis data
  analysis: publicProcedure.query(async () => {
    return getRootCauseAnalysis();
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
});

export type AppRouter = typeof appRouter;
