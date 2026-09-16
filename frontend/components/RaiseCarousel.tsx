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

/** Inline SVG logos for major tech companies (optimized) */
const COMPANY_LOGOS: Record<string, string> = {
  "AM": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjUgMzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZmOTlwMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPgogIDxwYXRoIGQ9Im0xMC4yIDBMMCAxMS45aDE1LjVsLTMuNyAxOS41aDExLjJsMy43LTkuOWgxNS41bC0xMS45IDEyLjEgMTEuOSAxMi4xaC0xNCIyTDI2LjggbC0zLjctMTkuNUgyNi44bDExLjkgMTIuMUw1Ny41IDMiaDAxNDIyTDI0LjggMGgxMS42bC0xMS45IDEyLjFMMjMuOCAzM2gxMS42TDM0LjYgMGgxMS42bC0xMS45IDEyLjFMNDUuNiAwSDEwLjJMMjEuMSAwSDEyLjNsMTEuOSAxMi4xTDI3LjggMzNoMTEuNmwxMi4xLTMyaDEyLjJMMjcuOCAwaC0xMi40SDENQzUgMGgxMS42bDExLjkgMTIuMUw1Ny41IDM4aC0xNC4yTDUwLjcgMEgxMC4yaCJvPgo8L3N2Zz4=",
  "AP": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTNhM2E2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE4LjQgMkwxIDJMNy44IDEyLjZsMi4yLTIuMiIvPjxwYXRoIGQ9Ik0xOC40IDIzTDQgMjNMMTQuMiAxNC44TDIwIDE0LjgiLz48cGF0aCBkPSJNMjAuIDEzLjg4TDEyLjMgMjBMMTAuODkgOC40MiIvPjwvc3ZnPg==",
  "TE": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTgyMTI3IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE0LjQgN0wxIDNMMTIuNCAxNmwyLjMgMi4xeiIvPjxwYXRoIGQ9Ik0xNC40IDE4TDogMTlMMTQuNCAxNGwxMi44IDEyLjhsLTIuMyAyLjN6Ii8+PHBhdGggZD0iTTQgMjNMMTIuNCAxNmwxMi44IDEyLjhsLTIuMy0yLjN6Ii8+PC9zdmc+",
  "GO": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDI4NWY0IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEgN0wxOCAxOEEKMTggN0wxOCAxOCIvPjxwYXRoIGQ9Ik0xOCAxOEMxOCAxOCAxMCAxOCAxMCAxNEwxMCAxNCIvPjxwYXRoIGQ9Ik0xOCAxOEMxOCAxOCAyNCAxNCAyNCAxNCIvPjwvc3ZnPg==",
  "NV": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNzZiOTAwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEwLjQgN0wxIDJMMTQuNSAxNGwyLjMgMi4zeiIvPjxwYXRoIGQ9Ik0xNC41IDE0TDE1IDIzTDI5IDEzTDI5IDEzIi8+PHBhdGggZD0iTTE1IDIzTDI5IDEzTDI5IDIzIi8+PC9zdmc+",
  "MS": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDBhNGVmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEgN0wyMCAyMEwxIDJMMTAgMjAiLz48cGF0aCBkPSJNMjAgMjBMMjAgN0wxNSAxNUwyMCAzIi8+PHBhdGggZD0iTTE1IDE1TDI4IDI0TDI4IDE1Ii8+PHBhdGggZD0iTTI4IDE1TDI4IDI0Ii8+PC9zdmc+",
  "ME": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDg2NmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEgN0wyNCAzbDExIDExVjdBNjQgMWwgMTEgMTEiLz48cGF0aCBkPSJNMjQgMzJMMjQgMTBMTjQgMTBMMjQgMzIvPjwvc3ZnPg==",
  "SX": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDA1Mjg4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEgN0wyNCAzbDggOHAiLz48cGF0aCBkPSJNMjQgMTJMMjQgMzJMMTggMzJMMTggMjQ2NCAyNCIvPjxwYXRoIGQ9Ik0xOCAyNEwxOCAzMkwxNiAyNCIvPjxwYXRoIGQ9Ik0xNiAyNCAxOCAzMiIvPjwvc3ZnPg==",
};

/** Render a company logo or fallback to branded badge */
function CompanyLogo({ logo, initials, tint }: { logo?: string; initials: string; tint: string }) {
  // Check if we have a built-in logo
  const builtinLogo = COMPANY_LOGOS[initials];
  
  if (builtinLogo) {
    return (
      <img
        src={builtinLogo}
        alt={`${initials} logo`}
        className="w-10 h-10 object-contain"
        onError={(e) => {
          // Still try external logo URL if builtin fails
          if (logo) {
            const target = e.currentTarget;
            target.src = logo;
            return;
          }
          // Final fallback to badge
          const svg = `data:image/svg+xml;base64,${btoa(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="${tint}" />
              <text x="50" y="58" font-family="JetBrains Mono,Arial,monospace" font-size="32" font-weight="600" fill="#000" text-anchor="middle">${initials}</text>
            </svg>`
          )}`;
          (e.currentTarget as HTMLImageElement).src = svg;
        }}
      />
    );
  }
  
  // Fallback to branded badge
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