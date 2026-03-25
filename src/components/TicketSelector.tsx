"use client";

import React from "react";
import { Plus, Minus } from "lucide-react";

interface TicketSelectorProps {
  count: number;
  setCount: (count: number) => void;
  max: number;
}

export default function TicketSelector({
  count,
  setCount,
  max,
}: TicketSelectorProps) {
  const handleDecrement = () => {
    if (count > 1) setCount(count - 1);
  };

  const handleIncrement = () => {
    if (count < max) setCount(count + 1);
  };

  return (
    <div className="flex items-center justify-between p-4 neu-inset rounded-3xl w-full max-w-sm mx-auto">
      <button
        onClick={handleDecrement}
        disabled={count <= 1}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl neu-btn flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <Minus className="w-6 h-6 group-hover:text-[var(--accent-primary)] transition-colors" />
      </button>

      <div className="flex flex-col items-center justify-center px-4 w-full">
        <span className="text-4xl font-black text-[var(--text-primary)] font-mono tracking-tighter">
          {count}
        </span>
        <span className="text-[10px] uppercase text-[var(--text-secondary)] font-bold tracking-[0.28em] mt-2">
          Tickets
        </span>
      </div>

      <button
        onClick={handleIncrement}
        disabled={count >= max}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl neu-btn flex flex-shrink-0 items-center justify-center text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <Plus className="w-6 h-6 group-hover:text-[var(--accent-primary)] transition-colors" />
      </button>
    </div>
  );
}
