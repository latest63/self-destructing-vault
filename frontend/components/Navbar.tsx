"use client";

import { useState, useEffect } from "react";
import { WordmarkSVG } from "./Logo";
import { useWallet } from "@/lib/genlayer/wallet";
import { LogOut, Menu, X, Wallet, Compass, Rocket, LayoutGrid } from "lucide-react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: "connect" | "explore" | "launch" | "dashboard" | "disconnect" | null;
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { address, isConnected, connectWallet, disconnectWallet } = useWallet();
  const { openConnectModal } = useConnectModal();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleNavAction = (action: string) => {
    setMenuOpen(false);
    switch (action) {
      case "connect":
        openConnectModal ? openConnectModal() : connectWallet();
        break;
      case "explore":
        router.push("/explore");
        break;
      case "launch":
        router.push("/");
        break;
      case "disconnect":
        disconnectWallet();
        break;
    }
  };

  // Menu items based on wallet state
  const menuItems: NavItem[] = isConnected
    ? [
        { label: "Explore raises", icon: Compass, action: "explore" },
        { label: "Launch a raise", icon: Rocket, action: "launch" },
        { label: "My raises", icon: LayoutGrid, action: "explore" },
        { label: "Disconnect wallet", icon: LogOut, action: "disconnect" },
      ]
    : [
        { label: "Explore raises", icon: Compass, action: "explore" },
        { label: "Connect wallet", icon: Wallet, action: "connect" },
      ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div
          className={`
            border-b transition-all duration-300
            ${isScrolled
              ? "bg-neutral-900/80 backdrop-blur-xl border-border"
              : "bg-transparent border-transparent"
            }
          `}
        >
          <div className="shell">
            <div className="flex h-16 items-center justify-between gap-4">
              {/* Left: brand */}
              <a
                href="/"
                className="flex items-center shrink-0"
                aria-label="ShipGuard home"
                onClick={() => setMenuOpen(false)}
              >
                <WordmarkSVG height={15} className="text-foreground" />
              </a>

              {/* Right: glass-morph wallet + hamburger */}
              <div className="flex items-center gap-2">
                {isConnected && address && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 transition-all duration-200">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </div>
                )}

                {/* Hamburger icon */}
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  className="
                    flex items-center justify-center w-9 h-9
                    rounded-lg border border-border bg-white/5 backdrop-blur-md
                    text-foreground hover:bg-white/10
                    transition-all duration-200
                  "
                >
                  {menuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile / Overlay menu ───────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 flex flex-col">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />

          {/* Panel */}
          <div
            className="
              relative mt-16 mx-4 rounded-xl
              bg-neutral-950/95 backdrop-blur-xl
              border border-border
              shadow-2xl shadow-black/50
              overflow-hidden
            "
          >
            {/* Section header */}
            <div className="px-5 py-4 border-b border-border/50">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                {isConnected ? "Connected" : "Menu"}
              </p>
              {isConnected && address && (
                <p className="text-xs text-foreground mt-0.5 tabular-nums">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              )}
            </div>

            {/* Items */}
            <nav className="p-2">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavAction(item.action ?? "explore")}
                  className="
                    w-full flex items-center gap-3
                    px-4 py-3.5 rounded-lg
                    text-sm font-medium
                    text-foreground/80
                    hover:text-foreground hover:bg-white/5
                    transition-colors duration-150
                  "
                >
                  <item.icon className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Footer note */}
            <div className="px-5 py-3 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground/60">
                {isConnected
                  ? "You are connected to Studio Next (61997)"
                  : "Connect your wallet to launch or back a raise"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
