"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { useWallet } from "../context/WalletContext";

export default function Navbar() {
  const {
    isConnected,
    address,
    balance,
    connect,
    disconnect,
    isMockingNetwork,
  } = useWallet();

  const handleWalletClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="flex items-center justify-between w-full neu-raised rounded-2xl p-3 md:p-4 mb-6 sticky top-0 z-100 gap-3">
      <div className="flex items-center gap-3 min-w-0 mr-auto">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold tracking-[0.1em] text-[var(--text-primary)] truncate">
              NARUKKU
            </h1>
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] neu-inset-shallow px-2 py-0.5 rounded-lg">
              Solana
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] hidden sm:block mt-0.5">
            On-Chain Pools
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {isConnected && (
          <div className="hidden lg:flex items-center gap-2 text-[var(--text-secondary)] text-xs font-semibold neu-inset-shallow px-3 py-2 rounded-xl">
            <span className="text-[var(--accent-primary)] font-mono">
              {balance.toFixed(2)}
            </span>
            SOL
          </div>
        )}

        <button
          onClick={handleWalletClick}
          disabled={isMockingNetwork}
          className="neu-btn rounded-xl px-4 md:px-5 py-2 md:py-2.5 flex items-center gap-2 text-[11px] md:text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] disabled:opacity-50 shrink-0"
        >
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 shrink-0 ${isConnected ? "led-on" : "led-off"}`}
          ></div>
          <span className="truncate max-w-[100px] sm:max-w-[160px]">
            {isMockingNetwork
              ? "Connecting"
              : isConnected
                ? `${address?.slice(0, 4)}...${address?.slice(-3)}`
                : "Connect Wallet"}
          </span>
          <Wallet className="w-3.5 h-3.5 opacity-60 shrink-0 hidden sm:block" />
        </button>
      </div>
    </div>
  );
}
