"use client";

import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";
import { Loader2, Wallet, LogOut } from "lucide-react";

interface WalletConnectButtonProps {
  /** Override the disconnected label (e.g. "Back a raise" in the hero). */
  cta?: string;
  className?: string;
}

export function WalletConnectButton({
  cta = "Connect Wallet",
  className,
}: WalletConnectButtonProps) {
  const {
    address,
    isConnected,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
  } = useWallet();

  if (isLoading) {
    return (
      <Button variant="secondary" disabled className={className}>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-2 ${className ?? ""}`}>
        <Button variant="secondary" onClick={switchWalletAccount} size="sm">
          <Wallet className="w-4 h-4 mr-2" />
          {address.slice(0, 6)}...{address.slice(-4)}
        </Button>
        <Button variant="outline" onClick={disconnectWallet} size="sm">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={connectWallet} className={className}>
      <Wallet className="w-4 h-4 mr-2" />
      {cta}
    </Button>
  );
}
