"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Calendar, Users, ArrowLeft, Link } from "lucide-react";
import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useInvalidateVaultsData } from "@/lib/hooks/useVault";
import { GENLAYER_NETWORK, getVaultContractAddress } from "@/lib/genlayer/client";
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

  // Stable tx identity: useTransactionFlow re-estimates (and resets the flow)
  // whenever the tx object reference changes, so it must not be re-created on
  // unrelated re-renders while the panel is mounted.
  const createVaultTx = useMemo<SubmitInput>(
    () => ({
      kind: "write",
      address: vaultAddress as `0x${string}`,
      method: "create_vault",
      args: [teamAddress, deadlineTimestamp, condition, checkUrl],
    }),
    [vaultAddress, teamAddress, deadlineTimestamp, condition, checkUrl]
  );

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

  const handleDone = (status: TrackedStatus) => {
    if (status.successful !== false) {
      invalidateVaultsData();
      success("Vault created successfully!", {
        description: "Your vault has been created on the blockchain."
      });
      resetForm();
      setIsOpen(false);
      return;
    }

    error("Failed to create vault", {
      description: "The transaction completed without a successful outcome."
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="gradient" disabled={!isConnected || !address || isLoading}>
          <Plus className="w-4 h-4 mr-2" />
          Create Vault
        </Button>
      </DialogTrigger>
      <DialogContent className="brand-card border-2 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create Self-Destructing Vault</DialogTitle>
          <DialogDescription>
            Create a vault that releases funds based on conditions
          </DialogDescription>
        </DialogHeader>

        {step === "review" && kit && vaultAddress ? (
          <div className="mt-4 space-y-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setStep("form")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <GenLayerTransactionPanel
              kit={kit}
              tx={createVaultTx}
              network={GENLAYER_NETWORK.chainName}
              theme="dark"
              trackUntil="decided"
              onDone={handleDone}
            />
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
              Condition
            </Label>
            <Input
              id="condition"
              type="text"
              placeholder="e.g., Team wins the championship"
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
              Check URL
            </Label>
            <Input
              id="checkUrl"
              type="url"
              placeholder="https://example.com/verify"
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