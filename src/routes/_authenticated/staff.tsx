import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  Eye,
  Flag,
  HardHat,
  ImageOff,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  Settings,
  Timer,
  Wrench,
  BarChart3,
} from "lucide-react";
import { FixFlowMark, Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSignOut } from "@/hooks/useAuth";
import { isOpen, workspaceStats } from "@/lib/workspace-stats";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["report_status"];
type Priority = Database["public"]["Enums"]["report_priority"];
type Job = Database["public"]["Tables"]["maintenance_reports"]["Row"];

const workStatuses: Status[] = ["Acknowledged", "Assigned", "In Progress", "Completed"];
const priorityRank: Record<Priority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "My maintenance jobs · Corridor Hill" },
      {
        name: "description",
        content:
          "Maintenance staff view: see the jobs assigned to you at Corridor Hill, update their status, add notes and mark work as completed.",
      },
      { property: "og:title", content: "My maintenance jobs · Corridor Hill" },
      {
        property: "og:description",
        content: "Assigned jobs with room location, category, notes and completion tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffPage,
});

const roomLabel = (j: Job) => `${j.block_name}${j.unit_number}${j.room_name}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function StaffPage() {
  const { data: profile } = useProfile();
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  const ordersRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const jobsQuery = useQuery({
    queryKey: ["staff-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const stats = workspaceStats(jobs);
  const openJobs = jobs.filter(isOpen);
  const notStarted = openJobs.filter((j) => j.status !== "In Progress").length;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [active, setActive] = useState<"dashboard" | "orders">("dashboard");

  const defaultJob = useMemo(
    () =>
      [...openJobs].sort(
        (a, b) =>
          priorityRank[a.priority] - priorityRank[b.priority] ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobs],
  );
  const selected = jobs.find((j) => j.id === selectedId) ?? defaultJob ?? null;

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["staff-jobs"] });

  const quickUpdate = useMutation({
    mutationFn: async ({ job, status }: { job: Job; status: Status }) => {
      const { error } = await supabase
        .from("maintenance_reports")
        .update({
          status,
          completed_at:
            status === "Completed" ? (job.completed_at ?? new Date().toISOString()) : null,
        })
        .eq("id", job.id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(status === "Completed" ? "Job marked as completed." : "Work started.");
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update this job."),
  });

  const goDashboard = () => {
    setActive("dashboard");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const goOrders = () => {
    setActive("orders");
    ordersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const openUpdate = () => {
    if (!selected) {
      toast.info("You have no job to update right now.");
      return;
    }
    setUpdateOpen(true);
  };

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const selectedDone = selected ? !isOpen(selected) : true;

  const nav: { key: string; label: string; icon: ReactNode; onClick: () => void; badge?: number; current?: boolean }[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, onClick: goDashboard, current: active === "dashboard" },
    { key: "orders", label: "My Work Orders", icon: <ClipboardList className="h-4 w-4" />, onClick: goOrders, badge: openJobs.length, current: active === "orders" },
    { key: "update", label: "Update Progress", icon: <RefreshCw className="h-4 w-4" />, onClick: openUpdate },
    { key: "logout", label: "Logout", icon: <LogOut className="h-4 w-4" />, onClick: () => void signOut() },
  ];

  return (
    <div className="worker-workspace flex">
      {/* Side menu (tablet and desktop) */}
      <aside className="worker-sidebar sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r border-border md:flex">
        <div className="px-5 pb-4 pt-5">
          <Wordmark subtitle="Maintenance System" />
        </div>
        <div className="mx-3 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
            {initials(profile?.full_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{profile?.full_name ?? "Maintenance worker"}</p>
            <p className="text-xs text-muted-foreground">Maintenance Staff</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-success" /> Online
            </p>
          </div>
        </div>
        <nav className="mt-5 flex flex-col gap-1 px-3">
          {nav.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                item.current
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground/85 hover:bg-muted",
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-1 px-4 pb-6 text-center">
          <FixFlowMark className="h-10 w-auto" />
          <p className="text-sm font-semibold">Corridor Hills</p>
          <p className="text-xs text-muted-foreground">Accommodation Maintenance Portal</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
          <div className="md:hidden">
            <Wordmark subtitle="Maintenance System" />
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={goOrders}
              className="relative rounded-full p-1.5 hover:bg-muted"
              aria-label={`${notStarted} jobs not started yet`}
            >
              <Bell className="h-5 w-5" />
              {notStarted > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {notStarted}
                </span>
              )}
            </button>
            <Clock />
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-full p-1.5 hover:bg-muted md:hidden"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Mobile menu */}
        <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-2 md:hidden">
          {nav.slice(0, 3).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs",
                item.current ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/85",
              )}
            >
              {item.icon}
              {item.label}
              {!!item.badge && (
                <span className="rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <main className="flex-1 space-y-5 px-4 py-5 sm:px-6" ref={undefined}>
          <div ref={topRef} className="flex scroll-mt-4 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning text-warning-foreground">
              <HardHat className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold sm:text-3xl">Welcome back, {firstName}!</h1>
              <p className="text-sm text-muted-foreground">Here are your assigned maintenance tasks.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard tone="bg-primary" icon={<ClipboardList className="h-5 w-5" />} value={stats.assigned} label="Assigned Jobs" />
            <StatCard tone="bg-success" icon={<CheckCircle2 className="h-5 w-5" />} value={stats.completedToday} label="Completed Today" />
            <StatCard tone="bg-warning" icon={<Timer className="h-5 w-5" />} value={stats.inProgress} label="In Progress" />
            <StatCard tone="worker-purple" icon={<BarChart3 className="h-5 w-5" />} value={stats.overdue} label="Overdue" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <section className="overflow-hidden rounded-xl border border-border">
              <div className="worker-band flex items-center gap-3 px-5 py-3 text-primary-foreground">
                <Wrench className="h-5 w-5" />
                <h2 className="font-display text-base font-semibold sm:text-lg">Your Assigned Work Order</h2>
                {selected && (
                  <span className={cn("ml-auto", priorityPill(selected.priority))}>
                    {selected.priority} Priority
                  </span>
                )}
              </div>
              <div className="worker-paper p-4 sm:p-5">
                {jobsQuery.isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : selected ? (
                  <WorkOrderSheet job={selected} />
                ) : (
                  <div className="py-8 text-center">
                    <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 font-medium">No work order assigned right now</p>
                    <p className="text-sm text-muted-foreground">
                      New jobs appear here as soon as the office assigns them to you.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <Settings className="h-5 w-5" /> Your Actions
              </h2>
              <div className="space-y-3">
                <ActionButton
                  tone="bg-primary text-primary-foreground"
                  icon={<Play className="h-4 w-4" />}
                  title="Start Work"
                  hint="Mark this job as in progress"
                  disabled={!selected || selectedDone || selected.status === "In Progress" || quickUpdate.isPending}
                  onClick={() => selected && quickUpdate.mutate({ job: selected, status: "In Progress" })}
                />
                <ActionButton
                  tone="bg-success text-success-foreground"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Update Progress"
                  hint="Add notes or upload a photo"
                  disabled={!selected}
                  onClick={openUpdate}
                />
                <ActionButton
                  tone="bg-secondary text-secondary-foreground"
                  icon={<Flag className="h-4 w-4" />}
                  title="Mark as Completed"
                  hint="Finish the job when done"
                  disabled={!selected || selectedDone || quickUpdate.isPending}
                  onClick={() => selected && quickUpdate.mutate({ job: selected, status: "Completed" })}
                />
              </div>
            </section>
          </div>

          <section ref={ordersRef} className="scroll-mt-4">
            <WorkOrdersTable
              jobs={jobs}
              loading={jobsQuery.isLoading}
              selectedId={selected?.id ?? null}
              onView={(id) => {
                setSelectedId(id);
                goDashboard();
              }}
            />
          </section>
        </main>
      </div>

      {selected && (
        <UpdateProgressDialog
          key={selected.id + String(updateOpen)}
          job={selected}
          open={updateOpen}
          onOpenChange={setUpdateOpen}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function initials(name?: string | null) {
  if (!name) return "MW";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <span className="whitespace-nowrap text-xs sm:text-sm">
      {now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
      <span className="mx-2 opacity-40">|</span>
      {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function StatCard({ tone, icon, value, label }: { tone: string; icon: ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground", tone)}>
        {icon}
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function ActionButton({
  tone,
  icon,
  title,
  hint,
  disabled,
  onClick,
}: {
  tone: string;
  icon: ReactNode;
  title: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full flex-col items-center rounded-lg px-4 py-3 text-center transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100",
        tone,
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </span>
      <span className="mt-0.5 text-xs opacity-80">{hint}</span>
    </button>
  );
}

function priorityPill(p: Priority) {
  const tone: Record<Priority, string> = {
    Urgent: "bg-destructive text-destructive-foreground",
    High: "bg-destructive text-destructive-foreground",
    Medium: "bg-warning text-warning-foreground",
    Low: "bg-secondary text-secondary-foreground",
  };
  return cn("inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold", tone[p]);
}

function statusPill(s: Status) {
  const tone: Record<Status, string> = {
    Submitted: "bg-secondary text-secondary-foreground",
    Acknowledged: "bg-secondary text-secondary-foreground",
    Assigned: "bg-primary text-primary-foreground",
    "In Progress": "bg-success text-success-foreground",
    Completed: "bg-success text-success-foreground",
    Closed: "bg-muted text-muted-foreground",
  };
  return cn("inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold", tone[s]);
}

function useReportPhoto(path: string | null) {
  return useQuery({
    queryKey: ["report-photo", path],
    enabled: !!path,
    staleTime: 20 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("report-photos").createSignedUrl(path!, 60 * 30);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

function WorkOrderSheet({ job }: { job: Job }) {
  const photo = useReportPhoto(job.photo_path);
  const rows: [string, ReactNode][] = [
    ["Work Order ID", <span className="font-semibold text-primary">{job.report_reference}</span>],
    ["Room Number", roomLabel(job)],
    ["Residence", job.residence],
    ["Problem", job.category],
    ["Reported By", `${job.student_name} (Student)`],
    ["Reported On", formatDate(job.created_at)],
    ["Priority", <span className={priorityPill(job.priority)}>{job.priority}</span>],
    ["Status", <span className={statusPill(job.status)}>{job.status}</span>],
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,220px)_1fr]">
      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted sm:aspect-auto sm:h-full sm:min-h-48">
        {job.photo_path && photo.data ? (
          <img src={photo.data} alt={`Photo of the ${job.category.toLowerCase()} problem`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
            {job.photo_path && photo.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageOff className="h-6 w-6" />}
            {job.photo_path && photo.isLoading ? "Loading photo…" : "The student did not add a photo"}
          </div>
        )}
      </div>
      <div>
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium">{k}:</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{job.description}</p>
        {job.staff_notes && (
          <p className="mt-2 text-sm">
            <span className="font-medium">Your notes: </span>
            {job.staff_notes}
          </p>
        )}
      </div>
    </div>
  );
}

function WorkOrdersTable({
  jobs,
  loading,
  selectedId,
  onView,
}: {
  jobs: Job[];
  loading: boolean;
  selectedId: string | null;
  onView: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const rows = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
  const statuses: Status[] = ["Assigned", "Acknowledged", "In Progress", "Completed", "Closed"];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <ListChecks className="h-5 w-5" />
        <h2 className="font-display text-base font-semibold">My Work Orders</h2>
        <div className="ml-auto w-40">
          <Select value={filter} onValueChange={(v) => setFilter(v as "all" | Status)}>
            <SelectTrigger className="h-8 text-xs" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              {["ID", "Room", "Problem", "Priority", "Status", "Assigned Date", "Actions"].map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  {jobs.length === 0 ? "No work orders have been assigned to you yet." : "No work orders with this status."}
                </td>
              </tr>
            )}
            {rows.map((j) => (
              <tr key={j.id} className={cn("border-t border-border", j.id === selectedId && "worker-row-active")}>
                <td className="px-4 py-2.5 font-mono text-xs">{j.report_reference}</td>
                <td className="px-4 py-2.5">{roomLabel(j)}</td>
                <td className="max-w-56 truncate px-4 py-2.5" title={j.description}>
                  {j.category}
                </td>
                <td className="px-4 py-2.5">
                  <span className={priorityPill(j.priority)}>{j.priority}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={statusPill(j.status)}>{j.status}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                  {formatDate(j.assigned_at ?? j.created_at)}
                </td>
                <td className="px-4 py-2.5">
                  <Button size="sm" variant="outline" className="h-7 bg-transparent" onClick={() => onView(j.id)}>
                    <Eye className="mr-1 h-3.5 w-3.5" /> View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UpdateProgressDialog({
  job,
  open,
  onOpenChange,
  onSaved,
}: {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<Status>(
    workStatuses.includes(job.status) ? job.status : "In Progress",
  );
  const [notes, setNotes] = useState(job.staff_notes ?? "");
  const [photo, setPhoto] = useState<File | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      let completionPhotoPath = job.completion_photo_path;
      if (photo) {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Please sign in again.");
        const ext = (photo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${u.user.id}/work-${job.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("report-photos")
          .upload(path, photo, { contentType: photo.type });
        if (upErr) throw new Error("The photo could not be uploaded. Try a smaller picture.");
        completionPhotoPath = path;
      }
      const { error } = await supabase
        .from("maintenance_reports")
        .update({
          status,
          staff_notes: notes.trim() || null,
          completion_photo_path: completionPhotoPath,
          completed_at: status === "Completed" ? (job.completed_at ?? new Date().toISOString()) : null,
        })
        .eq("id", job.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Progress saved.");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update this job."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update progress</DialogTitle>
          <DialogDescription>
            {job.report_reference} · {job.category} · Room {roomLabel(job)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="progress-notes">Notes</Label>
            <Textarea
              id="progress-notes"
              rows={3}
              placeholder="Work done, parts needed, or access problems."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="progress-photo">Photo of the work (optional)</Label>
            <Input
              id="progress-photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
