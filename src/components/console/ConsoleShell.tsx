import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Bell, ChevronDown, ChevronRight, LogOut, Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ConsoleNotification = {
  id: string;
  title: string;
  detail: string;
  time?: string;
  onSelect?: () => void;
};

export function initials(name?: string | null, fallback = "U") {
  if (!name) return fallback;
  const parts = name.split(" ").filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || fallback;
}

/** Inner content of a side-menu item; the page wraps it in its own typed Link. */
export function NavItemInner({ icon: Icon, label, badge }: { icon: LucideIcon; label: string; badge?: number }) {
  return (
    <>
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
          {badge}
        </span>
      ) : null}
    </>
  );
}

export function NavSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="console-sidebar-muted px-3 pb-1.5 pt-4 text-[11px] font-medium uppercase tracking-[0.08em] opacity-70">
        {label}
      </p>
      {children}
    </div>
  );
}

function SidebarBody({
  nav,
  user,
  onSignOut,
}: {
  nav: ReactNode;
  user: { name: string; role: string };
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="console-sidebar-line flex h-16 shrink-0 items-center border-b px-5">
        <Wordmark subtitle="Maintenance Management" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {nav}
        <div className="console-sidebar-line mt-4 border-t pt-3">
          <button type="button" onClick={onSignOut} className="console-nav-item w-full text-left">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span>Sign out</span>
          </button>
        </div>
      </nav>
      <div className="console-sidebar-line shrink-0 border-t px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {initials(user.name)}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--console-sidebar)] bg-[var(--primary)]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="console-sidebar-muted truncate text-xs">{user.role} · Online</p>
          </div>
        </div>
        <p className="console-sidebar-muted mt-4 text-[10px] uppercase leading-relaxed tracking-[0.08em] opacity-70">
          Tshwane University of Technology
          <br />
          Corridor Hills Residence
        </p>
      </div>
    </div>
  );
}

export function ConsoleShell({
  nav,
  user,
  breadcrumb,
  notifications,
  onSignOut,
  children,
}: {
  nav: ReactNode;
  user: { name: string; email?: string; role: string };
  breadcrumb: string[];
  notifications: ConsoleNotification[];
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const href = useRouterState({ select: (s) => s.location.href });
  useEffect(() => setMenuOpen(false), [href]);

  return (
    <div className="console-theme console flex">
      <aside className="console-sidebar sticky top-0 hidden h-svh w-[248px] shrink-0 lg:block">
        <SidebarBody nav={nav} user={user} onSignOut={onSignOut} />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="console-theme console-sidebar w-[280px] border-r-0 p-0 text-white [&>button]:text-white">
          <SheetTitle className="sr-only">Main menu</SheetTitle>
          <SidebarBody nav={nav} user={user} onSignOut={onSignOut} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="-ml-1 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <ol className="flex min-w-0 items-center gap-1.5 text-sm" aria-label="Breadcrumb">
            {breadcrumb.map((b, i) => (
              <li key={b} className="flex min-w-0 items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />}
                <span
                  className={cn(
                    "truncate",
                    i === breadcrumb.length - 1 ? "font-medium text-foreground" : "hidden text-muted-foreground sm:inline",
                  )}
                >
                  {b}
                </span>
              </li>
            ))}
          </ol>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <HeaderDate />
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Notifications (${notifications.length})`}
                >
                  <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {notifications.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="console-theme w-80 p-0">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <span className="text-xs text-muted-foreground">{notifications.length} new</span>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
                ) : (
                  <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={n.onSelect}
                          className="w-full px-4 py-3 text-left transition-colors hover:bg-muted/60"
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{n.detail}</p>
                          {n.time && <p className="mt-1 text-[11px] text-muted-foreground/80">{n.time}</p>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-muted"
                  aria-label="Account menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-semibold text-[var(--brand-strong)]">
                    {initials(user.name)}
                  </span>
                  <span className="hidden text-left md:block">
                    <span className="block max-w-36 truncate text-sm font-medium leading-tight">{user.name}</span>
                    <span className="block text-xs leading-tight text-muted-foreground">{user.role}</span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="console-theme w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
                  <p className="mt-1 text-xs text-[var(--brand-strong)]">{user.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

        <footer className="border-t border-border bg-card">
          <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>© {new Date().getFullYear()} FixFlow · Corridor Hills Residence, Tshwane University of Technology</span>
            <span>Maintenance Management System</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function HeaderDate() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <span className="mr-2 hidden whitespace-nowrap text-sm text-muted-foreground xl:inline">
      {now.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
    </span>
  );
}
