"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { WalletState } from "../types";
import {
  ConnectionProvider,
  WalletProvider as AdapterProvider,
  useConnection,
  useWallet as useAdapterWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletAdapterNetwork,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { PublicKey } from "@solana/web3.js";
import { getBalance } from "../services/walletService";
import { getCluster, getRpcEndpoint } from "../solana/config";

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  isMockingNetwork: boolean;
  publicKey: PublicKey | null;
  sendTransaction: ReturnType<typeof useAdapterWallet>["sendTransaction"];
  connection: ReturnType<typeof useConnection>["connection"];
  signTransaction: ReturnType<typeof useAdapterWallet>["signTransaction"];
  signAllTransactions: ReturnType<
    typeof useAdapterWallet
  >["signAllTransactions"];
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WalletStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { connection } = useConnection();
  const {
    publicKey,
    connected,
    connecting,
    disconnecting,
    connect,
    disconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    wallets,
    wallet,
    select,
  } = useAdapterWallet();

  const [balance, setBalance] = useState(0);

  const address = publicKey ? publicKey.toBase58() : null;
  const isMockingNetwork = connecting || disconnecting;

  const refreshBalance = async () => {
    if (!publicKey) return;
    try {
      const newBalance = await getBalance(publicKey);
      setBalance(newBalance);
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  };

  useEffect(() => {
    if (connected) {
      refreshBalance();
    } else {
      setBalance(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, address]);

  const handleConnect = async () => {
    if (connecting || connected) return;

    let walletToConnect = wallet;

    if (!walletToConnect) {
      const firstInstalled = wallets.find(
        (candidate) => candidate.readyState === WalletReadyState.Installed,
      );

      if (!firstInstalled) {
        console.error("No Solana wallet found.");
        if (typeof window !== "undefined") {
          window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
        }
        return;
      }

      select(firstInstalled.adapter.name);
      walletToConnect = firstInstalled;
    }

    if (walletToConnect.readyState !== WalletReadyState.Installed) {
      console.error("Wallet is not ready yet.", walletToConnect.readyState);
      return;
    }

    try {
      await walletToConnect.adapter.connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  const walletState: WalletState = {
    address,
    isConnected: connected,
    balance,
  };

  return (
    <WalletContext.Provider
      value={{
        ...walletState,
        connect: handleConnect,
        disconnect: handleDisconnect,
        refreshBalance,
        isMockingNetwork,
        publicKey,
        sendTransaction,
        connection,
        signTransaction,
        signAllTransactions,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const endpoint = getRpcEndpoint();
  const network = getCluster() as WalletAdapterNetwork;

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <AdapterProvider wallets={wallets} autoConnect>
        <WalletStateProvider>{children}</WalletStateProvider>
      </AdapterProvider>
    </ConnectionProvider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
