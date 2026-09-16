"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Vault, Clock, AlertCircle, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useVaults, useVaultContract, useInvalidateVaultsData } from "@/lib/hooks/useVault";
import { GENLAYER_NETWORK, getVaultContractAddress, getConditionContractAddress } from "@/lib/genlayer/client";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { error, success } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import type { Vault as VaultType } from "@/lib/contracts/types";

export function VaultList() {
  const contract = useVaultContract();
  const { data: vaults, isLoading, isError } = useVaults();
  const { address, isConnected, isLoading: isWalletLoading } = useWallet();
  const kit = useTransactionKit(address);
  const invalidateVaultsData = useInvalidateVaultsData();
  const vaultAddress = getVaultContractAddress();
  const [actionVaultId, setActionVaultId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"deposit" | "release" | "refund" | null>(null);

  // Stable tx identity for deposit
  const depositTx = useMemo<SubmitInput | null>(
    () =>
      actionVaultId && actionType === "deposit"
        ? {
            kind: "write",
            address: vaultAddress as `0x${string}`,
            method: "deposit",
            args: [actionVaultId],
            value: BigInt("1000000000000000000"), // 1 GEN in wei
          }
        : null,
    [vaultAddress, actionVaultId, actionType]
  );

  // Check URLs live on the ConditionGovernor, so resolve them per vault.
  const [conditionUrls, setConditionUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!contract || !vaults || vaults.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries: Record<string, string> = {};
      for (const v of vaults) {
        if (conditionUrls[v.id] !== undefined) continue;
        const c = await contract.getCondition(v.id).catch(() => null);
        if (c?.check_url) entries[v.id] = String(c.check_url);
      }
      if (!cancelled && Object.keys(entries).length > 0) {
        setConditionUrls((prev) => ({ ...prev, ...entries }));
      }
    })();
    return () => { cancelled = true; };
  }, [contract, vaults, conditionUrls]);

  // NOTE: release/refund are NOT routed through the Transaction Kit panel.
  //
  // Both methods emit outgoing transfers, which require a message-fee allocation
  // (fees.messageAllocations) declared at submission. SubmitInput has no `fees`
  // field and PolicyInput.overrides only covers FeesDistributionInput, so the
  // panel cannot express the allocation and those calls would always die with
  // `no_matching_allocation`. We call the contract client directly instead,
  // which uses estimateTransactionFeesForWrite to get the authoritative
  // allocation from the network.
  const [exitTxId, setExitTxId] = useState<string | null>(null);
  const [exitStatus, setExitStatus] = useState<string>("");

  const runExit = async (vaultId: string, type: "release" | "refund") => {
    if (!address) {
      error("Please connect your wallet to perform actions");
      return;
    }
    if (!contract) {
      error("Contract not available");
      return;
    }

    setActionVaultId(vaultId);
    setActionType(type);
    setExitStatus("Estimating fees…");

    try {
      const hash =
        type === "release"
          ? await contract.release(vaultId)
          : await contract.refund(vaultId);

      setExitTxId(hash);
      setExitStatus("Submitted — awaiting consensus…");
      success(`${type === "release" ? "Release" : "Refund"} submitted`, {
        description: "GenLayer validators are processing the transfer.",
      });
      invalidateVaultsData();

      setTimeout(() => {
        invalidateVaultsData();
        setActionVaultId(null);
        setActionType(null);
        setExitTxId(null);
        setExitStatus("");
      }, 8000);
    } catch (e: any) {
      error(`Failed to ${type}`, {
        description: e?.message || "The transaction could not be submitted.",
      });
      setActionVaultId(null);
      setActionType(null);
      setExitStatus("");
    }
  };

  const handleAction = (vaultId: string, type: "deposit" | "release" | "refund") => {
    if (type === "release" || type === "refund") {
      void runExit(vaultId, type);
      return;
    }

    if (!address) {
      error("Please connect your wallet to perform actions");
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

    setActionVaultId(vaultId);
    setActionType(type);
  };

  const handleActionDone = (status: TrackedStatus) => {
    if (status.successful !== false) {
      invalidateVaultsData();
      const actionName = actionType === "deposit" ? "Pledge" : actionType === "release" ? "Release" : "Refund";
      success(`${actionName} successful!`, {
        description: `The ${actionName.toLowerCase()} transaction has been completed.`
      });
      setActionVaultId(null);
      setActionType(null);
      return;
    }

    error(`Failed to ${actionType}`, {
      description: "The transaction completed without a successful outcome."
    });
  };

  if (isLoading) {
    return (
      <div className="brand-card p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">Loading funds...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="brand-card p-12">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-yellow-400 opacity-60" />
          <h3 className="text-xl font-bold">Setup Required</h3>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Contract addresses not configured.
            </p>
            <p className="text-sm text-muted-foreground">
              Please set <code className="bg-muted px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_VAULT_CONTRACT</code> and <code className="bg-muted px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_CONDITION_CONTRACT</code> in your .env file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="brand-card p-8">
        <div className="text-center">
          <p className="text-destructive">Failed to load funds. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!vaults || vaults.length === 0) {
    return (
      <div className="brand-card p-12">
        <div className="text-center space-y-3">
          <Vault className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
          <h3 className="text-xl font-bold">No Funds Yet</h3>
          <p className="text-muted-foreground">
            Be the first to open an ecosystem fund!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {vaults.map((vault) => (
          <VaultCard
            key={vault.id}
            vault={vault}
            checkUrl={conditionUrls[vault.id]}
            currentAddress={address}
            isConnected={isConnected}
            isWalletLoading={isWalletLoading}
            onAction={handleAction}
            isActing={actionVaultId === vault.id}
            actionType={actionVaultId === vault.id ? actionType : null}
          />
        ))}
      </div>

      <Dialog open={!!actionVaultId} onOpenChange={(open) => !open && setActionVaultId(null)}>
        <DialogContent className="brand-card border-2 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {actionType === "deposit" ? "Pledge Funds" : actionType === "release" ? "Release to Team" : "Refund Backers"}
            </DialogTitle>
            <DialogDescription>
              Review the transaction details and approve.
            </DialogDescription>
          </DialogHeader>

          {/* Only deposit uses the kit panel. release/refund are submitted
              directly via the contract client (see runExit) because they need
              a message fee allocation the panel cannot express. */}
          {kit && vaultAddress && actionVaultId && actionType === "deposit" && depositTx && (
            <div className="mt-4">
              <GenLayerTransactionPanel
                kit={kit}
                tx={depositTx}
                network={GENLAYER_NETWORK.chainName}
                theme="dark"
                trackUntil="decided"
                onDone={handleActionDone}
              />
            </div>
          )}

          {(actionType === "release" || actionType === "refund") && (
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-muted-foreground">{exitStatus}</p>
              {exitTxId && (
                <p className="break-all font-mono text-xs text-muted-foreground">
                  tx: {exitTxId}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface VaultCardProps {
  vault: VaultType;
  currentAddress: string | null;
  isConnected: boolean;
  isWalletLoading: boolean;
  onAction: (vaultId: string, type: "deposit" | "release" | "refund") => void;
  isActing: boolean;
  actionType: "deposit" | "release" | "refund" | null;
  checkUrl?: string;
}

function VaultCard({ vault, checkUrl, currentAddress, isConnected, isWalletLoading, onAction, isActing, actionType }: VaultCardProps) {
  const isCreator = currentAddress?.toLowerCase() === vault.creator?.toLowerCase();
  const isActive = vault.status === "active";
  const isReleased = vault.status === "released";
  const isRefunded = vault.status === "refunded";
  const deadlineDate = new Date(parseInt(vault.deadline) * 1000);
  const isPastDeadline = deadlineDate < new Date();

  const formatAmount = (weiString: string) => {
    try {
      const wei = BigInt(weiString);
      const gen = Number(wei) / 1e18;
      return gen.toFixed(4);
    } catch {
      return "0.0000";
    }
  };

  const getStatusBadge = () => {
    if (isReleased) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Released
        </Badge>
      );
    }
    if (isRefunded) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" />
          Refunded
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  };

  return (
    <div className="brand-card p-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        {/* Vault Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Fund #{vault.id}</h3>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Commitments:</span>
              <p className="font-medium">{vault.condition}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Settlement Deadline:</span>
              <p className="font-medium">{deadlineDate.toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Receiving Team:</span>
              <div className="flex items-center gap-2">
                <AddressDisplay address={vault.team_address} maxLength={10} showCopy={true} />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Total Pledged:</span>
              <p className="font-medium text-accent">{formatAmount(vault.total_deposited)} GEN</p>
            </div>
          </div>

          {/* Verdict Display */}
          {/* Verdict — string ("success" | "failure" | "") per contract */}
          {vault.verdict && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground text-sm">Verdict: </span>
              <span className={`font-semibold ${vault.verdict === "success" ? "text-green-400" : "text-red-400"}`}>
                {vault.verdict === "success" ? "Commitments Met — releases to team" : "Commitments Missed — refunds backers"}
              </span>
              {vault.verdict_reason && (
                <p className="mt-1 text-xs text-muted-foreground">{vault.verdict_reason}</p>
              )}
            </div>
          )}

          {/* Check URL lives on the ConditionGovernor, not the vault */}
          {checkUrl && (
            <div className="mt-2">
              <a
                href={checkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View Condition Check
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 min-w-[120px]">
          {isActive && (
            <>
              <Button
                onClick={() => onAction(vault.id, "deposit")}
                disabled={!isConnected || isWalletLoading || isActing}
                size="sm"
                variant="gradient"
                className="w-full"
              >
                {isActing && actionType === "deposit" ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Pledging...
                  </>
                ) : (
                  "Pledge"
                )}
              </Button>

              {/* The fork: condition met -> release to team; otherwise -> refund depositors.
                  Previously this showed "Release" for any truthy verdict, including
                  "failure", so a failed condition offered a button that could never work. */}
              {vault.verdict === "success" ? (
                <Button
                  onClick={() => onAction(vault.id, "release")}
                  disabled={!isConnected || isWalletLoading || isActing}
                  size="sm"
                  variant="default"
                  className="w-full"
                >
                  {isActing && actionType === "release" ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Releasing...
                    </>
                  ) : (
                    "Release to Team"
                  )}
                </Button>
              ) : (
                (vault.verdict === "failure" || isPastDeadline) && (
                  <Button
                    onClick={() => onAction(vault.id, "refund")}
                    disabled={!isConnected || isWalletLoading || isActing}
                    size="sm"
                    variant="secondary"
                    className="w-full"
                  >
                    {isActing && actionType === "refund" ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Refunding...
                      </>
                    ) : (
                      "Refund Backers"
                    )}
                  </Button>
                )
              )}
            </>
          )}

          {isCreator && (
            <Badge variant="secondary" className="text-xs">
              Creator
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}