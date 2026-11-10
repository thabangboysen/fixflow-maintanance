import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { CheckCircle2, ClipboardList, Clock, GraduationCap, Loader2, UserCheck, Users, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Panel, ReportPriority, ReportStatus, SearchField, StatCard } from "@/components/console/ConsoleUI";
import { DataTable, type Column } from "@/components/console/DataTable";
import { countBy, isResolved, monthlyTrend, summarizeReports } from "@/lib/report-stats";

type Status = Database["public"]["Enums"]["report_status"];
type Priority = Database["public"]["Enums"]["report_priority"];

export type AdminReport = {
  id: string;
  report_reference: string;
  student_name: string;
  student_number: string;
  block_name: string;
  unit_number: string;
  room_name: string;
  category: Database["public"]["Enums"]["problem_category"];
  priority: Priority;
  status: Status;
  description: string;
  staff_notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  assigned_staff_id: string | null;
  staff_accounts: { full_name: string; skill_category: string | null } | null;
};

const STATUSES: Status[] = ["Submitted", "Acknowledged", "Assigned", "In Progress", "Completed", "Closed"];
const PRIORITIES: Priority[] = ["Urgent", "High", "Medium", "Low"];

export function useAdminReports() {
  return useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_reports")
        .select(
          "id, report_reference, student_name, student_number, block_name, unit_number, room_name, category, priority, status, description, staff_notes, created_at, updated_at, assigned_at, completed_at, assigned_staff_id, staff_accounts(full_name, skill_category)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminReport[];
    },
  });
}

export const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "—";
const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const roomLabel = (r: Pick<AdminReport, "block_name" | "unit_number" | "room_name">) =>
  `${r.block_name}${r.unit_number}${r.room_name}`;
const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

/* ---------------- Headline numbers ---------------- */

export function AdminStatCards({ students, reports, loading }: { students: number; reports: AdminReport[]; loading: boolean }) {
  const s = summarizeReports(reports);
  const rate = s.total ? Math.round((s.resolved / s.total) * 100) : 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total students" value={students} icon={GraduationCap} hint="Registered in the student directory" loading={loading} />
      <StatCard label="Total reports" value={s.total} icon={ClipboardList} hint="All maintenance reports submitted" loading={loading} />
      <StatCard label="Resolved reports" value={s.resolved} icon={CheckCircle2} hint={`${rate}% resolution rate`} loading={loading} />
      <StatCard label="Pending reports" value={s.pending} icon={Clock} hint="Submitted, assigned or in progress" loading={loading} />
    </div>
  );
}

/* ---------------- Charts ---------------- */

const trendConfig = {
  submitted: { label: "Submitted", color: "var(--chart-2)" },
  resolved: { label: "Resolved", color: "var(--chart-1)" },
} satisfies ChartConfig;
const categoryConfig = { count: { label: "Reports", color: "var(--chart-1)" } } satisfies ChartConfig;

function BreakdownRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <li>
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/85">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {value} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

export function AdminCharts({ reports }: { reports: AdminReport[] }) {
  const trend = useMemo(() => monthlyTrend(reports, 6), [reports]);
  const byCategory = useMemo(() => countBy(reports, (r) => r.category).slice(0, 8), [reports]);
  const summary = summarizeReports(reports);
  const rate = summary.total ? Math.round((summary.resolved / summary.total) * 100) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="lg:col-span-2" title="Report volume" description="Reports submitted and resolved per month, last 6 months.">
        <ChartContainer config={trendConfig} className="h-[260px] w-full">
          <LineChart data={trend} margin={{ left: -12, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} fontSize={12}
              label={{ value: "Reports", angle: -90, position: "insideLeft", offset: 18, fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey="submitted" stroke="var(--color-submitted)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="resolved" stroke="var(--color-resolved)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ChartContainer>
      </Panel>

      <Panel title="Resolution" description="Share of all reports that are completed or closed.">
        <p className="text-4xl font-semibold tracking-tight tabular-nums">{rate}%</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.resolved} of {summary.total} reports resolved
        </p>
        <ul className="mt-6 space-y-4">
          {STATUSES.map((st) => (
            <BreakdownRow
              key={st}
              label={st}
              value={reports.filter((r) => r.status === st).length}
              total={summary.total}
              tone={isResolved(st) ? "bg-chart-1" : st === "Submitted" ? "bg-chart-4" : "bg-chart-2"}
            />
          ))}
        </ul>
      </Panel>

      <Panel className="lg:col-span-2" title="Reports by problem type" description="Most frequently reported categories.">
        {byCategory.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">No reports yet.</p>
        ) : (
          <ChartContainer config={categoryConfig} className="h-[260px] w-full">
            <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} cursor={{ fillOpacity: 0.04 }} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 3, 3, 0]} barSize={14} />
            </BarChart>
          </ChartContainer>
        )}
      </Panel>

      <Panel title="Priority mix" description="Open and closed reports by priority.">
        <ul className="space-y-4">
          {PRIORITIES.map((p) => (
            <BreakdownRow
              key={p}
              label={p}
              value={reports.filter((r) => r.priority === p).length}
              total={summary.total}
              tone={p === "Urgent" || p === "High" ? "bg-chart-5" : p === "Medium" ? "bg-chart-4" : "bg-chart-3"}
            />
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ---------------- All reports ---------------- */

function reportColumns(): Column<AdminReport>[] {
  return [
    {
      key: "ref", header: "Reference", sortValue: (r) => r.report_reference,
      cell: (r) => <span className="font-mono text-xs font-medium text-foreground">{r.report_reference}</span>,
    },
    {
      key: "student", header: "Student", sortValue: (r) => r.student_name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.student_name}</p>
          <p className="font-mono text-xs text-muted-foreground">{r.student_number}</p>
        </div>
      ),
    },
    { key: "room", header: "Room", hideBelow: "md", sortValue: (r) => roomLabel(r), cell: (r) => roomLabel(r) },
    { key: "category", header: "Problem", hideBelow: "lg", sortValue: (r) => r.category, cell: (r) => r.category },
    {
      key: "priority", header: "Priority", hideBelow: "sm",
      sortValue: (r) => PRIORITIES.length - PRIORITIES.indexOf(r.priority),
      cell: (r) => <ReportPriority priority={r.priority} />,
    },
    {
      key: "status", header: "Status", sortValue: (r) => STATUSES.indexOf(r.status),
      cell: (r) => <ReportStatus status={r.status} />,
    },
    {
      key: "worker", header: "Assigned to", hideBelow: "lg", sortValue: (r) => r.staff_accounts?.full_name ?? "",
      cell: (r) => r.staff_accounts?.full_name ?? <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      key: "created", header: "Submitted", hideBelow: "md", sortValue: (r) => time(r.created_at),
      cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{fmtDay(r.created_at)}</span>,
    },
  ];
}

export function RecentReportsPanel({ reports, loading, onViewAll }: { reports: AdminReport[]; loading: boolean; onViewAll: () => void }) {
  const [open, setOpen] = useState<AdminReport | null>(null);
  return (
    <Panel
      title="Recent reports"
      description="The five most recently submitted maintenance reports."
      actions={<Button variant="outline" size="sm" onClick={onViewAll}>View all reports</Button>}
      bodyClassName="p-0"
    >
      <DataTable columns={reportColumns()} rows={reports.slice(0, 5)} rowKey={(r) => r.id} onRowClick={setOpen}
        loading={loading} empty="No maintenance reports have been submitted yet." pageSize={5} />
      <ReportDetailDialog report={open} onClose={() => setOpen(null)} />
    </Panel>
  );
}

export function AllReportsPanel({ reports, loading }: { reports: AdminReport[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [priority, setPriority] = useState<Priority | "all">("all");
  const [open, setOpen] = useState<AdminReport | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (priority === "all" || r.priority === priority) &&
        (!term ||
          [r.report_reference, r.student_name, r.student_number, roomLabel(r), r.category, r.staff_accounts?.full_name ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(term)),
    );
  }, [reports, search, status, priority]);

  return (
    <Panel
      title={`Maintenance reports (${filtered.length})`}
      description="Select a report to see its full details and history."
      bodyClassName="p-0"
      actions={
        <>
          <SearchField value={search} onChange={setSearch} placeholder="Search reference, student, room…" />
          <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
            <SelectTrigger className="h-9 w-full bg-card sm:w-40" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent className="console-theme">
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority | "all")}>
            <SelectTrigger className="h-9 w-full bg-card sm:w-36" aria-label="Filter by priority"><SelectValue /></SelectTrigger>
            <SelectContent className="console-theme">
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      }
    >
      <DataTable
        columns={reportColumns()}
        rows={filtered}
        rowKey={(r) => r.id}
        onRowClick={setOpen}
        loading={loading}
        initialSort={{ key: "created", dir: "desc" }}
        empty={reports.length === 0 ? "No maintenance reports have been submitted yet." : "No reports match your filters."}
      />
      <ReportDetailDialog report={open} onClose={() => setOpen(null)} />
    </Panel>
  );
}

/* ---------------- Assignments ---------------- */

type WorkerLoad = { id: string; name: string; skill: string | null; total: number; open: number; resolved: number; last: string | null };

export function AssignmentsPanel({ reports, loading }: { reports: AdminReport[]; loading: boolean }) {
  const [open, setOpen] = useState<AdminReport | null>(null);
  const [search, setSearch] = useState("");
  const assigned = useMemo(() => reports.filter((r) => r.assigned_staff_id), [reports]);
  const unassigned = reports.filter((r) => !r.assigned_staff_id && !isResolved(r.status)).length;

  const workers = useMemo(() => {
    const map = new Map<string, WorkerLoad>();
    for (const r of assigned) {
      const id = r.assigned_staff_id!;
      const w = map.get(id) ?? { id, name: r.staff_accounts?.full_name ?? "Unknown worker", skill: r.staff_accounts?.skill_category ?? null, total: 0, open: 0, resolved: 0, last: null };
      w.total += 1;
      if (isResolved(r.status)) w.resolved += 1; else w.open += 1;
      if (!w.last || time(r.assigned_at) > time(w.last)) w.last = r.assigned_at;
      map.set(id, w);
    }
    return Array.from(map.values());
  }, [assigned]);

  const log = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assigned.filter((r) =>
      !term || [r.report_reference, r.staff_accounts?.full_name ?? "", roomLabel(r), r.category].join(" ").toLowerCase().includes(term));
  }, [assigned, search]);

  const workerCols: Column<WorkerLoad>[] = [
    {
      key: "name", header: "Worker", sortValue: (w) => w.name,
      cell: (w) => (
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
            <UserCheck className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="font-medium">{w.name}</span>
        </div>
      ),
    },
    { key: "skill", header: "Skill", hideBelow: "md", sortValue: (w) => w.skill ?? "", cell: (w) => w.skill ?? "Any category" },
    { key: "total", header: "Total jobs", align: "right", sortValue: (w) => w.total, cell: (w) => <span className="tabular-nums">{w.total}</span> },
    { key: "open", header: "Open", align: "right", sortValue: (w) => w.open, cell: (w) => <span className="tabular-nums">{w.open}</span> },
    { key: "resolved", header: "Resolved", align: "right", hideBelow: "sm", sortValue: (w) => w.resolved, cell: (w) => <span className="tabular-nums">{w.resolved}</span> },
    { key: "last", header: "Last assigned", hideBelow: "lg", sortValue: (w) => time(w.last), cell: (w) => <span className="text-muted-foreground">{fmtDay(w.last)}</span> },
  ];

  const logCols: Column<AdminReport>[] = [
    { key: "ref", header: "Reference", sortValue: (r) => r.report_reference, cell: (r) => <span className="font-mono text-xs font-medium">{r.report_reference}</span> },
    { key: "worker", header: "Worker", sortValue: (r) => r.staff_accounts?.full_name ?? "", cell: (r) => r.staff_accounts?.full_name ?? "—" },
    { key: "job", header: "Job", hideBelow: "md", sortValue: (r) => r.category, cell: (r) => `${r.category} · ${roomLabel(r)}` },
    { key: "status", header: "Status", sortValue: (r) => STATUSES.indexOf(r.status), cell: (r) => <ReportStatus status={r.status} /> },
    { key: "assigned", header: "Assigned on", hideBelow: "sm", sortValue: (r) => time(r.assigned_at), cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{fmtDate(r.assigned_at)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned reports" value={assigned.length} icon={ClipboardList} hint="Reports with a worker" loading={loading} />
        <StatCard label="Waiting for a worker" value={unassigned} icon={Hourglass} hint="Open reports not yet assigned" loading={loading} />
        <StatCard label="Workers with jobs" value={workers.length} icon={Users} hint="Maintenance staff with assignments" loading={loading} />
      </div>

      <Panel title="Workload by worker" description="How many jobs each maintenance worker holds." bodyClassName="p-0">
        <DataTable columns={workerCols} rows={workers} rowKey={(w) => w.id} loading={loading}
          initialSort={{ key: "open", dir: "desc" }} empty="No reports have been assigned to a worker yet." />
      </Panel>

      <Panel
        title="Assignment log"
        description="Every assigned report. Select a row to see its full history."
        bodyClassName="p-0"
        actions={<SearchField value={search} onChange={setSearch} placeholder="Search reference, worker, room…" />}
      >
        <DataTable columns={logCols} rows={log} rowKey={(r) => r.id} onRowClick={setOpen} loading={loading}
          initialSort={{ key: "assigned", dir: "desc" }} empty="No assignments to show." />
      </Panel>
      <ReportDetailDialog report={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/* ---------------- Report detail + history ---------------- */

export function ReportDetailDialog({ report, onClose }: { report: AdminReport | null; onClose: () => void }) {
  const history = useQuery({
    queryKey: ["admin-report-history", report?.id],
    enabled: !!report,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_history")
        .select("id, action, actor_name, previous_status, new_status, note, created_at")
        .eq("report_id", report!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="console-theme max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {report && (
          <>
            <DialogHeader className="space-y-2 border-b border-border px-6 py-5 text-left">
              <p className="font-mono text-xs text-muted-foreground">{report.report_reference}</p>
              <DialogTitle className="text-lg font-semibold">{report.category} · Room {roomLabel(report)}</DialogTitle>
              <DialogDescription>
                Reported by {report.student_name} ({report.student_number})
              </DialogDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <ReportStatus status={report.status} />
                <ReportPriority priority={report.priority} />
              </div>
            </DialogHeader>

            <div className="space-y-6 px-6 py-5">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Description</p>
                <p className="rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed">{report.description}</p>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                {[
                  ["Assigned to", report.staff_accounts?.full_name ?? "Not assigned"],
                  ["Assigned on", fmtDate(report.assigned_at)],
                  ["Submitted", fmtDate(report.created_at)],
                  ["Completed", fmtDate(report.completed_at)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>

              {report.staff_notes && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Worker notes</p>
                  <p className="text-sm">{report.staff_notes}</p>
                </div>
              )}

              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">History</p>
                {history.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (history.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No history recorded yet.</p>
                ) : (
                  <ol className="relative space-y-4 border-l border-border pl-5">
                    {history.data!.map((h) => (
                      <li key={h.id} className="relative">
                        <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
                        <p className="text-sm font-medium">
                          {h.action}
                          {h.previous_status && h.new_status && h.previous_status !== h.new_status && (
                            <span className="font-normal text-muted-foreground"> · {h.previous_status} → {h.new_status}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtDate(h.created_at)}{h.actor_name ? ` · ${h.actor_name}` : ""}</p>
                        {h.note && <p className="mt-1 text-xs text-foreground/80">{h.note}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-border px-6 py-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
