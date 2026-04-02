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
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import { MOCK_LOTTERIES } from "./mockData";
import { getInstructionDiscriminator } from "@/solana/idl";
import { getConnection } from "@/solana/connection";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const BUY_TICKET_DISCRIMINATOR = getInstructionDiscriminator("buy_ticket");
const COMMIT_RANDOMNESS_DISCRIMINATOR =
  getInstructionDiscriminator("commit_randomness");
const REVEAL_WINNER_DISCRIMINATOR =
  getInstructionDiscriminator("reveal_winner");

const formatWalletError = (error: unknown) => {
  if (error instanceof Error) {
    const anyError = error as { cause?: unknown; error?: unknown };
    const detail = anyError.cause ?? anyError.error;
    const detailText = detail ? ` | Details: ${JSON.stringify(detail)}` : "";
    return `${error.name}: ${error.message}${detailText}`;
  }

  if (typeof error === "string") {
    return error;
  }

  return JSON.stringify(error);
};

const toNumber = (value: { toString: () => string }) =>
  Number(value.toString());

const resolveWinnerAddress = async (
  tokenLotteryPda: PublicKey,
  winnerTicket: { toString: () => string },
) => {
  const connection = getConnection();
  try {
    const winnerIndex = toNumber(winnerTicket);
    if (!Number.isFinite(winnerIndex) || winnerIndex < 0) return null;

    const [ticketMint] = getTicketMintPda(tokenLotteryPda, winnerTicket);
    const largest = await connection.getTokenLargestAccounts(ticketMint);
    const largestAccount = largest.value[0];
    if (!largestAccount?.address) return null;

    const tokenAccount = await getAccount(
      connection,
      largestAccount.address,
      "confirmed",
    );
    return tokenAccount.owner.toBase58();
  } catch (error) {
    console.warn("Failed to resolve winner address.", error);
    return null;
  }
};

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
  winnerAddress: string | null,
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
    winnerAddress,
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

      const winnerAddress = account.winnerChosen
        ? await resolveWinnerAddress(
            getTokenLotteryPda(lotteryId)[0],
            account.winner,
          )
        : null;

      const endTime = toNumber(account.endTime);
      const endTimeIso = Number.isFinite(endTime)
        ? new Date(endTime * 1000).toISOString()
        : new Date(Date.now()).toISOString();

      return mapLottery(account, currentTime, endTimeIso, winnerAddress);
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

interface CreateRandomnessInput {
  wallet: {
    publicKey: NonNullable<
      import("@solana/wallet-adapter-react").WalletContextState["publicKey"]
    > | null;
    sendTransaction: import("@solana/wallet-adapter-react").WalletContextState["sendTransaction"];
    signTransaction?: import("@solana/wallet-adapter-react").WalletContextState["signTransaction"];
  };
  connection: Connection;
}

export const createRandomnessAccount = async ({
  wallet,
  connection,
}: CreateRandomnessInput): Promise<{
  success: boolean;
  randomnessAccount?: PublicKey;
  txHash?: string;
  error?: string;
}> => {
  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  if (!wallet.signTransaction) {
    return { success: false, error: "Wallet cannot sign transactions" };
  }

  const randomnessKeypair = Keypair.generate();
  try {
    const response = await fetch("/api/randomness/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payer: wallet.publicKey.toBase58(),
        randomness: randomnessKeypair.publicKey.toBase58(),
        randomnessSecret: Buffer.from(randomnessKeypair.secretKey).toString(
          "base64",
        ),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          typeof payload.error === "string"
            ? payload.error
            : "Randomness account creation failed",
      };
    }

    const payload = (await response.json()) as {
      randomnessAccount: string;
      instruction: {
        programId: string;
        data: string;
        keys: Array<{
          pubkey: string;
          isSigner: boolean;
          isWritable: boolean;
        }>;
      };
    };

    const createIx = new TransactionInstruction({
      programId: new PublicKey(payload.instruction.programId),
      data: Buffer.from(payload.instruction.data, "base64"),
      keys: payload.instruction.keys.map((key) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
    });

    const randomnessAccount = new PublicKey(payload.randomnessAccount);

    const transaction = new Transaction().add(createIx);
    transaction.feePayer = wallet.publicKey;

    const latest = await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = latest.blockhash;
    transaction.setSigners(wallet.publicKey, randomnessKeypair.publicKey);

    let signedByWallet: Transaction;
    try {
      signedByWallet = (await wallet.signTransaction(
        transaction,
      )) as Transaction;
    } catch (error) {
      throw new Error(formatWalletError(error));
    }

    signedByWallet.partialSign(randomnessKeypair);

    try {
      const simulation = await connection.simulateTransaction(signedByWallet, {
        sigVerify: false,
      });

      if (simulation.value.err) {
        const error = JSON.stringify(simulation.value.err);
        const logs = simulation.value.logs ?? [];
        const logBlock = logs.length ? `\nLogs:\n${logs.join("\n")}` : "";
        throw new Error(`Simulation failed: ${error}${logBlock}`);
      }
    } catch (error) {
      const message = formatWalletError(error);
      if (!message.toLowerCase().includes("invalid arguments")) {
        throw new Error(message);
      }
      console.warn("[createRandomnessAccount] simulation skipped", message);
    }

    let signature: string;
    try {
      signature = await connection.sendRawTransaction(
        signedByWallet.serialize(),
        {
          skipPreflight: true,
          maxRetries: 3,
        },
      );
    } catch (error) {
      throw new Error(formatWalletError(error));
    }

    await connection.confirmTransaction({ signature, ...latest }, "confirmed");

    const accountInfo = await connection.getAccountInfo(
      randomnessAccount,
      "confirmed",
    );

    if (!accountInfo) {
      throw new Error("Randomness account not found after creation.");
    }

    if (accountInfo.data.length < 8) {
      throw new Error("Randomness account data is not initialized.");
    }

    const expectedOwner = new PublicKey(payload.instruction.programId);
    if (!accountInfo.owner.equals(expectedOwner)) {
      throw new Error("Randomness account owner mismatch.");
    }

    return {
      success: true,
      randomnessAccount,
      txHash: signature,
    };
  } catch (error) {
    console.error("[createRandomnessAccount] failed", error);
    return {
      success: false,
      error: formatWalletError(error) || "Randomness account creation failed",
    };
  }
};

interface RandomnessInstructionInput {
  lotteryId: number;
  randomnessAccount: string;
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

export const commitRandomness = async ({
  lotteryId,
  randomnessAccount,
  wallet,
  connection,
}: RandomnessInstructionInput): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  const parsedLotteryId = Number(lotteryId);
  if (!Number.isFinite(parsedLotteryId) || parsedLotteryId < 0) {
    return { success: false, error: "Invalid lottery id" };
  }

  let randomnessPubkey: PublicKey;
  try {
    randomnessPubkey = new PublicKey(randomnessAccount);
  } catch {
    return { success: false, error: "Invalid randomness account" };
  }

  const randomnessInfo = await connection.getAccountInfo(
    randomnessPubkey,
    "confirmed",
  );

  if (!randomnessInfo) {
    return {
      success: false,
      error: "Randomness account not found. Create it first.",
    };
  }

  if (randomnessInfo.data.length < 8) {
    return {
      success: false,
      error: "Randomness account is not initialized.",
    };
  }

  const [tokenLotteryPda] = getTokenLotteryPda(parsedLotteryId);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: tokenLotteryPda, isSigner: false, isWritable: true },
      { pubkey: randomnessPubkey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      COMMIT_RANDOMNESS_DISCRIMINATOR,
      new BN(parsedLotteryId).toArrayLike(Buffer, "le", 8),
    ]),
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;

  try {
    const signature = await simulateAndSend({
      connection,
      transaction,
      sendTransaction: wallet.sendTransaction,
    });

    return { success: true, txHash: signature };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Commit failed",
    };
  }
};

export const revealWinner = async ({
  lotteryId,
  randomnessAccount,
  wallet,
  connection,
}: RandomnessInstructionInput): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  if (!wallet.publicKey) {
    return { success: false, error: "Wallet not connected" };
  }

  const parsedLotteryId = Number(lotteryId);
  if (!Number.isFinite(parsedLotteryId) || parsedLotteryId < 0) {
    return { success: false, error: "Invalid lottery id" };
  }

  let randomnessPubkey: PublicKey;
  try {
    randomnessPubkey = new PublicKey(randomnessAccount);
  } catch {
    return { success: false, error: "Invalid randomness account" };
  }

  const [tokenLotteryPda] = getTokenLotteryPda(parsedLotteryId);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: tokenLotteryPda, isSigner: false, isWritable: true },
      { pubkey: randomnessPubkey, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      REVEAL_WINNER_DISCRIMINATOR,
      new BN(parsedLotteryId).toArrayLike(Buffer, "le", 8),
    ]),
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;

  try {
    const signature = await simulateAndSend({
      connection,
      transaction,
      sendTransaction: wallet.sendTransaction,
    });

    return { success: true, txHash: signature };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reveal failed",
    };
  }
};
