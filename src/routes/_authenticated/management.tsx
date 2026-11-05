import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowRight, Building2, CheckCircle2, ClipboardList, Clock, LayoutGrid, ListFilter,
  Loader2, LogOut, MapPin, Menu, Plus, Search, ShieldCheck, User, Users, Wrench,
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { ResidenceStructure } from "@/components/ResidenceStructure";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSignOut } from "@/hooks/useAuth";
import { Constants, type Database } from "@/integrations/supabase/types";
import { PROBLEM_CATEGORY_VALUES } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Status = Database["public"]["Enums"]["report_status"];
type Priority = Database["public"]["Enums"]["report_priority"];
type Report = Database["public"]["Tables"]["maintenance_reports"]["Row"];
type Category = Database["public"]["Enums"]["problem_category"];
type View = "dashboard" | "reports" | "users" | "residence" | "profile";
const VIEWS: View[] = ["dashboard", "reports", "users", "residence", "profile"];
const ALL = "all";
const isOpen = (r: Report) => r.status !== "Completed" && r.status !== "Closed";

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

const NAV: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: "dashboard", label: "Dashboard", icon: <LayoutGrid className="h-5 w-5" /> },
  { view: "reports", label: "All Reports", icon: <ListFilter className="h-5 w-5" /> },
  { view: "users", label: "Users", icon: <Users className="h-5 w-5" /> },
  { view: "residence", label: "Residence Structure", icon: <Building2 className="h-5 w-5" /> },
  { view: "profile", label: "My Profile", icon: <User className="h-5 w-5" /> },
];

function ManagementPage() {
  const { view } = Route.useSearch();
  const { data: profile } = useProfile();
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const reports = reportsQuery.data ?? [];
  const staff = (staffQuery.data ?? []).filter((s) => s.role === "staff" && s.active).map((s) => ({
    ...s,
    activeJobs: reports.filter((r) => r.assigned_staff_id === s.id && isOpen(r)).length,
  }));

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

  const title = NAV.find((n) => n.view === view)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-primary text-primary-foreground transition-transform lg:static lg:translate-x-0",
        menuOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="px-6 py-6"><Wordmark subtitle="Smart Maintenance" /></div>
        <p className="px-6 pb-2 text-xs font-semibold uppercase tracking-wider opacity-50">{roleLabel} workspace</p>
        <nav className="flex-1 space-y-1 px-4">
          {NAV.map((n) => (
            <Link key={n.view} to="/management" search={{ view: n.view }} onClick={() => setMenuOpen(false)}
              className={cn("flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition",
                view === n.view ? "bg-accent text-accent-foreground" : "opacity-80 hover:bg-white/10 hover:opacity-100")}>
              {n.icon} {n.label}
            </Link>
          ))}
          {profile?.role === "admin" && (
            <Link to="/admin" className="flex items-center gap-3 rounded-lg px-4 py-3 font-medium opacity-80 hover:bg-white/10">
              <ShieldCheck className="h-5 w-5" /> Students &amp; team admin
            </Link>
          )}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg bg-white/5 p-4">
            <p className="font-semibold">{profile?.full_name}</p>
            <p className="flex items-center gap-1 text-xs opacity-50"><ShieldCheck className="h-3 w-3" /> {roleLabel} access</p>
          </div>
          <button onClick={signOut} className="mt-3 flex items-center gap-3 px-2 py-2 opacity-80 hover:opacity-100">
            <LogOut className="h-5 w-5" /> Logout
          </button>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 border-b border-border bg-card px-6 py-4 lg:px-10">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu className="h-6 w-6" /></button>
          <h1 className="font-display text-xl font-semibold">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-semibold">{profile?.full_name}</p>
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
              {profile?.full_name?.[0] ?? "?"}
            </span>
          </div>
        </header>
        <main className="p-6 lg:p-10">
          {reportsQuery.isLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
            <>
              {view === "dashboard" && <DashboardView name={profile?.full_name ?? ""} roleLabel={roleLabel} reports={reports} />}
              {view === "reports" && <ReportsView reports={reports} staff={staff} busy={update.isPending} assign={assign}
                onPatch={(id, patch) => update.mutate({ id, patch })} />}
              {view === "users" && <UsersView reports={reports} staff={staff} assign={assign} busy={update.isPending}
                canAdd={profile?.role === "admin"} onAdded={() => void queryClient.invalidateQueries({ queryKey: ["staff-list"] })} />}
              {view === "residence" && <ResidenceStructure />}
              {view === "profile" && (
                <Card className="max-w-lg"><CardHeader><CardTitle className="font-display">My Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {profile?.full_name}</p>
                    <p><strong>Email:</strong> {profile?.email}</p>
                    <p><strong>Access:</strong> {roleLabel}</p>
                    <p className="flex items-center gap-1"><MapPin className="h-4 w-4 text-accent" /> Corridor Hills</p>
                  </CardContent></Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function DashboardView({ name, roleLabel, reports }: { name: string; roleLabel: string; reports: Report[] }) {
  const total = reports.length;
  const completed = reports.filter((r) => !isOpen(r)).length;
  const weekAgo = Date.now() - 7 * 864e5;
  const stats = [
    { label: "Total reports", value: total, icon: <ClipboardList />, cls: "bg-primary text-primary-foreground" },
    { label: "Pending", value: reports.filter((r) => ["Submitted", "Acknowledged", "Assigned"].includes(r.status)).length, icon: <Clock />, cls: "bg-warning text-warning-foreground" },
    { label: "In progress", value: reports.filter((r) => r.status === "In Progress").length, icon: <Wrench />, cls: "bg-accent text-accent-foreground" },
    { label: "Completed", value: completed, icon: <CheckCircle2 />, cls: "bg-success text-success-foreground" },
    { label: "New reports", value: reports.filter((r) => r.status === "Submitted" && new Date(r.created_at).getTime() > weekAgo).length, icon: <AlertTriangle />, cls: "bg-accent text-accent-foreground" },
    { label: "Urgent reports", value: reports.filter((r) => r.priority === "Urgent" && isOpen(r)).length, icon: <AlertTriangle />, cls: "bg-destructive text-destructive-foreground" },
    { label: "Completion rate", value: `${total ? Math.round((completed / total) * 100) : 0}%`, icon: <CheckCircle2 />, cls: "bg-success text-success-foreground" },
    { label: "Open total", value: total - completed, icon: <ListFilter />, cls: "bg-primary text-primary-foreground" },
  ];
  const links: { view: View; label: string; icon: React.ReactNode; cls: string }[] = [
    { view: "reports", label: "All Reports", icon: <ListFilter />, cls: "bg-accent text-accent-foreground" },
    { view: "users", label: "Manage Users", icon: <Users />, cls: "bg-primary text-primary-foreground" },
    { view: "residence", label: "Residence Structure", icon: <Building2 />, cls: "bg-primary text-primary-foreground" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-8">
        <div>
          <h2 className="font-display text-3xl font-bold">Welcome, {name}</h2>
          <p className="text-muted-foreground">{roleLabel} workspace</p>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-accent" /> Corridor Hills
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-start justify-between rounded-2xl border border-border bg-card p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-2 font-display text-4xl font-bold">{s.value}</p>
            </div>
            <span className={cn("flex h-14 w-14 items-center justify-center rounded-xl [&_svg]:h-6 [&_svg]:w-6", s.cls)}>{s.icon}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {links.map((l) => (
          <Link key={l.view} to="/management" search={{ view: l.view }}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition hover:shadow-md">
            <span className={cn("flex h-14 w-14 items-center justify-center rounded-xl [&_svg]:h-6 [&_svg]:w-6", l.cls)}>{l.icon}</span>
            <span className="flex-1 font-display text-lg font-semibold">{l.label}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Recent Reports</h3>
          <Link to="/management" search={{ view: "reports" }} className="font-medium text-accent">View all</Link>
        </div>
        {reports.length === 0 && <p className="py-8 text-center text-muted-foreground">No reports yet.</p>}
        <div className="divide-y divide-border">
          {reports.slice(0, 5).map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{r.report_reference}</span>
              <span className="font-medium">{r.category}</span>
              <span className="text-muted-foreground">{r.block_name}{r.unit_number}{r.room_name}</span>
              <span className="ml-auto flex gap-2"><PriorityBadge priority={r.priority} /><StatusBadge status={r.status} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type StaffItem = { id: string; full_name: string; email: string; skill_category: Category | null; activeJobs: number };

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

function UsersView({ reports, staff, assign, busy, canAdd, onAdded }: {
  reports: Report[]; staff: StaffItem[]; assign: (id: string, s: string) => void; busy: boolean; canAdd: boolean; onAdded: () => void;
}) {
  const unassigned = reports.filter((r) => !r.assigned_staff_id && isOpen(r));
  const [picked, setPicked] = useState<Record<string, string>>({});
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
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <div className="space-y-6">
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
                  <p key={r.id} className="mt-2 text-xs text-muted-foreground">• {r.report_reference} · {r.category} · {r.block_name}{r.unit_number}{r.room_name} · {r.status}</p>
                ))}
              </div>
            ))}
          </CardContent></Card>
        {canAdd && (
          <Card><CardHeader><CardTitle className="font-display">Add staff member</CardTitle></CardHeader>
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

      <Card><CardHeader><CardTitle className="font-display">Assign work ({unassigned.length} waiting)</CardTitle>
        <CardDescription>Pick a staff member for each open job. Only workers with a matching skill are listed.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {unassigned.length === 0 && <p className="text-sm text-muted-foreground">Every open job has been assigned.</p>}
          {unassigned.map((r) => {
            const eligible = staff.filter((s) => !s.skill_category || s.skill_category === r.category);
            return (
              <div key={r.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{r.report_reference}</span>
                  <PriorityBadge priority={r.priority} />
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 font-semibold">{r.category} · Room {r.block_name}{r.unit_number}{r.room_name}</p>
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
