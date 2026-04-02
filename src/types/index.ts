export interface Lottery {
  id: string;
  name: string;
  jackpot: number; // in SOL
  ticketPrice: number; // in lamports
  endTime: string; // ISO date string
  ticketsSold: number;
  totalTickets: number; // Max tickets available (or tickets sold when unlimited)
  maxTickets: number | null; // null means unlimited
  status: "active" | "upcoming" | "completed";
}

export interface Ticket {
  id: string;
  lotteryId: string;
  ownerAddress: string;
  purchaseTime: string; // ISO date string
  status: "active" | "won" | "lost";
}

export interface Winner {
  id: string;
  lotteryId: string;
  lotteryName: string;
  winnerAddress: string;
  prizeAmount: number; // in SOL
  drawDate: string; // ISO date string
  claimed: boolean;
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  balance: number; // in SOL
}
