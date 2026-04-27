"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Shield, Fingerprint, Cpu } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4 relative overflow-hidden">
      
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
          Powered by GenLayer Intelligent Contracts
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
          The On-Chain <br />
          <span className="text-gradient">AI Art Detective</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
          Verify the authenticity of digital artworks and NFTs. GenArtAuth automatically checks provenance, style consistency, and AI-generation traces entirely on-chain.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link href="/submit">
            <button className="flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:-translate-y-1">
              Start Verification <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/5 text-white font-semibold hover:bg-white/10 transition-all border border-white/10 hover:-translate-y-1">
              View Dashboard
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-32 px-4"
      >
        <FeatureCard 
          icon={<Shield className="w-8 h-8 text-primary" />}
          title="On-Chain Provenance"
          description="We crawl Wayback Machine, original post metadata, and history to guarantee first appearance."
        />
        <FeatureCard 
          icon={<Fingerprint className="w-8 h-8 text-accent" />}
          title="Style Consistency"
          description="Matches artistic signatures across portfolios to detect plagiarism and re-minting."
        />
        <FeatureCard 
          icon={<Cpu className="w-8 h-8 text-pink-500" />}
          title="AI Generation Detection"
          description="Deep LLM analysis to detect subtle traces of AI generation and deepfakes."
        />
      </motion.div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="glass-panel p-8 rounded-2xl text-left hover:-translate-y-2 transition-transform duration-300">
      <div className="mb-4 bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
