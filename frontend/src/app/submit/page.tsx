"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, Plus, X, ArrowRight, Link as LinkIcon } from "lucide-react";
import { useAccount } from "wagmi";

export default function SubmitArtwork() {
  const { isConnected } = useAccount();
  const [artworkUrl, setArtworkUrl] = useState("");
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [newSource, setNewSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSource = () => {
    if (newSource && !sourceUrls.includes(newSource)) {
      setSourceUrls([...sourceUrls, newSource]);
      setNewSource("");
    }
  };

  const handleRemoveSource = (url: string) => {
    setSourceUrls(sourceUrls.filter(s => s !== url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artworkUrl || !isConnected) return;
    
    setIsSubmitting(true);
    try {
      const { createClient } = await import("genlayer-js");
      const client = createClient({ provider: (window as any).ethereum });
      
      const txHash = await client.writeContract({
        address: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "submitArtwork",
        args: [artworkUrl, sourceUrls]
      });
      
      alert(`Artwork submitted to GenLayer Intelligence! TxHash: ${txHash}`);
      setArtworkUrl("");
      setSourceUrls([]);
    } catch (error: any) {
      console.error(error);
      alert(`Submission failed: ${error.message || "Check console for details."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Submit Artwork for Verification</h1>
        <p className="text-gray-400">Our AI agents will analyze provenance, history, and style.</p>
      </motion.div>

      <motion.form 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit} 
        className="glass-panel p-8 rounded-3xl space-y-6"
      >
        {/* Main Artwork URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 ml-1">Target Artwork URL</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <input
              type="url"
              required
              value={artworkUrl}
              onChange={(e) => setArtworkUrl(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="https://opensea.io/assets/..."
            />
          </div>
        </div>

        {/* Source URLs */}
        <div className="space-y-2 pt-4">
          <label className="text-sm font-medium text-gray-300 ml-1">Original Sources (Optional)</label>
          <p className="text-xs text-gray-500 ml-1 mb-2">Add DeviantArt, Behance, or old social media links to help the AI establish provenance.</p>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="url"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSource())}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="https://deviantart.com/..."
              />
            </div>
            <button
              type="button"
              onClick={handleAddSource}
              className="bg-white/10 hover:bg-white/20 border border-white/10 text-white p-3 rounded-xl transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Tags */}
          {sourceUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {sourceUrls.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-primary/20 border border-primary/30 text-primary-foreground px-3 py-1.5 rounded-lg text-sm">
                  <span className="max-w-[200px] truncate">{url}</span>
                  <button type="button" onClick={() => handleRemoveSource(url)} className="text-gray-400 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="pt-6 border-t border-white/10">
          {!isConnected ? (
            <div className="bg-destructive/20 text-destructive border border-destructive/30 p-4 rounded-xl text-center text-sm">
              Please connect your wallet to submit artworks.
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Processing...
                </span>
              ) : (
                <>
                  Verify Authenticity <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          )}
          <p className="text-center text-xs text-gray-500 mt-4">
            Fee: 1 GEN per verification. Results will be permanently stored on GenLayer.
          </p>
        </div>
      </motion.form>
    </div>
  );
}
