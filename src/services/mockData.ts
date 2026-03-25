import { Lottery, Ticket, Winner } from "../types";

// ── Mock Lotteries ──

const now = Date.now();
const hour = 3_600_000;
const day = 24 * hour;

export const MOCK_LOTTERIES: Lottery[] = [
  {
    id: "sol-mega-jackpot",
    name: "SOL Mega Jackpot",
    jackpot: 2450.5,
    ticketPrice: 0.5,
    endTime: new Date(now + 2 * day + 14 * hour).toISOString(),
    ticketsSold: 3427,
    totalTickets: 5000,
    status: "active",
  },
  {
    id: "phantom-weekly",
    name: "Phantom Weekly Draw",
    jackpot: 820.0,
    ticketPrice: 0.1,
    endTime: new Date(now + 5 * day).toISOString(),
    ticketsSold: 1890,
    totalTickets: 10000,
    status: "active",
  },
  {
    id: "degen-rush",
    name: "Degen Rush",
    jackpot: 150.75,
    ticketPrice: 0.25,
    endTime: new Date(now + 12 * hour).toISOString(),
    ticketsSold: 580,
    totalTickets: 1000,
    status: "active",
  },
  {
    id: "community-pool-v2",
    name: "Community Pool V2",
    jackpot: 4100.0,
    ticketPrice: 1.0,
    endTime: new Date(now + 10 * day).toISOString(),
    ticketsSold: 312,
    totalTickets: 2000,
    status: "upcoming",
  },
  {
    id: "solana-holiday-special",
    name: "Solana Holiday Special",
    jackpot: 12750.0,
    ticketPrice: 2.0,
    endTime: new Date(now - 3 * day).toISOString(),
    ticketsSold: 5000,
    totalTickets: 5000,
    status: "completed",
  },
  {
    id: "micro-lotto-daily",
    name: "Micro Lotto Daily",
    jackpot: 32.5,
    ticketPrice: 0.01,
    endTime: new Date(now - 1 * day).toISOString(),
    ticketsSold: 9800,
    totalTickets: 10000,
    status: "completed",
  },
];

// ── Mock Tickets ──

export const MOCK_TICKETS: Ticket[] = [
  {
    id: "tkt-a1b2c3d4",
    lotteryId: "sol-mega-jackpot",
    ownerAddress: "7xKX...m9Qf",
    purchaseTime: new Date(now - 1 * day).toISOString(),
    status: "active",
  },
  {
    id: "tkt-e5f6g7h8",
    lotteryId: "sol-mega-jackpot",
    ownerAddress: "7xKX...m9Qf",
    purchaseTime: new Date(now - 1 * day - 2 * hour).toISOString(),
    status: "active",
  },
  {
    id: "tkt-i9j0k1l2",
    lotteryId: "phantom-weekly",
    ownerAddress: "7xKX...m9Qf",
    purchaseTime: new Date(now - 3 * hour).toISOString(),
    status: "active",
  },
  {
    id: "tkt-m3n4o5p6",
    lotteryId: "degen-rush",
    ownerAddress: "7xKX...m9Qf",
    purchaseTime: new Date(now - 6 * hour).toISOString(),
    status: "active",
  },
  {
    id: "tkt-q7r8s9t0",
    lotteryId: "solana-holiday-special",
    ownerAddress: "7xKX...m9Qf",
    purchaseTime: new Date(now - 4 * day).toISOString(),
    status: "won",
  },
  {
    id: "tkt-u1v2w3x4",
    lotteryId: "solana-holiday-special",
    ownerAddress: "7xKX...m9Qf",
    purchaseTime: new Date(now - 4 * day - 1 * hour).toISOString(),
    status: "lost",
  },
  {
    id: "tkt-y5z6a7b8",
    lotteryId: "micro-lotto-daily",
    ownerAddress: "7xKX...m9Qf",
    purchaseTime: new Date(now - 2 * day).toISOString(),
    status: "lost",
  },
  {
    id: "tkt-c9d0e1f2",
    lotteryId: "micro-lotto-daily",
    ownerAddress: "7xKX...m9Qf",
    purchaseTime: new Date(now - 2 * day - 30 * 60000).toISOString(),
    status: "lost",
  },
];

// ── Mock Winners ──

export const MOCK_WINNERS: Winner[] = [
  {
    id: "win-001",
    lotteryId: "solana-holiday-special",
    lotteryName: "Solana Holiday Special",
    winnerAddress: "7xKXp2eRd4Hj9sNmYqWvLzAb3cFgTu8KjDm9Qf",
    prizeAmount: 12750.0,
    drawDate: new Date(now - 3 * day).toISOString(),
    claimed: true,
  },
  {
    id: "win-002",
    lotteryId: "micro-lotto-daily",
    lotteryName: "Micro Lotto Daily",
    winnerAddress: "4kRNs8vWpXm2cD6tYqJ1hLfGbE7uZiA0wP3xMn",
    prizeAmount: 32.5,
    drawDate: new Date(now - 1 * day).toISOString(),
    claimed: false,
  },
  {
    id: "win-003",
    lotteryId: "phantom-weekly",
    lotteryName: "Phantom Weekly Draw",
    winnerAddress: "9pLTx5aVkR1mN7jQyH3sWcF8dG2bEiU6oK4zXr",
    prizeAmount: 645.2,
    drawDate: new Date(now - 8 * day).toISOString(),
    claimed: true,
  },
  {
    id: "win-004",
    lotteryId: "sol-mega-jackpot",
    lotteryName: "SOL Mega Jackpot",
    winnerAddress: "3mBYw6kRdTn0pH8vJfQ5xL2cA9gEiS7uZoK1Xp",
    prizeAmount: 1870.0,
    drawDate: new Date(now - 14 * day).toISOString(),
    claimed: true,
  },
  {
    id: "win-005",
    lotteryId: "degen-rush",
    lotteryName: "Degen Rush",
    winnerAddress: "6jFTp3wVnR8kM5aYdH2sXcL7bG0eEiU9oQ4zKr",
    prizeAmount: 98.4,
    drawDate: new Date(now - 6 * day).toISOString(),
    claimed: false,
  },
];
