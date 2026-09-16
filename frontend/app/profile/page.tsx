"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  User,
  Wallet,
  Copy,
  Check,
  LogOut,
  Compass,
  Rocket,
  ShieldCheck,
  Coins,
  Gavel,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchRaises, type ShippingRaise } from "@/lib/raises";

export default function ProfilePage() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [copied, setCopied] = useState(false);
  const [raises, setRaises] = useState<ShippingRaise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRaises()
      .then(setRaises)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="shell">
          <div className="max-w-2xl mx-auto">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-semibold tracking-wide uppercase">
                  <User className="w-3 h-3" />
                  Profile
                </span>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {isConnected ? "Your wallet" : "Connect to continue"}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                {isConnected
                  ? "Your wallet details and activity on ShipGuard."
                  : "Connect your wallet to view your raises and manage your connection."}
            </p>
            </div>

            {/* ── Wallet card ─────────────────────────────────────────────── */}
            <div className="bg-background border border-border rounded-xl overflow-hidden mb-8">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-primary/15 border border-primary/25 shrink-0">
                  {isConnected ? (
                    <Wallet className="w-5 h-5 text-primary" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isConnected ? "Connected wallet" : "No wallet connected"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isConnected
                      ? `Studio Next · Chain ${chainId ?? 61997}`
                      : "Connect to launch or back a raise"}
                  </p>
                </div>
                {isConnected && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                    </span>
                    Live
                  </span>
                )}
              </div>

              {/* Card body */}
              <div className="p-5 space-y-4">
                {isConnected && address ? (
                  <>
                    {/* Address row */}
                    <div>
                      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5 block">
                        Wallet address
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm font-medium text-foreground tabular-nums bg-white/[0.03] border border-border rounded-lg px-3 py-2.5">
                          {address}
                        </code>
                        <button
                          onClick={copyAddress}
                          aria-label="Copy address"
                          className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border border-border bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors duration-150"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-white/[0.03] border border-border">
                        <p className="text-lg font-bold tabular-nums">{raises.length}</p>
                        <p className="text-[11px] text-muted-foreground">Open raises</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03] border border-border">
                        <p className="text-lg font-bold tabular-nums text-primary">
                          {raises.filter((r) => r.verified).length}
                        </p>
                        <p className="text-[11px] text-muted-foreground">Verified</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.03] border border-border">
                        <p className="text-lg font-bold tabular-nums">GEN</p>
                        <p className="text-[11px] text-muted-foreground">Token</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your wallet to get started
                    </p>
                    <Button
                      variant="gradient"
                      onClick={() => openConnectModal?.()}
                      className="gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      Connect wallet
                    </Button>
                  </div>
                )}
              </div>

              {/* Card footer — connect / disconnect */}
              <div className="px-5 py-3 border-t border-border/50 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground/60">
                  {isConnected
                    ? "Manage your wallet connection"
                    : "Use RainbowKit to connect"}
                </p>
                {isConnected ? (
                  <button
                    onClick={() => disconnect()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/25 bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors duration-150"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => openConnectModal?.()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/25 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors duration-150"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Connect
                  </button>
                )}
              </div>
            </div>

            {/* ── Quick actions ───────────────────────────────────────────── */}
            {isConnected && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="flex-col gap-1.5 h-auto py-4 justify-center"
                  onClick={() => window.dispatchEvent(new Event("shipguard:open-launch"))}
                >
                  <Rocket className="w-5 h-5" />
                  <span className="text-xs font-medium">Launch a raise</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-col gap-1.5 h-auto py-4 justify-center"
                  onClick={() => (window.location.href = "/explore")}
                >
                  <Compass className="w-5 h-5" />
                  <span className="text-xs font-medium">Explore raises</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
