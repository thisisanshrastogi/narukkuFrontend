"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Ticket,
  Activity,
  Users,
  Trophy,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import * as lotteryService from "@/services/lotteryService";
import * as winnerService from "@/services/winnerService";
import * as ticketService from "@/services/ticketService";
import { Lottery, Winner } from "@/types";
import LotteryCard from "@/components/LotteryCard";
import StatsCard from "@/components/StatsCard";
import WinnerRow from "@/components/WinnerRow";

export default function Dashboard() {
  const { isConnected, address } = useWallet();
  const [featuredLottery, setFeaturedLottery] = useState<Lottery | null>(null);
  const [stats, setStats] = useState({ totalPool: 0, participants: 0 });
  const [recentWinners, setRecentWinners] = useState<Winner[]>([]);
  const [myTicketCount, setMyTicketCount] = useState(0);

  useEffect(() => {
    // Load dashboard data
    const loadData = async () => {
      const lotteries = await lotteryService.getLotteries();
      const activeLotteries = lotteries
        .filter((l) => l.status === "active")
        .sort((a, b) => b.jackpot - a.jackpot);
      if (activeLotteries.length > 0) {
        setFeaturedLottery(activeLotteries[0]);
      }

      const lStats = await lotteryService.getLotteryStats();
      setStats({
        totalPool: lStats.totalPoolActive,
        participants: lStats.totalParticipants,
      });

      const winners = await winnerService.getRecentWinners();
      setRecentWinners(winners.slice(0, 3));
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      ticketService.getMyTickets(address).then((tickets) => {
        setMyTicketCount(tickets.filter((t) => t.status === "active").length);
      });
    } else {
      setMyTicketCount(0);
    }
  }, [isConnected, address]);

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 min-w-0">
        <StatsCard
          icon={Activity}
          label="Total Active Pool"
          value={`${stats.totalPool.toLocaleString(undefined, {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6,
          })} SOL`}
        />
        <StatsCard
          icon={Users}
          label="Global Participants"
          value={stats.participants.toLocaleString()}
        />
        <StatsCard
          icon={Ticket}
          label="Your Active Tickets"
          value={isConnected ? myTicketCount : "--"}
          subtext={!isConnected ? "Connect wallet to view" : undefined}
        />
        <div className="neu-flat rounded-2xl p-5 flex flex-col justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Wallet Status
            </span>
            <p className="text-lg font-semibold text-[var(--text-primary)] mt-1.5">
              {isConnected ? "Connected" : "Not connected"}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {isConnected && address
                ? `${address.slice(0, 4)}...${address.slice(-4)}`
                : "Connect your wallet to join live pools."}
            </p>
          </div>
          <Link
            href="/profile"
            className="neu-btn py-2 rounded-xl text-center text-[11px] font-semibold uppercase tracking-wider"
          >
            Manage Wallet
          </Link>
        </div>
      </div>

      <div className="neu-raised rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-[var(--text-primary)]">
              Create a New Lottery
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              Initialize config + collection for a fresh devnet draw.
            </p>
          </div>
        </div>
        <Link
          href="/admin"
          className="neu-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2"
        >
          Open Admin
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Featured Pool
            </span>
            <Link
              href="/lotteries"
              className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors"
            >
              View All
            </Link>
          </div>
          {featuredLottery ? (
            <LotteryCard lottery={featuredLottery} />
          ) : (
            <div className="neu-inset rounded-2xl h-60 flex items-center justify-center text-[var(--text-secondary)]">
              Loading featured lottery...
            </div>
          )}
        </div>

        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Recent Winners
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
              Last 3 draws
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {recentWinners.length > 0 ? (
              recentWinners.map((winner) => (
                <WinnerRow key={winner.id} winner={winner} />
              ))
            ) : (
              <div className="text-center py-8 text-sm text-[var(--text-secondary)] neu-flat rounded-2xl">
                Loading winners...
              </div>
            )}
          </div>
          <Link
            href="/winners"
            className="text-[11px] text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-semibold uppercase tracking-wider transition-colors self-end"
          >
            View All Winners
          </Link>
        </div>
      </div>
    </div>
  );
}
