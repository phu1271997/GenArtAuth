"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  Award,
  BadgeCheck,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  Clock,
  ArrowLeft,
  Link2,
} from "lucide-react";
import {
  GENLAYER_CONTRACT_ADDRESS,
  getGenLayerChain,
  explorerAddressUrl,
} from "@/config/contract";

interface Certificate {
  serial: number;
  artwork_id: string;
  submitter: string;
  artwork_url: string;
  earliest_source: string;
  confidence: number;
  certificate_hash: string;
  status: string;
}

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [cert, setCert] = useState<Certificate | null>(null);
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { createClient } = await import("genlayer-js");
        const chain = await getGenLayerChain((window as any).ethereum);
        const client = createClient({ chain });

        const rawCert = await client.readContract({
          address: GENLAYER_CONTRACT_ADDRESS,
          functionName: "getCertificate",
          args: [id],
        });
        if (rawCert && rawCert !== "") {
          setCert(typeof rawCert === "string" ? JSON.parse(rawCert) : (rawCert as any));
        }

        // Pull the verdict rationale for context.
        try {
          const rawRes = await client.readContract({
            address: GENLAYER_CONTRACT_ADDRESS,
            functionName: "getVerificationResult",
            args: [id],
          });
          const parsed = typeof rawRes === "string" ? JSON.parse(rawRes) : rawRes;
          if (parsed?.verdict?.reason) setReason(parsed.verdict.reason);
        } catch {
          /* rationale is optional */
        }
      } catch (err) {
        console.error("Failed to load certificate:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="glass-panel p-12 rounded-3xl border border-white/5 space-y-6 animate-pulse">
          <div className="h-8 w-2/3 rounded bg-white/5" />
          <div className="h-4 w-1/2 rounded bg-white/5" />
          <div className="h-40 w-full rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-3xl text-center">
        <div className="glass-panel p-16 rounded-3xl border border-white/5">
          <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">No Certificate for Artwork #{id}</h1>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            A Certificate of Authenticity is minted only when the GenLayer validators verify an artwork as
            ORIGINAL. This artwork was either flagged as a copy, or has not been verified yet.
          </p>
          <Link href="/registry" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Registry
          </Link>
        </div>
      </div>
    );
  }

  const isValid = cert.status === "VALID";

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Link href="/registry" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Registry
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`relative glass-panel rounded-[2rem] border overflow-hidden ${
          isValid ? "border-emerald-500/30" : "border-gray-500/30"
        }`}
      >
        {/* Glow */}
        <div className={`absolute top-0 right-0 w-64 h-64 blur-[100px] -z-10 opacity-30 ${isValid ? "bg-emerald-500" : "bg-gray-500"}`} />

        {/* Ribbon header */}
        <div className={`px-8 py-6 border-b ${isValid ? "border-emerald-500/20 bg-emerald-500/5" : "border-gray-500/20 bg-gray-500/5"}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl border ${isValid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-gray-500/10 border-gray-500/30 text-gray-300"}`}>
                {isValid ? <Award className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white leading-tight">Certificate of Authenticity</h1>
                <p className="text-sm text-gray-400">GenArtAuth · GenLayer Studionet</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase font-bold">Serial</div>
              <div className="text-3xl font-black text-white">#{cert.serial}</div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Status */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${
            isValid
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-gray-500/10 text-gray-300 border-gray-500/30"
          }`}>
            {isValid ? <BadgeCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {isValid ? "VALID — verdict stands" : "REVOKED — overturned on dispute"}
          </div>

          {/* Artwork */}
          <Field label="Certified Artwork" icon={<ShieldCheck className="w-4 h-4 text-primary" />}>
            <a href={cert.artwork_url} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all inline-flex items-center gap-1">
              {cert.artwork_url} <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
          </Field>

          {/* Earliest source */}
          <Field label="Earliest Verified Appearance" icon={<Clock className="w-4 h-4 text-primary" />}>
            {cert.earliest_source ? (
              <a href={cert.earliest_source} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all inline-flex items-center gap-1">
                {cert.earliest_source} <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            ) : (
              <span className="text-gray-500">Not identified</span>
            )}
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Issued to */}
            <Field label="Issued To (Submitter)" icon={<ShieldCheck className="w-4 h-4 text-primary" />}>
              <a href={explorerAddressUrl(cert.submitter)} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-primary font-mono text-xs break-all inline-flex items-center gap-1">
                {cert.submitter} <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </Field>

            {/* Confidence */}
            <Field label="Consensus Confidence" icon={<Award className="w-4 h-4 text-primary" />}>
              <span className="text-2xl font-black text-white">{cert.confidence}%</span>
            </Field>
          </div>

          {/* Hash */}
          <Field label="Deterministic Fingerprint (sha256)" icon={<Fingerprint className="w-4 h-4 text-primary" />}>
            <code className="block text-[11px] font-mono text-gray-300 bg-black/40 p-3 rounded-lg border border-white/5 break-all">
              {cert.certificate_hash}
            </code>
          </Field>

          {/* Rationale */}
          {reason && (
            <Field label="Jury Rationale (Forensic · Provenance · Skeptic · Registry)" icon={<ShieldCheck className="w-4 h-4 text-primary" />}>
              <p className="text-xs text-gray-300 leading-relaxed italic bg-black/30 p-3 rounded-lg border border-white/5">&ldquo;{reason}&rdquo;</p>
            </Field>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
            <button
              onClick={copyLink}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 transition-all flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" /> {copied ? "Link copied!" : "Copy shareable link"}
            </button>
            <a
              href={explorerAddressUrl(GENLAYER_CONTRACT_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Verify contract on Explorer
            </a>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            This certificate is stored on-chain in a GenLayer Intelligent Contract on Studionet. The verdict was
            produced by decentralized AI validator consensus — not by any single server — and any later dispute
            that overturns it flips this certificate to REVOKED automatically.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase text-gray-500 mb-1.5 flex items-center gap-1.5">
        {icon} {label}
      </h4>
      <div className="text-sm">{children}</div>
    </div>
  );
}
