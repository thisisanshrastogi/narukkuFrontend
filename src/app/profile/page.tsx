"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Wallet,
  Activity,
  Trophy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import * as ticketService from "@/services/ticketService";
import * as winnerService from "@/services/winnerService";
import * as lotteryService from "@/services/lotteryService";
import { Ticket, Winner } from "@/types";
import StatsCard from "@/components/StatsCard";
import WinnerRow from "@/components/WinnerRow";

interface EnrichedTicket extends Ticket {
  lotteryName: string;
  price: number;
}

export default function ProfilePage() {
  const {
    isConnected,
    address,
    balance,
    connect,
    isMockingNetwork,
    connection,
    publicKey,
    sendTransaction,
    signTransaction,
    signAllTransactions,
  } = useWallet();
  const [tickets, setTickets] = useState<EnrichedTicket[]>([]);
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
    if (isConnected && address) {
      setIsLoading(true);
      Promise.all([
        ticketService.getMyTickets(address),
        winnerService.checkWinnings(address),
        lotteryService.getLotteries(),
      ]).then(([t, w, lotteries]) => {
        const enriched = t.map((ticket) => {
          const lot = lotteries.find((l) => l.id === ticket.lotteryId);
          return {
            ...ticket,
            lotteryName: lot?.name || "Unknown Pool",
            price: lot?.ticketPrice || 0,
          };
        });
        setTickets(enriched);
        setUnclaimedWins(w);
        setIsLoading(false);
      });
    } else {
      setTickets([]);
      setUnclaimedWins([]);
      setIsLoading(false);
    }
  }, [isConnected, address]);

  const handleClaim = async (winnerId: string) => {
    if (!address) return;
    setIsClaiming((prev) => ({ ...prev, [winnerId]: true }));
    try {
      const result = await winnerService.claimPrize({
        winnerId,
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
        setUnclaimedWins((prev) => prev.filter((w) => w.id !== winnerId));
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

  const activeTickets = tickets.filter((t) => t.status === "active").length;
  const completedTickets = tickets.filter((t) => t.status !== "active").length;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in">
        <div className="w-24 h-24 rounded-full neu-inset flex items-center justify-center border border-[rgba(255,255,255,0.05)]">
          <User className="w-12 h-12 text-[var(--text-secondary)]" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-[var(--text-primary)]">
            Wallet Disconnected
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">
            Connect your Solana wallet to view your profile and assets.
          </p>
        </div>
        <button
          onClick={connect}
          disabled={isMockingNetwork}
          className="accent-bg px-8 py-3 rounded-xl text-white font-bold tracking-wider uppercase transition-transform hover:-translate-y-1 active:translate-y-0"
        >
          {isMockingNetwork ? "Connecting..." : "Connect Wallet"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500 w-full max-w-6xl mx-auto">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 rounded-3xl p-6 md:p-8 neu-raised relative overflow-hidden">
        <div className="w-24 h-24 rounded-full neu-inset flex items-center justify-center border border-[rgba(43,43,43,0.08)] shrink-0 z-10">
          <User className="w-10 h-10 text-[var(--accent-primary)]" />
        </div>

        <div className="flex flex-col items-center md:items-start text-center md:text-left z-10 w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] font-mono break-all">
            {address}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full led-success`}></div>
            <span className="text-sm font-bold uppercase tracking-widest text-[var(--success)]">
              Connected
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          icon={Wallet}
          label="Available Balance"
          value={`${balance.toFixed(2)} SOL`}
        />
        <StatsCard
          icon={Activity}
          label="Active Tickets"
          value={activeTickets}
        />
        <StatsCard
          icon={CheckCircle}
          label="Past Entries"
          value={completedTickets}
        />
      </div>

      {/* Unclaimed Winnings Banner */}
      {unclaimedWins.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--accent-primary)] rounded-3xl p-6 md:p-8 flex flex-col xl:flex-row items-center justify-between gap-6 relative overflow-hidden neu-raised">
          <div className="flex items-center gap-4 z-10">
            <div className="w-16 h-16 rounded-full neu-inset flex items-center justify-center shrink-0 border border-[rgba(26,141,141,0.4)]">
              <Trophy className="w-8 h-8 text-[var(--accent-primary)] animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                Rewards Available
              </h2>
              <p className="text-[var(--text-secondary)] font-medium">
                Claim your winnings now.
              </p>
            </div>
          </div>

          <div className="flex flex-col w-full xl:w-auto gap-3 z-10">
            {unclaimedWins.map((win) => (
              <div
                key={win.id}
                className="flex items-center justify-between gap-4 neu-inset-shallow px-4 py-3 rounded-2xl border border-[rgba(43,43,43,0.08)]"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                    {win.lotteryName}
                  </span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {win.prizeAmount} SOL
                  </span>
                </div>
                <button
                  onClick={() => handleClaim(win.id)}
                  disabled={isClaiming[win.id]}
                  className="accent-bg px-6 py-2 rounded-xl text-white font-bold text-sm tracking-wider uppercase transition-all whitespace-nowrap disabled:opacity-50"
                >
                  {isClaiming[win.id] ? "Claiming..." : "Claim"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ticket History */}
      <div className="neu-raised rounded-3xl p-6 md:p-8 flex flex-col gap-4 mt-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2 mb-2">
          Ticket Ledger
        </h3>

        {isLoading ? (
          <div className="text-center py-12 text-[var(--text-secondary)] neu-inset rounded-3xl">
            Loading tickets...
          </div>
        ) : tickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="neu-inset-shallow rounded-2xl p-4 flex flex-col gap-2 border border-[rgba(43,43,43,0.08)] transition-colors hover:border-[var(--accent-primary)] duration-300"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-primary)] font-bold text-lg">
                    {ticket.lotteryName}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      ticket.status === "active"
                        ? "text-[var(--accent-primary)] neu-inset border-[rgba(26,141,141,0.25)]"
                        : "text-[var(--text-secondary)] neu-inset border-[rgba(43,43,43,0.12)]"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="font-mono text-sm text-[var(--text-secondary)]">
                    ID: ...{ticket.id.slice(-6)}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-widest">
                      Buy-in
                    </span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {ticket.price} SOL
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[var(--text-secondary)] neu-inset rounded-3xl">
            You have not purchased any tickets yet.
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
