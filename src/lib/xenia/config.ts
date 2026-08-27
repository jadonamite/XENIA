/**
 * Network constants.
 *
 * The mainnet values are the ones the sprint verified against the live network. The pool address
 * published in the STRK20 documentation is Sepolia — do not substitute it.
 */

/**
 * Which network the app talks to. `sepolia` for rehearsal, `mainnet` for the real thing.
 *
 * Read at build time, so changing it needs a redeploy — the same is true of the escrow address.
 */
export type NetworkName = 'mainnet' | 'sepolia';

const NETWORKS = {
  mainnet: {
    chainId: 'SN_MAIN',
    rpcUrl: 'https://rpc.starknet.lava.build',
    poolAddress: '0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a',
    /**
     * What the pool charges per transaction. Measured live with `get_fee_amount()`, not assumed —
     * mainnet is 6 STRK and Sepolia is 2, and hardcoding either would misprice the other.
     */
    poolFee: 6n * 10n ** 18n,
    explorer: 'https://voyager.online',
  },
  sepolia: {
    chainId: 'SN_SEPOLIA',
    rpcUrl: 'https://api.zan.top/public/starknet-sepolia',
    poolAddress: '0x0254a6b2997ef52e9f830ce1f543f6b29768295e8d17e2267d672c552cfe0d91',
    poolFee: 2n * 10n ** 18n,
    explorer: 'https://sepolia.voyager.online',
  },
} as const;

export const NETWORK: NetworkName =
  (process.env.NEXT_PUBLIC_XENIA_NETWORK as NetworkName | undefined) === 'sepolia'
    ? 'sepolia'
    : 'mainnet';

export const CHAIN = NETWORKS[NETWORK];

/** Kept for callers that predate the network switch. */
export const MAINNET = NETWORKS.mainnet;

/** Deployed by Sam; set `NEXT_PUBLIC_XENIA_ESCROW` to the one matching `NETWORK`. */
export const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_XENIA_ESCROW ?? '';

/**
 * What the pool charges, and the token it charges in.
 *
 * The fee is fronted by a relayer and reimbursed by a withdrawal out of the pool, and the pool
 * requires every token to net zero across a transaction. So this is not just a cost — it is an
 * inflow the transaction has to supply from somewhere. See `contracts/ONCHAIN-FINDINGS.md`.
 */
export const POOL_FEE_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
export const POOL_FEE = CHAIN.poolFee;

/** Notes mature this many blocks after creation. A claimed note is not immediately spendable. */
export const NOTE_MATURITY_BLOCKS = 10;

/** Default lifetime of a claim link, in seconds. */
export const DEFAULT_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/**
 * Tokens a claim can be denominated in.
 *
 * STRK and ETH carry the same address on both networks. USDC is mainnet-only — checked against
 * Sepolia, where nothing is deployed at that address, so offering it there would produce a claim
 * that cannot be created.
 */
const STRK = {
  symbol: 'STRK',
  decimals: 18,
  address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
} as const;
const ETH = {
  symbol: 'ETH',
  decimals: 18,
  address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
} as const;
const USDC = {
  symbol: 'USDC',
  decimals: 6,
  address: '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8',
} as const;

export const TOKENS = NETWORK === 'mainnet' ? [STRK, ETH, USDC] : [STRK, ETH];

export type Token = { symbol: string; decimals: number; address: string };

export const tokenBySymbol = (symbol: string): Token | undefined =>
  TOKENS.find((token) => token.symbol === symbol);
