"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { ReactNode } from "react";
import { createConfig, WagmiProvider, http } from "wagmi";
import { defineChain } from "viem";

const genLayerTestnet = defineChain({
  id: 2981,
  name: "GenLayer Testnet",
  nativeCurrency: { name: "GenLayer", symbol: "GEN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet.genlayer.network"] }, // Mock URL, adjust if needed
  },
  blockExplorers: {
    default: { name: "GenExplorer", url: "https://explorer.genlayer.network" },
  },
});

const config = createConfig({
  chains: [genLayerTestnet],
  transports: {
    [genLayerTestnet.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
