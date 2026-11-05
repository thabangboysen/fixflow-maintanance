import { Link } from "@tanstack/react-router";

/** The Corridor Hills building mark: slanted teal, blue and navy towers. */
export function FixFlowMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 220" className={className} aria-hidden="true">
      {/* back navy tower */}
      <path d="M86 70 L112 64 L104 190 L84 186 Z" fill="#0b1f45" />
      {/* tall blue tower */}
      <path d="M64 48 L92 38 L88 196 L70 190 Z" fill="#1d5fd1" />
      {/* dark stripe */}
      <path d="M56 52 L66 48 L72 190 L62 186 Z" fill="#0b2a5c" />
      {/* teal tallest tower */}
      <path d="M36 30 L66 0 L60 70 L54 186 L38 176 Z" fill="#22b393" />
      {/* front blue tower */}
      <path d="M2 96 L32 84 L30 178 L18 172 Z" fill="#1f63d8" />
      <path d="M32 84 L40 82 L40 176 L30 178 Z" fill="#0b2a5c" />
    </svg>
  );
}

/**
 * FixFlow logo recreated from the brand artwork. Clicking it always returns
 * to the landing page.
 */
export function Wordmark({
  subtitle = "Smart Maintenance Reporting System",
  large = false,
}: {
  subtitle?: string | undefined;
  large?: boolean;
}) {
  return (
    <Link
      to="/"
      className="group inline-flex items-center gap-3 text-primary-foreground sm:gap-4"
      aria-label="FixFlow — back to the home page"
    >
      <span className="flex flex-col items-center">
        <FixFlowMark
          className={`transition-transform duration-300 group-hover:-translate-y-0.5 ${
            large ? "h-12 sm:h-14" : "h-9"
          } w-auto`}
        />
        <span
          className={`mt-0.5 whitespace-nowrap font-medium leading-none ${
            large ? "text-[10px] sm:text-[11px]" : "text-[8px]"
          }`}
        >
          Corridor Hills
        </span>
      </span>
      <span
        className={`w-px self-stretch bg-current opacity-80 ${large ? "my-1" : "my-0.5"}`}
      />
      <span className="flex flex-col">
        <span
          className={`font-display font-bold leading-none tracking-tight ${
            large ? "text-3xl sm:text-4xl" : "text-2xl"
          }`}
        >
          FixFlow
        </span>
        {subtitle && (
          <span
            className={`mt-1.5 whitespace-nowrap leading-none opacity-90 ${
              large ? "text-[11px] sm:text-xs" : "text-[9px]"
            }`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}
