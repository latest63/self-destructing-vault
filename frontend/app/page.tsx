import { Navbar } from "@/components/Navbar";
import { CreateVaultModal } from "@/components/CreateVaultModal";
import { RaiseCarousel } from "@/components/RaiseCarousel";
import { fetchRaises } from "@/lib/raises";
import { Coins, ShieldCheck, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Coins,
    label: "Open a raise",
    body: "Set the team's wallet, the condition, the evidence URL, and the close date. Those four things are the whole contract.",
  },
  {
    icon: ShieldCheck,
    label: "Backers deposit",
    body: "Anyone can deposit GEN into the raise. It sits in the contract — the team cannot touch it until the condition is verified.",
  },
  {
    icon: Gavel,
    label: "Verify and settle",
    body: "At the close date, GenLayer's AI reads the evidence URL. Condition met — funds release to the team. Not met — every backer refunds.",
  },
];

const TIMELINE = [
  { label: "Open the raise", detail: "Condition + date" },
  { label: "Backers deposit", detail: "GEN into the raise" },
  { label: "AI reads evidence", detail: "Checks the URL" },
  { label: "Release or refund", detail: "One of two exits" },
];

// ShipGuard's own roadmap — the product, not any individual raise.
const ROADMAP = [
  {
    status: "Shipped",
    title: "Escrowed raises",
    body: "A team opens a raise with one condition, one evidence URL, and a close date. Backers deposit GEN into the contract.",
  },
  {
    status: "Shipped",
    title: "AI-verified settlement",
    body: "GenLayer validators read the evidence URL and settle to one of two endings — release to the team, or refund every backer.",
  },
  {
    status: "Shipped",
    title: "Refund safety net",
    body: "Past the close date, backers can always withdraw. A team that goes quiet cannot hold the funds.",
  },
  {
    status: "Next",
    title: "Multi-milestone raises",
    body: "Split a raise into stages, each with its own condition and date, releasing in tranches as each stage is verified.",
  },
  {
    status: "Next",
    title: "Repository tracking",
    body: "Point a condition at a public repo and let validators check commit activity directly, instead of a single evidence page.",
  },
  {
    status: "Exploring",
    title: "Dispute window",
    body: "A short period after a verdict where either side can submit counter-evidence before funds move.",
  },
];

export default async function HomePage() {
  const raises = await fetchRaises();

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
              Money that only
              <br />
              moves when the{" "}
              <span className="text-primary">work does</span>.
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
              One contract sets a condition, an evidence URL, and a close date.
              Backers deposit GEN. When the work ships, funds release — otherwise
              they refund. No middleman, no guesswork.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-12">
              <CreateVaultModal />
              <Button
                variant="secondary"
                size="default"
                disabled
                className="cursor-default"
              >
                Back a raise
              </Button>
            </div>

            {/* The contract, in four steps */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
              {TIMELINE.map((step, i) => {
                const isStep4 = i === 3;
                return (
                  <div
                    key={step.label}
                    className={`bg-background p-4 ${
                      isStep4 ? "step-highlight" : ""
                    }`}
                  >
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
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Open raises ──────────────────────────────────── */}
        <section className="pb-16">
          <div className="shell flex items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">Open raises</h2>
              <p className="text-sm text-muted-foreground">
                Live raises on ShipGuard, by amount committed.
              </p>
            </div>
          </div>

          <RaiseCarousel raises={raises} />
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section className="border-t border-border">
          <div className="shell section">
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-10 max-w-2xl">
              Three steps, one escrow, two possible endings.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.label}
                    className="bg-background p-6 md:p-8"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-muted-foreground">
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="eyebrow text-muted-foreground step-index">
                        {step.label.split(" ")[0]}
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
