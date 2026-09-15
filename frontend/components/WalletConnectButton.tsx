"use client";

import { useWallet } from "@/lib/genlayer/wallet";
import { Button } from "./ui/button";
import { Loader2, Wallet, LogOut } from "lucide-react";

export function WalletConnectButton() {
  const { 
    address, 
    isConnected, 
    isLoading, 
    connectWallet, 
    disconnectWallet, 
    switchWalletAccount 
  } = useWallet();

  if (isLoading) {
    return (
      <Button variant="secondary" disabled>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
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
    <Button variant="gradient" onClick={connectWallet}>
      <Wallet className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  );
}