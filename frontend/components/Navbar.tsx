"use client";

import { useState, useEffect } from "react";
import { WordmarkSVG } from "./Logo";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`border-b transition-colors duration-200 ${
          isScrolled
            ? "bg-black/85 backdrop-blur-xl border-border"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="shell">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: brand */}
            <a
              href="/"
              className="flex items-center shrink-0"
              aria-label="ShipGuard home"
            >
              <WordmarkSVG height={15} className="text-foreground" />
            </a>

            {/* Right: RainbowKit ConnectButton styled via theme provider */}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}