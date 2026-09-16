"use client";

/**
 * Open raises carousel.
 *
 * A continuously-scrolling band of raise cards, newest/most-funded first.
 * The track is duplicated once so the marquee can wrap seamlessly; hovering
 * pauses it and each card lifts slightly.
 */

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { ShippingRaise } from "@/lib/raises";

/** Pause the marquee while the pointer is over it. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Render a company logo or fallback to branded badge */
function CompanyLogo({ logo, initials, tint }: { logo?: string; initials: string; tint: string }) {
  // Prefer real logo if available
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className="w-10 h-10 object-contain"
        draggable={false}
        onError={(e) => {
          // Fallback to badge on error
          const target = e.currentTarget;
          const svg = `data:image/svg+xml;base64,${btoa(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="${tint}" />
              <text x="50" y="58" font-family="JetBrains Mono,Arial,monospace" font-size="32" font-weight="600" fill="#000" text-anchor="middle">${initials}</text>
            </svg>`
          )}`;
          target.src = svg;
        }}
      />
    );
  }
  // Fallback to inline SVG badge
  const svg = `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="${tint}" />
      <text x="50" y="58" font-family="JetBrains Mono,Arial,monospace" font-size="32" font-weight="600" fill="#000" text-anchor="middle">${initials}</text>
    </svg>`
  )}`;
  return (
    <img
      src={svg}
      alt=""
      className="w-10 h-10 object-contain rounded"
      draggable={false}
    />
  );
}

function RaiseCard({ raise }: { raise: ShippingRaise }) {
  const closes = new Date(raise.closes_on);
  const closesLabel = closes.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <article className="raise-card group">
      {/* Company mark - logo or badge fallback */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-background border border-border rounded">
            <CompanyLogo logo={raise.logo_url} initials={raise.initials} tint={raise.tint} />
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">
              {raise.company}
            </h3>
            <p className="text-xs text-muted-foreground leading-tight">
              {raise.tagline}
            </p>
          </div>
        </div>
        {raise.verified && (
          <span className="raise-verified" title="Condition verified met">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Raised */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-2xl font-bold tabular-nums tracking-tight">
          {raise.raised}
        </span>
        <span className="text-xs text-muted-foreground">GEN</span>
      </div>

      {/* Progress */}
      <div className="raise-bar mb-4" role="presentation">
        <span style={{ width: `${raise.progress}%` }} />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">{raise.progress}% of target</span>
        <span>Closes {closesLabel}</span>
      </div>
    </article>
  );
}

export function RaiseCarousel({ raises }: { raises: ShippingRaise[] }) {
  const reduced = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  // Duplicate the set so the marquee can wrap without a visible seam.
  const loop = [...raises, ...raises];
  const duration = Math.max(raises.length * 6, 30);

  return (
    <div
      className="raise-marquee"
      data-paused={reduced ? "true" : undefined}
      ref={trackRef}
    >
      <div
        className="raise-track"
        style={{ animationDuration: `${duration}s` }}
      >
        {loop.map((r, i) => (
          <RaiseCard key={`${r.id}-${i}`} raise={r} />
        ))}
      </div>
    </div>
  );
}