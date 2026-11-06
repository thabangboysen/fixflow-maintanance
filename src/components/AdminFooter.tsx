import { Link } from "@tanstack/react-router";
import { Mail, MapPin, ShieldCheck } from "lucide-react";
import { FixFlowMark } from "@/components/Wordmark";

export function AdminFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="hero-gradient mt-12 text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <FixFlowMark className="h-12 w-auto" />
            <div>
              <p className="font-display text-xl font-semibold">FixFlow</p>
              <p className="text-xs opacity-75">Corridor Hill Residence</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm opacity-80">
            Smart maintenance reporting for residence life. Report it. Track it. Fixed.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Quick links</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/management" search={{ view: "reports" }} className="opacity-85 hover:opacity-100 hover:underline">Management dashboard</Link></li>
            <li><Link to="/report" className="opacity-85 hover:opacity-100 hover:underline">Report a problem</Link></li>
            <li><Link to="/track" className="opacity-85 hover:opacity-100 hover:underline">Track a report</Link></li>
            <li><Link to="/" className="opacity-85 hover:opacity-100 hover:underline">Student portal</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Residence office</p>
          <ul className="mt-3 space-y-2 text-sm opacity-85">
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Corridor Hill Residence, Blocks A–F</li>
            <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /> Contact the residence administrator</li>
            <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Admin access only</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs opacity-75 sm:px-6">
          <span>© {year} FixFlow · Corridor Hill Residence</span>
          <span>Smart maintenance reporting</span>
        </div>
      </div>
    </footer>
  );
}
