"use client";

import { Navbar } from "@/components/Navbar";
import { VaultList } from "@/components/VaultList";
import { CreateVaultModal } from "@/components/CreateVaultModal";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ShieldCheck, Coins, Gavel } from "lucide-react";

const STEPS = [
  {
    icon: Coins,
    label: "Open a raise",
    body: "Set the team's wallet, the roadmap, the evidence URL, and the close date. Those four things are the whole contract.",
  },
  {
    icon: ShieldCheck,
    label: "Backers deposit",
    body: "Anyone can deposit GEN into the raise. It sits in the contract — the team cannot touch it until the roadmap is verified.",
  },
  {
    icon: Gavel,
    label: "Verify and settle",
    body: "At the close date, GenLayer's AI reads the evidence URL. Roadmap met — funds release to the team. Missed — every backer refunds.",
  },
];

const TIMELINE = [
  { label: "Open the raise", detail: "Roadmap + date" },
  { label: "Backers deposit", detail: "GEN into the raise" },
  { label: "AI reads evidence", detail: "Checks the URL" },
  { label: "Release or refund", detail: "One of two exits" },
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
            <p className="eyebrow mb-4">Escrowed funding on GenLayer</p>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-5">
              Fund a team.
              <br />
              Hold it to its <span className="text-primary">roadmap</span>.
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
              A team opens a raise with a roadmap, an evidence URL, and a close
              date. Backers deposit GEN. At the close date, AI reads the
              evidence — if the roadmap is met the funds release to the team,
              and if it isn&apos;t, every backer gets their GEN back.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-12">
              <CreateVaultModal />
              <WalletConnectButton />
            </div>

            {/* The contract, in four steps */}
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

        {/* ── Open raises ──────────────────────────────────── */}
        <section className="shell pb-16">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Open raises</h2>
              <p className="text-sm text-muted-foreground">
                Each raise, with its roadmap, close date, and evidence link.
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
              Three steps, one escrow, two possible endings.
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
              Nothing settles on its own — someone submits the check, and the
              close date guarantees backers can always refund if the team goes
              quiet.
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
