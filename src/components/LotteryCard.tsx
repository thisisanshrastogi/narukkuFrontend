"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Ticket } from "lucide-react";
import { Lottery } from "../types";
import CountdownTimer from "./CountdownTimer";

interface LotteryCardProps {
  lottery: Lottery;
}

export default function LotteryCard({ lottery }: LotteryCardProps) {
  const percentFilled = Math.min(
    100,
    Math.round((lottery.ticketsSold / lottery.totalTickets) * 100),
  );

  return (
    <div className="neu-raised rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            Pool
          </span>
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate mt-0.5">
            {lottery.name}
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mt-1 block">
            ID: {lottery.id.split("-").pop()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
              lottery.status === "active"
                ? "text-[var(--accent-primary)] border-[rgba(57,242,193,0.25)]"
                : lottery.status === "completed"
                  ? "text-[var(--success)] border-[rgba(57,217,138,0.25)]"
                  : "text-[var(--info)] border-[rgba(77,163,255,0.25)]"
            }`}
          >
            {lottery.status}
          </span>
          <div className="w-9 h-9 rounded-xl neu-inset-shallow flex items-center justify-center text-[var(--text-secondary)]">
            <Ticket className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Jackpot — flat display */}
      <div className="rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] p-4 flex flex-col items-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
          Current Jackpot
        </span>
        <h2 className="text-xl sm:text-2xl font-semibold accent-text tracking-tight font-mono truncate w-full text-center">
          {lottery.jackpot.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          <span className="text-sm text-[var(--accent-primary)]">SOL</span>
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {lottery.status === "active" && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Time Remaining
            </span>
            <div className="mt-2">
              <CountdownTimer endTime={lottery.endTime} />
            </div>
          </div>
        )}

        {/* Progress bar — clean pill */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <span>Tickets Sold</span>
            <span>{percentFilled}% Filled</span>
          </div>
          <div className="h-2.5 w-full bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full accent-bg transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(percentFilled, 3)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
            Ticket Price
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] font-mono">
            {lottery.ticketPrice} SOL
          </span>
        </div>

        <Link
          href={`/lotteries/${lottery.id}`}
          className="neu-btn px-4 py-2 rounded-xl flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px]"
        >
          {lottery.status === "active" ? "Buy Tickets" : "View Details"}
          <ChevronRight className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        </Link>
      </div>
    </div>
  );
}
