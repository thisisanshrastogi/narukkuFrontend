/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * The @solana/wallet-adapter-wallets package ships types but its package.json
 * "exports" field prevents TypeScript from resolving them.
 * Re-export everything as `any` so the build passes.
 */
declare module "@solana/wallet-adapter-wallets" {
  const value: any;
  export = value;
  export const PhantomWalletAdapter: any;
  export const SolflareWalletAdapter: any;
}
