import { PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  COLLECTION_MINT_SEED,
  PROGRAM_ID,
  TOKEN_LOTTERY_SEED,
  TOKEN_METADATA_PROGRAM_ID,
} from "./config";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

const toU64Seed = (value: BN | number) => {
  const bn = BN.isBN(value) ? value : new BN(value);
  return bn.toArrayLike(Buffer, "le", 8);
};

const COLLECTION_TOKEN_ACCOUNT_SEED = "collection_associated_token";

export const getTokenLotteryPda = (lotteryId: BN | number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from(TOKEN_LOTTERY_SEED), toU64Seed(lotteryId)],
    PROGRAM_ID,
  );

export const getGlobalStatePda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("global_state")], PROGRAM_ID);

export const getCollectionMintPda = (tokenLottery: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECTION_MINT_SEED), tokenLottery.toBuffer()],
    PROGRAM_ID,
  );

export const getCollectionTokenAccountPda = (tokenLottery: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from(COLLECTION_TOKEN_ACCOUNT_SEED), tokenLottery.toBuffer()],
    PROGRAM_ID,
  );

export const getTicketMintPda = (
  tokenLottery: PublicKey,
  ticketIndex: BN | number,
) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("ticket"), tokenLottery.toBuffer(), toU64Seed(ticketIndex)],
    PROGRAM_ID,
  );

export const getMetadataPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );

export const getMasterEditionPda = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );

export const getTicketOwnerAta = async (
  owner: PublicKey,
  mint: PublicKey,
  tokenProgramId: PublicKey,
) =>
  getAssociatedTokenAddress(
    mint,
    owner,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
