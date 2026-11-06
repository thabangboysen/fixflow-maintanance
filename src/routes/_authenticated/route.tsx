import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { StaffLogin, type Portal } from "@/components/StaffLogin";

const PORTAL_PATHS: Record<string, Portal> = { "/admin": "admin", "/management": "management", "/staff": "staff" };

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    const portal = PORTAL_PATHS[location.pathname.replace(/\/$/, "")];
    if (error || !data.user) {
      // Staff portals show their own sign-in page instead of redirecting.
      if (portal) return { user: null, portal };
      throw redirect({ to: "/auth" });
    }
    return { user: data.user, portal: null };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, portal } = Route.useRouteContext();
  if (!user && portal) return <StaffLogin portal={portal} />;
  return <Outlet />;
}
