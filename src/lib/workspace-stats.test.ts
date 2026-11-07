import { describe, expect, it } from "vitest";
import { workspaceStats } from "./workspace-stats";

const now = new Date(2026, 10, 7, 14, 0);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("workspaceStats", () => {
  it("counts unfinished jobs as assigned", () => {
    const s = workspaceStats(
      [
        { status: "Assigned", created_at: daysAgo(0), completed_at: null },
        { status: "In Progress", created_at: daysAgo(0), completed_at: null },
        { status: "Completed", created_at: daysAgo(0), completed_at: daysAgo(0) },
      ],
      now,
    );
    expect(s.assigned).toBe(2);
    expect(s.inProgress).toBe(1);
  });

  it("only counts jobs finished today as completed today", () => {
    const s = workspaceStats(
      [
        { status: "Completed", created_at: daysAgo(2), completed_at: daysAgo(0) },
        { status: "Completed", created_at: daysAgo(4), completed_at: daysAgo(2) },
      ],
      now,
    );
    expect(s.completedToday).toBe(1);
  });

  it("marks unfinished jobs older than 3 days as overdue", () => {
    const s = workspaceStats(
      [
        { status: "Assigned", created_at: daysAgo(4), completed_at: null },
        { status: "Assigned", created_at: daysAgo(2), completed_at: null },
        { status: "Completed", created_at: daysAgo(10), completed_at: daysAgo(1) },
      ],
      now,
    );
    expect(s.overdue).toBe(1);
  });
});
