"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, Check } from "lucide-react";
import { useAccount } from "wagmi";
import { fetchProject, upsertProject } from "@/lib/projects";
import { success, error } from "@/lib/utils/toast";

interface EditProjectFormData {
  name: string;
  logo_url: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
}

const EMPTY: EditProjectFormData = {
  name: "",
  logo_url: "",
  description: "",
  website: "",
  twitter: "",
  telegram: "",
  discord: "",
};

export default function EditProjectPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [form, setForm] = useState<EditProjectFormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof EditProjectFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  useEffect(() => {
    if (!isConnected || !address) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await fetchProject(address);
        if (cancelled) return;
        const extra = (p.profile_data || {}) as Record<string, unknown>;
        setForm({
          name: p.name || "",
          logo_url: p.logo_url || "",
          description: (extra.description as string) || "",
          website: p.link || "",
          twitter: (extra.twitter as string) || "",
          telegram: (extra.telegram as string) || "",
          discord: (extra.discord as string) || "",
        });
      } catch {
        /* keep empty form */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

  const handleSave = async () => {
    if (!address) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await upsertProject(address, {
        name: form.name || null,
        logo_url: form.logo_url || null,
        link: form.website || null,
        profile_data: {
          description: form.description || null,
          twitter: form.twitter || null,
          telegram: form.telegram || null,
          discord: form.discord || null,
        },
      });
      if (updated) {
        setSaved(true);
        success("Project updated", {
          description: "Your project details were saved.",
        });
        setTimeout(() => router.push("/dashboard"), 900);
      } else {
        error("Failed to update project", {
          description: "No wallet connected or Supabase configuration issue.",
        });
      }
    } catch (e: any) {
      error("Error updating project", {
        description: e?.message || "Unknown error occurred",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 pb-20">
          <div className="shell">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-2xl md:text-3xl font-bold mb-4">Connect your wallet</h1>
              <p className="text-muted-foreground mb-6">
                Connect your wallet to edit your project details.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="shell">
          <div className="max-w-2xl mx-auto">
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-semibold tracking-wide uppercase">
                  <Rocket className="w-3 h-3" />
                  Edit Project
                </span>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Edit details
                </h1>
              </div>
            </div>

            <div className="bg-background border border-border rounded-xl overflow-hidden">
              <div className="p-5 space-y-4">
                {loading ? (
                  <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading project...
                  </div>
                ) : (
                  <>
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
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                        Description
                      </label>
                      <textarea
                        placeholder="Describe your project..."
                        value={form.description}
                        onChange={handleChange("description")}
                        rows={3}
                        className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-y"
                      />
                    </div>

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
                  </>
                )}

                {saved && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <p className="text-xs font-medium text-green-900">Saved — returning to dashboard…</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2"
                    onClick={() => router.push("/dashboard")}
                  >
                    Back
                  </Button>
                  <Button
                    variant="gradient"
                    size="lg"
                    className="flex-1 gap-2"
                    onClick={handleSave}
                    disabled={saving || loading || !form.name}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
