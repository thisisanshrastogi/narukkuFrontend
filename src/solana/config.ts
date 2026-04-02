import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import { IDL_ADDRESS } from "./idl";

export const PROGRAM_ID = new PublicKey(
  "137WJawxE2JXE4hCmMRAvurvFFsCv3zWum9xBkmu2erb",
);

export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

export const TOKEN_LOTTERY_SEED = "token_lottery";
export const COLLECTION_MINT_SEED = "collection_mint";

export const getRpcEndpoint = () =>
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");

export const getCluster = () =>
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet";

export const getLotteryName = () =>
  process.env.NEXT_PUBLIC_LOTTERY_NAME || "Token Lottery";

export const getMaxTickets = () => {
  const raw = process.env.NEXT_PUBLIC_LOTTERY_MAX_TICKETS;
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const getExplorerAddressUrl = (address: string) => {
  const cluster = getCluster();
  const explorerCluster = cluster === "mainnet-beta" ? "mainnet" : cluster;
  return `https://explorer.solana.com/address/${address}?cluster=${explorerCluster}`;
};
