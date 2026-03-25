import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection } from "@/solana/connection";

export const getBalance = async (publicKey: PublicKey): Promise<number> => {
  const connection = getConnection();
  const lamports = await connection.getBalance(publicKey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
};
