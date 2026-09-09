"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  Scale,
  Coins,
  FileText,
  ShieldCheck,
  ShieldAlert,
  BadgeCheck,
  Plus,
  ExternalLink,
  Gavel,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  GENLAYER_CONTRACT_ADDRESS,
  getGenLayerChain,
  getGenLayerProvider,
  explorerAddressUrl,
} from "@/config/contract";
import { extractContractError } from "@/lib/errors";

const WEI = BigInt(10) ** BigInt(18);
const DISPUTE_STAKE_GEN = 5;
const toGen = (wei: number | string) => Number(wei) / 1e18;

interface License {
  license_id: string;
  artwork_id: string;
  rights_holder: string;
  terms: string;
  price: number;
  bond: number;
  active: boolean;
}
interface Grant {
  grant_id: string;
  license_id: string;
  artwork_id: string;
  licensee: string;
  usage_url: string;
  bond_locked: number;
  status: string;
  verdict: { verdict: string; severity: number; reason: string } | null;
}
interface Stats {
  total_licenses: number;
  total_grants: number;
  violations: number;
  compliant: number;
  royalties_paid: number;
}
interface OwnedCert {
  artwork_id: string;
  artwork_url: string;
}

export default function Licenses() {
  const { address, isConnected } = useAccount();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [grants, setGrants] = useState<Record<string, Grant[]>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [ownedCerts, setOwnedCerts] = useState<OwnedCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Issue-license form
  const [issueArtwork, setIssueArtwork] = useState("");
  const [terms, setTerms] = useState("");
  const [priceGen, setPriceGen] = useState("10");
  const [bondGen, setBondGen] = useState("5");

  // Purchase form (per-license usage url)
  const [usageUrl, setUsageUrl] = useState<Record<string, string>>({});
  // Review form (per-grant evidence url)
  const [evidenceUrl, setEvidenceUrl] = useState<Record<string, string>>({});

  const readClient = useCallback(async () => {
    const { createClient } = await import("genlayer-js");
    const chain = await getGenLayerChain((window as any).ethereum);
    return createClient({ chain });
  }, []);

  const writeClient = useCallback(async () => {
    const { createClient } = await import("genlayer-js");
    const walletProvider = (window as any).ethereum;
    const chain = await getGenLayerChain(walletProvider);
    return createClient({
      chain,
      account: address as `0x${string}`,
      provider: getGenLayerProvider(walletProvider),
    });
  }, [address]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const client = await readClient();
      const rd = (fn: string, args: any[] = []) =>
        client.readContract({ address: GENLAYER_CONTRACT_ADDRESS, functionName: fn, args });

      const [rawMarket, rawStats] = await Promise.all([
        rd("getLicenseMarketplace"),
        rd("getLicenseStats"),
      ]);
      const market: License[] = typeof rawMarket === "string" ? JSON.parse(rawMarket) : (rawMarket as any);
      setLicenses(Array.isArray(market) ? market : []);
      setStats(typeof rawStats === "string" ? JSON.parse(rawStats) : (rawStats as any));

      // Grants per license
      const grantMap: Record<string, Grant[]> = {};
      await Promise.all(
        (market || []).map(async (lic) => {
          try {
            const raw = await rd("getGrantsForLicense", [lic.license_id]);
            grantMap[lic.license_id] = typeof raw === "string" ? JSON.parse(raw) : (raw as any);
          } catch {
            grantMap[lic.license_id] = [];
          }
        })
      );
      setGrants(grantMap);

      // Owned certified originals (for the issue form)
      if (address) {
        try {
          const rawReg = await rd("getRegistry");
          const rows = typeof rawReg === "string" ? JSON.parse(rawReg) : rawReg;
          const mine = (rows || [])
            .filter((r: any) => r.certificate_status === "VALID" && r.submitter?.toLowerCase() === address.toLowerCase())
            .map((r: any) => ({ artwork_id: r.artwork_id, artwork_url: r.artwork_url }));
          setOwnedCerts(mine);
          if (mine.length && !issueArtwork) setIssueArtwork(mine[0].artwork_id);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error("Failed to load licenses:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, readClient]);

  useEffect(() => {
    load();
  }, [load]);

  const issueLicense = async () => {
    if (!isConnected || !address) return alert("Connect your wallet.");
    if (!issueArtwork || !terms.trim()) return alert("Pick a certified artwork and enter terms.");
    setBusy("issue");
    try {
      const client = await writeClient();
      const tx = await client.writeContract({
        address: GENLAYER_CONTRACT_ADDRESS,
        functionName: "createLicense",
        args: [issueArtwork, terms, BigInt(Math.round(Number(priceGen) * 1e18)), BigInt(Math.round(Number(bondGen) * 1e18))],
        value: BigInt(0),
      });
      alert(`License created! TxHash: ${tx}`);
      setTerms("");
      load();
    } catch (e) {
      alert(`Create license failed: ${extractContractError(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const purchase = async (lic: License) => {
    if (!isConnected || !address) return alert("Connect your wallet.");
    const url = usageUrl[lic.license_id];
    if (!url) return alert("Enter the usage URL where you will use the work.");
    setBusy(`buy-${lic.license_id}`);
    try {
      const client = await writeClient();
      const value = BigInt(Math.round(lic.price)) + BigInt(Math.round(lic.bond));
      const tx = await client.writeContract({
        address: GENLAYER_CONTRACT_ADDRESS,
        functionName: "purchaseLicense",
        args: [lic.license_id, url],
        value,
      });
      alert(`License purchased! Royalty paid, compliance bond locked. TxHash: ${tx}`);
      setUsageUrl((s) => ({ ...s, [lic.license_id]: "" }));
      load();
    } catch (e) {
      alert(`Purchase failed: ${extractContractError(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const review = async (grant: Grant) => {
    if (!isConnected || !address) return alert("Connect your wallet.");
    setBusy(`review-${grant.grant_id}`);
    try {
      const client = await writeClient();
      const ev = evidenceUrl[grant.grant_id];
      const tx = await client.writeContract({
        address: GENLAYER_CONTRACT_ADDRESS,
        functionName: "reviewLicenseCompliance",
        args: [grant.grant_id, ev ? [ev] : [grant.usage_url]],
        value: BigInt(DISPUTE_STAKE_GEN) * WEI,
      });
      alert(`Compliance review consensus completed! TxHash: ${tx}`);
      load();
    } catch (e) {
      alert(`Review failed: ${extractContractError(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary mb-3">
          <Scale className="w-3.5 h-3.5" /> Licensing & Royalty Marketplace
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Licenses & AI Compliance</h1>
        <p className="text-gray-400 max-w-2xl">
          Rights holders license their certified originals for GEN. When a licensee&apos;s real-world usage is disputed,
          GenLayer validators read the actual usage page and judge it against the written license terms on-chain.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <StatTile label="Licenses" value={stats.total_licenses} icon={<FileText className="w-4 h-4 text-primary" />} />
          <StatTile label="Purchases" value={stats.total_grants} icon={<Coins className="w-4 h-4 text-sky-400" />} />
          <StatTile label="Violations" value={stats.violations} icon={<XCircle className="w-4 h-4 text-red-400" />} />
          <StatTile label="Compliant" value={stats.compliant} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} />
          <StatTile label="Royalties (GEN)" value={toGen(stats.royalties_paid)} icon={<BadgeCheck className="w-4 h-4 text-amber-400" />} />
        </div>
      )}

      {/* Issue a license */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 mb-10">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Issue a License
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          You can license only artworks you submitted that hold a VALID Certificate of Authenticity.
        </p>
        {!isConnected ? (
          <div className="text-sm text-amber-300">Connect your wallet to issue a license.</div>
        ) : ownedCerts.length === 0 ? (
          <div className="text-sm text-gray-400">
            No certified originals under this wallet yet. <Link href="/submit" className="text-primary underline">Verify one first</Link>.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 block mb-1">Certified artwork</label>
              <select
                value={issueArtwork}
                onChange={(e) => setIssueArtwork(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                {ownedCerts.map((c) => (
                  <option key={c.artwork_id} value={c.artwork_id}>
                    #{c.artwork_id} — {c.artwork_url.slice(0, 48)}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Price (GEN)</label>
                  <input value={priceGen} onChange={(e) => setPriceGen(e.target.value)} type="number" min="0"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-1">Compliance bond (GEN)</label>
                  <input value={bondGen} onChange={(e) => setBondGen(e.target.value)} type="number" min="0"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-400 block mb-1">License terms (the AI judges usage against this)</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
                placeholder="e.g. Non-commercial use only. Attribution to the artist required. No modifications or derivatives."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 resize-none"
              />
              <button
                onClick={issueLicense}
                disabled={busy === "issue"}
                className="mt-3 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {busy === "issue" ? "Creating..." : "Create License"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Marketplace */}
      <h2 className="text-lg font-bold text-white mb-4">Marketplace</h2>
      {loading ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5 text-gray-400">Loading licenses…</div>
      ) : licenses.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No licenses yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">Certify an artwork, then issue the first license above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {licenses.map((lic, idx) => {
            const isHolder = address && lic.rights_holder.toLowerCase() === address.toLowerCase();
            const licGrants = grants[lic.license_id] || [];
            return (
              <motion.div
                key={lic.license_id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
                className="glass-panel p-6 rounded-3xl border border-white/5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold bg-white/5 px-2.5 py-1 rounded-md text-gray-300">License #{lic.license_id}</span>
                    <Link href={`/certificate/${lic.artwork_id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5" /> Certified artwork #{lic.artwork_id}
                    </Link>
                    {isHolder && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">You own this</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-white font-bold flex items-center gap-1"><Coins className="w-4 h-4 text-amber-400" /> {toGen(lic.price)} GEN</span>
                    <span className="text-gray-400 text-xs">+ {toGen(lic.bond)} GEN bond</span>
                  </div>
                </div>

                <p className="text-xs text-gray-300 bg-black/30 p-3 rounded-lg border border-white/5 mb-4">
                  <FileText className="w-3.5 h-3.5 inline mr-1 text-primary" /> {lic.terms}
                </p>

                <div className="flex items-center justify-between gap-3 mb-4">
                  <a href={explorerAddressUrl(lic.rights_holder)} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-gray-400 hover:text-primary inline-flex items-center gap-1">
                    holder {lic.rights_holder.slice(0, 10)}…{lic.rights_holder.slice(-6)} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Purchase */}
                {!isHolder && lic.active && (
                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      value={usageUrl[lic.license_id] || ""}
                      onChange={(e) => setUsageUrl((s) => ({ ...s, [lic.license_id]: e.target.value }))}
                      placeholder="https://your-site.example/where-you-use-it"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500"
                    />
                    <button
                      onClick={() => purchase(lic)}
                      disabled={busy === `buy-${lic.license_id}`}
                      className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      {busy === `buy-${lic.license_id}` ? "Purchasing..." : `Purchase (${toGen(lic.price) + toGen(lic.bond)} GEN)`}
                    </button>
                  </div>
                )}

                {/* Grants */}
                {licGrants.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                    <h4 className="text-xs font-bold uppercase text-gray-500">Purchased usages</h4>
                    {licGrants.map((g) => (
                      <div key={g.grant_id} className="bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <a href={g.usage_url} target="_blank" rel="noreferrer" className="text-xs text-gray-200 hover:text-primary inline-flex items-center gap-1 break-all">
                            {g.usage_url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          <GrantBadge status={g.status} />
                        </div>
                        {g.verdict && (
                          <p className="text-[11px] text-gray-300 mt-2 italic bg-black/30 p-2 rounded border border-white/5">
                            AI: <strong className={g.verdict.verdict === "VIOLATION" ? "text-red-300" : "text-emerald-300"}>{g.verdict.verdict}</strong>
                            {g.verdict.verdict === "VIOLATION" && ` (severity ${g.verdict.severity})`} — {g.verdict.reason}
                          </p>
                        )}
                        {isHolder && g.status === "ACTIVE" && (
                          <div className="flex flex-col sm:flex-row gap-2 mt-3">
                            <input
                              value={evidenceUrl[g.grant_id] || ""}
                              onChange={(e) => setEvidenceUrl((s) => ({ ...s, [g.grant_id]: e.target.value }))}
                              placeholder="Optional extra evidence URL"
                              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white placeholder-gray-500"
                            />
                            <button
                              onClick={() => review(g)}
                              disabled={busy === `review-${g.grant_id}`}
                              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-600 transition-all disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Gavel className="w-3.5 h-3.5" /> {busy === `review-${g.grant_id}` ? "AI reviewing..." : `Review compliance (${DISPUTE_STAKE_GEN} GEN)`}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GrantBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    ACTIVE: { cls: "bg-sky-500/10 text-sky-300 border-sky-500/30", icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "Active" },
    REVIEWING: { cls: "bg-blue-500/10 text-blue-300 border-blue-500/30", icon: <Gavel className="w-3.5 h-3.5" />, label: "Reviewing" },
    COMPLIANT: { cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Compliant" },
    VIOLATION: { cls: "bg-red-500/10 text-red-300 border-red-500/30", icon: <ShieldAlert className="w-3.5 h-3.5" />, label: "Violation" },
  };
  const s = map[status] || map.ACTIVE;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/5">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">{icon} {label}</div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}
