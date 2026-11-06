import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["report_status"];

export const RESOLVED_STATUSES: readonly Status[] = ["Completed", "Closed"];

export type ReportLike = {
  status: Status;
  category: string;
  created_at: string;
};

export function isResolved(status: Status) {
  return RESOLVED_STATUSES.includes(status);
}

/** Headline numbers for the admin dashboard. Resolved = Completed or Closed; everything else is pending. */
export function summarizeReports(reports: ReportLike[]) {
  const resolved = reports.filter((r) => isResolved(r.status)).length;
  return { total: reports.length, resolved, pending: reports.length - resolved };
}

export function countBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return Array.from(map, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

/** Reports submitted vs resolved per month for the last `months` months (oldest first). */
export function monthlyTrend(reports: ReportLike[], months = 6, now = new Date()) {
  const buckets: { key: string; month: string; submitted: number; resolved: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({
      key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
      month: d.toLocaleString("en-ZA", { month: "short", timeZone: "UTC" }),
      submitted: 0,
      resolved: 0,
    });
  }
  for (const r of reports) {
    const d = new Date(r.created_at);
    const bucket = buckets.find((b) => b.key === `${d.getUTCFullYear()}-${d.getUTCMonth()}`);
    if (!bucket) continue;
    bucket.submitted += 1;
    if (isResolved(r.status)) bucket.resolved += 1;
  }
  return buckets.map(({ key: _key, ...rest }) => rest);
}
