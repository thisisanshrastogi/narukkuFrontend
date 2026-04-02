import { Lottery } from "../types";
import { BN } from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";
import { PROGRAM_ID } from "@/solana/config";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  getLotteryName,
  getMaxTickets,
} from "@/solana/config";
import {
  fetchGlobalStateAccount,
  fetchTokenLotteryAccount,
} from "@/solana/state";
import {
  getCollectionTokenAccountPda,
  getCollectionMintPda,
  getGlobalStatePda,
  getMasterEditionPda,
  getMetadataPda,
  getTicketMintPda,
  getTicketOwnerAta,
  getTokenLotteryPda,
} from "@/solana/pdas";
import { getProgramForWrite } from "@/solana/program";
import { simulateAndSend } from "@/solana/transactions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import { MOCK_LOTTERIES } from "./mockData";
import { getInstructionDiscriminator } from "@/solana/idl";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const BUY_TICKET_DISCRIMINATOR = getInstructionDiscriminator("buy_ticket");

const toNumber = (value: { toString: () => string }) =>
  Number(value.toString());

const resolveStatus = (
  currentTime: number,
  startTime: number,
  endTime: number,
) => {
  if (currentTime < startTime) return "upcoming" as const;
  if (currentTime > endTime) return "completed" as const;
  return "active" as const;
};

const mapLottery = (
  account: NonNullable<
    Awaited<ReturnType<typeof fetchTokenLotteryAccount>>["account"]
  >,
  currentTime: number,
  endTimeIso: string,
): Lottery => {
  const startTime = toNumber(account.startTime);
  const endTime = toNumber(account.endTime);
  const ticketsSold = toNumber(account.totalTickets);
  const maxTickets = getMaxTickets();
  const resolvedMaxTickets = maxTickets > 0 ? maxTickets : null;
  const totalTickets = resolvedMaxTickets ?? Math.max(ticketsSold, 0);

  const id = account.id.toString();

  return {
    id,
    name: `${getLotteryName()} #${id}`,
    jackpot: toNumber(account.lotteryPotAmount) / LAMPORTS_PER_SOL,
    ticketPrice: toNumber(account.ticketPrice),
    endTime: endTimeIso,
    ticketsSold,
    totalTickets,
    maxTickets: resolvedMaxTickets,
    status: resolveStatus(currentTime, startTime, endTime),
  };
};

export const getLotteries = async (): Promise<Lottery[]> => {
  if (USE_MOCK) {
    console.debug("[lotteryService] using mock lotteries", {
      count: MOCK_LOTTERIES.length,
    });
    return MOCK_LOTTERIES;
  }

  const { account: globalState } = await fetchGlobalStateAccount();
  if (!globalState) {
    console.debug("[lotteryService] global state not found");
    return [];
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const totalCount = toNumber(globalState.lotteryCount);

  const lotteries = await Promise.all(
    [...Array(totalCount).keys()].map(async (lotteryId) => {
      const { account } = await fetchTokenLotteryAccount(lotteryId);
      if (!account) return null;

      const endTime = toNumber(account.endTime);
      const endTimeIso = Number.isFinite(endTime)
        ? new Date(endTime * 1000).toISOString()
        : new Date(Date.now()).toISOString();

      return mapLottery(account, currentTime, endTimeIso);
    }),
  );

  const mapped = lotteries.filter((lottery): lottery is Lottery =>
    Boolean(lottery),
  );
  const sorted = mapped.sort((a, b) => Number(b.id) - Number(a.id));
  console.debug("[lotteryService] on-chain lotteries", sorted);
  return sorted;
};

export const getLotteryById = async (
  id: string,
): Promise<Lottery | undefined> => {
  if (USE_MOCK) {
    const match = MOCK_LOTTERIES.find((l) => l.id === id) || MOCK_LOTTERIES[0];
    console.debug("[lotteryService] getLotteryById mock", { id, match });
    return match;
  }
  const lotteries = await getLotteries();
  const match = lotteries.find((l) => l.id === id) || lotteries[0];
  console.debug("[lotteryService] getLotteryById on-chain", { id, match });
  return match;
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
  const parsedLotteryId = Number(lotteryId);
  if (!Number.isFinite(parsedLotteryId) || parsedLotteryId < 0) {
    return { success: false, error: "Invalid lottery id" };
  }

  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  if (!wallet.signTransaction || !wallet.signAllTransactions) {
    return { success: false, error: "Wallet cannot sign transactions" };
  }

  const [tokenLotteryPda] = getTokenLotteryPda(parsedLotteryId);
  const [collectionMint] = getCollectionMintPda(tokenLotteryPda);
  const [collectionMetadata] = getMetadataPda(collectionMint);
  const [collectionMasterEdition] = getMasterEditionPda(collectionMint);

  let lastSignature: string | undefined;

  for (let i = 0; i < count; i += 1) {
    const { account } = await fetchTokenLotteryAccount(parsedLotteryId);
    if (!account) {
      return { success: false, error: "Lottery account not initialized" };
    }

    const maxTickets = getMaxTickets();
    if (maxTickets > 0 && toNumber(account.totalTickets) >= maxTickets) {
      return { success: false, error: "All tickets sold out" };
    }

    const [ticketMint] = getTicketMintPda(
      tokenLotteryPda,
      account.totalTickets,
    );
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
      data: Buffer.concat([
        BUY_TICKET_DISCRIMINATOR,
        new BN(parsedLotteryId).toArrayLike(Buffer, "le", 8),
      ]),
    });

    const transaction = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      instruction,
    );
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

interface InitializeConfigInput {
  lotteryId: number;
  startSlot: number;
  endSlot: number;
  ticketPriceLamports: number;
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

export const initializeConfig = async ({
  lotteryId,
  startSlot,
  endSlot,
  ticketPriceLamports,
  wallet,
  connection,
}: InitializeConfigInput): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  if (!wallet.signTransaction || !wallet.signAllTransactions) {
    return { success: false, error: "Wallet cannot sign transactions" };
  }

  const [tokenLotteryPda] = getTokenLotteryPda(lotteryId);
  const { account: globalState } = await fetchGlobalStateAccount();
  const [globalStatePda] = getGlobalStatePda();
  if (!globalState) {
    return { success: false, error: "Global state not initialized" };
  }
  const program = await getProgramForWrite(connection, {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  });

  try {
    const instruction = await program.methods
      .initializeConfig(
        new BN(Math.floor(lotteryId)),
        new BN(Math.floor(startSlot)),
        new BN(Math.floor(endSlot)),
        new BN(Math.floor(ticketPriceLamports)),
      )
      .accounts({
        payer: wallet.publicKey,
        tokenLottery: tokenLotteryPda,
        globalState: globalStatePda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;

    const signature = await simulateAndSend({
      connection,
      transaction,
      sendTransaction: wallet.sendTransaction,
    });

    return { success: true, txHash: signature };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Initialize config failed",
    };
  }
};

interface InitializeLotteryInput {
  lotteryId: number;
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

export const initializeLottery = async ({
  lotteryId,
  wallet,
  connection,
}: InitializeLotteryInput): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  if (!wallet.signTransaction || !wallet.signAllTransactions) {
    return { success: false, error: "Wallet cannot sign transactions" };
  }

  const [tokenLottery] = getTokenLotteryPda(lotteryId);
  const [collectionMint] = getCollectionMintPda(tokenLottery);
  const [collectionTokenAccount] = getCollectionTokenAccountPda(tokenLottery);
  const [metadata] = getMetadataPda(collectionMint);
  const [masterEdition] = getMasterEditionPda(collectionMint);

  const program = await getProgramForWrite(connection, {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  });

  try {
    const instruction = await program.methods
      .initializeLottery(new BN(Math.floor(lotteryId)))
      .accounts({
        payer: wallet.publicKey,
        collectionMint,
        tokenLottery,
        collectionTokenAccount,
        metadata,
        masterEdition,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    const transaction = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      instruction,
    );
    transaction.feePayer = wallet.publicKey;

    const signature = await simulateAndSend({
      connection,
      transaction,
      sendTransaction: wallet.sendTransaction,
    });

    return { success: true, txHash: signature };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Initialize lottery failed",
    };
  }
};

interface InitializeGlobalStateInput {
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

export const initializeGlobalState = async ({
  wallet,
  connection,
}: InitializeGlobalStateInput): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  if (!wallet.signTransaction || !wallet.signAllTransactions) {
    return { success: false, error: "Wallet cannot sign transactions" };
  }

  const [globalStatePda] = getGlobalStatePda();
  const program = await getProgramForWrite(connection, {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  });

  try {
    const instruction = await program.methods
      .initializeGlobalState()
      .accounts({
        payer: wallet.publicKey,
        globalState: globalStatePda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;

    const signature = await simulateAndSend({
      connection,
      transaction,
      sendTransaction: wallet.sendTransaction,
    });

    return { success: true, txHash: signature };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Initialize global state failed",
    };
  }
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
