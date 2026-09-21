import { describe, expect, it } from "vitest";
import {
  getTriageAccuracyAlert,
  TRIAGE_ACCURACY_ALERT,
  TRIAGE_ACCURACY_GOAL,
} from "./accuracyAlert";

describe("getTriageAccuracyAlert", () => {
  it("does not alert when accuracy meets the goal", () => {
    expect(getTriageAccuracyAlert(TRIAGE_ACCURACY_GOAL)).toEqual({
      visible: false,
      severity: null,
      accuracy: 90,
      target: 90,
    });
  });

  it("shows a warning between the critical threshold and the goal", () => {
    expect(getTriageAccuracyAlert(89.9)).toMatchObject({
      visible: true,
      severity: "warning",
      accuracy: 89.9,
      target: TRIAGE_ACCURACY_GOAL,
    });
    expect(getTriageAccuracyAlert(TRIAGE_ACCURACY_ALERT)).toMatchObject({
      visible: true,
      severity: "warning",
    });
  });

  it("shows a critical alert below the 75% threshold", () => {
    expect(getTriageAccuracyAlert(74.9)).toMatchObject({
      visible: true,
      severity: "critical",
      accuracy: 74.9,
    });
  });

  it("does not alert when the weekly trend has no usable value", () => {
    expect(getTriageAccuracyAlert(undefined).visible).toBe(false);
    expect(getTriageAccuracyAlert(null).visible).toBe(false);
    expect(getTriageAccuracyAlert(Number.NaN).visible).toBe(false);
  });
});
