import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock, Mail, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { requestLoginCode, verifyLoginCode } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff log in · Corridor Hills Maintenance" },
      {
        name: "description",
        content: "Log in to the Corridor Hills maintenance system with a 6-digit code sent to your registered email.",
      },
      { property: "og:title", content: "Staff log in · Corridor Hills Maintenance" },
      { property: "og:description", content: "Secure, role-based access for management, staff and administrators." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
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
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-primary p-14 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Wrench className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-display font-bold">Corridor Hills</span>
            <span className="block text-sm opacity-60">Maintenance System</span>
          </span>
        </Link>
        <div>
          <h1 className="font-display text-5xl font-bold leading-tight">
            Something needs <br />
            <span className="text-accent">fixing?</span>
          </h1>
          <p className="mt-5 max-w-md text-lg opacity-60">
            Corridor Hills residents report maintenance issues and track them through to done, from any device.
          </p>
          <ul className="mt-8 space-y-3">
            {["Report problems in seconds", "Track status from report to resolution"].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent" /> {t}
              </li>
            ))}
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-accent" /> Secure, role-based access
            </li>
          </ul>
        </div>
        <p className="text-sm opacity-50">© 2026 Corridor Hills Residence</p>
      </aside>

      <main className="flex items-center justify-center bg-background px-6 py-12">
        <form onSubmit={maskedEmail ? submitCode : sendCode} className="w-full max-w-lg space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold">Welcome back</h2>
            <p className="mt-1 text-muted-foreground">
              {maskedEmail
                ? "Enter the 6-digit code we emailed you."
                : "Enter your registered email and we'll send you a 6-digit code."}
            </p>
          </div>
          {!maskedEmail ? (
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                  className="h-14 pl-11" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="rounded-md bg-secondary p-3 text-sm">
                Code sent to <strong className="break-all">{maskedEmail}</strong>
              </p>
              <Label htmlFor="code">6-digit code</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456"
                  className="h-14 pl-11 font-mono text-lg tracking-[0.5em]" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
              </div>
            </div>
          )}
          <Button type="submit" className="h-14 w-full bg-accent text-base text-accent-foreground hover:bg-accent/90"
            disabled={busy || (maskedEmail !== null && code.length !== 6)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {maskedEmail ? "Log in" : "Send code"}
          </Button>
          {maskedEmail && (
            <div className="flex justify-between text-sm">
              <button type="button" className="text-muted-foreground hover:text-foreground"
                onClick={() => { setMaskedEmail(null); setCode(""); }} disabled={busy}>
                Use a different email
              </button>
              <button type="button" className="font-medium text-accent" onClick={() => void sendCode()} disabled={busy}>
                Resend code
              </button>
            </div>
          )}
          <div className="space-y-2 text-center text-sm">
            <p className="text-muted-foreground">
              Are you a student?{" "}
              <Link to="/report" className="font-medium text-accent">Report a problem</Link>
            </p>
            <p className="text-xs text-muted-foreground">Not receiving a code? Ask the residence administrator to check your email on file.</p>
          </div>
        </form>
      </main>
    </div>
  );
}
