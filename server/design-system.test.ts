import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Design System Validation Tests
 * Ensures the dark navy enterprise theme is correctly configured
 * and no light-theme artifacts remain in the codebase.
 */

const CSS_PATH = resolve(__dirname, "../client/src/index.css");
const cssContent = readFileSync(CSS_PATH, "utf-8");

describe("Design System - Dark Navy Enterprise Theme", () => {
  it("should use oklch color format for theme variables", () => {
    // The theme should use oklch colors as required by Tailwind CSS 4
    expect(cssContent).toContain("oklch(");
    // Background should be dark navy
    expect(cssContent).toContain("--background: oklch(0.13");
  });

  it("should define all required CSS custom properties", () => {
    const requiredVars = [
      "--background",
      "--foreground",
      "--card",
      "--card-foreground",
      "--popover",
      "--popover-foreground",
      "--primary",
      "--primary-foreground",
      "--secondary",
      "--secondary-foreground",
      "--muted",
      "--muted-foreground",
      "--accent",
      "--accent-foreground",
      "--destructive",
      "--destructive-foreground",
      "--border",
      "--input",
      "--ring",
      "--sidebar",
      "--sidebar-foreground",
      "--sidebar-primary",
      "--sidebar-accent",
      "--sidebar-border",
    ];

    for (const varName of requiredVars) {
      expect(cssContent).toContain(varName);
    }
  });

  it("should define enterprise chart colors", () => {
    expect(cssContent).toContain("--chart-1");
    expect(cssContent).toContain("--chart-2");
    expect(cssContent).toContain("--chart-3");
    expect(cssContent).toContain("--chart-4");
    expect(cssContent).toContain("--chart-5");
  });

  it("should include enterprise component classes", () => {
    const requiredClasses = [
      ".kpi-card",
      ".kpi-card-teal",
      ".kpi-card-value",
      ".kpi-card-label",
      ".data-table",
      ".chart-container",
      ".chart-title",
      ".status-closed",
      ".status-ongoing",
      ".status-delayed",
      ".status-waiting",
      ".severity-s",
      ".severity-a",
      ".severity-b",
      ".severity-c",
      ".kanban-card",
      ".kanban-column",
      ".workflow-step",
      ".sidebar-menu-item",
      ".login-container",
      ".login-card",
      ".header-bar",
      ".filter-chip",
      ".page-header",
      ".page-title",
    ];

    for (const cls of requiredClasses) {
      expect(cssContent).toContain(cls);
    }
  });

  it("should use Inter font family", () => {
    expect(cssContent).toContain("'Inter'");
    expect(cssContent).toContain("--font-sans");
  });

  it("should define dark mode variables matching root", () => {
    // Both :root and .dark should have the same dark navy background
    const rootMatch = cssContent.match(/:root\s*\{([^}]+--background:[^}]+)\}/s);
    const darkMatch = cssContent.match(/\.dark\s*\{([^}]+--background:[^}]+)\}/s);
    
    expect(rootMatch).toBeTruthy();
    expect(darkMatch).toBeTruthy();
    
    // Both should use the same dark background value
    if (rootMatch && darkMatch) {
      const rootBg = rootMatch[1].match(/--background:\s*([^;]+)/);
      const darkBg = darkMatch[1].match(/--background:\s*([^;]+)/);
      expect(rootBg?.[1]?.trim()).toBe(darkBg?.[1]?.trim());
    }
  });

  it("should include custom scrollbar styling for dark theme", () => {
    expect(cssContent).toContain("::-webkit-scrollbar");
    expect(cssContent).toContain("::-webkit-scrollbar-track");
    expect(cssContent).toContain("::-webkit-scrollbar-thumb");
  });

  it("should include animation utilities", () => {
    expect(cssContent).toContain(".animate-fade-in");
    expect(cssContent).toContain("@keyframes fadeIn");
  });

  it("should include gradient text utilities", () => {
    expect(cssContent).toContain(".text-gradient-teal");
    expect(cssContent).toContain(".text-gradient-gold");
  });

  it("should include glow effect utilities", () => {
    expect(cssContent).toContain(".glow-teal");
    expect(cssContent).toContain(".glow-gold");
  });
});

describe("Design System - No Light Theme Artifacts", () => {
  // Check that key page files don't contain light-theme patterns
  const pageFiles = [
    "Dashboard.tsx",
    "DefectList.tsx",
    "NotFound.tsx",
  ];

  for (const pageFile of pageFiles) {
    it(`${pageFile} should not contain bg-white class`, () => {
      const filePath = resolve(__dirname, `../client/src/pages/${pageFile}`);
      const content = readFileSync(filePath, "utf-8");
      // bg-white/20 in Kanban is acceptable (semi-transparent on dark bg)
      const matches = content.match(/bg-white(?!\/)/g);
      expect(matches).toBeNull();
    });
  }

  it("Dashboard should use enterprise chart tooltip styling", () => {
    const dashPath = resolve(__dirname, "../client/src/pages/Dashboard.tsx");
    const content = readFileSync(dashPath, "utf-8");
    // Should use dark tooltip style
    expect(content).toContain("#1A2942");
    expect(content).toContain("#1E3A5F");
  });

  it("Dashboard should use teal accent color for KPI cards", () => {
    const dashPath = resolve(__dirname, "../client/src/pages/Dashboard.tsx");
    const content = readFileSync(dashPath, "utf-8");
    expect(content).toContain("kpi-card-teal");
    expect(content).toContain("#00D4AA");
  });

  it("DefectList should use dark theme status badges", () => {
    const listPath = resolve(__dirname, "../client/src/pages/DefectList.tsx");
    const content = readFileSync(listPath, "utf-8");
    expect(content).toContain("status-closed");
    expect(content).toContain("status-ongoing");
    expect(content).toContain("status-delayed");
    expect(content).toContain("severity-s");
    expect(content).toContain("severity-a");
  });
});
