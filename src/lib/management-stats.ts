/** Counting rules for the management workspace dashboard. */
export type ManagedReport = {
  status: string;
  created_at: string;
  completed_at: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

export const isCompletedStatus = (s: string) => s === "Completed" || s === "Closed";
/** Pending = reported but work has not started yet. */
export const isPendingStatus = (s: string) => s === "Submitted" || s === "Acknowledged" || s === "Assigned";

/** Percentage change from last week to this week, rounded. No reports last week counts as +100% when there are some now. */
export function weekChange(thisWeek: number, lastWeek: number) {
  if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

function inWindow(iso: string | null, from: number, to: number) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from && t < to;
}

/**
 * Headline cards. Each card's change compares the last 7 days with the 7 days before:
 * total and in-progress/pending by when reports came in, completed by when the job was finished.
 */
export function managementStats(reports: ManagedReport[], now: Date = new Date()) {
  const end = now.getTime() + 1;
  const weekStart = end - 7 * DAY;
  const prevStart = end - 14 * DAY;
  const card = (match: (r: ManagedReport) => boolean, when: (r: ManagedReport) => string | null) => {
    const matching = reports.filter(match);
    const thisWeek = matching.filter((r) => inWindow(when(r), weekStart, end)).length;
    const lastWeek = matching.filter((r) => inWindow(when(r), prevStart, weekStart)).length;
    return { value: matching.length, change: weekChange(thisWeek, lastWeek) };
  };
  return {
    total: card(() => true, (r) => r.created_at),
    completed: card((r) => isCompletedStatus(r.status), (r) => r.completed_at ?? r.created_at),
    inProgress: card((r) => r.status === "In Progress", (r) => r.created_at),
    pending: card((r) => isPendingStatus(r.status), (r) => r.created_at),
  };
}

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Reports received vs jobs completed for each of the last 7 days (oldest first, today last). */
export function weeklyOverview(reports: ManagedReport[], now: Date = new Date()) {
  const days: { day: string; reports: number; completed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({
      day: d.toLocaleDateString("en-GB", { weekday: "short" }),
      reports: reports.filter((r) => sameLocalDay(new Date(r.created_at), d)).length,
      completed: reports.filter(
        (r) => isCompletedStatus(r.status) && r.completed_at && sameLocalDay(new Date(r.completed_at), d),
      ).length,
    });
  }
  return days;
}
