import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import rawIdl from "./idl/token_lottery.json";
import { PROGRAM_ID } from "./config";

const rawIdlValue = ((rawIdl as unknown as { default?: Idl }).default ??
  rawIdl) as Idl;

const accountsFromTypes = (rawIdlValue.types ?? []).map((typeDef) => {
  const discriminator = rawIdlValue.accounts?.find(
    (account) => account.name === typeDef.name,
  )?.discriminator;

  return {
    name: typeDef.name,
    ...(discriminator ? { discriminator } : {}),
    type: typeDef.type,
  };
});

const normalizedAccounts = accountsFromTypes.length
  ? accountsFromTypes
  : (rawIdlValue.accounts ?? []).map((account) => {
      if ("type" in account && account.type) {
        return account;
      }

      const fallbackType = rawIdlValue.types?.find(
        (candidate) => candidate.name === account.name,
      )?.type;

      return fallbackType ? { ...account, type: fallbackType } : account;
    });

const tokenLotteryType = rawIdlValue.types?.find(
  (candidate) => candidate.name === "TokenLottery",
);

const tokenLotteryDiscriminator = rawIdlValue.accounts?.find(
  (account) => account.name === "TokenLottery",
)?.discriminator ?? [219, 174, 104, 58, 76, 30, 61, 218];

const fallbackAccounts =
  normalizedAccounts.length === 0 && tokenLotteryType
    ? [
        {
          name: "TokenLottery",
          discriminator: tokenLotteryDiscriminator,
          type: tokenLotteryType.type,
        },
      ]
    : normalizedAccounts;

const idl: Idl = {
  ...rawIdlValue,
  address: rawIdlValue.address ?? PROGRAM_ID.toBase58(),
  accounts: fallbackAccounts as Idl["accounts"],
  types: rawIdlValue.types ?? [],
  instructions: rawIdlValue.instructions ?? [],
};

const READONLY_PUBLIC_KEY = new PublicKey("11111111111111111111111111111111");

const readonlyWallet = {
  publicKey: READONLY_PUBLIC_KEY,
  async signTransaction() {
    throw new Error("Readonly wallet cannot sign transactions.");
  },
  async signAllTransactions() {
    throw new Error("Readonly wallet cannot sign transactions.");
  },
};

export const getProgramForRead = async (connection: Connection) => {
  const provider = new AnchorProvider(connection, readonlyWallet, {
    commitment: "confirmed",
  });

  try {
    return await Program.at(PROGRAM_ID, provider);
  } catch (error) {
    console.warn("Failed to fetch IDL from chain, using local IDL.", error);
    return new Program(idl as Idl, provider);
  }
};

export const getProgramForWrite = (
  connection: Connection,
  wallet: AnchorProvider["wallet"],
) =>
  (async () => {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    try {
      return await Program.at(PROGRAM_ID, provider);
    } catch (error) {
      console.warn("Failed to fetch IDL from chain, using local IDL.", error);
      return new Program(idl as Idl, provider);
    }
  })();
