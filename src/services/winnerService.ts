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
import { fetchTokenLotteryAccount } from "@/solana/state";
import { simulateAndSend } from "@/solana/transactions";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import { PROGRAM_ID, TOKEN_METADATA_PROGRAM_ID } from "@/solana/config";
import { MOCK_WINNERS } from "./mockData";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const LOTTERY_ID = "token-lottery";
const CLAIM_WINNINGS_DISCRIMINATOR = Buffer.from([
  161, 215, 24, 59, 14, 236, 242, 221,
]);

const toNumber = (value: { toString: () => string }) =>
  Number(value.toString());

export const getRecentWinners = async (): Promise<Winner[]> => {
  if (USE_MOCK) return MOCK_WINNERS;

  const { account } = await fetchTokenLotteryAccount();
  if (!account || !account.winnerChosen) return [];

  const connection = getConnection();
  const [ticketMint] = getTicketMintPda(account.winner);

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

  return [
    {
      id: "winner-current",
      lotteryId: LOTTERY_ID,
      lotteryName: getLotteryName(),
      winnerAddress,
      prizeAmount: toNumber(account.lotteryPotAmount) / LAMPORTS_PER_SOL,
      drawDate: new Date(toNumber(account.endTime) * 1000).toISOString(),
      claimed: false,
    },
  ];
};

export const checkWinnings = async (
  walletAddress: string,
): Promise<Winner[]> => {
  if (!walletAddress) return [];
  if (USE_MOCK) return MOCK_WINNERS.filter((w) => !w.claimed);

  const { account } = await fetchTokenLotteryAccount();
  if (!account || !account.winnerChosen) return [];

  const connection = getConnection();
  const [ticketMint] = getTicketMintPda(account.winner);
  const owner = new PublicKey(walletAddress);
  const destination = await getTicketOwnerAta(owner, ticketMint, TOKEN_PROGRAM_ID);

  try {
    const tokenAccount = await getAccount(connection, destination, "confirmed");
    if (!tokenAccount.amount || tokenAccount.amount === BigInt(0)) {
      return [];
    }
  } catch {
    return [];
  }

  return [
    {
      id: "winner-current",
      lotteryId: LOTTERY_ID,
      lotteryName: getLotteryName(),
      winnerAddress: walletAddress,
      prizeAmount: toNumber(account.lotteryPotAmount) / LAMPORTS_PER_SOL,
      drawDate: new Date(toNumber(account.endTime) * 1000).toISOString(),
      claimed: false,
    },
  ];
};

interface ClaimInput {
  winnerId: string;
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
  walletAddress,
  wallet,
  connection,
}: ClaimInput): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> => {
  if (winnerId !== "winner-current") {
    return { success: false, error: "Winner record not found" };
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

  const { account } = await fetchTokenLotteryAccount();
  if (!account) {
    return { success: false, error: "Lottery account not initialized" };
  }

  const [tokenLottery] = getTokenLotteryPda();
  const [collectionMint] = getCollectionMintPda();
  const [collectionMetadata] = getMetadataPda(collectionMint);
  const [ticketMint] = getTicketMintPda(account.winner);
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
    data: CLAIM_WINNINGS_DISCRIMINATOR,
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
