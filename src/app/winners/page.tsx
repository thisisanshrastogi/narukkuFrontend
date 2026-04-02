"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Gift, CheckCircle, AlertCircle } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import * as winnerService from "@/services/winnerService";
import { Winner } from "@/types";
import WinnerRow from "@/components/WinnerRow";

export default function WinnersPage() {
  const {
    isConnected,
    address,
    connection,
    publicKey,
    sendTransaction,
    signTransaction,
    signAllTransactions,
  } = useWallet();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [unclaimedWins, setUnclaimedWins] = useState<Winner[]>([]);
  const [isClaiming, setIsClaiming] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState({
    open: false,
    title: "",
    message: "",
    tone: "success" as "success" | "error",
  });

  useEffect(() => {
    const fetchWinners = async () => {
      setIsLoading(true);
      const data = await winnerService.getRecentWinners();
      setWinners(data);
      setIsLoading(false);
    };
    fetchWinners();
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      winnerService.checkWinnings(address).then(setUnclaimedWins);
    } else {
      setUnclaimedWins([]);
    }
  }, [isConnected, address]);

  const handleClaim = async (winnerId: string, lotteryId: string) => {
    if (!address) return;

    setIsClaiming((prev) => ({ ...prev, [winnerId]: true }));
    try {
      const result = await winnerService.claimPrize({
        winnerId,
        lotteryId,
        walletAddress: address,
        wallet: {
          publicKey,
          sendTransaction,
          signTransaction,
          signAllTransactions,
        },
        connection,
      });
      if (result.success) {
        // Remove from unclaimed list
        setUnclaimedWins((prev) => prev.filter((w) => w.id !== winnerId));
        // Update general winners list
        setWinners((prev) =>
          prev.map((w) => (w.id === winnerId ? { ...w, claimed: true } : w)),
        );
        setDialog({
          open: true,
          title: "Prize claimed",
          message: "Your prize has been claimed and added to your wallet.",
          tone: "success",
        });
      } else {
        setDialog({
          open: true,
          title: "Claim failed",
          message: result.error || "Unable to claim prize.",
          tone: "error",
        });
      }
    } catch (error) {
      setDialog({
        open: true,
        title: "Claim failed",
        message: "Network error occurred while claiming.",
        tone: "error",
      });
    } finally {
      setIsClaiming((prev) => ({ ...prev, [winnerId]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500 min-w-0 overflow-x-hidden">
      {/* Claim Banner */}
      {isConnected && unclaimedWins.length > 0 && (
        <div className="neu-raised rounded-3xl p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl neu-inset flex items-center justify-center shrink-0 border border-[rgba(26,141,141,0.4)]">
                <Trophy className="w-7 h-7 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">
                  Jackpot Hit!
                </h2>
                <p className="text-[var(--text-secondary)]">
                  You have unclaimed prizes waiting.
                </p>
              </div>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
              Action Required
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {unclaimedWins.map((win) => (
              <div
                key={win.id}
                className="flex items-center justify-between gap-4 neu-inset-shallow px-4 py-3 rounded-2xl border border-[rgba(43,43,43,0.08)]"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold uppercase text-[var(--text-secondary)] truncate">
                    {win.lotteryName}
                  </span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {win.prizeAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 6,
                      maximumFractionDigits: 6,
                    })}{" "}
                    SOL
                  </span>
                </div>
                <button
                  onClick={() => handleClaim(win.id, win.lotteryId)}
                  disabled={isClaiming[win.id]}
                  className="accent-bg px-5 py-2 rounded-xl text-white font-bold text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-70 whitespace-nowrap"
                >
                  {isClaiming[win.id] ? "Claiming..." : "Claim"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Winners List Grid */}
      <div className="flex flex-col gap-6 w-full mt-4">
        {isLoading ? (
          <div className="text-center py-12 text-[var(--text-secondary)] neu-inset rounded-3xl">
            Loading winners...
          </div>
        ) : winners.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {winners.map((winner) => (
              <div key={winner.id} className="relative group">
                <WinnerRow winner={winner} />
                {winner.claimed && (
                  <div className="absolute top-1/2 -translate-y-1/2 right-4 hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--success)] neu-inset-shallow px-3 py-1 rounded-full border border-[rgba(31,157,106,0.35)]">
                    <CheckCircle className="w-3 h-3" /> Claimed
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--text-secondary)] neu-inset rounded-3xl">
            No recent winners found.
          </div>
        )}
      </div>

      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(27,24,20,0.35)]">
          <div className="neu-raised rounded-3xl p-6 md:p-7 w-full max-w-md flex flex-col gap-4 border border-[rgba(43,43,43,0.12)]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl neu-inset flex items-center justify-center">
                {dialog.tone === "success" ? (
                  <CheckCircle className="w-5 h-5 text-[var(--success)]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-[var(--accent-secondary)]" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {dialog.title}
                </h3>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Transaction update
                </p>
              </div>
            </div>
            <div className="neu-inset-shallow rounded-2xl p-4 border border-[rgba(43,43,43,0.08)] text-[var(--text-secondary)] text-sm">
              {dialog.message}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setDialog((prev) => ({ ...prev, open: false }))}
                className="neu-btn px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-[0.2em]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
