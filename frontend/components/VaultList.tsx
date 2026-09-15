"use client";

import { useMemo, useState } from "react";
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

  // Stable tx identity for release
  const releaseTx = useMemo<SubmitInput | null>(
    () =>
      actionVaultId && actionType === "release"
        ? {
            kind: "write",
            address: vaultAddress as `0x${string}`,
            method: "release",
            args: [actionVaultId],
          }
        : null,
    [vaultAddress, actionVaultId, actionType]
  );

  // Stable tx identity for refund
  const refundTx = useMemo<SubmitInput | null>(
    () =>
      actionVaultId && actionType === "refund"
        ? {
            kind: "write",
            address: vaultAddress as `0x${string}`,
            method: "refund",
            args: [actionVaultId],
          }
        : null,
    [vaultAddress, actionVaultId, actionType]
  );

  const handleAction = (vaultId: string, type: "deposit" | "release" | "refund") => {
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
      const actionName = actionType === "deposit" ? "Deposit" : actionType === "release" ? "Release" : "Refund";
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
          <p className="text-sm text-muted-foreground">Loading vaults...</p>
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
          <p className="text-destructive">Failed to load vaults. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!vaults || vaults.length === 0) {
    return (
      <div className="brand-card p-12">
        <div className="text-center space-y-3">
          <Vault className="w-16 h-16 mx-auto text-muted-foreground opacity-30" />
          <h3 className="text-xl font-bold">No Vaults Yet</h3>
          <p className="text-muted-foreground">
            Be the first to create a self-destructing vault!
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
              {actionType === "deposit" ? "Deposit to Vault" : actionType === "release" ? "Release Funds" : "Refund Funds"}
            </DialogTitle>
            <DialogDescription>
              Review the transaction details and approve.
            </DialogDescription>
          </DialogHeader>

          {kit && vaultAddress && actionVaultId && (
            <div className="mt-4">
              {actionType === "deposit" && depositTx && (
                <GenLayerTransactionPanel
                  kit={kit}
                  tx={depositTx}
                  network={GENLAYER_NETWORK.chainName}
                  theme="dark"
                  trackUntil="decided"
                  onDone={handleActionDone}
                />
              )}
              {actionType === "release" && releaseTx && (
                <GenLayerTransactionPanel
                  kit={kit}
                  tx={releaseTx}
                  network={GENLAYER_NETWORK.chainName}
                  theme="dark"
                  trackUntil="decided"
                  onDone={handleActionDone}
                />
              )}
              {actionType === "refund" && refundTx && (
                <GenLayerTransactionPanel
                  kit={kit}
                  tx={refundTx}
                  network={GENLAYER_NETWORK.chainName}
                  theme="dark"
                  trackUntil="decided"
                  onDone={handleActionDone}
                />
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
}

function VaultCard({ vault, currentAddress, isConnected, isWalletLoading, onAction, isActing, actionType }: VaultCardProps) {
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
            <h3 className="text-lg font-semibold">Vault #{vault.id}</h3>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Condition:</span>
              <p className="font-medium">{vault.condition}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Deadline:</span>
              <p className="font-medium">{deadlineDate.toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Team Address:</span>
              <div className="flex items-center gap-2">
                <AddressDisplay address={vault.team_address} maxLength={10} showCopy={true} />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Total Deposited:</span>
              <p className="font-medium text-accent">{formatAmount(vault.total_deposited)} GEN</p>
            </div>
          </div>

          {/* Verdict Display */}
          {vault.verdict !== undefined && vault.verdict !== null && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50">
              <span className="text-muted-foreground text-sm">Verdict: </span>
              <span className={`font-semibold ${vault.verdict ? "text-green-400" : "text-red-400"}`}>
                {vault.verdict ? "Condition Met" : "Condition Not Met"}
              </span>
            </div>
          )}

          {/* Check URL */}
          {vault.check_url && (
            <div className="mt-2">
              <a
                href={vault.check_url}
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
                    Depositing...
                  </>
                ) : (
                  "Deposit"
                )}
              </Button>

              {isPastDeadline && !vault.verdict && (
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
                    "Refund"
                  )}
                </Button>
              )}

              {vault.verdict && (
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
                    "Release"
                  )}
                </Button>
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