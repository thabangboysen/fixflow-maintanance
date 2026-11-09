import { describe, expect, it } from "vitest";
import { managementStats, weekChange, weeklyOverview } from "./management-stats";

const now = new Date(2026, 10, 9, 14, 0);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("management dashboard numbers", () => {
  it("counts completed and closed reports as completed", () => {
    const s = managementStats(
      [
        { status: "Completed", created_at: daysAgo(1), completed_at: daysAgo(0) },
        { status: "Closed", created_at: daysAgo(1), completed_at: daysAgo(0) },
        { status: "In Progress", created_at: daysAgo(1), completed_at: null },
      ],
      now,
    );
    expect(s.completed.value).toBe(2);
    expect(s.total.value).toBe(3);
  });

  it("counts submitted, acknowledged and assigned reports as pending, but not in-progress ones", () => {
    const s = managementStats(
      ["Submitted", "Acknowledged", "Assigned", "In Progress"].map((status) => ({
        status,
        created_at: daysAgo(1),
        completed_at: null,
      })),
      now,
    );
    expect(s.pending.value).toBe(3);
    expect(s.inProgress.value).toBe(1);
  });

  it("compares this week's reports with last week's", () => {
    const s = managementStats(
      [
        { status: "Submitted", created_at: daysAgo(1), completed_at: null },
        { status: "Submitted", created_at: daysAgo(2), completed_at: null },
        { status: "Submitted", created_at: daysAgo(9), completed_at: null },
      ],
      now,
    );
    expect(s.total.change).toBe(100);
  });

  it("shows a 33% drop when reports go from 3 to 2", () => {
    expect(weekChange(2, 3)).toBe(-33);
  });

  it("shows 0% when there were no reports either week", () => {
    expect(weekChange(0, 0)).toBe(0);
  });

  it("charts reports by the day they came in and completions by the day they were finished", () => {
    const days = weeklyOverview(
      [{ status: "Completed", created_at: daysAgo(3), completed_at: daysAgo(0) }],
      now,
    );
    expect(days).toHaveLength(7);
    expect(days[3]).toMatchObject({ reports: 1, completed: 0 });
    expect(days[6]).toMatchObject({ reports: 0, completed: 1 });
  });
});
