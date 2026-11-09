import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertCircle, ArrowDown, ArrowRight, ArrowUp, BarChart3, Bell, Building2, CheckCircle2, ClipboardList, Clock,
  Eye, FileBarChart, FileText, LayoutDashboard, List, Loader2, LogOut, MapPin, Menu, Plus, Search, ShieldCheck,
  UserCog, UserPlus, Users, X, Zap,
} from "lucide-react";
import photoDusk from "@/assets/residence-dusk.jpg.asset.json";
import { FixFlowMark, Wordmark } from "@/components/Wordmark";
import { ResidenceStructure } from "@/components/ResidenceStructure";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { AdminCharts, ReportDetailDialog, type AdminReport } from "@/components/admin/AdminReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSignOut } from "@/hooks/useAuth";
import { Constants, type Database } from "@/integrations/supabase/types";
import { PROBLEM_CATEGORY_VALUES } from "@/lib/categories";
import { managementStats, weeklyOverview } from "@/lib/management-stats";
import { cn } from "@/lib/utils";

type Status = Database["public"]["Enums"]["report_status"];
type Priority = Database["public"]["Enums"]["report_priority"];
type Report = Database["public"]["Tables"]["maintenance_reports"]["Row"];
type Category = Database["public"]["Enums"]["problem_category"];
type View = "dashboard" | "reports" | "assign" | "users" | "residence" | "analytics" | "profile";
const VIEWS: View[] = ["dashboard", "reports", "assign", "users", "residence", "analytics", "profile"];
const ALL = "all";
const isOpen = (r: Report) => r.status !== "Completed" && r.status !== "Closed";
const roomLabel = (r: Report) => `${r.block_name}${r.unit_number}${r.room_name}`;

export const Route = createFileRoute("/_authenticated/management")({
  validateSearch: (s: Record<string, unknown>): { view: View } => ({
    view: VIEWS.includes(s["view"] as View) ? (s["view"] as View) : "dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Management workspace · Corridor Hills Maintenance" },
      { name: "description", content: "Dashboard, reports, team assignments and residence structure for Corridor Hills maintenance." },
      { property: "og:title", content: "Management workspace · Corridor Hills Maintenance" },
      { property: "og:description", content: "Assign jobs, set priorities and track residence maintenance progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManagementPage,
});

const NAV: { view: View; label: string; icon: ReactNode }[] = [
  { view: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { view: "reports", label: "All Reports", icon: <ClipboardList className="h-5 w-5" /> },
  { view: "assign", label: "Assign Staff", icon: <UserPlus className="h-5 w-5" /> },
  { view: "users", label: "Staff Management", icon: <UserCog className="h-5 w-5" /> },
  { view: "residence", label: "Residence Overview", icon: <Building2 className="h-5 w-5" /> },
  { view: "analytics", label: "Analytics & Reports", icon: <BarChart3 className="h-5 w-5" /> },
];
const TITLES: Record<View, string> = {
  dashboard: "Dashboard", reports: "All Reports", assign: "Assign Staff", users: "Staff Management",
  residence: "Residence Overview", analytics: "Analytics & Reports", profile: "My Profile",
};

function ManagementPage() {
  const { view } = Route.useSearch();
  const { data: profile } = useProfile();
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewing, setViewing] = useState<Report | null>(null);
  const roleLabel = profile?.role === "admin" ? "Administrator" : "Management";

  const reportsQuery = useQuery({
    queryKey: ["all-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const staffQuery = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_accounts").select("id, full_name, email, role, active, skill_category").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);
  const allStaff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const staff = allStaff.filter((s) => s.role === "staff" && s.active).map((s) => ({
    ...s,
    activeJobs: reports.filter((r) => r.assigned_staff_id === s.id && isOpen(r)).length,
  }));
  const staffName = (id: string | null) => (id ? allStaff.find((s) => s.id === id)?.full_name ?? null : null);
  const toAdminReport = (r: Report): AdminReport => {
    const s = r.assigned_staff_id ? allStaff.find((x) => x.id === r.assigned_staff_id) : undefined;
    return { ...r, staff_accounts: s ? { full_name: s.full_name, skill_category: s.skill_category } : null };
  };
  const openCount = reports.filter(isOpen).length;
  const waiting = reports.filter((r) => !r.assigned_staff_id && isOpen(r)).length;

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Database["public"]["Tables"]["maintenance_reports"]["Update"] }) => {
      const { error } = await supabase.from("maintenance_reports").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report updated.");
      void queryClient.invalidateQueries({ queryKey: ["all-reports"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update this report."),
  });
  const assign = (id: string, staffId: string) =>
    update.mutate({ id, patch: { assigned_staff_id: staffId, assigned_at: new Date().toISOString() } });

  const sidebar = (
    <>
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Wordmark subtitle="Maintenance System" />
        <button className="rounded-md p-1 lg:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <Link to="/management" search={{ view: "profile" }} onClick={() => setMenuOpen(false)}
        className="mx-3 flex items-center gap-3 rounded-xl border border-border bg-muted/60 p-3 transition hover:bg-muted">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
          {initials(profile?.full_name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{profile?.full_name ?? roleLabel}</p>
          <span className="mt-0.5 inline-block rounded-md bg-primary/25 px-2 py-0.5 text-[11px] font-medium text-primary-foreground">{roleLabel}</span>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" /> Online
          </p>
        </div>
      </Link>
      <nav className="mt-5 flex flex-col gap-1 px-3">
        {NAV.map((n) => (
          <Link key={n.view} to="/management" search={{ view: n.view }} onClick={() => setMenuOpen(false)}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              view === n.view ? "bg-primary font-semibold text-primary-foreground" : "text-foreground/85 hover:bg-muted")}>
            {n.icon}
            <span className="flex-1">{n.label}</span>
            {n.view === "reports" && openCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                {openCount}
              </span>
            )}
          </Link>
        ))}
        {profile?.role === "admin" && (
          <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/85 hover:bg-muted">
            <ShieldCheck className="h-5 w-5" /> Students &amp; team admin
          </Link>
        )}
        <button type="button" onClick={() => void signOut()}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground/85 hover:bg-muted">
          <LogOut className="h-5 w-5" /> Logout
        </button>
      </nav>
      <div className="mt-auto flex flex-col items-center gap-1 px-4 pb-6 pt-6 text-center">
        <FixFlowMark className="h-10 w-auto" />
        <p className="text-sm font-semibold">Corridor Hills</p>
        <p className="text-xs text-muted-foreground">Accommodation Maintenance Portal</p>
      </div>
    </>
  );

  return (
    <div className="worker-workspace flex">
      <aside className="worker-sidebar sticky top-0 hidden h-svh w-64 shrink-0 flex-col overflow-y-auto border-r border-border lg:flex">
        {sidebar}
      </aside>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-background/70" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="worker-sidebar relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-border">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
          <button className="rounded-md p-1.5 hover:bg-muted lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="font-display text-lg font-semibold">{TITLES[view]}</h1>
          <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/management" search={{ view: "assign" }} className="relative rounded-full p-1.5 hover:bg-muted"
              aria-label={`${waiting} reports waiting for a worker`}>
              <Bell className="h-5 w-5" />
              {waiting > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {waiting}
                </span>
              )}
            </Link>
            <LiveClock />
          </div>
        </header>

        <main className="flex-1 space-y-5 px-4 py-5 sm:px-6">
          {reportsQuery.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
            <>
              {view === "dashboard" && (
                <DashboardView name={profile?.full_name ?? ""} reports={reports} staffName={staffName} onView={setViewing} />
              )}
              {view === "reports" && <ReportsView reports={reports} staff={staff} busy={update.isPending} assign={assign}
                onPatch={(id, patch) => update.mutate({ id, patch })} />}
              {view === "assign" && <AssignView reports={reports} staff={staff} assign={assign} busy={update.isPending} />}
              {view === "users" && <StaffView reports={reports} staff={staff} canAdd={profile?.role === "admin"}
                onAdded={() => void queryClient.invalidateQueries({ queryKey: ["staff-list"] })} />}
              {view === "residence" && <ResidenceStructure />}
              {view === "analytics" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Charts for every report in the system.</p>
                    <Button onClick={() => downloadReportsCsv(reports, staffName)}>
                      <FileBarChart className="mr-2 h-4 w-4" /> Generate report
                    </Button>
                  </div>
                  <AdminCharts reports={reports.map(toAdminReport)} />
                </div>
              )}
              {view === "profile" && (
                <Card className="max-w-lg"><CardHeader><CardTitle className="font-display">My Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {profile?.full_name}</p>
                    <p><strong>Email:</strong> {profile?.email}</p>
                    <p><strong>Access:</strong> {roleLabel}</p>
                    <p className="flex items-center gap-1"><MapPin className="h-4 w-4 text-primary" /> Corridor Hills</p>
                  </CardContent></Card>
              )}
            </>
          )}
        </main>
      </div>
      <ReportDetailDialog report={viewing ? toAdminReport(viewing) : null} onClose={() => setViewing(null)} />
    </div>
  );
}

function initials(name?: string | null) {
  if (!name) return "M";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <span className="hidden whitespace-nowrap text-sm sm:inline">
      {now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
      <span className="mx-2 opacity-40">|</span>
      {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadReportsCsv(reports: Report[], staffName: (id: string | null) => string | null) {
  const header = ["Reference", "Submitted", "Block", "Room", "Category", "Priority", "Status", "Assigned to", "Student", "Student number", "Description", "Completed"];
  const rows = reports.map((r) => [
    r.report_reference, new Date(r.created_at).toLocaleString("en-GB"), r.block_name, roomLabel(r), r.category, r.priority,
    r.status, staffName(r.assigned_staff_id) ?? "", r.student_name, r.student_number, r.description,
    r.completed_at ? new Date(r.completed_at).toLocaleString("en-GB") : "",
  ]);
  const csv = [header, ...rows].map((row) => row.map((c) => csvCell(String(c ?? ""))).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `corridor-hills-maintenance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Report downloaded with ${reports.length} maintenance request${reports.length === 1 ? "" : "s"}.`);
}

const overviewConfig = {
  reports: { label: "Reports", color: "var(--primary)" },
  completed: { label: "Completed", color: "var(--success)" },
} satisfies ChartConfig;

function DashboardView({ name, reports, staffName, onView }: {
  name: string; reports: Report[]; staffName: (id: string | null) => string | null; onView: (r: Report) => void;
}) {
  const stats = managementStats(reports);
  const overview = useMemo(() => weeklyOverview(reports), [reports]);
  const firstName = name.split(" ")[0] || "there";
  const cards = [
    { label: "Total Reports", stat: stats.total, icon: <ClipboardList className="h-7 w-7" />, tone: "bg-primary", tint: "border-primary/30 bg-primary/10", upIsGood: true },
    { label: "Completed", stat: stats.completed, icon: <CheckCircle2 className="h-7 w-7" />, tone: "bg-success", tint: "border-success/30 bg-success/10", upIsGood: true },
    { label: "In Progress", stat: stats.inProgress, icon: <Clock className="h-7 w-7" />, tone: "bg-warning", tint: "border-warning/30 bg-warning/10", upIsGood: null },
    { label: "Pending", stat: stats.pending, icon: <AlertCircle className="h-7 w-7" />, tone: "bg-destructive", tint: "border-destructive/30 bg-destructive/10", upIsGood: false },
  ];
  const actions: { view: View; title: string; hint: string; icon: ReactNode; tone: string }[] = [
    { view: "assign", title: "Assign Work", hint: "Give a task to staff", icon: <Plus className="h-7 w-7" />, tone: "bg-primary" },
    { view: "users", title: "Manage Staff", hint: "View & manage staff", icon: <Users className="h-7 w-7" />, tone: "bg-success" },
    { view: "reports", title: "View Reports", hint: "Check all reports", icon: <FileText className="h-7 w-7" />, tone: "worker-purple" },
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-border">
        <img src={photoDusk.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
        <div className="mgmt-banner-shade absolute inset-0" />
        <div className="relative flex items-center gap-4 px-5 py-7 sm:px-8 sm:py-9">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold sm:text-4xl">Welcome back, {firstName}!</h2>
            <p className="mt-2 max-w-xl text-sm text-foreground/85 sm:text-base">
              Manage maintenance requests and keep Corridor Hills in top condition.
            </p>
          </div>
          <div className="hidden items-center gap-3 rounded-xl bg-background/70 px-4 py-3 backdrop-blur sm:flex">
            <FixFlowMark className="h-10 w-auto" />
            <div className="leading-tight">
              <p className="font-display text-lg font-bold">TUT</p>
              <p className="text-xs text-foreground/80">Corridor Hills</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const up = c.stat.change >= 0;
          const good = c.upIsGood === null ? null : up === c.upIsGood;
          return (
            <div key={c.label} className={cn("flex items-center gap-4 rounded-xl border p-4", c.tint)}>
              <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-primary-foreground", c.tone)}>{c.icon}</span>
              <div>
                <p className="text-sm text-foreground/85">{c.label}</p>
                <p className="font-display text-3xl font-bold leading-tight">{c.stat.value}</p>
                <p className={cn("flex items-center gap-0.5 text-xs font-semibold",
                  good === null ? "text-warning" : good ? "text-success" : "text-destructive")}
                  title="Compared with the week before">
                  {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                  {up ? "+" : ""}{c.stat.change}% <span className="ml-1 font-normal text-muted-foreground">vs last week</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Maintenance Overview</h2>
            <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Reports</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Completed</span>
            </div>
          </div>
          <ChartContainer config={overviewConfig} className="h-56 w-full">
            <AreaChart data={overview} margin={{ left: -20, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="mgmt-fill-reports" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-reports)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-reports)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mgmt-fill-completed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-completed)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-completed)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="reports" stroke="var(--color-reports)" strokeWidth={2.5} fill="url(#mgmt-fill-reports)" dot />
              <Area type="monotone" dataKey="completed" stroke="var(--color-completed)" strokeWidth={2.5} fill="url(#mgmt-fill-completed)" dot />
            </AreaChart>
          </ChartContainer>
          <p className="mt-1 text-xs text-muted-foreground">Reports received and jobs completed over the last 7 days.</p>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <Zap className="h-5 w-5 text-warning" /> Quick Actions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((a) => (
              <Link key={a.view} to="/management" search={{ view: a.view }}
                className={cn("flex items-center gap-3 rounded-lg px-4 py-4 text-primary-foreground transition hover:brightness-110", a.tone)}>
                {a.icon}
                <span><span className="block font-semibold">{a.title}</span><span className="text-xs opacity-85">{a.hint}</span></span>
              </Link>
            ))}
            <button type="button" onClick={() => downloadReportsCsv(reports, staffName)}
              className="flex items-center gap-3 rounded-lg bg-warning px-4 py-4 text-left text-warning-foreground transition hover:brightness-110">
              <FileBarChart className="h-7 w-7" />
              <span><span className="block font-semibold">Generate Report</span><span className="text-xs opacity-85">Export data</span></span>
            </button>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <List className="h-5 w-5" />
          <h2 className="font-display text-base font-semibold sm:text-lg">Recent Maintenance Requests</h2>
          <Link to="/management" search={{ view: "reports" }}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            View All Reports <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                {["ID", "Date", "Block", "Room", "Problem", "Priority", "Status", "Assigned To", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No maintenance requests yet.</td></tr>
              )}
              {reports.slice(0, 5).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.report_reference}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td className="px-4 py-2.5">Block {r.block_name}</td>
                  <td className="px-4 py-2.5">{roomLabel(r)}</td>
                  <td className="max-w-[220px] px-4 py-2.5"><span className="block truncate" title={r.description}>{r.category} · {r.description}</span></td>
                  <td className="px-4 py-2.5"><span className={priorityPill(r.priority)}>{r.priority}</span></td>
                  <td className="px-4 py-2.5"><span className={statusPill(r.status)}>{r.status}</span></td>
                  <td className="px-4 py-2.5">{staffName(r.assigned_staff_id) ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <button type="button" onClick={() => onView(r)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function priorityPill(p: Priority) {
  const tone: Record<Priority, string> = {
    Urgent: "bg-destructive text-destructive-foreground",
    High: "bg-destructive text-destructive-foreground",
    Medium: "bg-warning text-warning-foreground",
    Low: "bg-success text-success-foreground",
  };
  return cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tone[p]);
}

function statusPill(s: Status) {
  const tone: Record<Status, string> = {
    Submitted: "bg-secondary text-secondary-foreground",
    Acknowledged: "bg-secondary text-secondary-foreground",
    Assigned: "bg-primary text-primary-foreground",
    "In Progress": "bg-success text-success-foreground",
    Completed: "worker-purple text-primary-foreground",
    Closed: "bg-muted text-muted-foreground",
  };
  return cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tone[s]);
}

type StaffItem = { id: string; full_name: string; email: string; skill_category: Category | null; activeJobs: number };

function StaffView({ reports, staff, canAdd, onAdded }: {
  reports: Report[]; staff: StaffItem[]; canAdd: boolean; onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [skill, setSkill] = useState<string>("any");
  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !email.trim()) throw new Error("Name and email are required.");
      const { error } = await supabase.from("staff_accounts").insert({
        full_name: name.trim(), email: email.trim(), role: "staff", skill_category: skill === "any" ? null : (skill as Category),
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Staff member added."); setName(""); setEmail(""); setSkill("any"); onAdded(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add."),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Card><CardHeader><CardTitle className="font-display">Staff members ({staff.length})</CardTitle>
        <CardDescription>Each worker's skill and current workload.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {staff.length === 0 && <p className="text-sm text-muted-foreground">No staff members yet.</p>}
          {staff.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{s.full_name[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.skill_category ?? "General"} · {s.email}</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{s.activeJobs} active</span>
              </div>
              {reports.filter((r) => r.assigned_staff_id === s.id && isOpen(r)).map((r) => (
                <p key={r.id} className="mt-2 text-xs text-muted-foreground">• {r.report_reference} · {r.category} · {roomLabel(r)} · {r.status}</p>
              ))}
            </div>
          ))}
        </CardContent></Card>
      {canAdd && (
        <Card className="h-fit"><CardHeader><CardTitle className="font-display">Add staff member</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Select value={skill} onValueChange={setSkill}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="any">General (any category)</SelectItem>
                {PROBLEM_CATEGORY_VALUES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Button className="w-full" onClick={() => add.mutate()} disabled={add.isPending}><Plus className="mr-2 h-4 w-4" /> Add staff member</Button>
          </CardContent></Card>
      )}
    </div>
  );
}

function AssignView({ reports, staff, assign, busy }: {
  reports: Report[]; staff: StaffItem[]; assign: (id: string, s: string) => void; busy: boolean;
}) {
  const unassigned = reports.filter((r) => !r.assigned_staff_id && isOpen(r));
  const [picked, setPicked] = useState<Record<string, string>>({});
  return (
    <Card><CardHeader><CardTitle className="font-display">Assign work ({unassigned.length} waiting)</CardTitle>
      <CardDescription>Pick a staff member for each open job. Only workers with a matching skill are listed.</CardDescription></CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {unassigned.length === 0 && <p className="text-sm text-muted-foreground">Every open job has been assigned.</p>}
        {unassigned.map((r) => {
          const eligible = staff.filter((s) => !s.skill_category || s.skill_category === r.category);
          return (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{r.report_reference}</span>
                <span className={priorityPill(r.priority)}>{r.priority}</span>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 font-semibold">{r.category} · Room {roomLabel(r)}</p>
              <p className="line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
              <div className="mt-3 flex gap-2">
                <Select value={picked[r.id] ?? ""} onValueChange={(v) => setPicked((p) => ({ ...p, [r.id]: v }))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={eligible.length ? "Choose staff member" : "No matching staff"} /></SelectTrigger>
                  <SelectContent>{eligible.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name} · {s.activeJobs} active</SelectItem>))}</SelectContent>
                </Select>
                <Button disabled={!picked[r.id] || busy} onClick={() => { const id = picked[r.id]; if (id) assign(r.id, id); }}>Assign</Button>
              </div>
            </div>
          );
        })}
      </CardContent></Card>
  );
}

function ReportsView({ reports, staff, busy, assign, onPatch }: {
  reports: Report[]; staff: StaffItem[]; busy: boolean; assign: (id: string, s: string) => void;
  onPatch: (id: string, p: Database["public"]["Tables"]["maintenance_reports"]["Update"]) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (category !== ALL && r.category !== category) return false;
      if (status !== ALL && r.status !== status) return false;
      return !term || [r.report_reference, r.student_name, r.student_number, r.description, r.block_name + r.unit_number + r.room_name]
        .join(" ").toLowerCase().includes(term);
    });
  }, [reports, search, category, status]);
  return (
    <div className="space-y-4">
      <Card><CardContent className="grid gap-3 pt-6 md:grid-cols-3">
        <div className="space-y-1.5"><Label className="text-xs">Search</Label>
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Reference, student, room…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
        <FilterSelect label="Category" value={category} onChange={setCategory} options={PROBLEM_CATEGORY_VALUES} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[...Constants.public.Enums.report_status]} />
      </CardContent></Card>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No reports match.</p>}
      {filtered.map((r) => (
        <ReportRow key={r.id} report={r} staff={staff} busy={busy} onAssign={(s) => assign(r.id, s)}
          onPriority={(priority) => onPatch(r.id, { priority })} onStatus={(next) => onPatch(r.id, { status: next })} />
      ))}
    </div>
  );
}

function ReportRow({
  report,
  staff,
  busy,
  onAssign,
  onPriority,
  onStatus,
}: {
  report: Report;
  staff: {
    id: string;
    full_name: string;
    skill_category: Report["category"] | null;
    activeJobs: number;
  }[];
  busy: boolean;
  onAssign: (staffId: string) => void;
  onPriority: (priority: Priority) => void;
  onStatus: (status: Status) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">{report.report_reference}</span>
          <StatusBadge status={report.status} />
          <PriorityBadge priority={report.priority} />
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(report.created_at).toLocaleString()}
          </span>
        </div>
        <CardTitle className="font-display text-lg">{report.category}</CardTitle>
        <CardDescription>
          Block {report.block_name} · Unit {report.unit_number} · Room {report.room_name} ·{" "}
          {report.student_name} ({report.student_number})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{report.description}</p>
        {report.staff_notes && (
          <p className="rounded bg-secondary/60 p-2 text-xs">
            <strong>Staff note:</strong> {report.staff_notes}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Assigned to</Label>
            <Select
              value={report.assigned_staff_id ?? ""}
              onValueChange={onAssign}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue placeholder="Not assigned" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const eligible = staff.filter(
                    (s) => !s.skill_category || s.skill_category === report.category,
                  );
                  if (eligible.length === 0) {
                    return (
                      <SelectItem value="none" disabled>
                        No {report.category} workers available
                      </SelectItem>
                    );
                  }
                  return eligible.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                      {s.skill_category ? ` · ${s.skill_category}` : " · General"} ·{" "}
                      {s.activeJobs} active job{s.activeJobs === 1 ? "" : "s"}
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <Select
              value={report.priority}
              onValueChange={(v) => onPriority(v as Priority)}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.report_priority.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={report.status}
              onValueChange={(v) => onStatus(v as Status)}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.report_status.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
