"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; label?: string },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(err: unknown): ErrorBoundaryState {
    return { hasError: true, message: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: unknown, info: unknown) {
    console.error(`[${this.props.label ?? "ErrorBoundary"}]`, err, info);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="glass-panel p-8 rounded-3xl border border-red-500/30 bg-red-950/10 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-4 font-mono break-words">{this.state.message}</p>
          <button
            onClick={this.reset}
            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
