"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import * as ticketService from "@/services/ticketService";
import * as lotteryService from "@/services/lotteryService";
import { Ticket as TicketType, Lottery } from "@/types";
import { getExplorerAddressUrl } from "@/solana/config";
import { getTicketMintPda, getTokenLotteryPda } from "@/solana/pdas";

export default function TicketsPage() {
  const { isConnected, address } = useWallet();
  const [tickets, setTickets] = useState<
    (TicketType & { lottery?: Lottery })[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadTickets = async () => {
      if (!isConnected || !address) return;

      setIsLoading(true);
      try {
        const userTickets = await ticketService.getMyTickets(address);

        // Enrich with lottery data
        const enriched = await Promise.all(
          userTickets.map(async (t) => {
            const lotto = await lotteryService.getLotteryById(t.lotteryId);
            return { ...t, lottery: lotto };
          }),
        );

        setTickets(enriched);
      } catch (e) {
        console.error("Failed to load tickets", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadTickets();
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 animate-in fade-in duration-500">
        <div className="neu-raised rounded-3xl p-8 md:p-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl neu-inset flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-[var(--text-secondary)]" />
          </div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] mt-4">
            Wallet Not Connected
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">
            Connect your wallet to view your ticket ledger and history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="neu-raised rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] flex items-center gap-3">
            <Ticket className="w-7 h-7 text-[var(--accent-secondary)]" />
            Ticket Ledger
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl">
            Every active entry and completed draw, organized for clarity.
          </p>
        </div>
        <div className="neu-inset-shallow rounded-2xl px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Synced on Chain
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[var(--text-secondary)] neu-inset rounded-3xl">
          Loading your tickets...
        </div>
      ) : tickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="neu-raised rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden group"
            >
              {/* Status Band */}
              <div
                className={`absolute top-0 left-0 w-2 h-full ${
                  ticket.status === "won"
                    ? "bg-[var(--success)]"
                    : ticket.status === "lost"
                      ? "bg-[var(--text-secondary)]"
                      : "bg-[var(--accent-primary)]"
                }`}
              ></div>

              <div className="flex justify-between items-start pl-2 gap-4">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    Lottery
                  </span>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] line-clamp-1">
                    {ticket.lottery?.name || "Unknown Pool"}
                  </h3>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${
                    ticket.status === "won"
                      ? "bg-[var(--success)] text-white shadow-[0_0_8px_rgba(31,157,106,0.35)]"
                      : ticket.status === "lost"
                        ? "neu-inset text-[var(--text-secondary)]"
                        : "neu-inset text-[var(--accent-primary)]"
                  }`}
                >
                  {ticket.status}
                </div>
              </div>

              <div className="neu-inset-shallow rounded-2xl p-4 flex flex-col gap-3 mt-2">
                <div className="flex justify-between text-[11px] uppercase tracking-[0.18em]">
                  <span className="text-[var(--text-secondary)] font-bold">
                    Ticket ID
                  </span>
                  <span className="font-mono text-[var(--text-primary)] font-semibold">
                    {ticket.id.split("-").pop()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] uppercase tracking-[0.18em]">
                  <span className="text-[var(--text-secondary)] font-bold">
                    Purchased
                  </span>
                  <span className="text-[var(--text-primary)] flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3" />
                    {new Date(ticket.purchaseTime).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-col items-center gap-2">
                <Link
                  href={`/lotteries/${ticket.lotteryId}`}
                  className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] flex items-center justify-center gap-1 transition-colors"
                >
                  View Draw Details <ExternalLink className="w-3 h-3" />
                </Link>
                {(() => {
                  const ticketNumber = Number(ticket.id.split("-").pop());
                  const lotteryIdNumber = Number(ticket.lotteryId);
                  const ticketIndex = Number.isFinite(ticketNumber)
                    ? Math.max(ticketNumber - 1, 0)
                    : null;
                  if (
                    ticketIndex === null ||
                    !Number.isFinite(lotteryIdNumber)
                  ) {
                    return null;
                  }
                  const [lotteryPda] = getTokenLotteryPda(lotteryIdNumber);
                  const [ticketMint] = getTicketMintPda(
                    lotteryPda,
                    ticketIndex,
                  );
                  return (
                    <Link
                      href={getExplorerAddressUrl(ticketMint.toBase58())}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1"
                    >
                      View Ticket NFT <ExternalLink className="w-3 h-3" />
                    </Link>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="neu-inset rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-4">
          <Ticket className="w-10 h-10 text-[var(--text-secondary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)]">
            No tickets found
          </h3>
          <p className="text-[11px] text-[var(--text-secondary)]">
            You havent purchased any tickets yet.
          </p>
          <Link
            href="/lotteries"
            className="neu-btn px-6 py-3 rounded-xl font-bold uppercase tracking-[0.2em] text-[11px] mt-2"
          >
            Browse Lotteries
          </Link>
        </div>
      )}
    </div>
  );
}
