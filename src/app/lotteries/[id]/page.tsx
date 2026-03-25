"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Info,
  Trophy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import * as lotteryService from "@/services/lotteryService";
import { Lottery } from "@/types";
import CountdownTimer from "@/components/CountdownTimer";
import TicketSelector from "@/components/TicketSelector";

export default function LotteryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    isConnected,
    address,
    balance,
    refreshBalance,
    connection,
    publicKey,
    sendTransaction,
    signTransaction,
    signAllTransactions,
  } = useWallet();

  const [lottery, setLottery] = useState<Lottery | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [ticketCount, setTicketCount] = useState(1);
  const [isBuying, setIsBuying] = useState(false);
  const [buyStatus, setBuyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchLottery = async () => {
      if (typeof id !== "string") return;
      setIsLoading(true);
      const data = await lotteryService.getLotteryById(id);
      setLottery(data || null);
      setIsLoading(false);
    };
    fetchLottery();
  }, [id]);

  const handleBuy = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first!");
      return;
    }
    if (!lottery) return;

    const totalCost = ticketCount * lottery.ticketPrice;
    if (balance < totalCost) {
      setBuyStatus("error");
      setErrorMessage("Insufficient SOL balance.");
      return;
    }

    setIsBuying(true);
    setBuyStatus("idle");
    try {
      const result = await lotteryService.buyTickets({
        lotteryId: lottery.id,
        count: ticketCount,
        wallet: {
          publicKey,
          sendTransaction,
          signTransaction,
          signAllTransactions,
        },
        connection,
      });
      if (result.success) {
        setBuyStatus("success");
        refreshBalance();
        // Update local state tickets sold to simulate real-time
        setLottery((prev) =>
          prev
            ? { ...prev, ticketsSold: prev.ticketsSold + ticketCount }
            : null,
        );
      } else {
        setBuyStatus("error");
        setErrorMessage(result.error || "Purchase failed");
      }
    } catch (e) {
      setBuyStatus("error");
      setErrorMessage("Network error occurred.");
    } finally {
      setIsBuying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-[var(--text-secondary)]">
        Loading lottery details...
      </div>
    );
  }

  if (!lottery) {
    return (
      <div className="p-12 text-center text-[var(--text-secondary)]">
        Lottery not found.
      </div>
    );
  }

  const percentFilled = Math.min(
    100,
    Math.round((lottery.ticketsSold / lottery.totalTickets) * 100),
  );
  const totalCost = ticketCount * lottery.ticketPrice;
  const isSoldOut = lottery.ticketsSold >= lottery.totalTickets;

  return (
    <div className="flex flex-col gap-8 pb-12 w-full max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Back Nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold uppercase tracking-wider text-xs transition-colors self-start neu-btn px-4 py-2 rounded-xl"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Lotteries
      </button>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Lottery Info & Countdown */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <div className="neu-raised rounded-3xl p-8 flex flex-col gap-8 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight">
                  {lottery.name}
                </h1>
                <span className="text-[var(--text-secondary)] font-mono text-sm mt-2 block opacity-70">
                  ID: {lottery.id}
                </span>
              </div>
              <div className="w-16 h-16 rounded-full neu-inset flex items-center justify-center bg-[var(--background-base)] shrink-0">
                <Trophy className="w-8 h-8 text-[var(--accent-primary)]" />
              </div>
            </div>

            <div className="neu-inset rounded-3xl w-full py-12 md:py-16 flex flex-col items-center justify-center border border-[rgba(43,43,43,0.08)] relative">
              <span className="text-xs font-bold tracking-widest uppercase text-[var(--text-secondary)] mb-4">
                Grand Prize Pool
              </span>
              <h2 className="text-5xl md:text-7xl font-black accent-text tracking-tighter drop-shadow-sm font-mono z-10">
                {lottery.jackpot.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h2>
              <span className="text-2xl md:text-3xl text-[var(--accent-primary)] font-bold mt-2 z-10">
                SOL
              </span>

              {/* Decorative radial gradient behind jackpot */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-primary)] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
            </div>

            {/* Progress Bar (Tickets Sold) */}
            <div className="w-full mt-4 flex flex-col gap-3">
              <div className="flex justify-between text-[10px] md:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                <span>
                  {lottery.ticketsSold.toLocaleString()} /{" "}
                  {lottery.totalTickets.toLocaleString()} Tickets Sold
                </span>
                <span
                  className={
                    percentFilled >= 90 ? "text-[var(--accent-secondary)]" : ""
                  }
                >
                  {percentFilled}% Filled
                </span>
              </div>
              <div className="h-6 w-full neu-inset rounded-full overflow-hidden p-[3px]">
                <div
                  className="h-full rounded-full accent-bg relative min-w-[2%] transition-all duration-1000 ease-out"
                  style={{ width: `${percentFilled}%` }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1/2 bg-white opacity-20 rounded-t-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Block */}
          {lottery.status === "active" && (
            <div className="neu-raised rounded-3xl p-6 md:p-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-6 text-center">
                Draw occurs in
              </h3>
              <CountdownTimer endTime={lottery.endTime} />
            </div>
          )}
        </div>

        {/* Right Column: Purchase Area */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="neu-raised rounded-3xl p-8 flex flex-col gap-6 sticky top-28">
            <h3 className="text-xl font-bold text-[var(--text-primary)] border-b border-[rgba(43,43,43,0.08)] pb-4">
              Enter the Draw
            </h3>

            {lottery.status !== "active" ? (
              <div className="p-8 neu-inset rounded-2xl text-center text-[var(--text-secondary)] font-bold">
                This lottery is no longer active.
              </div>
            ) : isSoldOut ? (
              <div className="p-8 neu-inset rounded-2xl text-center text-[var(--accent-secondary)] font-bold">
                Tickets are sold out!
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] text-center">
                    Select Quantity
                  </span>
                  <TicketSelector
                    count={ticketCount}
                    setCount={setTicketCount}
                    max={lottery.totalTickets - lottery.ticketsSold}
                  />
                </div>

                <div className="neu-inset-shallow rounded-2xl p-6 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-sm font-bold text-[var(--text-secondary)]">
                    <span>Ticket Price</span>
                    <span className="font-mono">{lottery.ticketPrice} SOL</span>
                  </div>
                  <div className="w-full h-px border-b border-dashed border-[rgba(43,43,43,0.18)]"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                      Total Cost
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-3xl font-black text-[var(--text-primary)] font-mono leading-none tracking-tighter">
                        {totalCost.toFixed(2)}
                      </span>
                      <span className="text-[var(--accent-primary)] font-bold mt-1 text-sm">
                        SOL
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Messages for Buy action */}
                {buyStatus === "success" && (
                  <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] p-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold">
                    <CheckCircle className="w-5 h-5" /> Tickets purchased!
                  </div>
                )}
                {buyStatus === "error" && (
                  <div className="bg-[var(--accent-secondary)]/10 border border-[var(--accent-secondary)]/30 text-[var(--accent-secondary)] p-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold">
                    <AlertCircle className="w-5 h-5" /> {errorMessage}
                  </div>
                )}

                <button
                  onClick={handleBuy}
                  disabled={isBuying || isSoldOut}
                  className="w-full py-5 rounded-2xl accent-bg relative overflow-hidden group shadow-xl transition-all disabled:opacity-75 disabled:cursor-not-allowed mt-2"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 font-black uppercase tracking-[0.16em] sm:tracking-[0.2em] text-base sm:text-lg drop-shadow-md">
                    {isBuying ? "Confirming..." : "Place Order"}
                  </span>
                </button>
              </>
            )}

            <div className="neu-inset-shallow p-4 rounded-2xl mt-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-[var(--info)] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed font-medium">
                Smart contract guarantees provably fair random selection. Winner
                receives total pool minus 5% protocol fee. Results are verified
                on-chain.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
