import { Connection, Transaction } from "@solana/web3.js";
import type { SendTransactionOptions } from "@solana/wallet-adapter-base";

interface SendContext {
  connection: Connection;
  transaction: Transaction;
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
    options?: SendTransactionOptions,
  ) => Promise<string>;
}

export const simulateAndSend = async ({
  connection,
  transaction,
  sendTransaction,
}: SendContext) => {
  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latest.blockhash;

  const simulation = await connection.simulateTransaction(transaction);

  if (simulation.value.err) {
    const error = JSON.stringify(simulation.value.err);
    throw new Error(`Simulation failed: ${error}`);
  }

  const signature = await sendTransaction(transaction, connection, {
    skipPreflight: true,
    maxRetries: 3,
  });

  await connection.confirmTransaction({ signature, ...latest }, "confirmed");

  return signature;
};
