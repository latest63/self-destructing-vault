"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { VaultList } from "@/components/VaultList";
import { CreateVaultModal } from "@/components/CreateVaultModal";
import { WalletConnectButton } from "@/components/WalletConnectButton";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main Content - Padding to account for fixed navbar */}
      <main className="flex-grow pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Ecosystem Fund Guardian
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Fund teams that ship, without trusting them blindly.
              <br />
              Backers pledge to a project. Meet the commitments, the team gets funded — miss them, and every backer is refunded.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 animate-slide-up">
            <WalletConnectButton />
            <CreateVaultModal />
          </div>

          {/* Vault List */}
          <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <VaultList />
          </div>

          {/* Info Section */}
          <div className="mt-8 glass-card p-6 md:p-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <h2 className="text-2xl font-bold mb-4">How it Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">1. Open a Fund</div>
                <p className="text-sm text-muted-foreground">
                  A team opens a fund with its commitments, a check URL, and a deadline (often the launch date). Those commitments become the release condition.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">2. Backers Pledge</div>
                <p className="text-sm text-muted-foreground">
                  Supporters pledge GEN to the project. Funds are held by the contract until the commitments are verified or the deadline passes.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">3. Verified Settlement</div>
                <p className="text-sm text-muted-foreground">
                  GenLayer's AI checks the commitment at the deadline. Met — the team is funded. Missed — every backer is refunded. No middleman decides.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-2">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Powered by GenLayer
              </a>
              <a
                href="https://studio-next.genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Studio
              </a>
              <a
                href="https://docs.genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Docs
              </a>
              <a
                href="https://explorer-studio-dev.genlayer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Explorer
              </a>
          </div>
        </div>
      </footer>
    </div>
  );
}