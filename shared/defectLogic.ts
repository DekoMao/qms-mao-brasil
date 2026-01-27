// =====================================================
// DEFECT BUSINESS LOGIC - Workflow 8D & Aging Calculations
// =====================================================

export type StepType =
  | "Aguardando Disposição"
  | "Aguardando Análise Técnica"
  | "Aguardando Causa Raiz"
  | "Aguardando Ação Corretiva"
  | "Aguardando Validação de Ação Corretiva"
  | "CLOSED";

export type StatusType = "CLOSED" | "ONGOING" | "DELAYED" | "Waiting for CHK Solution";

export type BucketAgingType = "<=4" | "5-14" | "15-29" | "30-59" | ">60";

export type ResponsibleType = "SQA" | "Fornecedor";

export interface DefectDates {
  openDate: Date | string | null;
  dateDisposition: Date | string | null;
  dateTechAnalysis: Date | string | null;
  dateRootCause: Date | string | null;
  dateCorrectiveAction: Date | string | null;
  dateValidation: Date | string | null;
  targetDate: Date | string | null;
}

export interface AgingResult {
  agingDisposition: number | null;
  agingTechAnalysis: number | null;
  agingRootCause: number | null;
  agingCorrectiveAction: number | null;
  agingValidation: number | null;
  agingTotal: number;
  agingByStep: number;
  bucketAging: BucketAgingType;
  daysLate: number;
}

// Helper to convert date to Date object
function toDate(d: Date | string | null): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  return new Date(d);
}

// Calculate days between two dates (calendar days)
function daysBetween(start: Date | null, end: Date | null): number | null {
  if (!start) return null;
  const endDate = end || new Date();
  const diffTime = endDate.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the current step based on 8D dates
 * Rule: Check dates in reverse order (validation -> corrective -> root cause -> tech analysis -> disposition)
 */
export function calculateStep(dates: DefectDates): StepType {
  const dateValidation = toDate(dates.dateValidation);
  const dateCorrectiveAction = toDate(dates.dateCorrectiveAction);
  const dateRootCause = toDate(dates.dateRootCause);
  const dateTechAnalysis = toDate(dates.dateTechAnalysis);
  const dateDisposition = toDate(dates.dateDisposition);

  if (dateValidation) return "CLOSED";
  if (dateCorrectiveAction) return "Aguardando Validação de Ação Corretiva";
  if (dateRootCause) return "Aguardando Ação Corretiva";
  if (dateTechAnalysis) return "Aguardando Causa Raiz";
  if (dateDisposition) return "Aguardando Análise Técnica";
  return "Aguardando Disposição";
}

/**
 * Calculate the current responsible party based on step
 * SQA: Disposition and Validation steps
 * Fornecedor: Analysis, Root Cause, and Corrective Action steps
 */
export function calculateResponsible(step: StepType): ResponsibleType {
  switch (step) {
    case "Aguardando Disposição":
    case "Aguardando Validação de Ação Corretiva":
    case "CLOSED":
      return "SQA";
    case "Aguardando Análise Técnica":
    case "Aguardando Causa Raiz":
    case "Aguardando Ação Corretiva":
      return "Fornecedor";
    default:
      return "SQA";
  }
}

/**
 * Calculate bucket aging category
 */
export function calculateBucketAging(agingTotal: number): BucketAgingType {
  if (agingTotal <= 4) return "<=4";
  if (agingTotal <= 14) return "5-14";
  if (agingTotal <= 29) return "15-29";
  if (agingTotal <= 59) return "30-59";
  return ">60";
}

/**
 * Calculate all aging metrics for a defect
 */
export function calculateAging(dates: DefectDates, step: StepType, status: StatusType): AgingResult {
  const openDate = toDate(dates.openDate);
  const dateDisposition = toDate(dates.dateDisposition);
  const dateTechAnalysis = toDate(dates.dateTechAnalysis);
  const dateRootCause = toDate(dates.dateRootCause);
  const dateCorrectiveAction = toDate(dates.dateCorrectiveAction);
  const dateValidation = toDate(dates.dateValidation);
  const targetDate = toDate(dates.targetDate);
  const today = new Date();

  // Aging per step (in calendar days)
  const agingDisposition = daysBetween(openDate, dateDisposition || today);
  const agingTechAnalysis = dateDisposition ? daysBetween(dateDisposition, dateTechAnalysis || today) : null;
  const agingRootCause = dateTechAnalysis ? daysBetween(dateTechAnalysis, dateRootCause || today) : null;
  const agingCorrectiveAction = dateRootCause ? daysBetween(dateRootCause, dateCorrectiveAction || today) : null;
  const agingValidation = dateCorrectiveAction ? daysBetween(dateCorrectiveAction, dateValidation || today) : null;

  // Total aging
  let agingTotal = 0;
  if (status === "CLOSED" && dateValidation && openDate) {
    agingTotal = daysBetween(openDate, dateValidation) || 0;
  } else if (openDate) {
    agingTotal = daysBetween(openDate, today) || 0;
  }

  // Aging by current step
  let agingByStep = 0;
  switch (step) {
    case "Aguardando Disposição":
      agingByStep = agingDisposition || 0;
      break;
    case "Aguardando Análise Técnica":
      agingByStep = agingTechAnalysis || 0;
      break;
    case "Aguardando Causa Raiz":
      agingByStep = agingRootCause || 0;
      break;
    case "Aguardando Ação Corretiva":
      agingByStep = agingCorrectiveAction || 0;
      break;
    case "Aguardando Validação de Ação Corretiva":
      agingByStep = agingValidation || 0;
      break;
    case "CLOSED":
      agingByStep = 0;
      break;
  }

  // Days late (only if not closed and target date exists)
  let daysLate = 0;
  if (status !== "CLOSED" && targetDate) {
    const lateDays = daysBetween(targetDate, today);
    daysLate = Math.max(0, lateDays || 0);
  }

  // Bucket aging
  const bucketAging = calculateBucketAging(agingTotal);

  return {
    agingDisposition,
    agingTechAnalysis,
    agingRootCause,
    agingCorrectiveAction,
    agingValidation,
    agingTotal,
    agingByStep,
    bucketAging,
    daysLate,
  };
}

/**
 * Calculate year from date
 */
export function calculateYear(date: Date | string | null): number | null {
  const d = toDate(date);
  return d ? d.getFullYear() : null;
}

/**
 * Calculate week key (WK + YY + WW format, week starting Monday)
 */
export function calculateWeekKey(date: Date | string | null): string | null {
  const d = toDate(date);
  if (!d) return null;

  const year = d.getFullYear().toString().slice(-2);
  
  // Get ISO week number (week starts on Monday)
  const tempDate = new Date(d.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  
  return `WK${year}${weekNum.toString().padStart(2, "0")}`;
}

/**
 * Calculate month name from date
 */
export function calculateMonthName(date: Date | string | null): string | null {
  const d = toDate(date);
  if (!d) return null;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[d.getMonth()];
}

/**
 * Get all calculated fields for a defect
 */
export function getCalculatedFields(dates: DefectDates, currentStatus?: StatusType) {
  const step = calculateStep(dates);
  const status = currentStatus || (step === "CLOSED" ? "CLOSED" : "ONGOING");
  const currentResponsible = calculateResponsible(step);
  const aging = calculateAging(dates, step, status);
  const year = calculateYear(dates.openDate);
  const weekKey = calculateWeekKey(dates.openDate);
  const monthName = calculateMonthName(dates.openDate);

  return {
    step,
    currentResponsible,
    year,
    weekKey,
    monthName,
    ...aging,
  };
}

/**
 * Get SLA status color based on aging
 */
export function getSlaColor(agingByStep: number): "green" | "yellow" | "red" {
  if (agingByStep <= 7) return "green";
  if (agingByStep <= 14) return "yellow";
  return "red";
}
