import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { CheckCircle2, ClipboardList, Clock, GraduationCap, History, Loader2, Search, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { countBy, monthlyTrend, summarizeReports } from "@/lib/report-stats";

type Status = Database["public"]["Enums"]["report_status"];

export type AdminReport = {
  id: string;
  report_reference: string;
  student_name: string;
  student_number: string;
  block_name: string;
  unit_number: string;
  room_name: string;
  category: Database["public"]["Enums"]["problem_category"];
  priority: Database["public"]["Enums"]["report_priority"];
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

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "—";
const roomLabel = (r: AdminReport) => `${r.block_name}${r.unit_number}${r.room_name}`;

/* ---------------- Headline numbers ---------------- */

export function AdminStatCards({ students, reports, loading }: { students: number; reports: AdminReport[]; loading: boolean }) {
  const s = summarizeReports(reports);
  const items = [
    { label: "Total students", value: students, icon: GraduationCap, tone: "bg-primary/10 text-primary" },
    { label: "Total reports", value: s.total, icon: ClipboardList, tone: "bg-chart-3/15 text-chart-3" },
    { label: "Resolved reports", value: s.resolved, icon: CheckCircle2, tone: "bg-success/20 text-success-foreground" },
    { label: "Pending reports", value: s.pending, icon: Clock, tone: "bg-warning/25 text-warning-foreground" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label} className="overflow-hidden">
          <CardContent className="flex items-center gap-4 py-5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-3xl font-semibold leading-none">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Charts ---------------- */

const trendConfig = {
  submitted: { label: "Submitted", color: "var(--chart-3)" },
  resolved: { label: "Resolved", color: "var(--chart-2)" },
} satisfies ChartConfig;

const statusConfig = { count: { label: "Reports", color: "var(--chart-1)" } } satisfies ChartConfig;
const categoryConfig = { count: { label: "Reports", color: "var(--chart-2)" } } satisfies ChartConfig;
const PIE_COLORS = ["var(--chart-2)", "var(--chart-4)"];

export function AdminCharts({ reports }: { reports: AdminReport[] }) {
  const trend = useMemo(() => monthlyTrend(reports, 6), [reports]);
  const byStatus = useMemo(
    () => STATUSES.map((st) => ({ name: st, count: reports.filter((r) => r.status === st).length })),
    [reports],
  );
  const byCategory = useMemo(() => countBy(reports, (r) => r.category).slice(0, 8), [reports]);
  const summary = summarizeReports(reports);
  const split = [
    { name: "Resolved", value: summary.resolved },
    { name: "Pending", value: summary.pending },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-display text-lg">Reports over the last 6 months</CardTitle>
          <CardDescription>New reports compared with reports that were resolved.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="h-64 w-full">
            <LineChart data={trend} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="submitted" stroke="var(--color-submitted)" strokeWidth={2.5} dot />
              <Line type="monotone" dataKey="resolved" stroke="var(--color-resolved)" strokeWidth={2.5} dot />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Resolved vs pending</CardTitle>
          <CardDescription>
            {summary.total ? `${Math.round((summary.resolved / summary.total) * 100)}% of all reports resolved.` : "No reports yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ value: { label: "Reports" } }} className="mx-auto h-64 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              <Pie data={summary.total ? split : [{ name: "No reports", value: 1 }]} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={summary.total ? 2 : 0}>
                {(summary.total ? split : [{ name: "No reports" }]).map((d, i) => (
                  <Cell key={d.name} fill={summary.total ? PIE_COLORS[i] : "var(--muted)"} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-2" /> Resolved {summary.resolved}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-chart-4" /> Pending {summary.pending}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-display text-lg">Reports by status</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={statusConfig} className="h-60 w-full">
            <BarChart data={byStatus} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} fontSize={11} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Top problem types</CardTitle>
        </CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No reports yet.</p>
          ) : (
            <ChartContainer config={categoryConfig} className="h-60 w-full">
              <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 8 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={90} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- All reports ---------------- */

export function AllReportsPanel({ reports, loading }: { reports: AdminReport[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [open, setOpen] = useState<AdminReport | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!term ||
          [r.report_reference, r.student_name, r.student_number, roomLabel(r), r.category, r.staff_accounts?.full_name ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(term)),
    );
  }, [reports, search, status]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg">All maintenance reports ({reports.length})</CardTitle>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search reference, student, room, worker…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-muted-foreground" />
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {reports.length === 0 ? "No maintenance reports have been submitted yet." : "No reports match your search."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Reference</th>
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Room</th>
                  <th className="py-2 pr-3 font-medium">Problem</th>
                  <th className="py-2 pr-3 font-medium">Priority</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Assigned to</th>
                  <th className="py-2 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-border/60 hover:bg-muted/50" onClick={() => setOpen(r)}>
                    <td className="py-2.5 pr-3 font-mono text-xs">{r.report_reference}</td>
                    <td className="py-2.5 pr-3">{r.student_name}</td>
                    <td className="py-2.5 pr-3">{roomLabel(r)}</td>
                    <td className="py-2.5 pr-3">{r.category}</td>
                    <td className="py-2.5 pr-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="py-2.5 pr-3"><StatusBadge status={r.status} /></td>
                    <td className="py-2.5 pr-3">{r.staff_accounts?.full_name ?? <span className="text-muted-foreground">Not assigned</span>}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <ReportDetailDialog report={open} onClose={() => setOpen(null)} />
    </Card>
  );
}

/* ---------------- Assignments ---------------- */

export function AssignmentsPanel({ reports, loading }: { reports: AdminReport[]; loading: boolean }) {
  const [open, setOpen] = useState<AdminReport | null>(null);
  const assigned = reports.filter((r) => r.assigned_staff_id);
  const unassigned = reports.filter((r) => !r.assigned_staff_id && r.status !== "Closed").length;

  const byWorker = useMemo(() => {
    const map = new Map<string, { name: string; skill: string | null; reports: AdminReport[] }>();
    for (const r of assigned) {
      const key = r.assigned_staff_id!;
      if (!map.has(key)) map.set(key, { name: r.staff_accounts?.full_name ?? "Unknown worker", skill: r.staff_accounts?.skill_category ?? null, reports: [] });
      map.get(key)!.reports.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.reports.length - a.reports.length);
  }, [assigned]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Assigned reports" value={assigned.length} />
        <MiniStat label="Waiting for a worker" value={unassigned} />
        <MiniStat label="Workers with jobs" value={byWorker.length} />
      </div>

      {loading ? (
        <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-muted-foreground" />
      ) : byWorker.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No reports have been assigned to a worker yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {byWorker.map((w) => {
            const done = summarizeReports(w.reports).resolved;
            return (
              <Card key={w.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><UserCheck className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">{w.name}</CardTitle>
                      <CardDescription>{w.skill ?? "Any category"} · {w.reports.length} job{w.reports.length === 1 ? "" : "s"} · {done} resolved</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {w.reports.map((r) => (
                    <button key={r.id} type="button" onClick={() => setOpen(r)} className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-border p-2.5 text-left text-sm transition-colors hover:bg-muted/50">
                      <span className="font-mono text-xs">{r.report_reference}</span>
                      <span className="min-w-0 flex-1 truncate">{r.category} · Room {roomLabel(r)}</span>
                      <StatusBadge status={r.status} />
                      <span className="w-full text-xs text-muted-foreground">Assigned {fmtDate(r.assigned_at)}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ReportDetailDialog report={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="font-display text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Report detail + history ---------------- */

function ReportDetailDialog({ report, onClose }: { report: AdminReport | null; onClose: () => void }) {
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {report && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Report {report.report_reference}</DialogTitle>
              <DialogDescription>
                {report.category} · Room {roomLabel(report)} · {report.student_name} ({report.student_number})
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={report.status} />
              <PriorityBadge priority={report.priority} />
            </div>
            <p className="rounded-lg bg-muted/60 p-3 text-sm">{report.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Assigned to</dt>
              <dd>{report.staff_accounts?.full_name ?? "Not assigned"}</dd>
              <dt className="text-muted-foreground">Assigned on</dt>
              <dd>{fmtDate(report.assigned_at)}</dd>
              <dt className="text-muted-foreground">Submitted</dt>
              <dd>{fmtDate(report.created_at)}</dd>
              <dt className="text-muted-foreground">Completed</dt>
              <dd>{fmtDate(report.completed_at)}</dd>
            </dl>
            {report.staff_notes && (
              <p className="text-sm"><span className="text-muted-foreground">Worker notes: </span>{report.staff_notes}</p>
            )}

            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> History</p>
              {history.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (history.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No history recorded yet.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {history.data!.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                      <p className="text-sm font-medium">
                        {h.action}
                        {h.previous_status && h.new_status && h.previous_status !== h.new_status && (
                          <span className="font-normal text-muted-foreground"> · {h.previous_status} → {h.new_status}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmtDate(h.created_at)}{h.actor_name ? ` · by ${h.actor_name}` : ""}</p>
                      {h.note && <p className="mt-1 text-xs">{h.note}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
