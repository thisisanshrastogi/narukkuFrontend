import { Connection } from "@solana/web3.js";
import { getRpcEndpoint } from "./config";

let cachedConnection: Connection | null = null;

export const getConnection = () => {
  if (!cachedConnection) {
    cachedConnection = new Connection(getRpcEndpoint(), "confirmed");
  }
  return cachedConnection;
};
