export const TRIAGE_ACCURACY_GOAL = 90;
export const TRIAGE_ACCURACY_ALERT = 75;

export type AccuracyAlertSeverity = "warning" | "critical";

export type AccuracyAlertState = {
  visible: boolean;
  severity: AccuracyAlertSeverity | null;
  accuracy: number | null;
  target: number;
};

/**
 * Classifies the most recent weekly Triage Agent accuracy for high-visibility UI alerts.
 * Values at or above the 90% goal are considered healthy and do not show an alert.
 */
export function getTriageAccuracyAlert(weeklyAccuracy: number | null | undefined): AccuracyAlertState {
  if (weeklyAccuracy === null || weeklyAccuracy === undefined || !Number.isFinite(weeklyAccuracy)) {
    return { visible: false, severity: null, accuracy: null, target: TRIAGE_ACCURACY_GOAL };
  }

  if (weeklyAccuracy < TRIAGE_ACCURACY_ALERT) {
    return { visible: true, severity: "critical", accuracy: weeklyAccuracy, target: TRIAGE_ACCURACY_GOAL };
  }

  if (weeklyAccuracy < TRIAGE_ACCURACY_GOAL) {
    return { visible: true, severity: "warning", accuracy: weeklyAccuracy, target: TRIAGE_ACCURACY_GOAL };
  }

  return { visible: false, severity: null, accuracy: weeklyAccuracy, target: TRIAGE_ACCURACY_GOAL };
}
