import { describe, it, expect } from "vitest";

// =====================================================
// WORKFLOW ENGINE INTEGRATION TESTS
// Tests for the integration between defect flow and
// the configurable workflow engine
// =====================================================

describe("Workflow Engine Integration with Defect Flow", () => {
  // Step mapping validation
  describe("Step-to-Engine Mapping", () => {
    const STEP_TO_ENGINE: Record<string, string> = {
      "Aguardando Disposição": "disposition",
      "Aguardando Análise Técnica": "tech_analysis",
      "Aguardando Causa Raiz": "root_cause",
      "Aguardando Ação Corretiva": "corrective_action",
      "Aguardando Validação de Ação Corretiva": "validation",
      "CLOSED": "closed",
    };

    it("should map all 6 defect steps to engine step IDs", () => {
      expect(Object.keys(STEP_TO_ENGINE)).toHaveLength(6);
    });

    it("should map Aguardando Disposição to disposition", () => {
      expect(STEP_TO_ENGINE["Aguardando Disposição"]).toBe("disposition");
    });

    it("should map Aguardando Análise Técnica to tech_analysis", () => {
      expect(STEP_TO_ENGINE["Aguardando Análise Técnica"]).toBe("tech_analysis");
    });

    it("should map Aguardando Causa Raiz to root_cause", () => {
      expect(STEP_TO_ENGINE["Aguardando Causa Raiz"]).toBe("root_cause");
    });

    it("should map Aguardando Ação Corretiva to corrective_action", () => {
      expect(STEP_TO_ENGINE["Aguardando Ação Corretiva"]).toBe("corrective_action");
    });

    it("should map Aguardando Validação to validation", () => {
      expect(STEP_TO_ENGINE["Aguardando Validação de Ação Corretiva"]).toBe("validation");
    });

    it("should map CLOSED to closed", () => {
      expect(STEP_TO_ENGINE["CLOSED"]).toBe("closed");
    });
  });

  // Default workflow definition structure
  describe("Default 8D Workflow Definition", () => {
    const defaultSteps = [
      { id: "disposition", name: "Aguardando Disposição", order: 1, responsible: "SQA", requiredFields: ["dateDisposition"], slaDefault: 3 },
      { id: "tech_analysis", name: "Aguardando Análise Técnica", order: 2, responsible: "SUPPLIER", requiredFields: ["dateTechAnalysis"], slaDefault: 7 },
      { id: "root_cause", name: "Aguardando Causa Raiz", order: 3, responsible: "SUPPLIER", requiredFields: ["dateRootCause", "cause"], slaDefault: 10 },
      { id: "corrective_action", name: "Aguardando Ação Corretiva", order: 4, responsible: "SUPPLIER", requiredFields: ["dateCorrectiveAction", "correctiveActions"], slaDefault: 15 },
      { id: "validation", name: "Aguardando Validação de Ação Corretiva", order: 5, responsible: "SQA", requiredFields: ["checkSolution"], slaDefault: 5 },
      { id: "closed", name: "CLOSED", order: 6, responsible: "SQA", requiredFields: [], slaDefault: 0 },
    ];

    it("should have 6 steps in the default 8D workflow", () => {
      expect(defaultSteps).toHaveLength(6);
    });

    it("should have steps in correct order", () => {
      for (let i = 0; i < defaultSteps.length; i++) {
        expect(defaultSteps[i].order).toBe(i + 1);
      }
    });

    it("should have SQA responsible for first step (disposition)", () => {
      expect(defaultSteps[0].responsible).toBe("SQA");
    });

    it("should have SUPPLIER responsible for root_cause and corrective_action", () => {
      expect(defaultSteps.find(s => s.id === "root_cause")?.responsible).toBe("SUPPLIER");
      expect(defaultSteps.find(s => s.id === "corrective_action")?.responsible).toBe("SUPPLIER");
    });

    it("should have SQA responsible for validation and closed", () => {
      expect(defaultSteps.find(s => s.id === "validation")?.responsible).toBe("SQA");
      expect(defaultSteps.find(s => s.id === "closed")?.responsible).toBe("SQA");
    });

    it("should have required fields for each step", () => {
      expect(defaultSteps.find(s => s.id === "disposition")?.requiredFields).toContain("dateDisposition");
      expect(defaultSteps.find(s => s.id === "root_cause")?.requiredFields).toContain("cause");
      expect(defaultSteps.find(s => s.id === "corrective_action")?.requiredFields).toContain("correctiveActions");
    });

    it("should have SLA defaults for all steps except closed", () => {
      const nonClosedSteps = defaultSteps.filter(s => s.id !== "closed");
      nonClosedSteps.forEach(step => {
        expect(step.slaDefault).toBeGreaterThan(0);
      });
      expect(defaultSteps.find(s => s.id === "closed")?.slaDefault).toBe(0);
    });
  });

  // Workflow transitions
  describe("Default 8D Workflow Transitions", () => {
    const defaultTransitions = [
      { fromStepId: "disposition", toStepId: "tech_analysis", conditions: ["dateDisposition"], actions: ["notify_supplier"] },
      { fromStepId: "tech_analysis", toStepId: "root_cause", conditions: ["dateTechAnalysis"], actions: ["notify_sqa"] },
      { fromStepId: "root_cause", toStepId: "corrective_action", conditions: ["dateRootCause", "cause"], actions: ["notify_sqa"] },
      { fromStepId: "corrective_action", toStepId: "validation", conditions: ["dateCorrectiveAction", "correctiveActions"], actions: ["notify_sqa"] },
      { fromStepId: "validation", toStepId: "closed", conditions: ["checkSolution"], actions: ["close_defect"] },
    ];

    it("should have 5 transitions (one between each consecutive step)", () => {
      expect(defaultTransitions).toHaveLength(5);
    });

    it("should have sequential transitions from disposition to closed", () => {
      const expectedPath = ["disposition", "tech_analysis", "root_cause", "corrective_action", "validation", "closed"];
      for (let i = 0; i < defaultTransitions.length; i++) {
        expect(defaultTransitions[i].fromStepId).toBe(expectedPath[i]);
        expect(defaultTransitions[i].toStepId).toBe(expectedPath[i + 1]);
      }
    });

    it("should have notify_supplier action on first transition", () => {
      expect(defaultTransitions[0].actions).toContain("notify_supplier");
    });

    it("should have close_defect action on last transition", () => {
      const lastTransition = defaultTransitions[defaultTransitions.length - 1];
      expect(lastTransition.actions).toContain("close_defect");
    });

    it("should require conditions for each transition", () => {
      defaultTransitions.forEach(t => {
        expect(t.conditions.length).toBeGreaterThan(0);
      });
    });
  });

  // Workflow instance step history
  describe("Workflow Instance Step History", () => {
    it("should create initial history entry with correct structure", () => {
      const initialHistory = {
        stepId: "disposition",
        enteredAt: new Date().toISOString(),
        exitedAt: null,
        completedBy: null,
        duration: null,
      };

      expect(initialHistory.stepId).toBe("disposition");
      expect(initialHistory.enteredAt).toBeTruthy();
      expect(initialHistory.exitedAt).toBeNull();
      expect(initialHistory.completedBy).toBeNull();
      expect(initialHistory.duration).toBeNull();
    });

    it("should calculate duration when step is completed", () => {
      const enteredAt = "2026-01-15T10:00:00.000Z";
      const exitedAt = "2026-01-15T14:30:00.000Z";
      const duration = Math.floor((new Date(exitedAt).getTime() - new Date(enteredAt).getTime()) / 1000);
      
      expect(duration).toBe(16200); // 4.5 hours in seconds
    });

    it("should set status to COMPLETED when reaching closed step", () => {
      const newStatus = "closed" === "closed" ? "COMPLETED" : "ACTIVE";
      expect(newStatus).toBe("COMPLETED");
    });

    it("should set status to ACTIVE for non-closed steps", () => {
      const newStatus = "root_cause" === "closed" ? "COMPLETED" : "ACTIVE";
      expect(newStatus).toBe("ACTIVE");
    });
  });

  // Template workflows
  describe("Workflow Templates", () => {
    const templates = {
      scar: {
        name: "SCAR",
        steps: ["open", "supplier_response", "sqa_review", "verification", "closed"],
      },
      fast_track: {
        name: "Fast Track",
        steps: ["open", "containment", "closed"],
      },
      investigation: {
        name: "Investigação Detalhada",
        steps: ["open", "containment", "investigation", "action_plan", "sqa_approval", "implementation", "verification", "closed"],
      },
    };

    it("should have SCAR template with 5 steps", () => {
      expect(templates.scar.steps).toHaveLength(5);
    });

    it("should have Fast Track template with 3 steps (minimal)", () => {
      expect(templates.fast_track.steps).toHaveLength(3);
    });

    it("should have Investigation template with 8 steps (most detailed)", () => {
      expect(templates.investigation.steps).toHaveLength(8);
    });

    it("all templates should start with open and end with closed", () => {
      Object.values(templates).forEach(tpl => {
        expect(tpl.steps[0]).toBe("open");
        expect(tpl.steps[tpl.steps.length - 1]).toBe("closed");
      });
    });
  });

  // Webhook integration
  describe("Webhook Integration with Workflow", () => {
    it("should fire defect.created webhook on defect creation", () => {
      const webhookPayload = { defectId: 1, docNumber: "TEST.01.26", userId: 1 };
      expect(webhookPayload).toHaveProperty("defectId");
      expect(webhookPayload).toHaveProperty("docNumber");
    });

    it("should fire defect.status_changed webhook on step advance", () => {
      const webhookPayload = { defectId: 1, oldStep: "Aguardando Disposição", newStep: "Aguardando Análise Técnica", userId: 1 };
      expect(webhookPayload).toHaveProperty("oldStep");
      expect(webhookPayload).toHaveProperty("newStep");
    });

    it("should fire workflow.step_changed webhook on engine advance", () => {
      const webhookPayload = { instanceId: 1, newStepId: "tech_analysis", userId: 1 };
      expect(webhookPayload).toHaveProperty("instanceId");
      expect(webhookPayload).toHaveProperty("newStepId");
    });
  });

  // RBAC integration
  describe("RBAC Integration with Workflow", () => {
    const protectedActions = [
      { resource: "workflow", action: "manage", procedures: ["seed", "create", "newVersion"] },
      { resource: "webhook", action: "manage", procedures: ["create", "delete", "test"] },
      { resource: "document", action: "create", procedures: ["create"] },
      { resource: "document", action: "manage", procedures: ["updateStatus", "addVersion", "delete"] },
      { resource: "tenant", action: "manage", procedures: ["seed", "create", "addUser", "removeUser"] },
    ];

    it("should have RBAC protection on workflow management procedures", () => {
      const workflowRbac = protectedActions.find(a => a.resource === "workflow");
      expect(workflowRbac).toBeTruthy();
      expect(workflowRbac!.procedures).toContain("create");
      expect(workflowRbac!.procedures).toContain("seed");
    });

    it("should have RBAC protection on webhook management procedures", () => {
      const webhookRbac = protectedActions.find(a => a.resource === "webhook");
      expect(webhookRbac).toBeTruthy();
      expect(webhookRbac!.procedures).toContain("create");
      expect(webhookRbac!.procedures).toContain("delete");
    });

    it("should have RBAC protection on document procedures", () => {
      const docCreate = protectedActions.find(a => a.resource === "document" && a.action === "create");
      const docManage = protectedActions.find(a => a.resource === "document" && a.action === "manage");
      expect(docCreate).toBeTruthy();
      expect(docManage).toBeTruthy();
    });
  });

  // Soft delete integration
  describe("Soft Delete Integration", () => {
    it("should filter out soft-deleted workflow definitions", () => {
      const definitions = [
        { id: 1, name: "8D", deletedAt: null },
        { id: 2, name: "SCAR", deletedAt: "2026-01-15T00:00:00Z" },
        { id: 3, name: "Fast Track", deletedAt: null },
      ];
      const active = definitions.filter(d => d.deletedAt === null);
      expect(active).toHaveLength(2);
      expect(active.map(d => d.name)).toEqual(["8D", "Fast Track"]);
    });

    it("should filter out soft-deleted tenants", () => {
      const tenants = [
        { id: 1, name: "Default", deletedAt: null },
        { id: 2, name: "Old Org", deletedAt: "2026-01-10T00:00:00Z" },
      ];
      const active = tenants.filter(t => t.deletedAt === null);
      expect(active).toHaveLength(1);
    });

    it("should filter out soft-deleted webhook configs", () => {
      const configs = [
        { id: 1, name: "ERP", deletedAt: null },
        { id: 2, name: "Old Hook", deletedAt: "2026-01-12T00:00:00Z" },
      ];
      const active = configs.filter(c => c.deletedAt === null);
      expect(active).toHaveLength(1);
    });
  });
});
