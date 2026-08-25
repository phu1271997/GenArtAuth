"use client";

import { motion } from "framer-motion";
import { Trophy, ShieldCheck, Sword, Users, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import {
  GENLAYER_CONTRACT_ADDRESS,
  getGenLayerChain,
  explorerAddressUrl,
} from "@/config/contract";

type Tier = "TRUSTED" | "RELIABLE" | "NEUTRAL" | "SUSPECT" | "UNTRUSTED";

interface ReputationRow {
  address: string;
  score: number;
  total_submissions: number;
  verified_stands: number;
  verdicts_overturned: number;
  successful_challenges: number;
  failed_challenges: number;
  tier: Tier;
  initialized: boolean;
}

const TIER_STYLE: Record<Tier, { color: string; bg: string; border: string; label: string }> = {
  TRUSTED: { color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Trusted" },
  RELIABLE: { color: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/30", label: "Reliable" },
  NEUTRAL: { color: "text-gray-300", bg: "bg-white/5", border: "border-white/10", label: "Neutral" },
  SUSPECT: { color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Suspect" },
  UNTRUSTED: { color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/30", label: "Untrusted" },
};

const SCAN_MAX_ID = 30;

export default function Leaderboard() {
  const [rows, setRows] = useState<ReputationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [treasury, setTreasury] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { createClient } = await import("genlayer-js");
      const chain = await getGenLayerChain((window as any).ethereum);
      const client = createClient({ chain });
      const contractAddress = GENLAYER_CONTRACT_ADDRESS;

      const uniqueAddrs = new Set<string>();

      for (let i = 1; i <= SCAN_MAX_ID; i++) {
        try {
          const res: any = await client.readContract({
            address: contractAddress,
            functionName: "getVerificationResult",
            args: [String(i)],
          });
          if (!res) break;
          const parsed = typeof res === "string" ? JSON.parse(res) : res;
          if (!parsed?.artwork_id) break;
          if (parsed.submitter) uniqueAddrs.add(String(parsed.submitter).toLowerCase());

          try {
            const cRes: any = await client.readContract({
              address: contractAddress,
              functionName: "getChallenge",
              args: [String(i)],
            });
            if (cRes && cRes !== "") {
              const c = typeof cRes === "string" ? JSON.parse(cRes) : cRes;
              if (c?.challenger) uniqueAddrs.add(String(c.challenger).toLowerCase());
            }
          } catch {
            /* no challenge */
          }
        } catch {
          break;
        }
      }

      try {
        const t: any = await client.readContract({
          address: contractAddress,
          functionName: "getTreasuryBalance",
          args: [],
        });
        const tParsed = typeof t === "string" ? JSON.parse(t) : t;
        if (tParsed?.treasury_slashed !== undefined) {
          setTreasury(Number(tParsed.treasury_slashed) / 10 ** 18);
        }
      } catch {
        /* view not present on old contract */
      }

      const collected: ReputationRow[] = [];
      for (const addr of Array.from(uniqueAddrs)) {
        try {
          const rep: any = await client.readContract({
            address: contractAddress,
            functionName: "getReputation",
            args: [addr],
          });
          const parsed: ReputationRow = typeof rep === "string" ? JSON.parse(rep) : rep;
          collected.push(parsed);
        } catch {
          /* skip */
        }
      }

      collected.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.verified_stands + b.successful_challenges - (a.verified_stands + a.successful_challenges);
      });
      setRows(collected);
    } catch (err) {
      console.error("Leaderboard load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const medal = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return `#${rank + 1}`;
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary mb-3">
            <Trophy className="w-3.5 h-3.5" /> On-Chain Reputation
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Trust Leaderboard</h1>
          <p className="text-gray-400 max-w-2xl">
            Ranked by on-chain reputation score computed from GenLayer's Optimistic Democracy verdicts.
            Score adjusts on every resolved challenge — submitters gain on verdicts that stand, challengers gain on successful overturns.
          </p>
        </div>
        <button
          onClick={load}
          className="px-5 py-2.5 rounded-xl bg-white/5 text-white text-sm font-bold hover:bg-white/10 border border-white/10 transition-all"
        >
          Refresh
        </button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatTile
          icon={<Users className="w-4 h-4 text-primary" />}
          label="Ranked participants"
          value={loading ? "…" : String(rows.length)}
        />
        <StatTile
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          label="Verdicts that stood"
          value={loading ? "…" : String(rows.reduce((sum, r) => sum + r.verified_stands, 0))}
        />
        <StatTile
          icon={<Sword className="w-4 h-4 text-amber-400" />}
          label="Treasury slashed (GEN)"
          value={treasury === null ? "—" : treasury.toFixed(2)}
        />
      </div>

      {loading ? (
        <LeaderboardSkeleton />
      ) : rows.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Reputation Records Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Submit an artwork or file a challenge to appear on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
          <div className="min-w-[720px]">
          <div className="grid grid-cols-12 gap-2 px-6 py-3 text-[10px] uppercase font-bold text-gray-500 border-b border-white/5">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">Address</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-center">Tier</div>
            <div className="col-span-3 text-right">Activity</div>
          </div>
          {rows.map((row, idx) => {
            const style = TIER_STYLE[row.tier] ?? TIER_STYLE.NEUTRAL;
            return (
              <motion.div
                key={row.address}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                className={`grid grid-cols-12 gap-2 items-center px-6 py-4 border-b border-white/5 last:border-b-0 ${
                  idx < 3 ? "bg-white/[0.02]" : ""
                }`}
              >
                <div className="col-span-1 font-mono font-bold text-white text-lg">{medal(idx)}</div>
                <div className="col-span-4 min-w-0">
                  <a
                    href={explorerAddressUrl(row.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-mono text-gray-200 hover:text-primary inline-flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{row.address}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
                <div className="col-span-2 text-right font-mono font-black text-white">{row.score}</div>
                <div className="col-span-2 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${style.bg} ${style.color} ${style.border} border`}
                  >
                    {style.label}
                  </span>
                </div>
                <div className="col-span-3 text-right text-[11px] text-gray-400 font-mono">
                  <div>
                    <span className="text-emerald-400">✓{row.verified_stands}</span>
                    {" · "}
                    <span className="text-red-400">✗{row.verdicts_overturned}</span>
                    {" · "}
                    <span className="text-sky-400">⚔{row.successful_challenges}</span>
                    {" · "}
                    <span className="text-amber-400">✗{row.failed_challenges}</span>
                  </div>
                  <div className="text-gray-500 mt-0.5">{row.total_submissions} submitted</div>
                </div>
              </motion.div>
            );
          })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-gray-500">{label}</div>
        <div className="text-xl font-black text-white font-mono">{value}</div>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
      <div className="overflow-x-auto">
      <div className="min-w-[720px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center px-6 py-4 border-b border-white/5 last:border-b-0">
          <div className="col-span-1">
            <div className="w-6 h-6 rounded bg-white/5 animate-pulse" />
          </div>
          <div className="col-span-4">
            <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
          </div>
          <div className="col-span-2">
            <div className="h-3 w-12 rounded bg-white/5 animate-pulse ml-auto" />
          </div>
          <div className="col-span-2">
            <div className="h-4 w-16 rounded bg-white/5 animate-pulse mx-auto" />
          </div>
          <div className="col-span-3">
            <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      ))}
      </div>
      </div>
    </div>
  );
}
