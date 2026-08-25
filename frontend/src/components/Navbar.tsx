"use client";

import Link from "next/link";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { ShieldCheck, Wallet } from "lucide-react";
import { studionet } from "genlayer-js/chains";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isWrongNetwork = isConnected && chainId !== studionet.id;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold tracking-tight text-white">GenArt<span className="text-primary">Auth</span></span>
        </Link>
        
        <div className="hidden md:flex items-center gap-6">
          <Link href="/submit" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Submit Artwork
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Leaderboard
          </Link>
          <Link href="/my-verifications" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            My Verifications
          </Link>
        </div>

        <div>
          {isConnected ? (
            <button
              onClick={() => {
                if (isWrongNetwork) {
                  switchChain({ chainId: studionet.id });
                } else {
                  disconnect();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                isWrongNetwork
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                  : "bg-secondary border-white/10 hover:bg-secondary/80"
              }`}
            >
              <Wallet className="w-4 h-4" />
              {isWrongNetwork
                ? isSwitching ? "Switching..." : "Switch to Studionet"
                : `${address?.slice(0, 6)}...${address?.slice(-4)}`}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.5)]"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
