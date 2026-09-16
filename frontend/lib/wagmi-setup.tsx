"use client";

/**
 * Wagmi + RainbowKit setup — copied from the Ecosystem Fund Guardian project.
 *
 * The EFG wiring lives in frontend/src/App.jsx and uses projectId
 * "7dbda9b31e7da7cb396ca5a5ae2f668e". ShipGuard reuses the same projectId
 * so the same WalletConnect relay infrastructure applies out of the box.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { WagmiProvider } from "wagmi";
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { studioDevnet } from "genlayer-js/chains";
import { GENLAYER_CHAIN } from "@/lib/genlayer/network";

// Use the GenLayer chain (Studio Next) instead of the pre-bundled preset.
const chains = [GENLAYER_CHAIN] as const;

const { connectors } = getDefaultWallets({
  appName: "ShipGuard",
  projectId: "7dbda9b31e7da7cb396ca5a5ae2f668e",
});

export const wagmiConfig = createConfig({
  chains,
  transports: {
    [studioDevnet.id]: http(),
  },
  connectors,
  ssr: true,
});

export const queryClient = new QueryClient();

export function WagmiProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
