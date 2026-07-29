"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, ExternalLink, ShieldAlert, AlertTriangle, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GENLAYER_CONTRACT_ADDRESS, getGenLayerChain } from "@/config/contract";

export default function MyVerifications() {
  const { address, isConnected } = useAccount();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyResults = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const { createClient } = await import("genlayer-js");
      const chain = await getGenLayerChain((window as any).ethereum);
      const client = createClient({ chain });
      const contractAddress = GENLAYER_CONTRACT_ADDRESS;
      
      const fetchedResults = [];
      for (let i = 1; i <= 15; i++) {
        try {
          const res: any = await client.readContract({
            address: contractAddress,
            functionName: "getVerificationResult",
            args: [String(i)]
          });
          
          if (res) {
            const parsed = typeof res === "string" ? JSON.parse(res) : res;
            if (parsed && parsed.artwork_id) {
              // Ensure we match case insensitive
              if (parsed.submitter?.toLowerCase() === address.toLowerCase()) {
                // Try to fetch challenge if exists
                let challenge = null;
                try {
                  const challengeRes: any = await client.readContract({
                    address: contractAddress,
                    functionName: "getChallenge",
                    args: [String(i)]
                  });
                  if (challengeRes && challengeRes !== "") {
                    challenge = typeof challengeRes === "string" ? JSON.parse(challengeRes) : challengeRes;
                  }
                } catch {
                  // Ignore
                }

                fetchedResults.push({
                  id: parsed.artwork_id,
                  url: parsed.artwork_url,
                  status: parsed.status,
                  verdict: parsed.verdict,
                  challenge: challenge
                });
              }
            }
          }
        } catch {
          break;
        }
      }
      setResults(fetchedResults.reverse());
    } catch (err) {
      console.error("Failed to fetch my verifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchMyResults();
    } else {
      setLoading(false);
    }
  // The address and connection state are the only inputs to this initial fetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-32 flex flex-col items-center justify-center text-center">
        <Wallet className="w-16 h-16 text-gray-500 mb-6 animate-pulse" />
        <h2 className="text-3xl font-black text-white mb-2">Wallet Not Connected</h2>
        <p className="text-gray-400 mb-8 max-w-sm">Please connect your Web3 wallet to access your private verification registry and track historical disputes.</p>
        <button 
          onClick={() => {
            const connectBtn = document.querySelector('nav button');
            if (connectBtn) (connectBtn as HTMLButtonElement).click();
          }}
          className="px-8 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        >
          Connect Wallet Now
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">My Verifications</h1>
          <p className="text-gray-400">History of digital artworks you submitted for on-chain AI forensic audits.</p>
        </div>
        <Link href="/submit">
          <button className="px-6 py-3 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 border border-white/10 transition-all">
            + Submit New Art
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-400 text-sm">Querying your portfolio states...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5">
          <p className="text-gray-400 mb-6 text-lg">You haven't submitted any artworks for verification yet.</p>
          <Link href="/submit">
            <button className="px-8 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-[0_0_25px_rgba(139,92,246,0.4)]">
              Submit Your First Artwork
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {results.map((item, idx) => {
            const challengeStatus = item.challenge?.status;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className={`glass-panel p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center gap-6 justify-between ${
                  item.status === "CHALLENGED" 
                    ? "border-amber-500/20" 
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                {/* Left side: Icon & Info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 pt-1">
                    {item.status === "PROCESSING" ? (
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
                      </div>
                    ) : item.status === "CHALLENGED" ? (
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-amber-400 animate-bounce" />
                      </div>
                    ) : item.verdict?.verdict === "ORIGINAL" ? (
                      <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6 text-red-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-gray-500">#{item.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === "PENDING"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : item.status === "PROCESSING"
                          ? "bg-blue-500/15 text-blue-400"
                          : item.status === "CHALLENGED"
                          ? "bg-amber-500/15 text-amber-400"
                          : challengeStatus === "RESOLVED_OVERTURNED"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-green-500/15 text-green-400"
                      }`}>
                        {item.status === "VERIFIED" 
                          ? (challengeStatus ? `RESOLVED (${challengeStatus.replace("RESOLVED_", "")})` : "VERIFIED") 
                          : item.status}
                      </span>
                    </div>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-white font-bold truncate hover:text-primary transition-colors flex items-center gap-1 text-sm break-all"
                    >
                      {item.url} <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                    </a>
                    
                    <p className="text-xs text-gray-400 mt-2">
                      {item.status === "PROCESSING" 
                        ? "Supreme Consensus engine is working on cowering timeline facts..."
                        : item.status === "CHALLENGED"
                        ? "A dispute is active. Lock stakes are in place waiting for the Supreme AI Jury."
                        : `Action: ${item.verdict?.action.replace("_", " ")}`}
                    </p>
                  </div>
                </div>

                {/* Right side: Verdict Summary & Actions */}
                <div className="flex-shrink-0 w-full md:w-auto flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                  {item.status === "PROCESSING" ? (
                    <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 animate-pulse">
                      In Progress
                    </span>
                  ) : item.verdict ? (
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Confidence</div>
                        <div className="font-mono text-sm text-white font-bold">{item.verdict.confidence}%</div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <div className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Final Decision</div>
                        <span className={`px-4 py-1.5 rounded-xl text-xs font-black border ${
                          item.verdict.verdict === "ORIGINAL" 
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {item.verdict.verdict}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 italic">Not available</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
