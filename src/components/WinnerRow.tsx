import React from "react";
import { Trophy, Calendar } from "lucide-react";
import { Winner } from "../types";

interface WinnerRowProps {
  winner: Winner;
}

export default function WinnerRow({ winner }: WinnerRowProps) {
  const dateStr = new Date(winner.drawDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="neu-flat rounded-2xl p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all duration-200 hover:border-[rgba(255,255,255,0.09)]">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl neu-inset-shallow flex items-center justify-center flex-shrink-0">
          <Trophy className="w-4 h-4 text-[var(--accent-primary)]" />
        </div>

        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            Winning Pool
          </span>
          <h4 className="text-[var(--text-primary)] font-semibold text-sm md:text-base truncate mt-0.5">
            {winner.lotteryName}
          </h4>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mt-1.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {dateStr}
            </span>
            <span className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-lg text-[var(--accent-primary)] truncate max-w-[180px]">
              {winner.winnerAddress.slice(0, 4)}...
              {winner.winnerAddress.slice(-4)}
            </span>
          </div>
        </div>
      </div>

      <div className="neu-inset-shallow rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 w-full lg:w-auto lg:min-w-[180px]">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] tracking-wider">
            Prize Won
          </span>
          <span className="text-sm md:text-base font-semibold text-[var(--text-primary)] font-mono truncate">
            {winner.prizeAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
          SOL
        </span>
      </div>
    </div>
  );
}
