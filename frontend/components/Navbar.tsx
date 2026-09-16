"use client";

import { useState, useEffect } from "react";
import { AccountPanel } from "./AccountPanel";
import { WordmarkSVG } from "./Logo";
import { WalletConnectButton } from "./WalletConnectButton";
import { useWallet } from "@/lib/genlayer/wallet";

/**
 * A single wallet control for the navbar.
 *
 * Two components used to be rendered here at once — WalletConnectButton and
 * AccountPanel both drew their own "Connect Wallet" button, so the bar showed
 * the same action twice. Only one is shown now, picked by connection state.
 */
function WalletSlot() {
  const { isConnected, isLoading } = useWallet();
  if (isLoading) return <WalletConnectButton />;
  return isConnected ? <AccountPanel /> : <WalletConnectButton />;
}

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

            {/* Right: one wallet control */}
            <div className="flex items-center gap-2 sm:gap-3">
              <WalletSlot />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
