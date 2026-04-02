import { Winner } from "../types";
import { getConnection } from "@/solana/connection";
import { getLotteryName } from "@/solana/config";
import {
  getCollectionMintPda,
  getMetadataPda,
  getTicketMintPda,
  getTicketOwnerAta,
  getTokenLotteryPda,
} from "@/solana/pdas";
import {
  fetchGlobalStateAccount,
  fetchTokenLotteryAccount,
} from "@/solana/state";
import { simulateAndSend } from "@/solana/transactions";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import { PROGRAM_ID, TOKEN_METADATA_PROGRAM_ID } from "@/solana/config";
import { MOCK_WINNERS } from "./mockData";
import { getInstructionDiscriminator } from "@/solana/idl";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const CLAIM_WINNINGS_DISCRIMINATOR =
  getInstructionDiscriminator("claim_winnings");

const toNumber = (value: { toString: () => string }) =>
  Number(value.toString());

export const getRecentWinners = async (): Promise<Winner[]> => {
  if (USE_MOCK) return MOCK_WINNERS;

  const { account: globalState } = await fetchGlobalStateAccount();
  if (!globalState) return [];

  const connection = getConnection();
  const totalLotteries = toNumber(globalState.lotteryCount);

  const winners = await Promise.all(
    [...Array(totalLotteries).keys()].map(async (lotteryId) => {
      const { account, tokenLotteryPda } =
        await fetchTokenLotteryAccount(lotteryId);
      if (!account || !account.winnerChosen) return null;

      const [ticketMint] = getTicketMintPda(tokenLotteryPda, account.winner);
      let winnerAddress = "Unknown";
      try {
        const largest = await connection.getTokenLargestAccounts(ticketMint);
        const largestAccount = largest.value[0];
        if (largestAccount?.address) {
          const tokenAccount = await getAccount(
            connection,
            largestAccount.address,
            "confirmed",
          );
          winnerAddress = tokenAccount.owner.toBase58();
        }
      } catch (error) {
        console.warn("Failed to resolve winner address.", error);
      }

      const endTime = toNumber(account.endTime);
      const drawDate = Number.isFinite(endTime)
        ? new Date(endTime * 1000).toISOString()
        : new Date(Date.now()).toISOString();

      return {
        id: `winner-${lotteryId}`,
        lotteryId: String(lotteryId),
        lotteryName: `${getLotteryName()} #${lotteryId}`,
        winnerAddress,
        prizeAmount: toNumber(account.lotteryPotAmount) / LAMPORTS_PER_SOL,
        drawDate,
        claimed: false,
      } as Winner;
    }),
  );

  return winners
    .filter((winner): winner is Winner => Boolean(winner))
    .sort((a, b) => Number(b.lotteryId) - Number(a.lotteryId));
};

export const checkWinnings = async (
  walletAddress: string,
): Promise<Winner[]> => {
  if (!walletAddress) return [];
  if (USE_MOCK) return MOCK_WINNERS.filter((w) => !w.claimed);

  const { account: globalState } = await fetchGlobalStateAccount();
  if (!globalState) return [];

  const connection = getConnection();
  const owner = new PublicKey(walletAddress);
  const totalLotteries = toNumber(globalState.lotteryCount);

  const winnings = await Promise.all(
    [...Array(totalLotteries).keys()].map(async (lotteryId) => {
      const { account, tokenLotteryPda } =
        await fetchTokenLotteryAccount(lotteryId);
      if (!account || !account.winnerChosen) return null;

      const [ticketMint] = getTicketMintPda(tokenLotteryPda, account.winner);
      const destination = await getTicketOwnerAta(
        owner,
        ticketMint,
        TOKEN_PROGRAM_ID,
      );

      try {
        const tokenAccount = await getAccount(
          connection,
          destination,
          "confirmed",
        );
        if (!tokenAccount.amount || tokenAccount.amount === BigInt(0)) {
          return null;
        }
      } catch {
        return null;
      }

      const endTime = toNumber(account.endTime);
      const drawDate = Number.isFinite(endTime)
        ? new Date(endTime * 1000).toISOString()
        : new Date(Date.now()).toISOString();

      return {
        id: `winner-${lotteryId}`,
        lotteryId: String(lotteryId),
        lotteryName: `${getLotteryName()} #${lotteryId}`,
        winnerAddress: walletAddress,
        prizeAmount: toNumber(account.lotteryPotAmount) / LAMPORTS_PER_SOL,
        drawDate,
        claimed: false,
      } as Winner;
    }),
  );

  return winnings
    .filter((winner): winner is Winner => Boolean(winner))
    .sort((a, b) => Number(b.lotteryId) - Number(a.lotteryId));
};

interface ClaimInput {
  winnerId: string;
  lotteryId: string;
  walletAddress: string;
  wallet: {
    publicKey: NonNullable<
      import("@solana/wallet-adapter-react").WalletContextState["publicKey"]
    > | null;
    sendTransaction: import("@solana/wallet-adapter-react").WalletContextState["sendTransaction"];
    signTransaction?: import("@solana/wallet-adapter-react").WalletContextState["signTransaction"];
    signAllTransactions?: import("@solana/wallet-adapter-react").WalletContextState["signAllTransactions"];
  };
  connection: ReturnType<typeof getConnection>;
}

export const claimPrize = async ({
  winnerId,
  lotteryId,
  walletAddress,
  wallet,
  connection,
}: ClaimInput): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  if (!winnerId) {
    return { success: false, error: "Winner record not found" };
  }

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

  if (wallet.publicKey.toBase58() !== walletAddress) {
    return { success: false, error: "Wallet mismatch" };
  }

  const { account } = await fetchTokenLotteryAccount(parsedLotteryId);
  if (!account) {
    return { success: false, error: "Lottery account not initialized" };
  }

  const [tokenLottery] = getTokenLotteryPda(parsedLotteryId);
  const [collectionMint] = getCollectionMintPda(tokenLottery);
  const [collectionMetadata] = getMetadataPda(collectionMint);
  const [ticketMint] = getTicketMintPda(tokenLottery, account.winner);
  const [metadata] = getMetadataPda(ticketMint);
  const destination = await getTicketOwnerAta(
    wallet.publicKey,
    ticketMint,
    TOKEN_PROGRAM_ID,
  );

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: tokenLottery, isSigner: false, isWritable: true },
      { pubkey: collectionMint, isSigner: false, isWritable: true },
      { pubkey: ticketMint, isSigner: false, isWritable: false },
      { pubkey: metadata, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: false },
      { pubkey: collectionMetadata, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      {
        pubkey: TOKEN_METADATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
    ],
    data: Buffer.concat([
      CLAIM_WINNINGS_DISCRIMINATOR,
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
      error: error instanceof Error ? error.message : "Transaction failed",
    };
  }
};
