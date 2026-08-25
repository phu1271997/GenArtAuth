"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Award } from "lucide-react";
import { GENLAYER_CONTRACT_ADDRESS, getGenLayerChain } from "@/config/contract";

type ReputationTier = "TRUSTED" | "RELIABLE" | "NEUTRAL" | "SUSPECT" | "UNTRUSTED";

interface ReputationData {
  address: string;
  score: number;
  total_submissions: number;
  verified_stands: number;
  verdicts_overturned: number;
  successful_challenges: number;
  failed_challenges: number;
  tier: ReputationTier;
  initialized: boolean;
}

const TIER_STYLE: Record<ReputationTier, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  TRUSTED: {
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: <Award className="w-3.5 h-3.5" />,
    label: "Trusted",
  },
  RELIABLE: {
    color: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    label: "Reliable",
  },
  NEUTRAL: {
    color: "text-gray-300",
    bg: "bg-white/5",
    border: "border-white/10",
    icon: <Shield className="w-3.5 h-3.5" />,
    label: "Neutral",
  },
  SUSPECT: {
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    label: "Suspect",
  },
  UNTRUSTED: {
    color: "text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: <ShieldX className="w-3.5 h-3.5" />,
    label: "Untrusted",
  },
};

export function ReputationBadge({ address, compact = false }: { address?: string; compact?: boolean }) {
  const [rep, setRep] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("genlayer-js");
        const chain = await getGenLayerChain((window as any).ethereum);
        const client = createClient({ chain });
        const res: any = await client.readContract({
          address: GENLAYER_CONTRACT_ADDRESS,
          functionName: "getReputation",
          args: [address.toLowerCase()],
        });
        if (cancelled) return;
        const parsed: ReputationData = typeof res === "string" ? JSON.parse(res) : res;
        setRep(parsed);
      } catch (err) {
        console.warn("Reputation fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) return null;
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/5 text-gray-500 border border-white/10">
        <span className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
        Rep …
      </span>
    );
  }
  if (!rep) return null;

  const style = TIER_STYLE[rep.tier] ?? TIER_STYLE.NEUTRAL;

  if (compact) {
    return (
      <span
        title={`Reputation ${rep.score} · ${rep.verified_stands} verdicts stood · ${rep.successful_challenges} challenges won · ${rep.failed_challenges} lost`}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${style.bg} ${style.color} ${style.border} border`}
      >
        {style.icon} {style.label} · {rep.score}
      </span>
    );
  }

  return (
    <div className={`inline-flex flex-col gap-1 px-3 py-2 rounded-xl ${style.bg} ${style.color} border ${style.border}`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        {style.icon} {style.label} · score {rep.score}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-gray-300">
        <span>Submissions: {rep.total_submissions}</span>
        <span>Verdicts stood: {rep.verified_stands}</span>
        <span>Verdicts overturned: {rep.verdicts_overturned}</span>
        <span>Wins: {rep.successful_challenges}</span>
        <span>Losses: {rep.failed_challenges}</span>
        <span>Status: {rep.initialized ? "Active" : "Fresh"}</span>
      </div>
    </div>
  );
}
