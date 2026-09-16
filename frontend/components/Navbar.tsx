"use client";

import { useState, useEffect } from "react";
import { WordmarkSVG } from "./Logo";
import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { address, isConnected, disconnectWallet } = useWallet();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`
          border-b transition-all duration-300
          ${isScrolled
            ? "bg-black/85 backdrop-blur-xl border-border"
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
            >
              <WordmarkSVG height={15} className="text-foreground" />
            </a>

            {/* Right: glass-morph wallet info - when connected */}
            {isConnected && address && (
              <div className="flex items-center gap-2">
                {/* Glass morph effect container */}
                <div className="
                  hidden sm:flex items-center gap-2 px-3 py-1.5
                  rounded-full
                  bg-white/5 backdrop-blur-md
                  border border-white/10
                  shadow-[0_8px_32px_rgba(0,0,0,0.3)]
                  hover:bg-white/10
                  transition-all duration-200
                ">
                  <span className="text-xs text-muted-foreground">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectWallet}
                  className="
                    border-white/20 bg-white/5 hover:bg-white/10
                    text-muted-foreground hover:text-foreground
                    transition-all duration-200
                  "
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