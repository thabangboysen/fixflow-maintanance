import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/Wordmark";
import { supabase } from "@/integrations/supabase/client";
import { passwordSignIn } from "@/lib/auth.functions";
import { newStaffPasswordSchema } from "@/lib/staff-auth";
import bg from "@/assets/portal-management.jpg";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set your password · FixFlow Corridor Hill" },
      { name: "description", content: "Create or reset the password for your FixFlow staff account." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Set your password · FixFlow Corridor Hill" },
      { property: "og:description", content: "Secure password setup for FixFlow staff accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

type LinkState = "checking" | "ready" | "invalid";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const signIn = useServerFn(passwordSignIn);
  const [state, setState] = useState<LinkState>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("error")) {
      setState("invalid");
      return;
    }
    let settled = false;
    const accept = (userEmail: string | undefined) => {
      if (settled || !userEmail) return;
      settled = true;
      setEmail(userEmail);
      setState("ready");
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      accept(session?.user.email);
    });
    void supabase.auth.getSession().then(({ data }) => accept(data.session?.user.email));
    const timer = window.setTimeout(() => {
      if (!settled) setState("invalid");
    }, 6000);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newStaffPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Sign in through the staff check so roles come from the staff directory.
      const session = await signIn({ data: { email, password } });
      const { error: sessionError } = await supabase.auth.setSession(session);
      if (sessionError) throw sessionError;
      toast.success("Password saved. You're signed in.");
      await navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden text-primary-foreground">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-foreground/20" />
      <header className="relative z-10 px-6 pt-6 drop-shadow-md lg:px-8 lg:pt-8">
        <Wordmark large subtitle="Corridor Hill Residence" />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-primary-foreground/20 bg-foreground/45 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent">
            <KeyRound className="h-4 w-4" /> Staff password
          </span>

          {state === "checking" && (
            <p className="flex items-center gap-2 opacity-80">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
            </p>
          )}

          {state === "invalid" && (
            <div className="space-y-4">
              <h1 className="font-display text-2xl font-bold">This link has expired</h1>
              <p className="opacity-80">
                Password links work once and expire after a short time. Go back to your sign-in page and choose
                “Set up or reset your password” to get a new one.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/admin">Admin</Link>
                </Button>
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/management" search={{ view: "dashboard" }}>Management</Link>
                </Button>
                <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link to="/staff">Worker</Link>
                </Button>
              </div>
            </div>
          )}

          {state === "ready" && (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold">Choose a password</h1>
                <p className="mt-2 text-sm opacity-80">For {email}. Use at least 8 characters.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
                  <Input id="new-password" type="password" autoComplete="new-password" required minLength={8}
                    className="h-14 border-primary-foreground/20 bg-primary-foreground/10 pl-11 text-primary-foreground"
                    value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
                  <Input id="confirm-password" type="password" autoComplete="new-password" required minLength={8}
                    className="h-14 border-primary-foreground/20 bg-primary-foreground/10 pl-11 text-primary-foreground"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={busy}
                className="h-14 w-full bg-accent text-base font-semibold text-accent-foreground hover:bg-accent/90">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save password and sign in
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
