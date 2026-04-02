"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import * as lotteryService from "@/services/lotteryService";
import { getCluster } from "@/solana/config";
import { fetchGlobalStateAccount } from "@/solana/state";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function AdminPage() {
  const {
    isConnected,
    address,
    connect,
    isMockingNetwork,
    connection,
    publicKey,
    sendTransaction,
    signTransaction,
    signAllTransactions,
  } = useWallet();

  const [startSlot, setStartSlot] = useState("");
  const [endSlot, setEndSlot] = useState("");
  const [slotOffset, setSlotOffset] = useState("600");
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [isFetchingSlot, setIsFetchingSlot] = useState(false);
  const [lotteryId, setLotteryId] = useState("0");
  const [globalStateCount, setGlobalStateCount] = useState<number | null>(null);
  const [isFetchingGlobalState, setIsFetchingGlobalState] = useState(false);
  const [ticketPrice, setTicketPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configTx, setConfigTx] = useState<string | null>(null);
  const [collectionTx, setCollectionTx] = useState<string | null>(null);
  const [globalStateTx, setGlobalStateTx] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const cluster = useMemo(() => getCluster(), []);
  const explorerCluster = cluster === "mainnet-beta" ? "mainnet" : cluster;

  const refreshGlobalState = async () => {
    if (!isConnected) return;
    setIsFetchingGlobalState(true);
    try {
      const { account } = await fetchGlobalStateAccount();
      if (!account) {
        setGlobalStateCount(null);
        setLotteryId("0");
        return;
      }
      const count = toNumber(account.lotteryCount.toString());
      setGlobalStateCount(Number.isFinite(count) ? count : null);
      if (Number.isFinite(count)) {
        setLotteryId(String(count));
      }
    } finally {
      setIsFetchingGlobalState(false);
    }
  };

  useEffect(() => {
    refreshGlobalState();
  }, [isConnected]);

  const validateInputs = () => {
    const id = toNumber(lotteryId);
    const start = toNumber(startSlot);
    const end = toNumber(endSlot);
    const price = toNumber(ticketPrice);

    if (
      !Number.isFinite(id) ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      !Number.isFinite(price)
    ) {
      return "All fields must be numeric.";
    }

    if (!Number.isInteger(id) || id < 0) {
      return "Lottery ID must be a non-negative integer.";
    }

    if (start <= 0 || end <= 0) {
      return "Start and end must be positive values.";
    }

    if (end <= start) {
      return "End must be greater than start.";
    }

    if (price <= 0) {
      return "Ticket price must be greater than 0.";
    }

    if (!Number.isInteger(price)) {
      return "Ticket price must be a whole number of lamports.";
    }

    return null;
  };

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleAutofillSlots = async () => {
    if (!isConnected) {
      setErrorMessage("Connect your wallet to continue.");
      return;
    }

    resetMessages();
    setIsFetchingSlot(true);

    try {
      const now = Math.floor(Date.now() / 1000);
      const offsetValue = toNumber(slotOffset);
      const safeOffset =
        Number.isFinite(offsetValue) && offsetValue > 0 ? offsetValue : 600;
      setCurrentSlot(now);
      setStartSlot(String(now));
      setEndSlot(String(now + Math.floor(safeOffset)));
    } catch (error) {
      setErrorMessage("Failed to fetch the current time.");
    } finally {
      setIsFetchingSlot(false);
    }
  };

  const handleInitializeConfig = async () => {
    if (!isConnected) {
      setErrorMessage("Connect your wallet to continue.");
      return;
    }

    const validationError = validateInputs();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    resetMessages();
    setIsSubmitting(true);

    const result = await lotteryService.initializeConfig({
      lotteryId: toNumber(lotteryId),
      startSlot: toNumber(startSlot),
      endSlot: toNumber(endSlot),
      ticketPriceLamports: toNumber(ticketPrice),
      wallet: {
        publicKey,
        sendTransaction,
        signTransaction,
        signAllTransactions,
      },
      connection,
    });

    setIsSubmitting(false);

    if (result.success) {
      setConfigTx(result.txHash || null);
      setSuccessMessage("Config initialized on-chain.");
    } else {
      setErrorMessage(result.error || "Initialization failed.");
    }
  };

  const handleInitializeLottery = async () => {
    if (!isConnected) {
      setErrorMessage("Connect your wallet to continue.");
      return;
    }

    resetMessages();
    setIsSubmitting(true);

    const result = await lotteryService.initializeLottery({
      lotteryId: toNumber(lotteryId),
      wallet: {
        publicKey,
        sendTransaction,
        signTransaction,
        signAllTransactions,
      },
      connection,
    });

    setIsSubmitting(false);

    if (result.success) {
      setCollectionTx(result.txHash || null);
      setSuccessMessage("Collection initialized successfully.");
    } else {
      setErrorMessage(result.error || "Initialization failed.");
    }
  };

  const handleInitializeAll = async () => {
    if (!isConnected) {
      setErrorMessage("Connect your wallet to continue.");
      return;
    }

    const validationError = validateInputs();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    resetMessages();
    setIsSubmitting(true);

    if (globalStateCount === null) {
      const globalResult = await lotteryService.initializeGlobalState({
        wallet: {
          publicKey,
          sendTransaction,
          signTransaction,
          signAllTransactions,
        },
        connection,
      });

      if (!globalResult.success) {
        setIsSubmitting(false);
        setErrorMessage(
          globalResult.error || "Global state initialization failed.",
        );
        return;
      }

      setGlobalStateTx(globalResult.txHash || null);
      await refreshGlobalState();
    }

    const configResult = await lotteryService.initializeConfig({
      lotteryId: toNumber(lotteryId),
      startSlot: toNumber(startSlot),
      endSlot: toNumber(endSlot),
      ticketPriceLamports: toNumber(ticketPrice),
      wallet: {
        publicKey,
        sendTransaction,
        signTransaction,
        signAllTransactions,
      },
      connection,
    });

    if (!configResult.success) {
      setIsSubmitting(false);
      setErrorMessage(configResult.error || "Config initialization failed.");
      return;
    }

    setConfigTx(configResult.txHash || null);

    const lotteryResult = await lotteryService.initializeLottery({
      lotteryId: toNumber(lotteryId),
      wallet: {
        publicKey,
        sendTransaction,
        signTransaction,
        signAllTransactions,
      },
      connection,
    });

    setIsSubmitting(false);

    if (lotteryResult.success) {
      setCollectionTx(lotteryResult.txHash || null);
      setSuccessMessage("Lottery initialized end-to-end.");
    } else {
      setErrorMessage(
        lotteryResult.error || "Collection initialization failed.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500 w-full max-w-5xl mx-auto">
      <div className="neu-raised rounded-3xl p-6 md:p-8 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-(--accent-primary)" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-(--text-primary)">
              Admin Control Room
            </h1>
            <p className="text-(--text-secondary) text-sm">
              Initialize the devnet lottery config and collection.
            </p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-(--text-secondary) neu-inset-shallow px-3 py-2 rounded-xl">
            {cluster}
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="neu-inset rounded-3xl p-8 flex flex-col gap-4 items-center text-center">
          <AlertCircle className="w-6 h-6 text-(--text-secondary)" />
          <div>
            <h2 className="text-lg font-semibold text-(--text-primary)">
              Wallet not connected
            </h2>
            <p className="text-(--text-secondary) text-sm mt-1">
              Connect a devnet wallet to initialize the lottery.
            </p>
          </div>
          <button
            onClick={connect}
            disabled={isMockingNetwork}
            className="accent-bg px-6 py-2.5 rounded-xl text-white font-bold uppercase tracking-wider text-xs"
          >
            {isMockingNetwork ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      )}

      {isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 neu-raised rounded-3xl p-6 md:p-8 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-(--text-secondary)">
                Lottery Configuration
              </h3>
              <p className="text-(--text-secondary) text-sm mt-2">
                Provide the lottery ID, unix timestamps, and ticket price in
                lamports.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-(--text-secondary)">
              Lottery ID
              <input
                type="number"
                min="0"
                step="1"
                value={lotteryId}
                onChange={(event) => setLotteryId(event.target.value)}
                className="neu-inset-shallow rounded-xl px-4 py-3 text-base text-(--text-primary) font-mono"
              />
              <span className="text-[10px] normal-case tracking-normal text-(--text-secondary)">
                {isFetchingGlobalState
                  ? "Checking global state..."
                  : globalStateCount === null
                    ? "Global state not initialized."
                    : `Next ID: ${globalStateCount}`}
              </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-(--text-secondary)">
                Start Time (unix)
                <input
                  type="number"
                  min="0"
                  value={startSlot}
                  onChange={(event) => setStartSlot(event.target.value)}
                  className="neu-inset-shallow rounded-xl px-4 py-3 text-base text-(--text-primary) font-mono"
                />
              </label>
              <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-(--text-secondary)">
                End Time (unix)
                <input
                  type="number"
                  min="0"
                  value={endSlot}
                  onChange={(event) => setEndSlot(event.target.value)}
                  className="neu-inset-shallow rounded-xl px-4 py-3 text-base text-(--text-primary) font-mono"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-(--text-secondary)">
                End Offset (seconds)
                <input
                  type="number"
                  min="1"
                  value={slotOffset}
                  onChange={(event) => setSlotOffset(event.target.value)}
                  className="neu-inset-shallow rounded-xl px-4 py-3 text-base text-(--text-primary) font-mono"
                />
              </label>
              <button
                onClick={handleAutofillSlots}
                disabled={isSubmitting || isFetchingSlot}
                className="neu-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em]"
              >
                {isFetchingSlot ? "Fetching..." : "Use Current Time"}
              </button>
              {currentSlot !== null && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-(--text-secondary)">
                  Current Time: {currentSlot}
                </span>
              )}
            </div>

            <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-(--text-secondary)">
              Ticket Price (lamports)
              <input
                type="number"
                min="0"
                step="1"
                value={ticketPrice}
                onChange={(event) => setTicketPrice(event.target.value)}
                className="neu-inset-shallow rounded-xl px-4 py-3 text-base text-(--text-primary) font-mono"
              />
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleInitializeConfig}
                disabled={isSubmitting}
                className="neu-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em]"
              >
                Initialize Config
              </button>
              <button
                onClick={async () => {
                  if (!isConnected) {
                    setErrorMessage("Connect your wallet to continue.");
                    return;
                  }
                  resetMessages();
                  setIsSubmitting(true);
                  const result = await lotteryService.initializeGlobalState({
                    wallet: {
                      publicKey,
                      sendTransaction,
                      signTransaction,
                      signAllTransactions,
                    },
                    connection,
                  });
                  setIsSubmitting(false);
                  if (result.success) {
                    setGlobalStateTx(result.txHash || null);
                    setSuccessMessage("Global state initialized on-chain.");
                    await refreshGlobalState();
                  } else {
                    setErrorMessage(
                      result.error || "Global state initialization failed.",
                    );
                  }
                }}
                disabled={isSubmitting}
                className="neu-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em]"
              >
                Initialize Global State
              </button>
              <button
                onClick={handleInitializeAll}
                disabled={isSubmitting}
                className="accent-bg px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em] text-white"
              >
                Run Full Initialization
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="neu-raised rounded-3xl p-6 md:p-7 flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-(--text-secondary)">
                Collection Setup
              </h3>
              <p className="text-(--text-secondary) text-sm">
                Initialize the collection mint and metadata for ticket NFTs.
              </p>
              <button
                onClick={handleInitializeLottery}
                disabled={isSubmitting}
                className="neu-btn px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-[0.2em]"
              >
                Initialize Collection
              </button>
            </div>

            <div className="neu-inset rounded-3xl p-6 flex flex-col gap-3 text-(--text-secondary) text-sm">
              <div className="text-[11px] uppercase tracking-[0.2em]">
                Connected Wallet
              </div>
              <div className="text-(--text-primary) font-mono break-all">
                {address}
              </div>
            </div>
          </div>
        </div>
      )}

      {isSubmitting && (
        <div className="neu-inset rounded-3xl p-5 flex items-center gap-3 text-(--text-secondary)">
          <Loader2 className="w-4 h-4 animate-spin" />
          Sending transaction to {cluster}...
        </div>
      )}

      {errorMessage && (
        <div className="neu-raised rounded-3xl p-5 flex items-center gap-3 text-(--accent-secondary)">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="neu-raised rounded-3xl p-5 flex items-center gap-3 text-(--success)">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{successMessage}</span>
        </div>
      )}

      {(globalStateTx || configTx || collectionTx) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {globalStateTx && (
            <a
              className="neu-inset rounded-2xl p-4 text-sm text-(--text-secondary) hover:text-(--accent-primary) transition-colors"
              href={`https://explorer.solana.com/tx/${globalStateTx}?cluster=${explorerCluster}`}
              target="_blank"
              rel="noreferrer"
            >
              View global state tx
            </a>
          )}
          {configTx && (
            <a
              className="neu-inset rounded-2xl p-4 text-sm text-(--text-secondary) hover:text-(--accent-primary) transition-colors"
              href={`https://explorer.solana.com/tx/${configTx}?cluster=${explorerCluster}`}
              target="_blank"
              rel="noreferrer"
            >
              View config tx
            </a>
          )}
          {collectionTx && (
            <a
              className="neu-inset rounded-2xl p-4 text-sm text-(--text-secondary) hover:text-(--accent-primary) transition-colors"
              href={`https://explorer.solana.com/tx/${collectionTx}?cluster=${explorerCluster}`}
              target="_blank"
              rel="noreferrer"
            >
              View collection tx
            </a>
          )}
        </div>
      )}
    </div>
  );
}
