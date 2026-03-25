import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "./connection";
import { PROGRAM_ID } from "./config";
import { getTokenLotteryPda } from "./pdas";
import type { TokenLotteryAccount } from "./types";

const TOKEN_LOTTERY_DISCRIMINATOR = Buffer.from([
  219, 174, 104, 58, 76, 30, 61, 218,
]);

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
  };
};

export const fetchTokenLotteryAccount = async () => {
  const connection = getConnection();
  const [tokenLotteryPda] = getTokenLotteryPda();

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

    if (accountInfo.data.length < 122) {
      throw new Error("TokenLottery account data too short");
    }

    const account = decodeTokenLotteryAccount(accountInfo.data);
    return { account, tokenLotteryPda };
  } catch (error) {
    console.warn("TokenLottery account not found.", error);
    return { account: null, tokenLotteryPda };
  }
};
