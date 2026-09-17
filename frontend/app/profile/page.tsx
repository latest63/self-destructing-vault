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
  Github,
  KeyRound,
  FileCode,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchRaises, type ShippingRaise } from "@/lib/raises";
import { createClient } from "genlayer-js";
import {
  GENLAYER_CHAIN,
  getGithubVerifyContractAddress,
} from "@/lib/genlayer/client";
import { success, error } from "@/lib/utils/toast";

// ── GitHub verification helpers ───────────────────────────────────────────
// The GitHubVerifier contract (Studio Next 61997) verifies that a wallet
// owns a GitHub account. Flow:
//   1. Start: generate a one-time code, show the gist template to the user.
//   2. User creates a PUBLIC GIST containing the code.
//   3. Submit: fetch GitHub API evidence (user profile + gist scan) and
//      call submit() on the contract with the evidence.
//   4. verify(): run AI consensus on the stored evidence. On success,
//      get_gh_handle(wallet) returns the handle, and the user can launch
//      raises whose source-of-truth URL is under that handle.

const GITHUB_VERIFY_CONTRACT = getGithubVerifyContractAddress();

function genCode() {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  let out = "";
  for (const n of arr) out += CHARS[n % CHARS.length];
  return out;
}

function ghClient(address?: `0x${string}`) {
  const config: any = { chain: GENLAYER_CHAIN };
  if (address) config.account = address;
  return createClient(config);
}

export default function ProfilePage() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [copied, setCopied] = useState(false);
  const [raises, setRaises] = useState<ShippingRaise[]>([]);
  const [loading, setLoading] = useState(true);

  // ── GitHub verification state ──────────────────────────────────────────
  type GhPhase = "idle" | "code" | "submitting" | "verifying" | "verified";
  const [ghPhase, setGhPhase] = useState<GhPhase>("idle");
  const [ghHandle, setGhHandle] = useState("");
  const [ghCode, setGhCode] = useState("");
  const [ghGistUrl, setGhGistUrl] = useState("");
  const [ghBusy, setGhBusy] = useState(false);
  const [ghError, setGhError] = useState("");
  const [ghVerifiedHandle, setGhVerifiedHandle] = useState("");
  const [ghChecking, setGhChecking] = useState(true);

  // On connect: check whether the wallet already has a verified GitHub handle
  useEffect(() => {
    if (!isConnected || !address || !GITHUB_VERIFY_CONTRACT) {
      setGhChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const client = ghClient();
        const h = await client.readContract({
          address: GITHUB_VERIFY_CONTRACT,
          functionName: "get_gh_handle",
          args: [address],
        });
        if (!cancelled) {
          setGhVerifiedHandle(typeof h === "string" ? h : h?.toString() || "");
          setGhPhase(typeof h === "string" && h ? "verified" : "idle");
        }
      } catch {
        /* contract not configured / chain not ready */
      } finally {
        if (!cancelled) setGhChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isConnected, address]);

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

  // ── GitHub verify: start (generate code) ───────────────────────────────
  const ghStart = () => {
    setGhError("");
    setGhCode(genCode());
    setGhGistUrl("");
    setGhPhase("code");
  };

  // ── GitHub verify: submit (fetch GitHub API evidence → contract) ───────
  const ghSubmit = async () => {
    if (!address || !GITHUB_VERIFY_CONTRACT || !ghHandle.trim() || !ghCode) return;
    const handle = ghHandle.trim().replace(/^@/, "");
    setGhBusy(true);
    setGhError("");
    try {
      // 1. GitHub API: user profile (identity pin)
      const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}`);
      if (userRes.status === 404) throw new Error(`GitHub user "@${handle}" not found`);
      if (!userRes.ok) throw new Error(`GitHub API error (HTTP ${userRes.status})`);
      const user = await userRes.json();

      // 2. GitHub API: scan public gists for the one-time code
      let gistFound = false;
      let gistUrl = "";
      const gistsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(handle)}/gists?per_page=100`);
      if (gistsRes.ok) {
        const gists = await gistsRes.json();
        for (const g of gists) {
          for (const f of Object.values(g.files || {})) {
            const raw = f as any;
            if (raw.content && raw.content.includes(ghCode)) {
              gistFound = true;
              gistUrl = g.html_url;
              break;
            }
          }
          if (gistFound) break;
        }
      }

      // 3. submit() on the contract
      setGhPhase("submitting");
      const client = ghClient(address as `0x${string}`);
      const fees = await client.estimateTransactionFees({});
      await client.writeContract({
        address: GITHUB_VERIFY_CONTRACT,
        functionName: "submit",
        args: [
          address,
          handle,
          ghCode,
          user.login,
          user.type,
          user.html_url,
          gistFound,
          gistUrl,
        ],
        fees,
      });

      // 4. verify() — AI consensus
      setGhPhase("verifying");
      const fees2 = await client.estimateTransactionFees({});
      await client.writeContract({
        address: GITHUB_VERIFY_CONTRACT,
        functionName: "verify",
        args: [address],
        fees: fees2,
      });

      // 5. read back
      const h = await client.readContract({
        address: GITHUB_VERIFY_CONTRACT,
        functionName: "get_gh_handle",
        args: [address],
      });
      const got = typeof h === "string" ? h : h?.toString() || "";
      if (got) {
        setGhVerifiedHandle(got);
        setGhPhase("verified");
        success("GitHub verified", { description: `@${got} is now linked to your wallet.` });
      } else {
        setGhPhase("idle");
        throw new Error("Verification did not resolve to a handle — the gist may not contain the code yet.");
      }
    } catch (e: any) {
      setGhPhase("idle");
      setGhError(e?.message || "GitHub verification failed");
    } finally {
      setGhBusy(false);
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
                        <code className="flex-1 min-w-0 text-sm font-medium text-foreground tabular-nums bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 truncate" title={address}>
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

            {/* ── GitHub verification card ─────────────────────────────────── */}
            {isConnected && (
              <div className="bg-background border border-border rounded-xl overflow-hidden mb-8">
                {/* Card header */}
                <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/5 border border-border shrink-0">
                    <Github className="w-5 h-5 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">GitHub identity</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ghPhase === "verified"
                        ? "Verified on-chain — required to launch a raise"
                        : "Verify your GitHub before launching a raise"}
                    </p>
                  </div>
                  {ghPhase === "verified" && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
                      <Check className="w-3 h-3" />
                      @{ghVerifiedHandle}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5">
                  {ghChecking ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking on-chain status…
                    </div>
                  ) : ghPhase === "verified" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
                          <Github className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            <a
                              href={`https://github.com/${ghVerifiedHandle}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-primary transition-colors"
                            >
                              github.com/{ghVerifiedHandle}
                            </a>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Verified via public gist code · stored on Studio Next
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                        You can now launch a raise. The source-of-truth URL you set will be
                        checked against this verified handle.
                      </p>
                    </div>
                  ) : ghPhase === "idle" ? (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        To launch a raise, prove you own a GitHub account. We generate a
                        one-time code — you publish it in a <strong>public gist</strong>, then
                        we fetch the GitHub API and commit the proof to the chain.
                      </p>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground block">
                          GitHub username
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. octocat"
                          value={ghHandle}
                          onChange={(e) => setGhHandle(e.target.value)}
                          className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <Button variant="gradient" onClick={ghStart} className="w-full gap-2">
                        <KeyRound className="w-4 h-4" />
                        Get my code
                      </Button>
                    </div>
                  ) : ghPhase === "code" ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground mb-2">
                          Create a <strong>public gist</strong> containing this code:
                        </p>
                        <div className="bg-white/[0.03] border border-primary/30 rounded-lg p-4">
                          <p className="font-mono text-lg text-primary tracking-wider select-all">
                            {ghCode}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-2">
                            gist.github.com → New gist → paste the code → Public
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setGhPhase("idle")}
                          className="flex-1"
                          disabled={ghBusy}
                        >
                          Back
                        </Button>
                        <Button
                          variant="gradient"
                          onClick={ghSubmit}
                          className="flex-1 gap-2"
                          disabled={ghBusy}
                        >
                          {ghBusy ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {(ghPhase as string) === "verifying" ? "Verifying…" : "Submitting…"}
                            </>
                          ) : (
                            <>
                              <FileCode className="w-4 h-4" />
                              I created the gist
                            </>
                          )}
                        </Button>
                      </div>
                      {ghError && (
                        <p className="text-xs text-destructive leading-relaxed">{ghError}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
                        {ghBusy
                          ? "Two transactions will run: submit the evidence, then AI-consensus verify. This takes ~1–2 min."
                          : "We fetch api.github.com for your profile + gists, then commit the result on-chain."}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

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
