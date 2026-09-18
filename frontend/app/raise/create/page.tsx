"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { fetchRaises, type ShippingRaise } from "@/lib/raises";
import { Loader2, Rocket, Github } from "lucide-react";

interface CreateCampaignFormData {
  name: string;
  logo_url: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState<CreateCampaignFormData>({
    name: "",
    logo_url: "",
    description: "",
    website: "",
    twitter: "",
    telegram: "",
    discord: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof CreateCampaignFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // TODO: Implement submission logic
      console.log("Create campaign:", form);
      // After creating, redirect to the raise or back to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating campaign:", error);
    } finally {
      setLoading(false);
    }
  };

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
                  <Rocket className="w-3 h-3" />
                  Create Campaign
                </span>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Launch a new raise
                </h1>
              </div>
              <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
                Set up your funding round with a GitHub-verified source of truth.
              </p>
            </div>

            {/* ── Create Campaign Form ────────────────────────────────── */}
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              <div className="p-5 space-y-4">
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. My Awesome Project"
                    value={form.name}
                    onChange={handleChange("name")}
                    className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Logo URL - using text input, not file upload */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourproject.com/logo.png"
                    value={form.logo_url}
                    onChange={handleChange("logo_url")}
                    className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Direct link to your project logo image
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe your project..."
                    value={form.description}
                    onChange={handleChange("description")}
                    rows={4}
                    className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-y"
                  />
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourproject.com"
                    value={form.website}
                    onChange={handleChange("website")}
                    className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Twitter */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Twitter
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. yourproject"
                    value={form.twitter}
                    onChange={handleChange("twitter")}
                    className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Telegram */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Telegram
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. @yourproject"
                    value={form.telegram}
                    onChange={handleChange("telegram")}
                    className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Discord */}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                    Discord
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. discord.gg/yourproject"
                    value={form.discord}
                    onChange={handleChange("discord")}
                    className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* GitHub Verification Notice */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Github className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">
                        GitHub verification required
                      </p>
                      <p className="text-xs text-blue-700">
                        Your raise will use a GitHub-verified source of truth. 
                        Complete verification in your dashboard first.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleSubmit}
                  disabled={loading || !form.name}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating campaign...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Create Campaign
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}