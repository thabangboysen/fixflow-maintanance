import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Droplets,
  Hammer,
  Home,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackStudentReports } from "@/lib/student.functions";
import { consumeTracking } from "@/lib/tracking-handoff";
import residencePhoto from "@/assets/residence-court-enhanced.jpg";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "My Reports · Corridor Hills Maintenance" },
      {
        name: "description",
        content:
          "Track the progress of maintenance problems you reported at Corridor Hills using your student number.",
      },
      { property: "og:title", content: "My Reports · Corridor Hills Maintenance" },
      {
        property: "og:description",
        content: "See the status and maintenance notes for every problem you have reported.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrackPage,
});

type TrackedReport = {
  reference: string;
  category: string;
  description: string;
  status: Parameters<typeof StatusBadge>[0]["status"];
  priority: Parameters<typeof PriorityBadge>[0]["priority"];
  createdAt: string;
  completedAt: string | null;
  staffNotes: string | null;
  roomLabel: string;
  assignedTo: string | null;
  photoUrl: string | null;
};

const CATEGORY_ICONS: Record<string, typeof Zap> = {
  Electrical: Zap,
  Plumbing: Droplets,
  "Broken/Damaged": Hammer,
  Cleaning: Sparkles,
  "Safety/Security": ShieldCheck,
  Other: CircleHelp,
};

const OPEN_STATUSES = ["Submitted", "Acknowledged", "Assigned"] as const;

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function TrackPage() {
  const track = useServerFn(trackStudentReports);
  const [studentNumber, setStudentNumber] = useState("");
  const [studentName, setStudentName] = useState<string | null>(null);
  const [reports, setReports] = useState<TrackedReport[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [automatic, setAutomatic] = useState(false);
  const [panel, setPanel] = useState<"contact" | null>(null);
  const checkedHandoff = useRef(false);

  useEffect(() => {
    if (checkedHandoff.current) return;
    checkedHandoff.current = true;
    const number = consumeTracking(window.sessionStorage);
    if (!number) {
      setInitializing(false);
      return;
    }
    setStudentNumber(number);
    setAutomatic(true);
    setBusy(true);
    void track({ data: { studentNumber: number } })
      .then((result) => {
        setStudentName(result.student.fullName);
        setReports(result.reports);
      })
      .catch((e: unknown) => {
        setAutomatic(false);
        toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      })
      .finally(() => {
        setBusy(false);
        setInitializing(false);
      });
  }, [track]);

  async function lookup() {
    setBusy(true);
    try {
      const result = await track({ data: { studentNumber: studentNumber.trim() } });
      setStudentName(result.student.fullName);
      setReports(result.reports);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const openCount = (reports ?? []).filter((r) =>
    (OPEN_STATUSES as readonly string[]).includes(r.status),
  ).length;
  const inProgressCount = (reports ?? []).filter((r) => r.status === "In Progress").length;
  const resolvedCount = (reports ?? []).filter((r) => r.status === "Completed").length;
  const closedCount = (reports ?? []).filter((r) => r.status === "Closed").length;
  const statusBreakdown = [
    { label: "Open", count: openCount, dot: "bg-chart-3" },
    { label: "In Progress", count: inProgressCount, dot: "bg-warning" },
    { label: "Resolved", count: resolvedCount, dot: "bg-success" },
    { label: "Closed", count: closedCount, dot: "bg-muted-foreground" },
  ];

  function focusReports() {
    if (reports) {
      document.getElementById("reports-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      document.getElementById("studentNumber")?.focus();
    }
  }

  return (
    <div className="report-workspace grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="report-sidebar flex flex-col border-b border-border px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="px-2 pb-5 lg:pb-8"><Wordmark subtitle="Maintenance System" /></div>
        <nav aria-label="Student navigation" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <Button asChild variant="ghost" className="report-nav report-soft text-left hover:bg-primary/30 hover:text-primary-foreground">
            <Link to="/"><Home />Home</Link>
          </Button>
          <Button asChild className="report-nav report-active-nav text-left text-primary-foreground" aria-current="page">
            <Link to="/track"><ClipboardList />My Reports<ChevronRight className="ml-auto" /></Link>
          </Button>
          <Button asChild variant="ghost" className="report-nav report-soft text-left hover:bg-primary/30 hover:text-primary-foreground">
            <Link to="/report"><Plus />Report a Problem</Link>
          </Button>
          <Button asChild variant="ghost" className="report-nav report-soft text-left hover:bg-primary/30 hover:text-primary-foreground">
            <Link to="/report"><User />Student Verification</Link>
          </Button>
          <Button variant="ghost" className="report-nav report-soft text-left hover:bg-primary/30 hover:text-primary-foreground" onClick={() => setPanel("contact")}>
            <Phone />Contact Management
          </Button>
        </nav>
        <div className="mt-auto hidden border-t border-border px-2 pt-5 pb-8 lg:block">
          <p className="report-eyebrow text-[10px] font-semibold uppercase tracking-[0.15em]">TUT Corridor Hills Residence</p>
          <p className="report-soft mt-3 text-xs italic">Safe · Connected · Supported</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-5 sm:px-8 lg:px-9">
          <span className="flex items-center gap-2 text-xs sm:text-sm"><MapPin className="h-4 w-4 text-accent" />Corridor Hills Residence · TUT eMalahleni Campus</span>
          {studentName && (
            <span className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground"><User className="h-3.5 w-3.5" /></span>
              <span className="hidden sm:inline text-muted-foreground">Student</span>
              <span className="font-semibold">{studentNumber}</span>
            </span>
          )}
        </header>

        <section className="relative isolate overflow-hidden border-b border-border">
          <img src={residencePhoto} alt="Corridor Hills residence buildings" className="absolute inset-0 -z-20 h-full w-full object-cover object-[60%_center]" />
          <div className="report-photo-shade absolute inset-0 -z-10" />
          <div className="px-5 py-8 sm:px-8 lg:px-9 lg:py-10">
            <h1 className="font-display text-2xl leading-tight font-bold text-primary-foreground sm:text-3xl report-photo-copy">
              Welcome back{studentName ? `, ${firstName(studentName)}` : ""}
            </h1>
            <p className="report-photo-copy mt-2 max-w-md text-sm leading-6 text-primary-foreground/90">
              Keep your space safe, comfortable and well maintained. Track your reports and stay updated in real time.
            </p>
          </div>
        </section>

        <main className="mx-auto grid w-full max-w-[1440px] flex-1 items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-7 lg:px-9 lg:py-10">
          <Card className="report-form min-w-0">
            <CardHeader>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary"><ClipboardList className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <CardTitle className="font-display text-xl">Track your reports</CardTitle>
                  <CardDescription>
                    {automatic ? "See every problem you've reported and its progress." : "Enter your student number to see every problem you've reported and its progress."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {initializing ? (
                <p role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading your reports…</p>
              ) : <form onSubmit={(e) => { e.preventDefault(); if (!busy && studentNumber.trim().length >= 3) void lookup(); }} className="flex flex-wrap gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="studentNumber" className="sr-only">Student number</Label>
                  <Input id="studentNumber" inputMode="numeric" autoComplete="off" placeholder="Your student number" className="h-11" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} />
                </div>
                <Button type="submit" size="lg" disabled={busy || studentNumber.trim().length < 3}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">Look up</span>
                </Button>
              </form>}

              {reports && (
                <div id="reports-list" className="space-y-3 pt-2">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Student {studentNumber} · {reports.length} report{reports.length === 1 ? "" : "s"}
                  </p>
                  {reports.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No reports yet for this student number.
                    </p>
                  )}
                  {reports.map((r) => {
                    const CategoryIcon = CATEGORY_ICONS[r.category] ?? CircleHelp;
                    return (
                      <div key={r.reference} className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/40">
                        {r.photoUrl ? <a href={r.photoUrl} target="_blank" rel="noreferrer" className="shrink-0"><img src={r.photoUrl} alt={`Photo for report ${r.reference}`} className="h-16 w-16 rounded-md object-cover" /></a> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-secondary"><CategoryIcon className="h-6 w-6" /></span>}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">{r.reference}</span>
                            <StatusBadge status={r.status} />
                            <PriorityBadge priority={r.priority} />
                            <span className="ml-auto text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-2 font-display text-base font-semibold">{r.category}</p>
                          <p className="text-sm text-muted-foreground">{r.description}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Room {r.roomLabel}
                            {r.assignedTo ? ` · Assigned to ${r.assignedTo}` : " · Not yet assigned"}
                          </p>
                          {r.staffNotes && (
                            <p className="mt-2 rounded bg-secondary/60 p-2 text-xs">
                              <strong>Update from maintenance:</strong> {r.staffNotes}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="mt-6 hidden shrink-0 text-muted-foreground sm:block" />
                      </div>
                    );
                  })}
                </div>
              )}

              <Button asChild variant="ghost" className="w-full">
                <Link to="/"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to home</Link>
              </Button>
            </CardContent>
          </Card>

          <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20"><CheckCircle2 className="h-5 w-5 text-success-foreground" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold">Your reports</p>
                  <p className="text-xs text-muted-foreground">{reports ? `${openCount} active report${openCount === 1 ? "" : "s"}` : "Look up to see them"}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={focusReports} aria-label="View your reports"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
              <p className="flex items-center gap-2 font-display text-sm font-semibold"><Activity className="h-4 w-4" /> Report status</p>
              <ul className="mt-3 space-y-2">
                {statusBreakdown.map((row) => (
                  <li key={row.label} className="flex items-center gap-2 text-xs">
                    <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="ml-auto font-semibold">{reports ? row.count : "–"}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
              <p className="flex items-center gap-2 font-display text-sm font-semibold"><Zap className="h-4 w-4" /> Quick actions</p>
              <div className="mt-3 space-y-2">
                <Button asChild variant="secondary" className="h-10 w-full justify-between rounded-md bg-secondary/60 text-card-foreground hover:bg-secondary">
                  <Link to="/report"><span className="flex items-center gap-2 text-xs font-medium"><Plus className="h-4 w-4 text-accent" />Report a Problem</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
                </Button>
                <Button variant="secondary" className="h-10 w-full justify-between rounded-md bg-secondary/60 text-card-foreground hover:bg-secondary" onClick={focusReports}>
                  <span className="flex items-center gap-2 text-xs font-medium"><ClipboardList className="h-4 w-4 text-primary" />View All Reports</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="secondary" className="h-10 w-full justify-between rounded-md bg-secondary/60 text-card-foreground hover:bg-secondary" onClick={() => setPanel("contact")}>
                  <span className="flex items-center gap-2 text-xs font-medium"><Phone className="h-4 w-4 text-primary" />Contact Management</span><ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button asChild variant="secondary" className="h-10 w-full justify-between rounded-md bg-secondary/60 text-card-foreground hover:bg-secondary">
                  <Link to="/report"><span className="flex items-center gap-2 text-xs font-medium"><User className="h-4 w-4 text-primary" />Student Verification</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-gradient-to-br from-secondary to-accent/15 p-4 text-card-foreground">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent"><ShieldCheck className="h-5 w-5 text-accent-foreground" /></span>
                <div>
                  <p className="font-display text-sm font-semibold">Need help?</p>
                  <p className="text-xs text-muted-foreground">Our team is here to assist you.</p>
                </div>
              </div>
              <Button className="mt-3 w-full" onClick={() => setPanel("contact")}>Contact us</Button>
            </div>
          </aside>
        </main>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-4 text-xs report-soft sm:px-8 lg:px-9">
          <p>Corridor Hills Maintenance System <span className="mx-1">·</span> TUT eMalahleni Campus</p>
          <p>Report <span className="mx-1">·</span> Track <span className="mx-1">·</span> Done</p>
        </footer>
      </div>

      <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Management</DialogTitle>
            <DialogDescription>For room allocation or student-number problems, contact the Corridor Hills residence office.</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">For an existing maintenance request, use My Reports to check updates from the maintenance team.</p>
          <Button asChild><Link to="/track">My Reports<ArrowLeft className="ml-2" /></Link></Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
