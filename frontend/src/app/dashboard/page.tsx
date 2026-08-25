"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  ShieldAlert, 
  AlertTriangle, 
  Scale, 
  Coins, 
  FileText, 
  History,
  ArrowRight,
  X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { GENLAYER_CONTRACT_ADDRESS, getGenLayerChain, getGenLayerProvider, explorerAddressUrl } from "@/config/contract";
import { ReputationBadge } from "@/components/ReputationBadge";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "disputed">("all");
  
  // Challenge Modal State
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [newEvidence, setNewEvidence] = useState("");
  const [isChallenging, setIsChallenging] = useState(false);
  const [isResolving, setIsResolving] = useState<string | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const { createClient } = await import("genlayer-js");
      const chain = await getGenLayerChain((window as any).ethereum);
      const client = createClient({ chain });
      const contractAddress = GENLAYER_CONTRACT_ADDRESS;
      
      const fetchedResults = [];
      // Scan for the first 15 artwork IDs
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
              // Try to fetch challenge details if applicable
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
                // Silently ignore if no challenge exists
              }

              fetchedResults.push({
                id: parsed.artwork_id,
                url: parsed.artwork_url,
                submitter: parsed.submitter,
                status: parsed.status,
                verdict: parsed.verdict,
                source_urls: parsed.source_urls,
                challenge: challenge
              });
            }
          }
        } catch {
          // Break loop on first missing sequential ID
          break;
        }
      }
      setResults(fetchedResults.reverse());
    } catch (err) {
      console.error("Failed to fetch dashboard results:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleAddEvidence = () => {
    if (newEvidence && !evidenceUrls.includes(newEvidence)) {
      setEvidenceUrls([...evidenceUrls, newEvidence]);
      setNewEvidence("");
    }
  };

  const handleRemoveEvidence = (url: string) => {
    setEvidenceUrls(evidenceUrls.filter(s => s !== url));
  };

  const submitChallenge = async () => {
    if (!selectedArtwork || !isConnected || !address) return;
    if (evidenceUrls.length === 0) {
      alert("Please provide at least one evidence URL.");
      return;
    }

    setIsChallenging(true);
    try {
      const { createClient } = await import("genlayer-js");
      const walletProvider = (window as any).ethereum;
      const chain = await getGenLayerChain(walletProvider);
      const client = createClient({
        chain,
        account: address as `0x${string}`,
        provider: getGenLayerProvider(walletProvider),
      });
      const contractAddress = GENLAYER_CONTRACT_ADDRESS;

      // Call payable challengeVerdict with 10 GEN stake
      const txHash = await client.writeContract({
        address: contractAddress,
        functionName: "challengeVerdict",
        args: [selectedArtwork.id, evidenceUrls],
        value: BigInt(10 * 10**18) // 10 GEN
      });

      alert(`Dispute successfully filed! Stake of 10 GEN locked. TxHash: ${txHash}`);
      setSelectedArtwork(null);
      setEvidenceUrls([]);
      fetchResults();
    } catch (error: any) {
      console.error(error);
      alert(`Dispute submission failed: ${error.message || "Please check your balance and connection."}`);
    } finally {
      setIsChallenging(false);
    }
  };

  const triggerResolve = async (artworkId: string) => {
    if (!address) {
      alert("Connect your wallet to resolve the dispute.");
      return;
    }
    setIsResolving(artworkId);
    try {
      const { createClient } = await import("genlayer-js");
      const walletProvider = (window as any).ethereum;
      const chain = await getGenLayerChain(walletProvider);
      const client = createClient({
        chain,
        account: address as `0x${string}`,
        provider: getGenLayerProvider(walletProvider),
      });
      const contractAddress = GENLAYER_CONTRACT_ADDRESS;

      const txHash = await client.writeContract({
        address: contractAddress,
        functionName: "resolveChallenge",
        args: [artworkId],
        value: BigInt(0)
      });

      alert(`Supreme AI Jury consensus execution completed! TxHash: ${txHash}`);
      fetchResults();
    } catch (error: any) {
      console.error(error);
      alert(`Resolution failed: ${error.message || "Check console for details."}`);
    } finally {
      setIsResolving(null);
    }
  };

  const filteredResults = results.filter(item => {
    if (activeTab === "disputed") {
      return item.status === "CHALLENGED" || item.challenge !== null;
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary mb-3">
            <Scale className="w-3.5 h-3.5" /> On-Chain Consensus & Dispute Registry
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Art Provenance & Disputes</h1>
          <p className="text-gray-400">Live feed of decentralized AI judgments, verification trials, and copyright battles.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/submit">
            <button className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              + Verify New Artwork
            </button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
            activeTab === "all"
              ? "text-white border-primary"
              : "text-gray-400 border-transparent hover:text-white"
          }`}
        >
          All Verifications ({results.length})
        </button>
        <button
          onClick={() => setActiveTab("disputed")}
          className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === "disputed"
              ? "text-white border-primary"
              : "text-gray-400 border-transparent hover:text-white"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Disputes & Challenges ({results.filter(r => r.status === "CHALLENGED" || r.challenge !== null).length})
        </button>
      </div>

      {/* Main Panel */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-400 text-sm">Querying GenLayer Intelligent State...</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-3xl border border-white/5">
          <Scale className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Records Found</h3>
          <p className="text-gray-400 max-w-md mx-auto">There are currently no verifications matching the selected filter on the GenLayer network.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredResults.map((item, idx) => {
            const hasChallenge = item.challenge !== null;
            const isChallenged = item.status === "CHALLENGED";
            const challengeStatus = item.challenge?.status;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`glass-panel p-8 rounded-3xl border transition-all ${
                  isChallenged 
                    ? "border-amber-500/30 bg-amber-950/5" 
                    : challengeStatus === "RESOLVED_OVERTURNED"
                    ? "border-red-500/30 bg-red-950/5"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                {/* Upper row: Header, Badges, Status */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold bg-white/5 px-2.5 py-1 rounded-md text-gray-300">
                        ID: #{item.id}
                      </span>
                      
                      {/* Status Badges */}
                      {item.status === "PENDING" && (
                        <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20">
                          Pending Verification
                        </span>
                      )}
                      {item.status === "PROCESSING" && (
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 animate-pulse">
                          Consensus Processing
                        </span>
                      )}
                      {isChallenged && (
                        <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold border border-amber-500/30 animate-pulse flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" /> Disputed / Challenged
                        </span>
                      )}
                      {item.status === "VERIFIED" && !hasChallenge && (
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Verified Secure
                        </span>
                      )}
                      {item.status === "VERIFIED" && challengeStatus === "RESOLVED_UPHELD" && (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Dispute Upheld (Original Safe)
                        </span>
                      )}
                      {item.status === "VERIFIED" && challengeStatus === "RESOLVED_OVERTURNED" && (
                        <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Verdict Overturned
                        </span>
                      )}
                    </div>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-lg font-bold text-white hover:text-primary transition-colors flex items-center gap-1.5 break-all"
                    >
                      {item.url} <ExternalLink className="w-4 h-4 flex-shrink-0 text-gray-500" />
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-end">
                    {/* Action buttons based on state */}
                    {item.status === "VERIFIED" && (
                      <button
                        onClick={() => setSelectedArtwork(item)}
                        className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Dispute Verdict (10 GEN)
                      </button>
                    )}

                    {isChallenged && (
                      <button
                        onClick={() => triggerResolve(item.id)}
                        disabled={isResolving === item.id}
                        className="px-5 py-2.5 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-white transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50"
                      >
                        {isResolving === item.id ? (
                          <>
                            <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></span>
                            Summoning AI Jury...
                          </>
                        ) : (
                          <>
                            <Scale className="w-3.5 h-3.5" /> Convene AI Jury
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid info details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Column 1: Details & Crawl sources */}
                  <div className="space-y-4 lg:col-span-1">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1.5">Submitted By</h4>
                      <a
                        href={explorerAddressUrl(item.submitter)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-mono text-gray-300 hover:text-primary break-all inline-flex items-center gap-1"
                      >
                        {item.submitter}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                      <div className="mt-2">
                        <ReputationBadge address={item.submitter} compact />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1.5">Historical Sources</h4>
                      <div className="flex flex-col gap-1">
                        {item.source_urls.map((src: string, idx: number) => (
                          <a 
                            key={idx} 
                            href={src} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" /> {src}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Column 2 & 3: Verdict & Timeline Analysis */}
                  <div className="lg:col-span-2 space-y-6">
                    {item.status === "PENDING" && (
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center">
                        <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2 animate-bounce" />
                        <h5 className="font-bold text-white mb-1">Awaiting Verification</h5>
                        <p className="text-xs text-gray-400">The verification request has been successfully submitted. Call verifyAuthenticity on GenLayer Studio or wait for the system to process the record.</p>
                      </div>
                    )}

                    {item.status === "PROCESSING" && (
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center">
                        <Scale className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
                        <h5 className="font-bold text-white mb-1">Decentralized Analysis Underway</h5>
                        <p className="text-xs text-gray-400">GenLayer validators are crawling metadata, querying the Wayback Machine API, and generating consensus verdicts.</p>
                      </div>
                    )}

                    {/* Verdict Display */}
                    {item.verdict && (
                      <div className="space-y-4">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                          
                          {/* Corner decoration based on verdict */}
                          <div className={`absolute top-0 right-0 w-24 h-24 blur-[40px] -z-10 opacity-30 ${
                            item.verdict.verdict === "ORIGINAL" ? "bg-green-500" : "bg-red-500"
                          }`} />

                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div>
                              <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">GenLayer Verdict</h4>
                              <span className={`text-xl font-black ${
                                item.verdict.verdict === "ORIGINAL" ? "text-green-400" : "text-red-400"
                              }`}>
                                {item.verdict.verdict}
                              </span>
                            </div>
                            <div className="text-right">
                              <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Consensus Confidence</h4>
                              <span className="font-mono font-bold text-lg text-white">
                                {item.verdict.confidence}%
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 mt-4">
                            <div>
                              <h5 className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                <History className="w-3.5 h-3.5 text-primary" /> Provenance Trail / Timeline Verdict
                              </h5>
                              <p className="text-xs text-gray-300 mt-1">
                                <strong className="text-gray-400">Earliest Source: </strong> 
                                <a href={item.verdict.earliest_source} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                                  {item.verdict.earliest_source || "None identified"}
                                </a>
                              </p>
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-primary" /> Verdict Rationale
                              </h5>
                              <p className="text-xs text-gray-300 leading-relaxed mt-1 bg-black/30 p-3 rounded-lg border border-white/5">
                                {item.verdict.reason}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Provenance Trail / Challenge history if available */}
                        {hasChallenge && (
                          <div className="bg-amber-950/10 p-5 rounded-2xl border border-amber-500/20 space-y-3">
                            <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4" /> Dispute Resolution Dossier
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-gray-500 font-bold uppercase block">Challenger Address</span>
                                <a
                                  href={explorerAddressUrl(item.challenge.challenger)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono text-gray-300 hover:text-primary break-all inline-flex items-center gap-1"
                                >
                                  {item.challenge.challenger}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                                <div className="mt-1.5">
                                  <ReputationBadge address={item.challenge.challenger} compact />
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500 font-bold uppercase block">Spam Penalty Lock (Stake)</span>
                                <span className="font-semibold text-white flex items-center gap-1">
                                  <Coins className="w-3.5 h-3.5 text-amber-500" /> 
                                  {Number(item.challenge.stake) / 10**18} GEN
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/5">
                              <span className="text-xs text-gray-400 font-bold block mb-1">New Evidence Crawled</span>
                              <div className="flex flex-col gap-1">
                                {item.challenge.evidence_urls.map((url: string, idx: number) => (
                                  <a 
                                    key={idx} 
                                    href={url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 truncate"
                                  >
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" /> {url}
                                  </a>
                                ))}
                              </div>
                            </div>

                            {/* Show dispute result */}
                            {challengeStatus !== "PENDING" && item.challenge.new_verdict && (
                              <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                                <div className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                                  <span className="text-xs text-gray-400 font-bold">Supreme AI Jury Verdict:</span>
                                  <span className={`text-xs font-black px-2.5 py-1 rounded-md ${
                                    challengeStatus === "RESOLVED_OVERTURNED" 
                                      ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  }`}>
                                    {challengeStatus === "RESOLVED_OVERTURNED" ? "OVERTURNED" : "UPHELD"}
                                  </span>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                  <span className="text-xs text-amber-400 font-bold block mb-1">Jury Joint Statement (Forensic, Provenance, Skeptic Perspectives)</span>
                                  <p className="text-xs text-gray-300 leading-relaxed italic">
                                    "{item.challenge.new_verdict.reason}"
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Challenge / Dispute Modal */}
      <AnimatePresence>
        {selectedArtwork && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArtwork(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-2xl p-8 rounded-3xl border border-white/15 relative z-10 space-y-6 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-10" />
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Dispute Authenticity Verdict</h3>
                    <p className="text-xs text-gray-400">File a challenge against the existing GenLayer verdict.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedArtwork(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning box */}
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 text-xs text-amber-400 leading-relaxed">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-500" />
                <div>
                  <strong className="block font-bold mb-0.5">IMPORTANT: Dispute Rules</strong>
                  Filing a dispute requires locking a **10 GEN stake**. If the Supreme AI Jury upholds the previous verdict, your stake is **forfeited**. If the jury overturns the verdict, your stake is **refunded plus a 5 GEN reward** for helping secure the network.
                </div>
              </div>

              {/* Artwork Summary */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-1 text-xs">
                <span className="text-gray-500 font-semibold block uppercase">Target Artwork URL</span>
                <span className="text-white font-mono break-all">{selectedArtwork.url}</span>
              </div>

              {/* Form Input */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-300 block">Add Fresh Evidence URLs</label>
                <p className="text-xs text-gray-500">Provide Behance, DeviantArt, Wayback snapshots, or blockchain provenance sources to convince the Jury.</p>
                
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newEvidence}
                    onChange={(e) => setNewEvidence(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEvidence())}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                    placeholder="https://original-art-platform.com/..."
                  />
                  <button
                    type="button"
                    onClick={handleAddEvidence}
                    className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-4 rounded-xl transition-colors text-xs font-bold"
                  >
                    Add
                  </button>
                </div>

                {/* Evidence Tags */}
                {evidenceUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {evidenceUrls.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-lg text-xs">
                        <span className="max-w-[220px] truncate">{url}</span>
                        <button type="button" onClick={() => handleRemoveEvidence(url)} className="text-gray-400 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedArtwork(null)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitChallenge}
                  disabled={isChallenging || !isConnected}
                  className="px-6 py-2.5 text-xs font-black rounded-xl bg-amber-500 hover:bg-amber-600 text-black transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isChallenging ? (
                    <>
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-black"></span>
                      Locking Stake...
                    </>
                  ) : (
                    <>
                      Lock Stake & File Dispute <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
