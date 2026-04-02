import { Ticket } from "../types";
import { getConnection } from "@/solana/connection";
import {
  fetchGlobalStateAccount,
  fetchTokenLotteryAccount,
} from "@/solana/state";
import { getTicketMintPda } from "@/solana/pdas";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { MOCK_TICKETS } from "./mockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
const toNumber = (value: { toString: () => string }) =>
  Number(value.toString());

const resolveTicketStatus = (
  ticketIndex: number,
  winnerChosen: boolean,
  winnerIndex: number,
) => {
  if (!winnerChosen) return "active" as const;
  return ticketIndex === winnerIndex ? ("won" as const) : ("lost" as const);
};

const getAllTicketMints = (tokenLottery: PublicKey, totalTickets: number) => {
  const mints = new Map<string, number>();
  for (let i = 0; i < totalTickets; i += 1) {
    const [mint] = getTicketMintPda(tokenLottery, i);
    mints.set(mint.toBase58(), i);
  }
  return mints;
};

export const getAllTickets = async (): Promise<Ticket[]> => {
  if (USE_MOCK) return MOCK_TICKETS;

  const { account: globalState } = await fetchGlobalStateAccount();
  if (!globalState) return [];

  const totalLotteries = toNumber(globalState.lotteryCount);
  const purchaseTime = new Date().toISOString();

  const ticketsByLottery = await Promise.all(
    [...Array(totalLotteries).keys()].map(async (lotteryId) => {
      const { account, tokenLotteryPda } =
        await fetchTokenLotteryAccount(lotteryId);
      if (!account) return [] as Ticket[];

      const totalTickets = toNumber(account.totalTickets);
      const winnerChosen = account.winnerChosen;
      const winnerIndex = toNumber(account.winner);

      return [...Array(totalTickets).keys()].map((i) => ({
        id: `ticket-${lotteryId}-${i + 1}`,
        lotteryId: String(lotteryId),
        ownerAddress: "",
        purchaseTime,
        status: resolveTicketStatus(i, winnerChosen, winnerIndex),
      }));
    }),
  );

  return ticketsByLottery.flat();
};

export const getMyTickets = async (
  walletAddress: string,
): Promise<Ticket[]> => {
  if (!walletAddress) return [];
  if (USE_MOCK) return MOCK_TICKETS;

  const { account: globalState } = await fetchGlobalStateAccount();
  if (!globalState) return [];

  const connection = getConnection();
  const owner = new PublicKey(walletAddress);
  const totalLotteries = toNumber(globalState.lotteryCount);
  const purchaseTime = new Date().toISOString();

  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });

  const ticketsByLottery = await Promise.all(
    [...Array(totalLotteries).keys()].map(async (lotteryId) => {
      const { account, tokenLotteryPda } =
        await fetchTokenLotteryAccount(lotteryId);
      if (!account) return [] as Ticket[];

      const totalTickets = toNumber(account.totalTickets);
      if (totalTickets === 0) return [] as Ticket[];

      const mintIndexLookup = getAllTicketMints(tokenLotteryPda, totalTickets);
      const winnerChosen = account.winnerChosen;
      const winnerIndex = toNumber(account.winner);

      return tokenAccounts.value
        .map((item) => {
          const info = item.account.data.parsed.info as {
            mint: string;
            tokenAmount: { amount: string };
          };
          const index = mintIndexLookup.get(info.mint);
          if (index === undefined) return null;
          if (info.tokenAmount.amount === "0") return null;

          return {
            id: `ticket-${lotteryId}-${index + 1}`,
            lotteryId: String(lotteryId),
            ownerAddress: walletAddress,
            purchaseTime,
            status: resolveTicketStatus(index, winnerChosen, winnerIndex),
          } as Ticket;
        })
        .filter((ticket): ticket is Ticket => Boolean(ticket));
    }),
  );

  return ticketsByLottery.flat();
};

export const getTicketDetails = async (
  _ticketId: string,
): Promise<Ticket | undefined> => {
  if (USE_MOCK) return MOCK_TICKETS.find((t) => t.id === _ticketId);
  return undefined;
};
