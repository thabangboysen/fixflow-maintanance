import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, CircleHelp, ClipboardList, Eye, Home, Info, Loader2, Mail, MapPin, Phone, Send, UserRound, Wrench, Zap } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import residencePhoto from "@/assets/residence-court-enhanced.jpg";
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
import { PROBLEM_CATEGORIES, type ProblemCategory } from "@/lib/categories";
import { getLinkedStudent, requestStudentOtp, setReportPhoto, submitStudentReport } from "@/lib/student.functions";
import { supabase } from "@/integrations/supabase/client";
import { prepareTracking } from "@/lib/tracking-handoff";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a problem · Corridor Hills Maintenance" },
      {
        name: "description",
        content:
          "Report a maintenance problem in your room or unit at Corridor Hills. Verify your student number, describe the problem and get a reference number to track it.",
      },
      { property: "og:title", content: "Report a problem · Corridor Hills Maintenance" },
      {
        property: "og:description",
        content: "Verified student maintenance reporting with instant reference numbers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

type VerifiedStudent = {
  fullName: string;
  studentNumber: string;
  residence: string;
  block: string | null;
  unit: string | null;
  room: string | null;
  roomLabel: string | null;
};

function ReportPage() {
  const requestOtp = useServerFn(requestStudentOtp);
  const linkedStudent = useServerFn(getLinkedStudent);
  const submit = useServerFn(submitStudentReport);
  const attachPhoto = useServerFn(setReportPhoto);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [restoring, setRestoring] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const [studentNumber, setStudentNumber] = useState("");
  const [student, setStudent] = useState<VerifiedStudent | null>(null);
  const [category, setCategory] = useState<ProblemCategory | "">("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"help" | "contact" | null>(null);
  const step = reference ? 3 : student ? 2 : 1;

  const errorText = (e: unknown) =>
    e instanceof Error ? e.message : "Something went wrong. Please try again.";

  async function sendLink() {
    setBusy(true);
    try {
      const result = await requestOtp({ data: { studentNumber: studentNumber.trim(), origin: window.location.origin } });
      setMaskedEmail(result.maskedEmail);
      setCooldown(60);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // After the student taps the emailed link they land here signed in;
  // look up their residence record and skip straight to step 2.
  useEffect(() => {
    let cancelled = false;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const linkError = hash.get("error_code") || hash.get("error");
    const cameFromLink = hash.has("access_token") || Boolean(linkError);
    if (linkError) {
      toast.error("That sign-in link has expired or was already used. Please request a new one.");
      window.history.replaceState(null, "", window.location.pathname);
    }

    async function restore(showErrors: boolean) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        const result = await linkedStudent();
        if (cancelled) return;
        setStudent({
          fullName: result.fullName,
          studentNumber: result.studentNumber,
          residence: "Corridor Hill",
          block: result.block,
          unit: null,
          room: null,
          roomLabel: result.roomNumber,
        });
        setStudentNumber(result.studentNumber);
        if (!result.roomNumber) toast.error("Your room has not been allocated yet. Please contact Corridor Hills Management.");
      } catch (e) {
        if (showErrors && !cancelled) toast.error(errorText(e));
      }
    }

    void restore(cameFromLink && !linkError).finally(() => {
      if (!cancelled) setRestoring(false);
    });

    // If the link was opened in another tab, this tab picks up the sign-in too.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void restore(false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitReport() {
    if (!student) return;
    if (!category) {
      toast.error("Choose what kind of problem it is.");
      return;
    }
    setBusy(true);
    try {
      const result = await submit({
        data: { studentNumber: student.studentNumber, category, description: description.trim() },
      });
      if (photo) {
        try {
          const { data: u } = await supabase.auth.getUser();
          const ext = (photo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
          const path = `${u.user?.id}/${result.reportId}.${ext}`;
          const { error: upErr } = await supabase.storage.from("report-photos").upload(path, photo, { upsert: true, contentType: photo.type });
          if (upErr) throw upErr;
          await attachPhoto({ data: { reportId: result.reportId, path } });
        } catch {
          toast.error("Your report was sent, but the photo could not be uploaded.");
        }
      }
      setReference(result.reference);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-workspace grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="report-sidebar flex flex-col border-b border-border px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="px-2 pb-5 lg:pb-8"><Wordmark subtitle="Maintenance System" /></div>
        <nav aria-label="Student navigation" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <Button asChild className="report-nav report-active-nav text-primary-foreground">
            <Link to="/report" aria-current="page"><Home />Report a Problem<ChevronRight className="ml-auto" /></Link>
          </Button>
          <Button asChild variant="ghost" className="report-nav report-soft hover:bg-primary/30 hover:text-primary-foreground">
            <Link to="/track" onClick={() => prepareTracking(student?.studentNumber, window.sessionStorage)}><ClipboardList />My Requests</Link>
          </Button>
          <Button variant="ghost" className="report-nav report-soft hover:bg-primary/30 hover:text-primary-foreground" onClick={() => setPanel("help")}><CircleHelp />Help</Button>
          <Button variant="ghost" className="report-nav report-soft hover:bg-primary/30 hover:text-primary-foreground" onClick={() => setPanel("contact")}><Phone />Contact Management</Button>
        </nav>
        <div className="mt-auto hidden border-t border-border px-2 pt-5 pb-8 lg:block">
          <p className="report-eyebrow text-[10px] font-semibold uppercase tracking-[0.15em]">TUT Corridor Hills Residence</p>
          <p className="report-soft mt-3 text-xs italic">Safe · Connected · Supported</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-5 sm:px-8 lg:justify-end">
          <span className="flex items-center gap-2 text-xs sm:text-sm"><MapPin className="h-4 w-4 text-accent" />Corridor Hills Residence</span>
          <span className="h-5 w-px bg-border" />
          <Button variant="ghost" className="px-2 text-primary-foreground hover:bg-primary/30" onClick={() => setPanel("help")}><CircleHelp />Help</Button>
        </header>

        <main className="mx-auto grid max-w-[1440px] items-start gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,1fr)] lg:gap-7 lg:px-9 lg:py-10">
          <section className="min-w-0">
            <p className="report-eyebrow mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]">Corridor Hills Maintenance System</p>
            <h1 className="font-display text-3xl leading-tight font-bold sm:text-4xl xl:text-[42px]">Report a maintenance<br /><span className="text-accent">problem</span></h1>
            <p className="report-soft mt-4 max-w-lg text-sm leading-7">Quick and easy. Log the issue from your room and follow every update until it’s resolved.</p>

            <ol aria-label="Reporting progress" className="my-7 flex items-center gap-2 sm:gap-3">
              {["Verify student", "Describe problem", "Track repair"].map((label, index) => (
                <li key={label} aria-current={step === index + 1 ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm ${step >= index + 1 ? "border-accent bg-accent text-accent-foreground" : "border-border report-soft"}`}>
                    {step > index + 1 ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className={`text-[10px] sm:text-xs ${step === index + 1 ? "font-semibold" : "report-soft"}`}>{label}</span>
                  {index < 2 && <span className={`hidden h-px min-w-3 flex-1 sm:block ${step > index + 1 ? "bg-accent" : "bg-border"}`} />}
                </li>
              ))}
            </ol>

            <div key={step} className="report-form rounded-lg border border-input bg-card p-5 text-card-foreground sm:p-7">
              <div className="mb-6 flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary">
                  {reference ? <CheckCircle2 className="h-7 w-7 text-accent" /> : student ? <Wrench className="h-6 w-6" /> : <UserRound className="h-6 w-6" />}
                </span>
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-semibold text-accent">Step {step} of 3</p>
                  <h2 className="font-display text-xl leading-snug font-bold sm:text-2xl">{reference ? "Problem reported" : student ? "Describe your problem" : "Verify your student number"}</h2>
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">{reference ? "Your report has been sent to the maintenance team. Keep this reference number." : student ? "Tell us what needs attention in your assigned room." : "First, confirm your student number so we can attach your room details."}</p>
                </div>
              </div>

              {reference ? (
                <div className="space-y-5 text-center">
                  <p className="break-all rounded-md bg-secondary py-4 font-mono text-2xl font-semibold">{reference}</p>
                  <p className="text-sm text-muted-foreground">Follow progress at any time with your student number.</p>
                  <Button asChild className="h-11 w-full"><Link to="/track" onClick={() => prepareTracking(student?.studentNumber, window.sessionStorage)}>Track this report<ArrowRight /></Link></Button>
                  <Button asChild variant="ghost" className="w-full"><Link to="/">Back to home</Link></Button>
                </div>
              ) : !student && restoring ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Checking your sign-in…</div>
              ) : !student && maskedEmail ? (
                <div className="space-y-5">
                  <div className="space-y-2 rounded-md bg-secondary p-4 text-sm leading-6">
                    <p className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4 text-accent" />Check your email</p>
                    <p>We sent a sign-in link to <strong className="break-all">{maskedEmail}</strong>.</p>
                    <p className="text-muted-foreground">Open the email and tap the link. You'll come straight back here, ready to describe your problem.</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Can't find it? Check your spam folder. The link can only be used once.</p>
                  <Button type="button" variant="outline" className="w-full" disabled={busy || cooldown > 0} onClick={() => void sendLink()}>{busy ? <Loader2 className="animate-spin" /> : null}{cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}</Button>
                  <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={() => setMaskedEmail(null)}><ArrowLeft />Back</Button>
                </div>
              ) : !student ? (
                <form onSubmit={(e) => { e.preventDefault(); if (!busy && /^\d{9}$/.test(studentNumber.trim())) void sendLink(); }} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="studentNumber" className="text-xs font-semibold">Student number</Label>
                    <Input id="studentNumber" inputMode="numeric" autoComplete="off" maxLength={9} placeholder="e.g. 202412345" className="h-11" value={studentNumber} onChange={(e) => setStudentNumber(e.target.value.replace(/\D/g, ""))} />
                    <p className="flex items-start gap-2 pt-1 text-[10px] leading-5 text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />We'll email a sign-in link to the email on your student record.</p>
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={busy || !/^\d{9}$/.test(studentNumber.trim())}>
                    {busy ? <Loader2 className="animate-spin" /> : null}Send sign-in link<ArrowRight />
                  </Button>
                  <Button asChild variant="ghost" className="w-full text-muted-foreground"><Link to="/"><ArrowLeft />Back</Link></Button>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); if (!busy && student.roomLabel) void submitReport(); }} className="space-y-5">
                  <div className="flex items-start gap-2 rounded-md bg-secondary p-3 text-xs leading-5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{student.fullName}<br />{student.residence} · {student.block ? `Block ${student.block} · ` : ""}{student.roomLabel ? `Room ${student.roomLabel}` : "Room not yet allocated"}</span></div>
                  <div className="space-y-2">
                    <Label htmlFor="problemCategory">Problem category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as ProblemCategory)}>
                      <SelectTrigger id="problemCategory" className="h-11"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                      <SelectContent>{PROBLEM_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}><span className="font-medium">{c.value}</span><span className="block text-xs text-muted-foreground">{c.examples}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Describe the problem</Label>
                    <Textarea id="description" rows={4} placeholder="e.g. The tap in the kitchenette keeps dripping and the cupboard underneath is getting wet." value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportPhoto">Photo (optional)</Label>
                    <Input id="reportPhoto" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f && f.size > 8 * 1024 * 1024) { toast.error("Photo must be under 8 MB."); e.target.value = ""; return; } setPhoto(f); }} />
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={busy || !student.roomLabel}>{busy ? <Loader2 className="animate-spin" /> : <Send />}Submit report</Button>
                </form>
              )}
            </div>
          </section>

          <aside aria-label="Corridor Hills residence" className="relative isolate min-h-[610px] overflow-hidden rounded-lg border border-border lg:min-h-[650px]">
            <img src={residencePhoto} alt="Corridor Hills residence buildings overlooking the teal sports court" className="absolute inset-0 -z-20 h-full w-full object-cover object-[60%_center]" />
            <div className="report-photo-shade absolute inset-0 -z-10" />
            <div className="flex min-h-[610px] flex-col justify-between p-5 lg:min-h-[650px]">
              <div className="report-photo-copy">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Corridor Hills Residence</p>
                <h2 className="mt-3 font-display text-xl leading-8 font-semibold uppercase tracking-[0.15em]">A better living<br />environment</h2>
                <p className="mt-3 text-sm">Well-maintained. Safe. Always.</p>
              </div>
              <div className="mt-28 space-y-3">
                {[
                  { title: "Quick reporting", copy: "Log issues in minutes, from your room.", icon: Zap, color: "bg-accent", action: () => document.getElementById(student ? "description" : "studentNumber")?.focus() },
                  { title: "Track every update", copy: "Follow your report from assignment to completion.", icon: Eye, color: "bg-primary", link: true },
                  { title: "Direct to the right technician", copy: "Your issue goes to the right team based on the type of problem.", icon: Wrench, color: "report-specialist-icon", action: () => setPanel("help") },
                ].map(({ title, copy, icon: Icon, color, link, action }) => {
                  const content = <><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-foreground ${color}`}><Icon className="h-6 w-6" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold">{title}</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{copy}</span></span><ChevronRight className="text-muted-foreground" /></>;
                  return <Button key={title} onClick={action} asChild={Boolean(link)} variant="secondary" className="h-auto min-h-20 w-full justify-start gap-3 rounded-md border border-input bg-card px-3 py-3 text-left whitespace-normal text-card-foreground hover:bg-secondary">{link ? <Link to="/track" onClick={() => prepareTracking(student?.studentNumber, window.sessionStorage)}>{content}</Link> : content}</Button>;
                })}
              </div>
            </div>
          </aside>
        </main>
      </div>
      <Dialog open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{panel === "contact" ? "Contact Management" : "Reporting help"}</DialogTitle>
            <DialogDescription>{panel === "contact" ? "For room allocation or student-number problems, contact the Corridor Hills residence office." : "Verify your registered student number, choose a category and describe the problem. Your assigned room is attached automatically."}</DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-6 text-muted-foreground">{panel === "contact" ? "For an existing maintenance request, use My Requests to check updates from the maintenance team." : "Management assigns the appropriate technician. Use My Requests with your student number to follow progress and completion."}</p>
          <Button asChild><Link to="/track" onClick={() => prepareTracking(student?.studentNumber, window.sessionStorage)}>My Requests<ArrowRight /></Link></Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
