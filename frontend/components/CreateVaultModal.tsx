"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Calendar, Users, ArrowLeft, Link, Loader2 } from "lucide-react";
import { createClient } from "genlayer-js";
import { useInvalidateVaultsData } from "@/lib/hooks/useVault";
import {
  GENLAYER_CHAIN,
  GENLAYER_NETWORK,
  getVaultContractAddress,
  getConditionContractAddress,
} from "@/lib/genlayer/client";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { error, success } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function CreateVaultModal() {
  const { isConnected, address, isLoading } = useWallet();
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

      success("Fund opened successfully!", {
        description: `Fund ${id} is live. Backers can now pledge GEN to it.`,
      });
      invalidateVaultsData();
      resetForm();
      setIsOpen(false);
    } catch (e: any) {
      error("Failed to open fund", {
        description: e?.message || "The transaction could not be submitted.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-close modal when wallet disconnects
  useEffect(() => {
    if (!isConnected && isOpen && step === "form") {
      setIsOpen(false);
    }
  }, [isConnected, isOpen, step]);

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
      error("Please connect your wallet first");
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="gradient" disabled={!isConnected || !address || isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          Open Fund
        </Button>
      </DialogTrigger>
      <DialogContent className="brand-card border-2 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Open an Ecosystem Fund</DialogTitle>
          <DialogDescription>
            Define the team's commitments, the check URL, and the deadline. Backers pledge; the AI settles it.
          </DialogDescription>
        </DialogHeader>

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

            <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
              <p className="font-semibold">Review</p>
              <p><span className="text-muted-foreground">Team:</span> {teamAddress}</p>
              <p><span className="text-muted-foreground">Deadline:</span> {new Date(deadline).toLocaleString()}</p>
              <p><span className="text-muted-foreground">Commitments:</span> {condition}</p>
              <p className="break-all"><span className="text-muted-foreground">Verification URL:</span> {checkUrl}</p>
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
                  Opening fund…
                </>
              ) : (
                "Confirm & Open Fund"
              )}
            </Button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Team Address */}
          <div className="space-y-2">
            <Label htmlFor="teamAddress" className="flex items-center gap-2">
              <Users className="w-4 h-4 !text-white" />
              Team Address
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
              <Calendar className="w-4 h-4 !text-white" />
              Deadline
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
              <Link className="w-4 h-4 !text-white" />
              Commitments
            </Label>
            <Input
              id="condition"
              type="text"
              placeholder="e.g., The project ships v1 and publishes a public changelog"
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
              <Link className="w-4 h-4 !text-white" />
              Verification URL
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
              disabled={!kit}
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