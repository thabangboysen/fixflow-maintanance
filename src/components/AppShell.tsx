import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/useAuth";

export function AppShell({
  title,
  subtitle,
  personName,
  roleLabel,
  children,
  footer,
}: {
  footer?: ReactNode;
  title: string;
  subtitle?: string | undefined;
  personName?: string | undefined;
  roleLabel?: string | undefined;
  children: ReactNode;
}) {
  const signOut = useSignOut();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="hero-gradient text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4 sm:px-6">
          <Wordmark subtitle="Digital Maintenance Management" />
          <div className="ml-auto flex items-center gap-3">
            {personName && (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{personName}</p>
                {roleLabel && <p className="text-xs opacity-75">{roleLabel}</p>}
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={signOut}
              className="bg-white/15 text-primary-foreground hover:bg-white/25"
            >
              <LogOut className="mr-1.5 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-2 sm:px-6">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm opacity-80">{subtitle}</p>}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      {footer}
    </div>
  );
}
