"use client";

/**
 * Wagmi + RainbowKit setup — styled for ShipGuard's lemon UI theme.
 *
 * Uses the same projectId as EFG so WalletConnect relay works out of the box.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { WagmiProvider } from "wagmi";
import { getDefaultWallets, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
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

/** Custom theme matching ShipGuard's lemon UI: lime #d4ff00 on black, smaller button */
const shipguardTheme = darkTheme({
  accentColor: "var(--primary, #d4ff00)",
  accentColorForeground: "#000",
  borderRadius: "large",
  // Override connect button size via custom CSS variables
  overlayBlur: "small",
} as any);

// Add custom CSS for smaller button
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --rk-font-size-caption: 11px;
      --rk-font-size-label: 12px;
      --rk-font-size-account-name: 12px;
    }
    [data-rk] .ju367vn { min-height: 36px; }
    [data-rk] .ju367v1d { font-size: 15px; }
  `;
  document.head.appendChild(style);
}

export function WagmiProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={shipguardTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}