"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const { createClient } = await import("genlayer-js");
        const client = createClient();
        
        const fetchedResults = [];
        // Scan for the first 10 artworks
        for (let i = 1; i <= 10; i++) {
          try {
            const res: any = await client.readContract({
              address: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS as `0x${string}`,
              functionName: "getVerificationResult",
              args: [String(i)]
            });
            if (res && res.artwork_id) {
              fetchedResults.push({
                id: res.artwork_id,
                url: res.artwork_url,
                status: res.status,
                verdict: res.verdict
              });
            }
          } catch (e) {
            // Stop when we hit an unassigned ID
            break;
          }
        }
        setResults(fetchedResults.reverse());
      } catch (err) {
        console.error("Failed to fetch dashboard results:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, []);
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Global Verifications</h1>
          <p className="text-gray-400">Live stream of AI authenticity checks on GenLayer.</p>
        </div>
        <Link href="/submit">
          <button className="px-6 py-2 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all border border-white/10">
            + New Verification
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : results.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl">
          <p className="text-gray-400">No verifications found on the network yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {results.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6"
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {item.status === "PROCESSING" ? (
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
                </div>
              ) : item.verdict?.authenticity === "ORIGINAL" ? (
                <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-destructive/20 border border-destructive/30 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6 text-destructive" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <span className="text-sm text-gray-400 font-mono">#{item.id}</span>
                <a href={item.url} target="_blank" rel="noreferrer" className="text-white font-medium truncate hover:text-primary transition-colors flex items-center gap-1">
                  {item.url.replace(/^https?:\/\//, '').split('/')[0]}... <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-sm text-gray-500">
                {item.status === "PROCESSING" 
                  ? "AI is currently crawling sources and analyzing the artwork..."
                  : `First seen: ${item.verdict?.first_appearance}`}
              </p>
            </div>

            {/* Verdict */}
            <div className="flex-shrink-0 flex items-center gap-4">
              {item.status === "PROCESSING" ? (
                <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20">
                  Processing
                </span>
              ) : (
                <>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 mb-1">Confidence</div>
                    <div className="font-mono text-white font-medium">{item.verdict?.confidence}%</div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
                    item.verdict?.authenticity === "ORIGINAL" 
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }`}>
                    {item.verdict?.authenticity}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        ))}
        </div>
      )}
    </div>
  );
}
