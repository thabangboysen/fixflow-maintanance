import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homePathForRole, useProfile, useSignOut } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard · Corridor Hill Maintenance" },
      { name: "description", content: "Opening the Corridor Hill maintenance dashboard for your role." },
      { property: "og:title", content: "Your dashboard · Corridor Hill Maintenance" },
      { property: "og:description", content: "Role-based maintenance dashboards for Corridor Hill residence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardRedirect,
});

function DashboardRedirect() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = useProfile();
  const signOut = useSignOut();

  useEffect(() => {
    if (profile) navigate({ to: homePathForRole(profile.role), replace: true });
  }, [profile, navigate]);

  if (isLoading || profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">Your account isn't linked yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This email address isn't on the Corridor Hill residence or staff register. Ask the
          residence office to add you, then sign in again.
        </p>
        <Button className="mt-6" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
