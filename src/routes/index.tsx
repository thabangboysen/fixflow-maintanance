import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  Database,
  Search,
  ShieldCheck,
  Wrench,
  Zap,
} from "lucide-react";
import { Wordmark } from "@/components/Wordmark";
import photoDusk from "@/assets/residence-dusk.jpg.asset.json";
import photoNight from "@/assets/residence-night.jpg.asset.json";
import photoCommunity from "@/assets/residence-community.jpg.asset.json";
import photoCourtEnhanced from "@/assets/residence-court-enhanced.jpg";

const welcomeMessages = [
  "Welcome to Corridor Hills",
  "Your home, well looked after",
  "Spotted a problem? Report it in minutes",
  "Track every fix, from start to finish",
];

function WelcomeTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % welcomeMessages.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative mt-5 h-8 overflow-hidden sm:h-9">
      {welcomeMessages.map((m, idx) => (
        <p
          key={m}
          className={`absolute inset-x-0 top-0 font-display text-lg font-semibold text-white transition-all duration-700 sm:text-2xl ${
            idx === i
              ? "translate-y-0 opacity-100"
              : idx === (i - 1 + welcomeMessages.length) % welcomeMessages.length
                ? "-translate-y-full opacity-0"
                : "translate-y-full opacity-0"
          }`}
        >
          {m}
        </p>
      ))}
    </div>
  );
}

import { Card, CardContent } from "@/components/ui/card";
import { PhotoBackdrop } from "@/components/PhotoBackdrop";

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

const slides = [
  { src: photoDusk.url, alt: "Corridor Hills residence buildings at sunset" },
  { src: photoNight.url, alt: "Corridor Hills residence courtyard at night" },
];

function BackgroundSlideshow() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0">
      {slides.map((slide, index) => (
        <img
          key={slide.src}
          src={slide.src}
          alt={index === active ? slide.alt : ""}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FixFlow — Corridor Hills Maintenance Reporting System" },
      {
        name: "description",
        content:
          "Report. Track. Resolve. A simple and reliable way for students of Corridor Hills to report maintenance issues and follow every update until the problem is fixed.",
      },
      {
        property: "og:title",
        content: "FixFlow — Corridor Hills Maintenance Reporting System",
      },
      {
        property: "og:description",
        content:
          "Report a maintenance problem in your room and follow its progress until it is fixed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const whyFixflow = [
  {
    icon: Zap,
    title: "Faster Reporting",
    text: "Students report issues in under a minute from any device.",
  },
  {
    icon: Database,
    title: "Digital Records",
    text: "Every report, status change, and note is permanently stored.",
  },
  {
    icon: Search,
    title: "Easy Tracking",
    text: "Real-time status updates keep everyone informed.",
  },
  {
    icon: BarChart3,
    title: "Centralised Management",
    text: "All residence maintenance managed from one dashboard.",
  },
  {
    icon: Building2,
    title: "Better Visibility",
    text: "Clear analytics across blocks, units, and categories.",
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: "1. Report the problem",
    text: "Enter your student number, choose the type of problem and describe it. Your room details are attached automatically.",
  },
  {
    icon: Wrench,
    title: "2. We assign a worker",
    text: "The report goes to a maintenance worker with the right skill for the job — electrical, plumbing, repairs and more.",
  },
  {
    icon: ShieldCheck,
    title: "3. Track it until it's fixed",
    text: "Use your student number at any time to see the status of your report and notes from the maintenance team.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Full-screen cover */}
      <header className="relative flex min-h-screen flex-col overflow-hidden text-white">
        <BackgroundSlideshow />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b2e]/80 via-[#0d1b2e]/55 to-[#0d1b2e]/85" />

        {/* Top bar */}
        <nav className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-12 sm:pt-8">
          <Wordmark large subtitle="Smart Maintenance Reporting System" />
        </nav>

        {/* Hero copy */}
        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-16 sm:px-12 lg:max-w-3xl">
          <span className="h-0.5 w-14 bg-[#2dd4bf]" />
          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-white/70 sm:text-xs">
            For students of Corridor Hill
          </p>
          <WelcomeTicker />
          <h1 className="font-display mt-3 whitespace-nowrap text-4xl font-bold leading-[1.02] tracking-tight animate-fade-in sm:text-6xl lg:text-7xl">
            Corridor Hills
            <span className="text-[#2dd4bf]">.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg font-medium sm:text-xl">
            Digital Maintenance &amp; Residence Operations Platform
          </p>
          <p className="font-display mt-4 text-xl font-semibold tracking-[0.14em] text-[#5eead4] uppercase sm:text-2xl">
            Report. Track. Resolve.
          </p>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            A simple and reliable way to report maintenance issues in your
            residence. Submit a detailed request from your room, attach
            supporting photos, and monitor its progress from submission to
            completion.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Whether it&rsquo;s a leaking shower, faulty electrical socket,
            damaged lock, or another maintenance concern, keep track of every
            update until the issue is resolved.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/report"
              className="inline-flex items-center gap-2 bg-[#2dd4bf] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#0d1b2e] transition-colors hover:bg-[#5eead4]"
            >
              Report an issue <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center gap-2 border border-white/30 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/90 transition-colors hover:border-white/60 hover:text-white"
            >
              <Search className="h-4 w-4" /> Track a report
            </Link>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="relative z-10 px-6 pb-7 sm:px-12">
          <div className="text-[10px] uppercase tracking-[0.24em] text-white/50">
            Prepared for
            <span className="mt-1 block text-xs font-semibold normal-case tracking-normal text-white">
              Corridor Hills Residence · TUT
            </span>
          </div>
        </div>
      </header>

      {/* Why FixFlow */}
      <section className="relative overflow-hidden py-16 text-primary-foreground sm:py-24">
        <PhotoBackdrop src={photoCourtEnhanced} alt="Corridor Hills residence buildings beside the teal sports court" shade="photo-shade-landing" parallax />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="inline-block h-1 w-14 bg-warning" />
            <h2 className="font-display mt-4 text-3xl font-bold sm:text-4xl">
              Why FixFlow
            </h2>
            <p className="mt-3 text-sm text-primary-foreground/70 sm:text-base">
              Built for university residences, designed for speed and clarity.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
            {whyFixflow.map((f, i) => (
              <Reveal key={f.title} delay={i * 120} className="lg:col-span-2">
                <Card className="h-full border-white/15 bg-white/10 text-primary-foreground backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-warning/70 hover:bg-white/15 hover:shadow-[0_20px_45px_-20px_oklch(0.85_0.16_80/0.5)]">
                  <CardContent className="p-6">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-warning/20 ring-1 ring-warning/45">
                      <f.icon className="h-5 w-5 text-warning" />
                    </span>
                    <h3 className="font-display mt-4 text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-primary-foreground/70">
                      {f.text}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden py-20 text-white sm:py-28">
        <PhotoBackdrop src={photoCommunity.url} alt="Corridor Hills students on the residence sports court" shade="photo-shade-landing" parallax />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <span className="inline-block h-1 w-14 bg-accent" />
            <h2 className="font-display mt-4 text-3xl font-bold drop-shadow-lg sm:text-4xl">How it works</h2>
            <p className="mt-3 text-sm text-white/85 drop-shadow-md sm:text-base">
              Three simple steps from problem to fixed.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 180}>
                <div className="h-full rounded-xl border border-white/15 bg-white/10 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/60 hover:bg-white/15">
                  <div className="flex items-center justify-between">
                    <s.icon className="h-6 w-6 text-accent" />
                    <span className="font-display text-3xl font-bold text-white/20">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-white/75">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-footer-midnight border-t border-primary-foreground/10 py-8 text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-xs text-primary-foreground/75 sm:flex-row sm:px-6 sm:text-left">
          <span>© 2026 FixFlow · Smart Maintenance Reporting System</span>
          <span>🕐 Reporting available 24/7</span>
        </div>
      </footer>
    </div>
  );
}
