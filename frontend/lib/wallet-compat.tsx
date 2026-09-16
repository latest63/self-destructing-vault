"use client";

/**
 * Thin compat wrapper so existing code using `useWallet()` keeps working after
 * switching from the hand-rolled WalletProvider to RainbowKit + wagmi.
 *
 * Exposes the same shape as the old hook (address, isConnected, isLoading,
 * connectWallet, disconnectWallet, switchWalletAccount, isMetaMaskInstalled,
 * isOnCorrectNetwork) but delegates the actual connection to RainbowKit.
 */

import { useContext, createContext, useMemo } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { GENLAYER_CHAIN_ID } from "@/lib/genlayer/network";

const CompatContext = createContext<{
  address: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isMetaMaskInstalled: boolean;
  isOnCorrectNetwork: boolean;
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  switchWalletAccount: () => Promise<void>;
}>({
  address: null,
  isConnected: false,
  isLoading: true,
  isMetaMaskInstalled: typeof window !== "undefined" && !!window.ethereum,
  isOnCorrectNetwork: false,
  connectWallet: async () => "",
  disconnectWallet: () => {},
  switchWalletAccount: async () => {},
});

export function useWallet() {
  const ctx = useContext(CompatContext);
  if (!ctx) throw new Error("useWallet must be used within a CompatProvider");
  return ctx;
}

export function CompatProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Pick MetaMask connector by default, fall back to first available
  const metaMaskConnector = useMemo(
    () => connectors.find((c) => c.id === "metaMask") ?? connectors[0],
    [connectors]
  );

  const isOnCorrectNetwork = chain?.id === GENLAYER_CHAIN_ID;

  return (
    <CompatContext.Provider
      value={{
        address: address ?? null,
        isConnected,
        isLoading: false,
        isMetaMaskInstalled: typeof window !== "undefined" && !!window.ethereum,
        isOnCorrectNetwork,
        connectWallet: async () => {
          if (!metaMaskConnector) throw new Error("No wallet connector found");
          await connectAsync({ connector: metaMaskConnector });
          return address ?? "";
        },
        disconnectWallet: () => disconnect(),
        switchWalletAccount: async () => {
          // MetaMask handles account switching via its UI
          if (typeof window !== "undefined" && window.ethereum) {
            await window.ethereum.request({ method: "eth_accounts" });
          }
        },
      }}
    >
      {children}
    </CompatContext.Provider>
  );
}
