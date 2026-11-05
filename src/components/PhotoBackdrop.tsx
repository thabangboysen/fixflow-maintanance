import { useEffect, useRef } from "react";

type PhotoBackdropProps = {
  src: string;
  alt: string;
  /** Class(es) for the darkening overlay layer, e.g. "photo-shade-landing". */
  shade: string;
  /** Gentle scroll drift on desktop only; mobile stays static for iOS safety. */
  parallax?: boolean;
  className?: string;
  eager?: boolean;
};

/**
 * Reusable photo background for every photo section.
 * Desktop: the photo covers the whole section behind a darkening shade.
 * Mobile: the photo stays wide (100% width, natural height), pinned to the top,
 * and fades into the solid fill colour below — no zoom, no hard edge, and no
 * background-attachment: fixed anywhere (iOS-safe).
 */
export function PhotoBackdrop({ src, alt, shade, parallax = false, className = "", eager = false }: PhotoBackdropProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!parallax) return;
    let frame = 0;
    const drift = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = imgRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        el.style.transform = `translateY(${p * -60}px) scale(1.15)`;
      });
    };
    const mq = window.matchMedia("(min-width: 768px) and (prefers-reduced-motion: no-preference)");
    const update = () => {
      const el = imgRef.current;
      if (mq.matches) drift();
      else if (el) el.style.transform = "";
    };
    update();
    window.addEventListener("scroll", drift, { passive: true });
    mq.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", drift);
      mq.removeEventListener("change", update);
    };
  }, [parallax]);

  return (
    <div className={`photo-backdrop ${className}`} role="img" aria-label={alt}>
      <div className="photo-backdrop-fill" />
      <img
        ref={imgRef}
        src={src}
        alt=""
        aria-hidden="true"
        loading={eager ? "eager" : "lazy"}
        className="photo-backdrop-img"
      />
      <div className={`photo-backdrop-shade ${shade}`} />
    </div>
  );
}
