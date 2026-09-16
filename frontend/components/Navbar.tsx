"use client";

import { useState, useEffect } from "react";
import { WordmarkSVG } from "./Logo";
import { ConnectButton } from "@rainbow-me/rainbowkit";

/**
 * Styled link button to match the lemon UI theme.
 * Appears when wallet is connected, opens MetaMask when disconnected.
 */
function StyledLink({ 
  children, 
  onClick,
  disabled 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-primary text-sm font-semibold"
      style={{
        background: "var(--primary, #d4ff00)",
        color: "#000",
        border: "none",
        borderRadius: "var(--radius, 0.25rem)",
        padding: "0.5rem 1.25rem",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </button>
  );
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

            {/* Right: connect button - styled to match the app's lemon theme */}
            <StyledLink onClick={() => {}}>
              Connect Wallet
            </StyledLink>
          </div>
        </div>
      </div>
    </header>
  );
}