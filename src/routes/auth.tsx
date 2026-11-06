import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock, Mail, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { passwordSignIn, requestStaffPasswordLink } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff log in · Corridor Hills Maintenance" },
      {
        name: "description",
        content: "Log in to the Corridor Hills maintenance system with your registered email and password.",
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
  const signIn = useServerFn(passwordSignIn);
  const passwordLink = useServerFn(requestStaffPasswordLink);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const session = await signIn({ data: { email: email.trim(), password } });
      const { error } = await supabase.auth.setSession(session);
      if (error) throw error;
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log in.");
    } finally { setBusy(false); }
  }

  async function sendPasswordLink() {
    if (!email.trim()) { toast.error("Enter your registered email address first."); return; }
    setBusy(true);
    try {
      await passwordLink({ data: { email: email.trim(), origin: window.location.origin } });
      setLinkSent(true);
      toast.success("Check your email for a secure password setup link.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the password link.");
    } finally { setBusy(false); }
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
        <form onSubmit={submitPassword} className="w-full max-w-lg space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold">Welcome back</h2>
            <p className="mt-1 text-muted-foreground">
              Enter your registered staff email and password.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" autoComplete="username" placeholder="you@example.com" className="h-14 pl-11"
                value={email} onChange={(e) => { setEmail(e.target.value); setLinkSent(false); }} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" autoComplete="current-password" className="h-14 pl-11" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="h-14 w-full bg-accent text-base text-accent-foreground hover:bg-accent/90" disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Log in
          </Button>
          <Button type="button" variant="link" className="w-full text-accent" disabled={busy} onClick={() => void sendPasswordLink()}>
            Set up or reset your password
          </Button>
          {linkSent && <p role="status" className="text-sm text-muted-foreground">Check your inbox and spam folder for the password link.</p>}

          <div className="space-y-2 text-center text-sm">
            <p className="text-muted-foreground">
              Are you a student?{" "}
              <Link to="/report" className="font-medium text-accent">Report a problem</Link>
            </p>
            <p className="text-xs text-muted-foreground">Having trouble signing in? Ask the residence administrator to check your email on file.</p>
          </div>
        </form>
      </main>
    </div>
  );
}
