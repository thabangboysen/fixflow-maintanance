/** Counting rules for the maintenance worker workspace. */
export type WorkspaceJob = {
  status: string;
  created_at: string;
  completed_at: string | null;
};

/** Jobs not yet finished for longer than this many days count as overdue. */
export const OVERDUE_AFTER_DAYS = 3;

export const isOpen = (job: Pick<WorkspaceJob, "status">) =>
  job.status !== "Completed" && job.status !== "Closed";

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function workspaceStats(jobs: WorkspaceJob[], now: Date = new Date()) {
  const cutoff = now.getTime() - OVERDUE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return {
    assigned: jobs.filter(isOpen).length,
    completedToday: jobs.filter(
      (j) => !isOpen(j) && j.completed_at && sameLocalDay(new Date(j.completed_at), now),
    ).length,
    inProgress: jobs.filter((j) => j.status === "In Progress").length,
    overdue: jobs.filter((j) => isOpen(j) && new Date(j.created_at).getTime() < cutoff).length,
  };
}
