import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ClipboardList, Loader2, Lock, Mail, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/Wordmark";
import { supabase } from "@/integrations/supabase/client";
import { requestLoginCode, verifyLoginCode } from "@/lib/auth.functions";
import adminBg from "@/assets/portal-admin.jpg";
import managementBg from "@/assets/portal-management.jpg";
import staffBg from "@/assets/portal-staff.jpg";

export type Portal = "admin" | "management" | "staff";

const PORTALS: Record<Portal, { bg: string; badge: string; who: string; subtitle: string; Icon: typeof Wrench }> = {
  admin: { bg: adminBg, badge: "Admin portal", who: "Admin", subtitle: "Manage users, settings and the full maintenance system.", Icon: ShieldCheck },
  management: { bg: managementBg, badge: "Management portal", who: "Management", subtitle: "Review reports, assign workers and track repairs.", Icon: ClipboardList },
  staff: { bg: staffBg, badge: "Worker portal", who: "Worker", subtitle: "See your assigned jobs and update repair progress.", Icon: Wrench },
};

export function StaffLogin({ portal }: { portal: Portal }) {
  const cfg = PORTALS[portal];
  const router = useRouter();
  const requestCode = useServerFn(requestLoginCode);
  const verifyCode = useServerFn(verifyLoginCode);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    try {
      const res = await requestCode({ data: { email: email.trim() } });
      setMaskedEmail(res.maskedEmail);
      setCode("");
      toast.success("We emailed you a 6-digit code.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const s = await verifyCode({ data: { email: email.trim(), code } });
      const { error } = await supabase.auth.setSession(s);
      if (error) throw error;
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  const shadow = "[text-shadow:0_2px_12px_rgb(0_0_0/0.55)]";

  return (
    <div className="relative min-h-screen overflow-hidden text-primary-foreground">
      <img src={cfg.bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-foreground/35 to-transparent" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:px-14">
        <div className={`flex flex-col items-center gap-8 lg:h-full lg:items-start lg:justify-between lg:py-4 ${shadow}`}>
          <Wordmark large subtitle="Corridor Hill Residence" />
          <div className="hidden lg:block">
            <h1 className="font-display text-4xl font-bold leading-tight">Smart maintenance<br />reporting system</h1>
            <p className="mt-3 text-lg opacity-90">Report it. Track it. Fixed.</p>
          </div>
          <p className="hidden text-sm opacity-80 lg:block">© 2026 FixFlow</p>
        </div>

        <form
          onSubmit={maskedEmail ? submitCode : sendCode}
          className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-primary-foreground/20 bg-foreground/45 p-8 shadow-2xl backdrop-blur-xl sm:p-10"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent">
            <cfg.Icon className="h-4 w-4" /> {cfg.badge}
          </span>
          <div>
            <h2 className="font-display text-3xl font-bold">Welcome back, {cfg.who}</h2>
            <p className="mt-2 opacity-80">{maskedEmail ? "Enter the 6-digit code we emailed you." : cfg.subtitle}</p>
          </div>
          {!maskedEmail ? (
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                  className="h-14 border-primary-foreground/20 bg-primary-foreground/10 pl-11 text-primary-foreground placeholder:text-primary-foreground/50"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="rounded-md bg-primary-foreground/10 p-3 text-sm">
                Code sent to <strong className="break-all">{maskedEmail}</strong>
              </p>
              <Label htmlFor="code">6-digit code</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
                <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456"
                  className="h-14 border-primary-foreground/20 bg-primary-foreground/10 pl-11 font-mono text-lg tracking-[0.5em] text-primary-foreground placeholder:text-primary-foreground/50"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
              </div>
            </div>
          )}
          <Button type="submit" className="h-14 w-full bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90"
            disabled={busy || (maskedEmail !== null && code.length !== 6)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {maskedEmail ? "Log in" : "Send code"}
          </Button>
          {maskedEmail && (
            <div className="flex justify-between text-sm">
              <button type="button" className="opacity-80 hover:opacity-100"
                onClick={() => { setMaskedEmail(null); setCode(""); }} disabled={busy}>Use a different email</button>
              <button type="button" className="font-medium text-accent" onClick={() => void sendCode()} disabled={busy}>Resend code</button>
            </div>
          )}
          <div className="space-y-2 text-center text-sm">
            <Link to="/" className="font-medium text-accent">← Back to home</Link>
            <p className="text-xs opacity-70">Not receiving a code? Ask the residence administrator to check your email on file.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
