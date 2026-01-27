import { describe, expect, it } from "vitest";
import { 
  calculateStep, 
  calculateResponsible, 
  calculateBucketAging, 
  calculateAging,
  calculateWeekKey,
  calculateMonthName,
  getCalculatedFields,
  type DefectDates,
  type StepType
} from "../shared/defectLogic";

describe("calculateStep", () => {
  it("returns 'Aguardando Disposição' when no dates are filled", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: null,
      dateTechAnalysis: null,
      dateRootCause: null,
      dateCorrectiveAction: null,
      dateValidation: null,
      targetDate: null
    };
    const result = calculateStep(dates);
    expect(result).toBe("Aguardando Disposição");
  });

  it("returns 'Aguardando Análise Técnica' when dateDisposition is filled", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: "2025-01-15",
      dateTechAnalysis: null,
      dateRootCause: null,
      dateCorrectiveAction: null,
      dateValidation: null,
      targetDate: null
    };
    const result = calculateStep(dates);
    expect(result).toBe("Aguardando Análise Técnica");
  });

  it("returns 'Aguardando Causa Raiz' when dateTechAnalysis is filled", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: "2025-01-15",
      dateTechAnalysis: "2025-01-16",
      dateRootCause: null,
      dateCorrectiveAction: null,
      dateValidation: null,
      targetDate: null
    };
    const result = calculateStep(dates);
    expect(result).toBe("Aguardando Causa Raiz");
  });

  it("returns 'Aguardando Ação Corretiva' when dateRootCause is filled", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: "2025-01-15",
      dateTechAnalysis: "2025-01-16",
      dateRootCause: "2025-01-17",
      dateCorrectiveAction: null,
      dateValidation: null,
      targetDate: null
    };
    const result = calculateStep(dates);
    expect(result).toBe("Aguardando Ação Corretiva");
  });

  it("returns 'Aguardando Validação de Ação Corretiva' when dateCorrectiveAction is filled", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: "2025-01-15",
      dateTechAnalysis: "2025-01-16",
      dateRootCause: "2025-01-17",
      dateCorrectiveAction: "2025-01-18",
      dateValidation: null,
      targetDate: null
    };
    const result = calculateStep(dates);
    expect(result).toBe("Aguardando Validação de Ação Corretiva");
  });

  it("returns 'CLOSED' when dateValidation is filled", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: "2025-01-15",
      dateTechAnalysis: "2025-01-16",
      dateRootCause: "2025-01-17",
      dateCorrectiveAction: "2025-01-18",
      dateValidation: "2025-01-19",
      targetDate: null
    };
    const result = calculateStep(dates);
    expect(result).toBe("CLOSED");
  });
});

describe("calculateResponsible", () => {
  it("returns 'SQA' for Aguardando Disposição", () => {
    expect(calculateResponsible("Aguardando Disposição")).toBe("SQA");
  });

  it("returns 'Fornecedor' for Aguardando Análise Técnica", () => {
    expect(calculateResponsible("Aguardando Análise Técnica")).toBe("Fornecedor");
  });

  it("returns 'Fornecedor' for Aguardando Causa Raiz", () => {
    expect(calculateResponsible("Aguardando Causa Raiz")).toBe("Fornecedor");
  });

  it("returns 'Fornecedor' for Aguardando Ação Corretiva", () => {
    expect(calculateResponsible("Aguardando Ação Corretiva")).toBe("Fornecedor");
  });

  it("returns 'SQA' for Aguardando Validação de Ação Corretiva", () => {
    expect(calculateResponsible("Aguardando Validação de Ação Corretiva")).toBe("SQA");
  });

  it("returns 'SQA' for CLOSED", () => {
    expect(calculateResponsible("CLOSED")).toBe("SQA");
  });
});

describe("calculateBucketAging", () => {
  it("returns '<=4' for 0-4 days", () => {
    expect(calculateBucketAging(0)).toBe("<=4");
    expect(calculateBucketAging(4)).toBe("<=4");
  });

  it("returns '5-14' for 5-14 days", () => {
    expect(calculateBucketAging(5)).toBe("5-14");
    expect(calculateBucketAging(14)).toBe("5-14");
  });

  it("returns '15-29' for 15-29 days", () => {
    expect(calculateBucketAging(15)).toBe("15-29");
    expect(calculateBucketAging(29)).toBe("15-29");
  });

  it("returns '30-59' for 30-59 days", () => {
    expect(calculateBucketAging(30)).toBe("30-59");
    expect(calculateBucketAging(59)).toBe("30-59");
  });

  it("returns '>60' for 60+ days", () => {
    expect(calculateBucketAging(60)).toBe(">60");
    expect(calculateBucketAging(100)).toBe(">60");
  });
});

describe("calculateAging", () => {
  it("calculates aging total from openDate to today", () => {
    const today = new Date();
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(today.getDate() - 10);
    
    const dates: DefectDates = {
      openDate: tenDaysAgo.toISOString().split("T")[0],
      dateDisposition: null,
      dateTechAnalysis: null,
      dateRootCause: null,
      dateCorrectiveAction: null,
      dateValidation: null,
      targetDate: null
    };
    
    const result = calculateAging(dates, "Aguardando Disposição", "ONGOING");
    expect(result.agingTotal).toBe(10);
  });

  it("calculates days late when targetDate is past", () => {
    const today = new Date();
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 5);
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(today.getDate() - 10);
    
    const dates: DefectDates = {
      openDate: tenDaysAgo.toISOString().split("T")[0],
      dateDisposition: null,
      dateTechAnalysis: null,
      dateRootCause: null,
      dateCorrectiveAction: null,
      dateValidation: null,
      targetDate: fiveDaysAgo.toISOString().split("T")[0]
    };
    
    const result = calculateAging(dates, "Aguardando Disposição", "ONGOING");
    expect(result.daysLate).toBe(5);
  });

  it("returns 0 days late when status is CLOSED", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: "2025-01-11",
      dateTechAnalysis: "2025-01-12",
      dateRootCause: "2025-01-13",
      dateCorrectiveAction: "2025-01-14",
      dateValidation: "2025-01-15",
      targetDate: "2025-01-01" // Past target date
    };
    
    const result = calculateAging(dates, "CLOSED", "CLOSED");
    expect(result.daysLate).toBe(0);
  });
});

describe("calculateWeekKey", () => {
  it("formats week key as WKYYXX", () => {
    const result = calculateWeekKey("2025-01-15");
    expect(result).toMatch(/^WK\d{4}$/);
  });

  it("handles different dates correctly", () => {
    // Mid January 2025
    const result = calculateWeekKey("2025-01-15");
    expect(result).toBe("WK2503"); // Week 3 of 2025
  });
});

describe("calculateMonthName", () => {
  it("returns correct month name in English", () => {
    expect(calculateMonthName("2025-01-15")).toBe("January");
    expect(calculateMonthName("2025-06-15")).toBe("June");
    expect(calculateMonthName("2025-12-15")).toBe("December");
  });

  it("handles edge cases", () => {
    // Note: JavaScript Date parsing may vary by timezone
    expect(calculateMonthName("2025-02-15")).toBe("February");
    expect(calculateMonthName("2025-03-15")).toBe("March");
  });
});

// BDD-style scenarios
describe("Workflow 8D Scenarios (BDD)", () => {
  describe("GIVEN a new defect with only openDate", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: null,
      dateTechAnalysis: null,
      dateRootCause: null,
      dateCorrectiveAction: null,
      dateValidation: null,
      targetDate: null
    };

    it("WHEN calculating step THEN should be 'Aguardando Disposição'", () => {
      expect(calculateStep(dates)).toBe("Aguardando Disposição");
    });

    it("WHEN calculating responsible THEN should be 'SQA'", () => {
      const step = calculateStep(dates);
      expect(calculateResponsible(step)).toBe("SQA");
    });
  });

  describe("GIVEN a defect in supplier phase", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: "2025-01-11",
      dateTechAnalysis: "2025-01-12",
      dateRootCause: null,
      dateCorrectiveAction: null,
      dateValidation: null,
      targetDate: null
    };

    it("WHEN calculating step THEN should be 'Aguardando Causa Raiz'", () => {
      expect(calculateStep(dates)).toBe("Aguardando Causa Raiz");
    });

    it("WHEN calculating responsible THEN should be 'Fornecedor'", () => {
      const step = calculateStep(dates);
      expect(calculateResponsible(step)).toBe("Fornecedor");
    });
  });

  describe("GIVEN a closed defect", () => {
    const dates: DefectDates = {
      openDate: "2025-01-10",
      dateDisposition: "2025-01-11",
      dateTechAnalysis: "2025-01-12",
      dateRootCause: "2025-01-13",
      dateCorrectiveAction: "2025-01-14",
      dateValidation: "2025-01-15",
      targetDate: null
    };

    it("WHEN calculating step THEN should be 'CLOSED'", () => {
      expect(calculateStep(dates)).toBe("CLOSED");
    });

    it("WHEN calculating responsible THEN should be 'SQA'", () => {
      const step = calculateStep(dates);
      expect(calculateResponsible(step)).toBe("SQA");
    });
  });

  describe("GIVEN a defect with all calculated fields", () => {
    it("WHEN using getCalculatedFields THEN should return all metrics", () => {
      const today = new Date();
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(today.getDate() - 10);
      
      const dates: DefectDates = {
        openDate: tenDaysAgo.toISOString().split("T")[0],
        dateDisposition: null,
        dateTechAnalysis: null,
        dateRootCause: null,
        dateCorrectiveAction: null,
        dateValidation: null,
        targetDate: null
      };
      
      const result = getCalculatedFields(dates);
      
      expect(result.step).toBe("Aguardando Disposição");
      expect(result.currentResponsible).toBe("SQA");
      expect(result.agingTotal).toBe(10);
      expect(result.bucketAging).toBe("5-14");
    });
  });
});
