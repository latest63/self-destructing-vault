"use client";

import { useState, useEffect, useMemo } from "react";
import { Rocket, Calendar, Users, ArrowLeft, Link, Loader2, ShieldCheck, Github } from "lucide-react";
import { createClient } from "genlayer-js";
import { useInvalidateVaultsData } from "@/lib/hooks/useVault";
import {
  GENLAYER_CHAIN,
  GENLAYER_NETWORK,
  getVaultContractAddress,
  getConditionContractAddress,
  getGithubVerifyContractAddress,
} from "@/lib/genlayer/client";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { error, success } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const GITHUB_VERIFY_CONTRACT = getGithubVerifyContractAddress();

export function CreateVaultModal() {
  const { isConnected, address, isLoading } = useWallet();
  const { openConnectModal } = useConnectModal();
  const kit = useTransactionKit(address);
  const invalidateVaultsData = useInvalidateVaultsData();
  const vaultAddress = getVaultContractAddress();
  const conditionAddress = getConditionContractAddress();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"form" | "review">("form");
  const [teamAddress, setTeamAddress] = useState("");
  const [deadline, setDeadline] = useState("");
  const [condition, setCondition] = useState("");
  const [checkUrl, setCheckUrl] = useState("");

  const [errors, setErrors] = useState({
    teamAddress: "",
    deadline: "",
    condition: "",
    checkUrl: "",
  });

  // ── GitHub verification gate ────────────────────────────────────────────
  // Launching a raise requires a verified GitHub identity (on-chain).
  // The verification status is checked by reading get_gh_handle from the
  // GitHubVerifier contract; if the handle is empty, the user must verify first.
  const [ghHandle, setGhHandle] = useState<string>("");
  const [ghChecked, setGhChecked] = useState(false);
  const [ghChecking, setGhChecking] = useState(false);

  // Check if the currently connected wallet has a verified GitHub handle
  // on-chain. Runs when wallet/address or dialog open state changes.
  useEffect(() => {
    if (!isConnected || !address || !GITHUB_VERIFY_CONTRACT || !isOpen) {
      setGhHandle("");
      setGhChecked(false);
      setGhChecking(false);
      return;
    }
    let cancelled = false;
    setGhChecking(true);
    (async () => {
      try {
        const client = createClient({ chain: GENLAYER_CHAIN });
        const h = await client.readContract({
          address: GITHUB_VERIFY_CONTRACT as `0x${string}`,
          functionName: "get_gh_handle",
          args: [address],
        });
        if (!cancelled) {
          setGhHandle(typeof h === "string" ? h : h?.toString() || "");
          setGhChecked(true);
        }
      } catch {
        if (!cancelled) {
          // If contract is not deployed or chain is not ready, treat as not verified
          setGhHandle("");
          setGhChecked(true);
        }
      } finally {
        if (!cancelled) setGhChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isConnected, address, isOpen]);

  // Whether the user is allowed to launch: must be connected, address present,
  // verification check complete, and a GitHub handle found on-chain.
  const canLaunch = isConnected && !!address && ghChecked && !!ghHandle;

  // Guard that blocks launch when the user hasn't verified GitHub
  const requireGitHubVerification = (): boolean => {
    if (!isConnected || !address) {
      // Wallet not connected — handled separately in handleSubmit
      return true;
    }
    if (!GITHUB_VERIFY_CONTRACT) {
      error("GitHub verification not configured", {
        description: "The GitHub verifier contract is not deployed.",
      });
      return false;
    }
    if (!ghChecked) {
      // Still checking — shouldn't happen on button click, but guard anyway
      error("Please wait", { description: "Checking your verification status…" });
      return false;
    }
    if (!ghHandle) {
      error("Verify your GitHub first", {
        description:
          "You must verify your GitHub account on your profile page before " +
          "launching a raise. This prevents linking a raise to someone else's " +
          "GitHub as the source of truth.",
        action: {
          label: "Go verify now",
          onClick: () => {
            setIsOpen(false);
            window.location.href = "/profile";
          },
        },
      });
      return false;
    }
    return true;
  };

  // Convert deadline to Unix timestamp
  const deadlineTimestamp = useMemo(() => {
    if (!deadline) return "";
    return Math.floor(new Date(deadline).getTime() / 1000).toString();
  }, [deadline]);

  // The contract keys the vault and its condition by a caller-supplied vault_id,
  // so one id is minted per form submission and reused by both transactions:
  //   1. register_condition(vault_id, check_url, success_condition, team_address)
  //   2. create_vault(vault_id, team_address, deadline, condition, condition_contract)
  const [vaultId, setVaultId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const createAndRegister = async () => {
    if (!address) {
      error("Please connect your wallet first");
      return;
    }
    if (!vaultAddress || !conditionAddress) {
      error("Contract address not configured", {
        description:
          "Set NEXT_PUBLIC_VAULT_CONTRACT and NEXT_PUBLIC_CONDITION_CONTRACT in your .env file.",
      });
      return;
    }
    // GitHub verification gate — must have a verified GitHub handle on-chain
    if (!requireGitHubVerification()) return;

    const id = vaultId || `vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setVaultId(id);
    setSubmitting(true);

    try {
      const client = createClient({
        chain: GENLAYER_CHAIN,
        account: address as `0x${string}`,
      });

      // 1. Register the condition with the governor.
      const regFees = await client.estimateTransactionFees({});
      await client.writeContract({
        address: conditionAddress as `0x${string}`,
        functionName: "register_condition",
        args: [id, checkUrl, condition, teamAddress],
        fees: regFees,
      });

      // 2. Create the vault, reusing the same id.
      const cvFees = await client.estimateTransactionFees({});
      await client.writeContract({
        address: vaultAddress as `0x${string}`,
        functionName: "create_vault",
        args: [id, teamAddress, deadlineTimestamp, condition, conditionAddress],
        fees: cvFees,
      });

      success("Raise launched", {
        description: `Raise ${id} is live. Backers can now deposit GEN into it.`,
      });
      invalidateVaultsData();
      resetForm();
      setIsOpen(false);
    } catch (e: any) {
      error("Could not launch raise", {
        description: e?.message || "The transaction could not be submitted.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Note: we no longer auto-close when disconnected, because the form is
  // viewable/fillable without a wallet — the connect check happens at submit.

  const validateForm = (): boolean => {
    const newErrors = {
      teamAddress: "",
      deadline: "",
      condition: "",
      checkUrl: "",
    };

    if (!teamAddress.trim()) {
      newErrors.teamAddress = "Team address is required";
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(teamAddress.trim())) {
      newErrors.teamAddress = "Invalid Ethereum address";
    }

    if (!deadline.trim()) {
      newErrors.deadline = "Deadline is required";
    } else if (new Date(deadline) <= new Date()) {
      newErrors.deadline = "Deadline must be in the future";
    }

    if (!condition.trim()) {
      newErrors.condition = "Condition is required";
    }

    if (!checkUrl.trim()) {
      newErrors.checkUrl = "Check URL is required";
    } else if (!/^https?:\/\/.+/.test(checkUrl.trim())) {
      newErrors.checkUrl = "Invalid URL";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      // Prompt to connect via RainbowKit — don't just error out.
      openConnectModal?.();
      return;
    }

    if (!kit) {
      error("Transaction kit unavailable", {
        description: "Please check your wallet connection and try again."
      });
      return;
    }

    if (!vaultAddress) {
      error("Contract address not configured", {
        description: "Please set NEXT_PUBLIC_VAULT_CONTRACT in your .env file."
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    // GitHub verification gate — must have a verified GitHub handle on-chain
    if (GITHUB_VERIFY_CONTRACT && ghChecked && !ghHandle) {
      error("Verify your GitHub first", {
        description:
          "You must verify your GitHub account on your profile page before " +
          "launching a raise. This prevents linking a raise to someone else's " +
          "GitHub as the source of truth.",
        action: {
          label: "Go verify now",
          onClick: () => {
            setIsOpen(false);
            window.location.href = "/profile";
          },
        },
      });
      return;
    }

    setStep("review");
  };

  const resetForm = () => {
    setTeamAddress("");
    setDeadline("");
    setCondition("");
    setCheckUrl("");
    setStep("form");
    setErrors({ teamAddress: "", deadline: "", condition: "", checkUrl: "" });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsOpen(open);
  };

// Handle "Launch a raise" button click - always open the form.
// The wallet is only required at submit time, not to view the form.
  const handleLaunchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  // Allow other components (e.g. the Navbar menu) to open the form
  // without navigating — dispatches the shared custom event.
  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener("shipguard:open-launch", onOpen);
    return () => window.removeEventListener("shipguard:open-launch", onOpen);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button 
        variant="gradient" 
        disabled={isLoading}
        onClick={handleLaunchClick}
        className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Rocket className="w-4 h-4 mr-2" />
        Launch a raise
      </Button>
      <DialogContent className="brand-card border-2 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Launch a raise</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Set the team&apos;s wallet, the condition, the evidence URL, and the
            close date. Backers deposit GEN — the AI checks the evidence at the
            close date.
          </DialogDescription>
        </DialogHeader>

        {/* GitHub verification gate notice */}
        {GITHUB_VERIFY_CONTRACT && isConnected && (
          ghChecking ? (
            <div className="mt-4 rounded-lg border border-border/30 bg-white/[0.03] p-4 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Checking GitHub verification…</span>
            </div>
          ) : !ghHandle ? (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm space-y-2">
              <div className="flex items-center gap-2 text-destructive font-medium">
                <Github className="w-4 h-4" />
                GitHub verification required
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You must verify your GitHub account on-chain before launching a
                raise — this stops people pointing a raise at someone else&apos;s
                GitHub as their source of truth.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/profile";
                }}
              >
                <Github className="w-4 h-4 mr-1.5" />
                Verify on profile
              </Button>
            </div>
          ) : null
        )}

        {ghHandle && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-primary/90">
              Launching as verified GitHub <strong>@{ghHandle}</strong>
            </p>
          </div>
        )}

        {step === "review" ? (
          <div className="mt-4 space-y-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setStep("form")}
              className="gap-2"
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="space-y-2.5 rounded-sm border border-border bg-muted/50 p-5 text-sm">
              <p className="eyebrow">Review</p>
              <p><span className="text-muted-foreground">Team:</span> {teamAddress}</p>
              <p><span className="text-muted-foreground">Close date:</span> {new Date(deadline).toLocaleString()}</p>
              <p><span className="text-muted-foreground">Condition:</span> {condition}</p>
              <p className="break-all"><span className="text-muted-foreground">Evidence URL:</span> {checkUrl}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              This submits two transactions: first the commitments are registered with the
              guardian, then the fund is opened. Both share one fund id.
            </p>

            <Button
              type="button"
              variant="gradient"
              className="w-full"
              onClick={createAndRegister}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Launching…
                </>
              ) : (
                "Launch raise"
              )}
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Team Address */}
          <div className="space-y-2">
            <Label htmlFor="teamAddress" className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Team wallet
            </Label>
            <Input
              id="teamAddress"
              type="text"
              placeholder="0x..."
              value={teamAddress}
              onChange={(e) => {
                setTeamAddress(e.target.value);
                setErrors({ ...errors, teamAddress: "" });
              }}
              className={errors.teamAddress ? "border-destructive" : ""}
            />
            {errors.teamAddress && (
              <p className="text-xs text-destructive">{errors.teamAddress}</p>
            )}
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Close date
            </Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                setErrors({ ...errors, deadline: "" });
              }}
              className={errors.deadline ? "border-destructive" : ""}
            />
            {errors.deadline && (
              <p className="text-xs text-destructive">{errors.deadline}</p>
            )}
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label htmlFor="condition" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Condition
            </Label>
            <Input
              id="condition"
              type="text"
              placeholder="e.g., Ships v1 and publishes a public changelog"
              value={condition}
              onChange={(e) => {
                setCondition(e.target.value);
                setErrors({ ...errors, condition: "" });
              }}
              className={errors.condition ? "border-destructive" : ""}
            />
            {errors.condition && (
              <p className="text-xs text-destructive">{errors.condition}</p>
            )}
          </div>

          {/* Check URL */}
          <div className="space-y-2">
            <Label htmlFor="checkUrl" className="flex items-center gap-2">
              <Link className="w-4 h-4 text-primary" />
              Evidence URL
            </Label>
            <Input
              id="checkUrl"
              type="url"
              placeholder="https://github.com/org/project"
              value={checkUrl}
              onChange={(e) => {
                setCheckUrl(e.target.value);
                setErrors({ ...errors, checkUrl: "" });
              }}
              className={errors.checkUrl ? "border-destructive" : ""}
            />
            {errors.checkUrl && (
              <p className="text-xs text-destructive">{errors.checkUrl}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              disabled={!kit || (isConnected && ghChecked && !ghHandle)}
            >
              Create Vault
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}