import { Lottery } from "../types";
import type { Connection } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  getLotteryName,
  getMaxTickets,
} from "@/solana/config";
import { fetchTokenLotteryAccount } from "@/solana/state";
import {
  getCollectionMintPda,
  getMasterEditionPda,
  getMetadataPda,
  getTicketMintPda,
  getTicketOwnerAta,
  getTokenLotteryPda,
} from "@/solana/pdas";
import { simulateAndSend } from "@/solana/transactions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import { PROGRAM_ID } from "@/solana/config";
import { MOCK_LOTTERIES } from "./mockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const LOTTERY_ID = "token-lottery";
const BUY_TICKET_DISCRIMINATOR = Buffer.from([
  11, 24, 17, 193, 168, 116, 164, 169,
]);

const toNumber = (value: { toString: () => string }) =>
  Number(value.toString());

const resolveStatus = (nowMs: number, startMs: number, endMs: number) => {
  if (nowMs < startMs) return "upcoming" as const;
  if (nowMs > endMs) return "completed" as const;
  return "active" as const;
};

const mapLottery = (
  account: NonNullable<
    Awaited<ReturnType<typeof fetchTokenLotteryAccount>>["account"]
  >,
): Lottery => {
  const nowMs = Date.now();
  const startMs = toNumber(account.startTime) * 1000;
  const endMs = toNumber(account.endTime) * 1000;
  const ticketsSold = toNumber(account.totalTickets);
  const maxTickets = getMaxTickets();
  const totalTickets = maxTickets > 0 ? maxTickets : ticketsSold;

  return {
    id: LOTTERY_ID,
    name: getLotteryName(),
    jackpot: toNumber(account.lotteryPotAmount) / LAMPORTS_PER_SOL,
    ticketPrice: toNumber(account.ticketPrice) / LAMPORTS_PER_SOL,
    endTime: new Date(endMs).toISOString(),
    ticketsSold,
    totalTickets,
    status: resolveStatus(nowMs, startMs, endMs),
  };
};

export const getLotteries = async (): Promise<Lottery[]> => {
  if (USE_MOCK) return MOCK_LOTTERIES;
  const { account } = await fetchTokenLotteryAccount();
  if (!account) return [];
  return [mapLottery(account)];
};

export const getLotteryById = async (
  id: string,
): Promise<Lottery | undefined> => {
  if (USE_MOCK) return MOCK_LOTTERIES.find((l) => l.id === id) || MOCK_LOTTERIES[0];
  const lotteries = await getLotteries();
  return lotteries.find((l) => l.id === id) || lotteries[0];
};

interface BuyTicketsInput {
  lotteryId: string;
  count: number;
  wallet: {
    publicKey: NonNullable<
      import("@solana/wallet-adapter-react").WalletContextState["publicKey"]
    > | null;
    sendTransaction: import("@solana/wallet-adapter-react").WalletContextState["sendTransaction"];
    signTransaction?: import("@solana/wallet-adapter-react").WalletContextState["signTransaction"];
    signAllTransactions?: import("@solana/wallet-adapter-react").WalletContextState["signAllTransactions"];
  };
  connection: Connection;
}

export const buyTickets = async ({
  lotteryId,
  count,
  wallet,
  connection,
}: BuyTicketsInput): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  if (lotteryId !== LOTTERY_ID) {
    return { success: false, error: "Lottery not found" };
  }

  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  if (!wallet.signTransaction || !wallet.signAllTransactions) {
    return { success: false, error: "Wallet cannot sign transactions" };
  }

  const [tokenLotteryPda] = getTokenLotteryPda();
  const [collectionMint] = getCollectionMintPda();
  const [collectionMetadata] = getMetadataPda(collectionMint);
  const [collectionMasterEdition] = getMasterEditionPda(collectionMint);

  let lastSignature: string | undefined;

  for (let i = 0; i < count; i += 1) {
    const { account } = await fetchTokenLotteryAccount();
    if (!account) {
      return { success: false, error: "Lottery account not initialized" };
    }

    const [ticketMint] = getTicketMintPda(account.totalTickets);
    const [ticketMetadata] = getMetadataPda(ticketMint);
    const [ticketMasterEdition] = getMasterEditionPda(ticketMint);
    const destination = await getTicketOwnerAta(
      wallet.publicKey,
      ticketMint,
      TOKEN_PROGRAM_ID,
    );

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: true,
        },
        { pubkey: tokenLotteryPda, isSigner: false, isWritable: true },
        { pubkey: ticketMint, isSigner: false, isWritable: true },
        { pubkey: ticketMetadata, isSigner: false, isWritable: true },
        { pubkey: ticketMasterEdition, isSigner: false, isWritable: true },
        { pubkey: collectionMetadata, isSigner: false, isWritable: true },
        { pubkey: collectionMasterEdition, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: TOKEN_METADATA_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: collectionMint, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      data: BUY_TICKET_DISCRIMINATOR,
    });

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;

    try {
      lastSignature = await simulateAndSend({
        connection,
        transaction,
        sendTransaction: wallet.sendTransaction,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transaction failed",
      };
    }
  }

  return { success: true, txHash: lastSignature };
};

export const getLotteryStats = async () => {
  const lotteries = await getLotteries();
  const active = lotteries.filter((lottery) => lottery.status === "active");
  const totalPoolActive = active.reduce(
    (sum, lottery) => sum + lottery.jackpot,
    0,
  );
  const totalTicketsSold = active.reduce(
    (sum, lottery) => sum + lottery.ticketsSold,
    0,
  );

  return {
    totalPoolActive,
    totalParticipants: totalTicketsSold,
    totalTicketsSold,
  };
};

