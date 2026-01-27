import { describe, expect, it } from "vitest";

/**
 * Testes para a lógica do Portal do Fornecedor
 */

// Função auxiliar para gerar código de acesso
function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Função para validar código de acesso
function isValidAccessCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  if (code.length !== 8) return false;
  return /^[A-Z0-9]{8}$/.test(code);
}

// Função para verificar se fornecedor pode atualizar defeito
function canSupplierUpdateDefect(
  defectSupplier: string | null,
  supplierName: string,
  defectStatus: string | null
): { allowed: boolean; reason?: string } {
  if (!defectSupplier) {
    return { allowed: false, reason: "Defeito não tem fornecedor atribuído" };
  }
  if (defectSupplier.toLowerCase() !== supplierName.toLowerCase()) {
    return { allowed: false, reason: "Fornecedor não autorizado para este defeito" };
  }
  if (defectStatus === "CLOSED") {
    return { allowed: false, reason: "Defeito já está fechado" };
  }
  return { allowed: true };
}

describe("Supplier Portal - Access Code Generation", () => {
  it("generates 8-character alphanumeric code", () => {
    const code = generateAccessCode();
    expect(code).toHaveLength(8);
    expect(isValidAccessCode(code)).toBe(true);
  });

  it("generates unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateAccessCode());
    }
    // Com 100 códigos gerados, esperamos alta unicidade
    expect(codes.size).toBeGreaterThan(95);
  });
});

describe("Supplier Portal - Access Code Validation", () => {
  it("validates correct 8-char alphanumeric code", () => {
    expect(isValidAccessCode("ABC12345")).toBe(true);
    expect(isValidAccessCode("XXXXXXXX")).toBe(true);
    expect(isValidAccessCode("12345678")).toBe(true);
  });

  it("rejects invalid codes", () => {
    expect(isValidAccessCode("")).toBe(false);
    expect(isValidAccessCode("ABC123")).toBe(false); // muito curto
    expect(isValidAccessCode("ABC123456789")).toBe(false); // muito longo
    expect(isValidAccessCode("abc12345")).toBe(false); // minúsculas
    expect(isValidAccessCode("ABC-1234")).toBe(false); // caractere especial
  });

  it("rejects null/undefined", () => {
    expect(isValidAccessCode(null as any)).toBe(false);
    expect(isValidAccessCode(undefined as any)).toBe(false);
  });
});

describe("Supplier Portal - Defect Update Authorization", () => {
  it("allows supplier to update their own defect", () => {
    const result = canSupplierUpdateDefect("ABC Components", "ABC Components", "ONGOING");
    expect(result.allowed).toBe(true);
  });

  it("allows case-insensitive supplier matching", () => {
    const result = canSupplierUpdateDefect("ABC Components", "abc components", "ONGOING");
    expect(result.allowed).toBe(true);
  });

  it("denies update for different supplier", () => {
    const result = canSupplierUpdateDefect("ABC Components", "XYZ Parts", "ONGOING");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("não autorizado");
  });

  it("denies update for defect without supplier", () => {
    const result = canSupplierUpdateDefect(null, "ABC Components", "ONGOING");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("não tem fornecedor");
  });

  it("denies update for closed defect", () => {
    const result = canSupplierUpdateDefect("ABC Components", "ABC Components", "CLOSED");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("fechado");
  });

  it("allows update for DELAYED defect", () => {
    const result = canSupplierUpdateDefect("ABC Components", "ABC Components", "DELAYED");
    expect(result.allowed).toBe(true);
  });
});

describe("Supplier Portal - SLA Violation Detection", () => {
  // Função para calcular dias em etapa
  function calculateDaysInStep(stepStartDate: string | null): number {
    if (!stepStartDate) return 0;
    const start = new Date(stepStartDate);
    const now = new Date();
    const diffTime = now.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Função para verificar violação de SLA
  function checkSlaViolation(
    daysInStep: number,
    warningDays: number,
    maxDays: number
  ): "OK" | "WARNING" | "EXCEEDED" {
    if (daysInStep > maxDays) return "EXCEEDED";
    if (daysInStep >= warningDays) return "WARNING";
    return "OK";
  }

  it("returns OK when within SLA", () => {
    expect(checkSlaViolation(3, 5, 7)).toBe("OK");
    expect(checkSlaViolation(0, 5, 7)).toBe("OK");
    expect(checkSlaViolation(4, 5, 7)).toBe("OK");
  });

  it("returns WARNING when approaching SLA", () => {
    expect(checkSlaViolation(5, 5, 7)).toBe("WARNING");
    expect(checkSlaViolation(6, 5, 7)).toBe("WARNING");
    expect(checkSlaViolation(7, 5, 7)).toBe("WARNING");
  });

  it("returns EXCEEDED when past SLA", () => {
    expect(checkSlaViolation(8, 5, 7)).toBe("EXCEEDED");
    expect(checkSlaViolation(10, 5, 7)).toBe("EXCEEDED");
    expect(checkSlaViolation(100, 5, 7)).toBe("EXCEEDED");
  });
});

describe("Supplier Portal - RCA Pareto Analysis", () => {
  interface CauseCount {
    cause: string;
    count: number;
  }

  // Função para calcular percentual acumulado (Pareto)
  function calculateParetoPercentages(causes: CauseCount[]): Array<CauseCount & { percentage: number; cumulativePercentage: number }> {
    const total = causes.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) return [];

    // Ordenar por count decrescente
    const sorted = [...causes].sort((a, b) => b.count - a.count);
    
    let cumulative = 0;
    return sorted.map(c => {
      const percentage = (c.count / total) * 100;
      cumulative += percentage;
      return {
        ...c,
        percentage: Math.round(percentage * 10) / 10,
        cumulativePercentage: Math.round(cumulative * 10) / 10,
      };
    });
  }

  it("calculates correct percentages", () => {
    const causes = [
      { cause: "Material defeituoso", count: 50 },
      { cause: "Processo incorreto", count: 30 },
      { cause: "Erro humano", count: 20 },
    ];
    
    const result = calculateParetoPercentages(causes);
    
    expect(result[0].cause).toBe("Material defeituoso");
    expect(result[0].percentage).toBe(50);
    expect(result[0].cumulativePercentage).toBe(50);
    
    expect(result[1].percentage).toBe(30);
    expect(result[1].cumulativePercentage).toBe(80);
    
    expect(result[2].percentage).toBe(20);
    expect(result[2].cumulativePercentage).toBe(100);
  });

  it("sorts by count descending", () => {
    const causes = [
      { cause: "C", count: 10 },
      { cause: "A", count: 50 },
      { cause: "B", count: 30 },
    ];
    
    const result = calculateParetoPercentages(causes);
    
    expect(result[0].cause).toBe("A");
    expect(result[1].cause).toBe("B");
    expect(result[2].cause).toBe("C");
  });

  it("handles empty array", () => {
    const result = calculateParetoPercentages([]);
    expect(result).toHaveLength(0);
  });

  it("handles single cause", () => {
    const causes = [{ cause: "Única causa", count: 100 }];
    const result = calculateParetoPercentages(causes);
    
    expect(result[0].percentage).toBe(100);
    expect(result[0].cumulativePercentage).toBe(100);
  });

  it("identifies 80/20 threshold", () => {
    const causes = [
      { cause: "A", count: 60 },
      { cause: "B", count: 25 },
      { cause: "C", count: 10 },
      { cause: "D", count: 5 },
    ];
    
    const result = calculateParetoPercentages(causes);
    
    // As duas primeiras causas (A e B) devem representar ~85% dos casos
    const causes80 = result.filter(c => c.cumulativePercentage <= 80);
    expect(causes80.length).toBeLessThanOrEqual(2);
  });
});
