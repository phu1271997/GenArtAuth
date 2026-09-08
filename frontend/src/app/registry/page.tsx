"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Award,
  BadgeCheck,
  ExternalLink,
  ShieldAlert,
  Copy as CopyIcon,
  CheckCircle,
  Library,
  Cpu,
} from "lucide-react";
import { GENLAYER_CONTRACT_ADDRESS, getGenLayerChain, explorerAddressUrl } from "@/config/contract";

interface RegistryRow {
  artwork_id: string;
  submitter: string;
  artwork_url: string;
  status: string;
  verdict: {
    verdict: string;
    action: string;
    confidence: number;
    earliest_source: string;
    matched_artwork_id?: string;
    reason: string;
  } | null;
  certificate_status: string;
  certificate_serial: number;
}

interface RegistryStats {
  total_artworks: number;
  originals: number;
  copies: number;
  certificates_issued: number;
  certificates_valid: number;
  certificates_revoked: number;
  treasury_slashed: number;
}

export default function Registry() {
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [stats, setStats] = useState<RegistryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "certified" | "copies">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createClient } = await import("genlayer-js");
        const chain = await getGenLayerChain((window as any).ethereum);
        const client = createClient({ chain });

        const [rawRegistry, rawStats] = await Promise.all([
          client.readContract({ address: GENLAYER_CONTRACT_ADDRESS, functionName: "getRegistry", args: [] }),
          client.readContract({ address: GENLAYER_CONTRACT_ADDRESS, functionName: "getRegistryStats", args: [] }),
        ]);

        const parsedRows: RegistryRow[] = typeof rawRegistry === "string" ? JSON.parse(rawRegistry) : (rawRegistry as any);
        const parsedStats: RegistryStats = typeof rawStats === "string" ? JSON.parse(rawStats) : (rawStats as any);
        setRows(Array.isArray(parsedRows) ? parsedRows : []);
        setStats(parsedStats);
      } catch (err) {
        console.error("Failed to load registry:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (filter === "certified") return r.certificate_status === "VALID";
    if (filter === "copies") return r.verdict?.verdict === "COPY";
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary mb-3">
          <Library className="w-3.5 h-3.5" /> On-Chain Provenance Registry
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Certified Artwork Registry</h1>
        <p className="text-gray-400 max-w-2xl">
          Every artwork the GenLayer validators have judged, and the on-chain Certificates of Authenticity
          they minted. Each new submission is cross-referenced against this corpus to detect re-mints of
          already-certified originals.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatTile label="Total Artworks" value={stats.total_artworks} icon={<Library className="w-4 h-4 text-primary" />} />
          <StatTile label="Certified Originals" value={stats.certificates_valid} icon={<BadgeCheck className="w-4 h-4 text-emerald-400" />} />
          <StatTile label="Copies Blocked" value={stats.copies} icon={<CopyIcon className="w-4 h-4 text-red-400" />} />
          <StatTile label="Certs Revoked" value={stats.certificates_revoked} icon={<ShieldAlert className="w-4 h-4 text-amber-400" />} />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {([
          ["all", "All"],
          ["certified", "Certified Originals"],
          ["copies", "Blocked Copies"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all ${
              filter === key
                ? "bg-primary text-white border-primary"
                : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <RegistrySkeleton />
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5">
          <Library className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Registry is empty</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            No artworks match this filter yet. Submit and verify an artwork to mint the first Certificate of Authenticity.
          </p>
          <Link href="/submit" className="inline-block mt-6 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all">
            + Verify New Artwork
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((row, idx) => (
            <motion.div
              key={row.artwork_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
              className={`glass-panel p-6 rounded-3xl border transition-all hover:-translate-y-1 ${
                row.certificate_status === "VALID"
                  ? "border-emerald-500/25"
                  : row.verdict?.verdict === "COPY"
                  ? "border-red-500/20"
                  : "border-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-semibold bg-white/5 px-2.5 py-1 rounded-md text-gray-300">
                  #{row.artwork_id}
                </span>
                {row.certificate_status === "VALID" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <Award className="w-3.5 h-3.5" /> Certificate #{row.certificate_serial}
                  </span>
                )}
                {row.certificate_status === "REVOKED" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-500/10 text-gray-300 text-xs font-bold border border-gray-500/30">
                    <ShieldAlert className="w-3.5 h-3.5" /> Revoked #{row.certificate_serial}
                  </span>
                )}
                {!row.certificate_status && row.verdict?.verdict === "COPY" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-300 text-xs font-bold border border-red-500/30">
                    <CopyIcon className="w-3.5 h-3.5" /> Copy Blocked
                  </span>
                )}
                {row.status !== "VERIFIED" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-bold border border-blue-500/30">
                    <Cpu className="w-3.5 h-3.5" /> {row.status}
                  </span>
                )}
              </div>

              <a
                href={row.artwork_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-white hover:text-primary transition-colors flex items-center gap-1.5 break-all mb-4"
              >
                {row.artwork_url} <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
              </a>

              {row.verdict && (
                <div className="flex items-center gap-4 mb-4 text-xs">
                  <span className={`inline-flex items-center gap-1 font-black ${row.verdict.verdict === "ORIGINAL" ? "text-green-400" : "text-red-400"}`}>
                    {row.verdict.verdict === "ORIGINAL" ? <CheckCircle className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                    {row.verdict.verdict}
                  </span>
                  <span className="text-gray-400">Confidence <strong className="text-white">{row.verdict.confidence}%</strong></span>
                  {row.verdict.matched_artwork_id && (
                    <Link href={`/certificate/${row.verdict.matched_artwork_id}`} className="text-red-300 underline hover:text-red-200">
                      copies #{row.verdict.matched_artwork_id}
                    </Link>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <a
                  href={explorerAddressUrl(row.submitter)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono text-gray-400 hover:text-primary break-all inline-flex items-center gap-1"
                >
                  {row.submitter.slice(0, 10)}…{row.submitter.slice(-6)}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                {row.certificate_status && (
                  <Link
                    href={`/certificate/${row.artwork_id}`}
                    className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" /> Certificate
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/5">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
        {icon} {label}
      </div>
      <div className="text-3xl font-black text-white">{value}</div>
    </div>
  );
}

function RegistrySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-label="Loading registry">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex justify-between">
            <div className="h-5 w-12 rounded bg-white/5 animate-pulse" />
            <div className="h-5 w-28 rounded-full bg-white/5 animate-pulse" />
          </div>
          <div className="h-4 w-3/4 rounded bg-white/5 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
          <div className="h-8 w-full rounded bg-white/5 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
