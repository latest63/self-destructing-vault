"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { RaiseCarousel } from "@/components/RaiseCarousel";
import { fetchRaises, type ShippingRaise } from "@/lib/raises";
import { Loader2, Coins, Gavel, ShieldCheck, Clock } from "lucide-react";

export default function ExplorePage() {
  const [raises, setRaises] = useState<ShippingRaise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRaises()
      .then((data) => {
        setRaises(data);
      })
      .catch(() => {
        // Fallback handled in fetchRaises
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="shell">
          {/* Header */}
          <div className="mb-10">
            <p className="eyebrow mb-2">Live</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Open Raises
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg">
              Browse active funding rounds. Each raise is escrowed — funds are
              locked until the condition is verified by AI at the close date.
            </p>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-3 mb-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {raises.length} open round{raises.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-xs text-muted-foreground">
              <Coins className="w-3.5 h-3.5" />
              <span>GEN locked in escrow</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AI-verified settlement</span>
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading open raises…
              </p>
            </div>
          ) : (
            <RaiseCarousel raises={raises} />
          )}
        </div>
      </main>
    </div>
  );
}
