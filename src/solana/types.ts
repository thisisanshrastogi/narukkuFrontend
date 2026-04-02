import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export interface TokenLotteryAccount {
  bump: number;
  winner: BN;
  winnerChosen: boolean;
  startTime: BN;
  endTime: BN;
  lotteryPotAmount: BN;
  totalTickets: BN;
  authority: PublicKey;
  randomnessAccount: PublicKey;
  ticketPrice: BN;
  id: BN;
}

export interface GlobalStateAccount {
  lotteryCount: BN;
}
