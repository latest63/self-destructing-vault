"use client";

import { useState, useEffect } from "react";
import { WordmarkSVG } from "./Logo";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";
import { Wallet, LogOut } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { address, isConnected, connectWallet, disconnectWallet } = useWallet();

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
              href="/home"
              className="flex items-center shrink-0"
              aria-label="ShipGuard home"
            >
              <WordmarkSVG height={15} className="text-foreground" />
            </a>

            {/* Right: wallet info - when connected */}
            {isConnected && address && (
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}