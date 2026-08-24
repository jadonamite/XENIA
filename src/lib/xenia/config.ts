/**
 * Network constants.
 *
 * The mainnet values are the ones the sprint verified against the live network. The pool address
 * published in the STRK20 documentation is Sepolia — do not substitute it.
 */

export const MAINNET = {
  chainId: 'SN_MAIN',
  rpcUrl: 'https://rpc.starknet.lava.build',
  poolAddress: '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a',
} as const;

/** Deployed by Sam; filled in once the contract is on-chain. */
export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_XENIA_ESCROW ?? '';

/** Notes mature this many blocks after creation. A claimed note is not immediately spendable. */
export const NOTE_MATURITY_BLOCKS = 10;

/** Default lifetime of a claim link, in seconds. */
export const DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/**
 * Tokens a claim can be denominated in.
 *
 * Mainnet addresses, checked against Starkscan. `decimals` is only used for display — every amount
 * crosses the wire in the token's smallest unit.
 */
export const TOKENS = [
  {
    symbol: 'STRK',
    decimals: 18,
    address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  },
  {
    symbol: 'ETH',
    decimals: 18,
    address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
  },
  {
    symbol: 'USDC',
    decimals: 6,
    address: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
  },
] as const;

export type Token = (typeof TOKENS)[number];

export const tokenBySymbol = (symbol: string): Token | undefined =>
  TOKENS.find((token) => token.symbol === symbol);
