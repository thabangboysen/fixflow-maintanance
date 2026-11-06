import { describe, expect, test } from "vitest";
import { monthlyTrend, summarizeReports, type ReportLike } from "./report-stats";

const r = (status: ReportLike["status"], created_at = "2026-11-02T10:00:00Z"): ReportLike => ({
  status,
  category: "Toilet",
  created_at,
});

describe("admin report statistics", () => {
  test("completed and closed reports count as resolved", () => {
    expect(summarizeReports([r("Completed"), r("Closed")]).resolved).toBe(2);
  });
  test("submitted, acknowledged, assigned and in-progress reports count as pending", () => {
    const s = summarizeReports([r("Submitted"), r("Acknowledged"), r("Assigned"), r("In Progress"), r("Closed")]);
    expect(s).toEqual({ total: 5, resolved: 1, pending: 4 });
  });
  test("monthly trend places reports in their submission month", () => {
    const trend = monthlyTrend([r("Completed", "2026-11-02T10:00:00Z"), r("Submitted", "2026-10-15T10:00:00Z")], 2, new Date("2026-11-06T00:00:00Z"));
    expect(trend.map((m) => [m.submitted, m.resolved])).toEqual([[1, 0], [1, 1]]);
  });
});
