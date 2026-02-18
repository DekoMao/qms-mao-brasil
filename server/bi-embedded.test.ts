/**
 * P4 — BI Embedded Tests
 * Tests for dashboard CRUD, widget CRUD, and data resolver.
 */
import { describe, it, expect } from "vitest";
import {
  getBiDashboards, createBiDashboard, updateBiDashboard, deleteBiDashboard,
  getWidgetsForDashboard, createBiWidget, updateBiWidget, deleteBiWidget,
  resolveWidgetData,
} from "./biResolver";

describe("P4 — BI Embedded", () => {
  let dashboardId: number;
  let widgetId: number;

  describe("Dashboard CRUD", () => {
    it("should create a dashboard", async () => {
      const result = await createBiDashboard({
        userId: 1,
        tenantId: 1,
        name: "Test Dashboard",
        description: "Test description",
      });
      expect(result.id).toBeDefined();
      dashboardId = result.id;
    });

    it("should list dashboards for user", async () => {
      const dashboards = await getBiDashboards(1, 1);
      expect(Array.isArray(dashboards)).toBe(true);
      expect(dashboards.length).toBeGreaterThan(0);
      const found = dashboards.find(d => d.id === dashboardId);
      expect(found).toBeDefined();
      expect(found?.name).toBe("Test Dashboard");
    });

    it("should update a dashboard", async () => {
      const result = await updateBiDashboard(dashboardId, 1, {
        name: "Updated Dashboard",
        description: "Updated description",
      });
      expect(result.success).toBe(true);
    });

    it("should not list deleted dashboards", async () => {
      const tempResult = await createBiDashboard({
        userId: 1,
        tenantId: 1,
        name: "To Delete",
      });
      await deleteBiDashboard(tempResult.id, 1);
      const dashboards = await getBiDashboards(1, 1);
      const found = dashboards.find(d => d.id === tempResult.id);
      expect(found).toBeUndefined();
    });
  });

  describe("Widget CRUD", () => {
    it("should create a widget", async () => {
      const result = await createBiWidget({
        dashboardId,
        widgetType: "KPI_CARD",
        title: "Total Defeitos",
        dataSource: "DEFECT_COUNT",
        position: { x: 0, y: 0, w: 6, h: 4 },
      });
      expect(result.id).toBeDefined();
      widgetId = result.id;
    });

    it("should list widgets for dashboard", async () => {
      const widgets = await getWidgetsForDashboard(dashboardId);
      expect(Array.isArray(widgets)).toBe(true);
      expect(widgets.length).toBeGreaterThan(0);
      const found = widgets.find(w => w.id === widgetId);
      expect(found).toBeDefined();
      expect(found?.title).toBe("Total Defeitos");
    });

    it("should update a widget", async () => {
      const result = await updateBiWidget(widgetId, {
        title: "Updated Widget",
        position: { x: 0, y: 0, w: 12, h: 6 },
      });
      expect(result.success).toBe(true);
    });

    it("should create multiple widget types", async () => {
      const types = ["BAR_CHART", "LINE_CHART", "PIE_CHART", "TABLE"];
      const sources = ["DEFECT_BY_STATUS", "DEFECT_TREND", "COPQ_BY_CATEGORY", "SUPPLIER_RANKING"];

      for (let i = 0; i < types.length; i++) {
        const result = await createBiWidget({
          dashboardId,
          widgetType: types[i],
          title: `Widget ${types[i]}`,
          dataSource: sources[i],
          position: { x: (i % 2) * 6, y: Math.floor(i / 2) * 4 + 4, w: 6, h: 4 },
        });
        expect(result.id).toBeDefined();
      }
    });

    it("should delete a widget", async () => {
      const result = await deleteBiWidget(widgetId);
      expect(result.success).toBe(true);
    });
  });

  describe("Data Resolver", () => {
    it("should resolve DEFECT_COUNT", async () => {
      const data = await resolveWidgetData("DEFECT_COUNT", 1);
      expect(data).toBeDefined();
    });

    it("should resolve DEFECT_BY_STATUS", async () => {
      const data = await resolveWidgetData("DEFECT_BY_STATUS", 1);
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should resolve DEFECT_BY_SEVERITY", async () => {
      const data = await resolveWidgetData("DEFECT_BY_SEVERITY", 1);
      expect(data).toBeDefined();
    });

    it("should resolve DEFECT_TREND", async () => {
      const data = await resolveWidgetData("DEFECT_TREND", 1);
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should resolve COPQ_TOTAL", async () => {
      const data = await resolveWidgetData("COPQ_TOTAL");
      expect(data).toBeDefined();
    });

    it("should resolve SLA_COMPLIANCE", async () => {
      const data = await resolveWidgetData("SLA_COMPLIANCE", 1);
      expect(data).toBeDefined();
    });

    it("should resolve SUPPLIER_SCORES", async () => {
      const data = await resolveWidgetData("SUPPLIER_SCORES");
      expect(data).toBeDefined();
    });

    it("should resolve RESOLUTION_TIME", async () => {
      const data = await resolveWidgetData("RESOLUTION_TIME", 1);
      expect(data).toBeDefined();
    });

    it("should resolve TOP_ROOT_CAUSES", async () => {
      const data = await resolveWidgetData("TOP_ROOT_CAUSES", 1);
      expect(data).toBeDefined();
    });

    it("should resolve MONTHLY_COMPARISON", async () => {
      const data = await resolveWidgetData("MONTHLY_COMPARISON", 1);
      expect(data).toBeDefined();
    });

    it("should handle unknown data source", async () => {
      const data = await resolveWidgetData("UNKNOWN_SOURCE");
      expect(data).toHaveProperty("error");
    });

    it("should resolve without tenantId (global)", async () => {
      const data = await resolveWidgetData("DEFECT_COUNT");
      expect(data).toBeDefined();
    });
  });

  describe("Dashboard Cleanup", () => {
    it("should soft-delete the test dashboard", async () => {
      const result = await deleteBiDashboard(dashboardId, 1);
      expect(result.success).toBe(true);
    });
  });
});
