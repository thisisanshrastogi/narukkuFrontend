import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./connection";
import { PROGRAM_ID } from "./config";
import { getGlobalStatePda, getTokenLotteryPda } from "./pdas";
import type { GlobalStateAccount, TokenLotteryAccount } from "./types";
import { getAccountDiscriminator } from "./idl";

const TOKEN_LOTTERY_DISCRIMINATOR = getAccountDiscriminator("TokenLottery");
const GLOBAL_STATE_DISCRIMINATOR = getAccountDiscriminator("GlobalState");

const readU64 = (buffer: Buffer, offset: number) =>
  new BN(buffer.subarray(offset, offset + 8), "le");

const decodeTokenLotteryAccount = (data: Buffer): TokenLotteryAccount => {
  const discriminator = data.subarray(0, 8);
  if (!discriminator.equals(TOKEN_LOTTERY_DISCRIMINATOR)) {
    throw new Error("Invalid TokenLottery discriminator");
  }

  let offset = 8;
  const bump = data.readUInt8(offset);
  offset += 1;
  const winner = readU64(data, offset);
  offset += 8;
  const winnerChosen = data.readUInt8(offset) === 1;
  offset += 1;
  const startTime = readU64(data, offset);
  offset += 8;
  const endTime = readU64(data, offset);
  offset += 8;
  const lotteryPotAmount = readU64(data, offset);
  offset += 8;
  const totalTickets = readU64(data, offset);
  offset += 8;
  const authority = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const randomnessAccount = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const ticketPrice = readU64(data, offset);
  offset += 8;
  const id = readU64(data, offset);

  return {
    bump,
    winner,
    winnerChosen,
    startTime,
    endTime,
    lotteryPotAmount,
    totalTickets,
    authority,
    randomnessAccount,
    ticketPrice,
    id,
  };
};

const decodeGlobalStateAccount = (data: Buffer): GlobalStateAccount => {
  const discriminator = data.subarray(0, 8);
  if (!discriminator.equals(GLOBAL_STATE_DISCRIMINATOR)) {
    throw new Error("Invalid GlobalState discriminator");
  }

  const lotteryCount = readU64(data, 8);
  return { lotteryCount };
};

export const fetchTokenLotteryAccount = async (lotteryId: BN | number) => {
  const connection = getConnection();
  const [tokenLotteryPda] = getTokenLotteryPda(lotteryId);

  try {
    const accountInfo = await connection.getAccountInfo(
      tokenLotteryPda,
      "confirmed",
    );

    if (!accountInfo) {
      return { account: null, tokenLotteryPda };
    }

    if (!accountInfo.owner.equals(PROGRAM_ID)) {
      throw new Error("TokenLottery account owner mismatch");
    }

    if (accountInfo.data.length < 130) {
      throw new Error("TokenLottery account data too short");
    }

    const account = decodeTokenLotteryAccount(accountInfo.data);
    return { account, tokenLotteryPda };
  } catch (error) {
    console.warn("TokenLottery account not found.", error);
    return { account: null, tokenLotteryPda };
  }
};

export const fetchGlobalStateAccount = async () => {
  const connection = getConnection();
  const [globalStatePda] = getGlobalStatePda();

  try {
    const accountInfo = await connection.getAccountInfo(
      globalStatePda,
      "confirmed",
    );

    if (!accountInfo) {
      return { account: null, globalStatePda };
    }

    if (!accountInfo.owner.equals(PROGRAM_ID)) {
      throw new Error("GlobalState account owner mismatch");
    }

    if (accountInfo.data.length < 16) {
      throw new Error("GlobalState account data too short");
    }

    const account = decodeGlobalStateAccount(accountInfo.data);
    return { account, globalStatePda };
  } catch (error) {
    console.warn("GlobalState account not found.", error);
    return { account: null, globalStatePda };
  }
};
