"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Search, Gavel, Trophy, X, ArrowRight, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "genartauth.onboarded.v1";

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
  bullets: string[];
}

const STEPS: Step[] = [
  {
    icon: <Search className="w-6 h-6 text-primary" />,
    title: "1. Submit an artwork",
    body: "Paste the target NFT / artwork URL plus one or more source URLs. A 5 GEN bond is locked to fund any future overturn reward.",
    bullets: [
      "Target URL: OpenSea, Foundation, Twitter post, etc.",
      "At least one Original Source URL (DeviantArt, Behance, old post)",
      "Bond: 5 GEN — refunded if the verdict survives",
    ],
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
    title: "2. Trigger AI verification",
    body: "GenLayer validators crawl the target, sources, and Wayback Machine snapshots — then reason across Forensic, Provenance, and Skeptic perspectives to reach consensus.",
    bullets: [
      "Consensus checks meaning, not JSON shape",
      "Prompt-injection canary rejects hijacked verdicts",
      "Verdict: ORIGINAL / COPY + confidence + earliest source",
    ],
  },
  {
    icon: <Gavel className="w-6 h-6 text-amber-400" />,
    title: "3. Dispute or trust",
    body: "Anyone can challenge a verdict by locking a 10 GEN stake and submitting fresh evidence. A Supreme AI Jury re-examines everything and issues a binding decision.",
    bullets: [
      "Overturn → challenger wins stake + submitter's bond (15 GEN)",
      "Upheld → submitter's bond refunded, challenger's stake slashed",
      "Every outcome updates on-chain reputation",
    ],
  },
  {
    icon: <Trophy className="w-6 h-6 text-yellow-400" />,
    title: "4. Track reputation",
    body: "Each participant carries an ELO-style score, tier badge, and monotonic activity counters. See the Leaderboard to spot Trusted authenticators and Untrusted spam challengers.",
    bullets: [
      "Score starts at 1000 for every new address",
      "Submitters gain +50 on stood verdicts, lose 100 on overturns",
      "Challengers gain +100 on overturns, lose 50 on failed disputes",
    ],
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const done = window.localStorage.getItem(STORAGE_KEY);
      if (!done) setOpen(true);
    } catch {
      /* localStorage may be blocked in privacy modes */
    }
  }, []);

  const finish = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    setStep(0);
  };

  const showAgain = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setStep(0);
    setOpen(true);
  };

  useEffect(() => {
    (window as any).__genartauth_openOnboarding = showAgain;
    return () => {
      try {
        delete (window as any).__genartauth_openOnboarding;
      } catch {
        /* ignore */
      }
    };
  }, []);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={finish}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to GenArtAuth"
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            className="glass-panel relative z-10 w-full max-w-xl p-8 rounded-3xl border border-white/10 space-y-6"
          >
            <button
              onClick={finish}
              aria-label="Close onboarding"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                {current.icon}
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Step {step + 1} of {STEPS.length}
                </div>
                <h2 className="text-xl font-bold text-white">{current.title}</h2>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed">{current.body}</p>

            <ul className="space-y-2">
              {current.bullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-1 pt-2">
              {STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setStep(idx)}
                  aria-label={`Go to step ${idx + 1}`}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    idx === step ? "bg-primary" : idx < step ? "bg-primary/40" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <button
                onClick={finish}
                className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-2"
              >
                Skip tour
              </button>

              {isLast ? (
                <button
                  onClick={finish}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all"
                >
                  Get started <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Small button that surfaces the "Show tour" affordance in the navbar / footer. */
export function OnboardingReopenButton() {
  return (
    <button
      onClick={() => (window as any).__genartauth_openOnboarding?.()}
      className="text-xs text-gray-400 hover:text-white transition-colors underline decoration-dotted"
    >
      Show tour
    </button>
  );
}
