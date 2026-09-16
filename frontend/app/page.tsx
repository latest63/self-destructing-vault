"use client";

import { Navbar } from "@/components/Navbar";
import { VaultList } from "@/components/VaultList";
import { CreateVaultModal } from "@/components/CreateVaultModal";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ShieldCheck, Coins, Gavel } from "lucide-react";

const STEPS = [
  {
    icon: Coins,
    label: "Back a project",
    body: "Pledge GEN to a team raising for their next release. Your funds sit in escrow until the terms are settled.",
  },
  {
    icon: ShieldCheck,
    label: "Milestones hold the funds",
    body: "The team commits to public, verifiable milestones up front. Those commitments are the release condition — not a promise.",
  },
  {
    icon: Gavel,
    label: "AI settles it",
    body: "At the close date, GenLayer's validators check the evidence. Delivered — the team is paid. Missed — every backer is refunded.",
  },
];

const TIMELINE = [
  { label: "Raise opens", detail: "Backers pledge" },
  { label: "Milestones due", detail: "Team ships" },
  { label: "AI verifies", detail: "Evidence checked" },
  { label: "Funds move", detail: "Paid or refunded" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Offset the fixed 64px navbar */}
      <main className="flex-grow pt-16">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="shell pt-16 pb-12 md:pt-24 md:pb-16">
          <div className="max-w-3xl">
            <p className="eyebrow mb-4">Launchpad · Escrowed raises</p>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-5">
              Back the teams
              <br />
              that <span className="text-primary">ship</span>.
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
              A launchpad where builders raise from their community, and backers
              stay protected. Pledges are held in escrow — released when the
              team delivers its milestones, returned to you when they don&apos;t.
              No committee decides. AI settles it against the team&apos;s public
              evidence.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-12">
              <CreateVaultModal />
              <WalletConnectButton />
            </div>

            {/* Settlement timeline — explains the product in one glance */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
              {TIMELINE.map((step, i) => (
                <div key={step.label} className="bg-background p-4">
                  <div className="eyebrow mb-2">
                    Step {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="text-sm font-semibold mb-0.5">
                    {step.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Live raises ──────────────────────────────────── */}
        <section className="shell pb-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Live raises</h2>
              <p className="text-sm text-muted-foreground">
                Every open raise, with its milestones and settlement date.
              </p>
            </div>
          </div>

          <VaultList />
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="shell section">
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-10 max-w-2xl">
              Escrowed funding, settled by evidence instead of trust.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="bg-background p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-primary">
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="eyebrow">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold mb-2">
                      {step.label}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-6 max-w-2xl leading-relaxed">
              The milestone check is a gate, not a trigger — settlement runs when
              someone submits it, and the deadline guarantees backers can always
              reclaim if the team goes quiet.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="shell py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              ShipGuard — escrowed raises for teams that ship.
            </p>
            <nav className="flex items-center gap-5 text-xs text-muted-foreground">
              <a
                href="https://genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                GenLayer
              </a>
              <a
                href="https://docs.genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Docs
              </a>
              <a
                href="https://explorer-studio-dev.genlayer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Explorer
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
