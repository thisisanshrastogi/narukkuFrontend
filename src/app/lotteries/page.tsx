"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Filter } from "lucide-react";
import { Lottery } from "@/types";
import * as lotteryService from "@/services/lotteryService";
import LotteryCard from "@/components/LotteryCard";

type FilterType = "all" | "active" | "completed";

export default function LotteriesPage() {
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLotteries = async () => {
      setIsLoading(true);
      const data = await lotteryService.getLotteries();
      setLotteries(data);
      setIsLoading(false);
    };
    fetchLotteries();
  }, []);

  const filteredLotteries = lotteries.filter((l) =>
    filter === "all" ? true : l.status === filter,
  );
  const totalCount = lotteries.length;
  const activeCount = lotteries.filter((l) => l.status === "active").length;
  const completedCount = lotteries.filter(
    (l) => l.status === "completed",
  ).length;

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="neu-raised rounded-2xl p-5 md:p-6 flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <div className="neu-inset-shallow rounded-xl px-3 py-2.5 min-w-[120px]">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              All Pools
            </span>
            <p className="text-lg font-semibold text-[var(--text-primary)] mt-0.5">
              {totalCount}
            </p>
          </div>
          <div className="neu-inset-shallow rounded-xl px-3 py-2.5 min-w-[120px]">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Active
            </span>
            <p className="text-lg font-semibold text-[var(--text-primary)] mt-0.5">
              {activeCount}
            </p>
          </div>
          <div className="neu-inset-shallow rounded-xl px-3 py-2.5 min-w-[120px]">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Completed
            </span>
            <p className="text-lg font-semibold text-[var(--text-primary)] mt-0.5">
              {completedCount}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 neu-inset-shallow p-1 rounded-xl">
          <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)] ml-2 mr-0.5 hidden sm:block" />
          {(["all", "active", "completed"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                filter === f
                  ? "neu-raised text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="neu-raised rounded-2xl h-[360px] animate-pulse bg-[var(--surface)]/70"
            ></div>
          ))}
        </div>
      ) : filteredLotteries.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredLotteries.map((lottery) => (
            <LotteryCard key={lottery.id} lottery={lottery} />
          ))}
        </div>
      ) : (
        <div className="neu-inset rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3">
          <Trophy className="w-10 h-10 text-[var(--text-secondary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-secondary)]">
            No lotteries found
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Try changing your filter criteria.
          </p>
        </div>
      )}
    </div>
  );
}
