import { testnetBradbury, studionet, localnet } from "genlayer-js/chains";

// Floor gas price for GenLayer Studionet. Studionet reports eth_gasPrice as 0
// (or a value below the mempool floor for non-det ops such as LLM +
// web.render), so wallets sign transactions the RPC then rejects as
// "transaction underpriced". 25 gwei is a safe floor that stays negligible on
// a faucet-funded Studio balance.
const MIN_GAS_PRICE_HEX = "0x5d21dba00"; // 25 gwei
const MIN_GAS_PRICE_BIGINT = BigInt(MIN_GAS_PRICE_HEX);
const MIN_PRIORITY_FEE_HEX = "0x77359400"; // 2 gwei
const MIN_PRIORITY_FEE_BIGINT = BigInt(MIN_PRIORITY_FEE_HEX);

export const GENLAYER_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ||
  "0xC00FDc21EdCC4D07a0c8d585fDEE01B07Fb8FCA1"
) as `0x${string}`;

const toHex = (value: bigint) => `0x${value.toString(16)}`;

/**
 * Wrap the wallet provider so gas-price RPC methods always return at least the
 * configured floor. Fixes two failure modes seen on GenLayer Studionet:
 *   1. Studionet reports eth_gasPrice as 0 → MetaMask rejects a resubmit at the
 *      same nonce with "transaction underpriced".
 *   2. Studionet reports a price below the mempool floor for non-det ops (LLM
 *      + web.render), so a first-time write is rejected as underpriced.
 * Also floors EIP-1559 fields (maxPriorityFeePerGas / feeHistory) since modern
 * wallets prefer type-2 transactions.
 */
export function getGenLayerProvider(provider?: any) {
  const eth = provider || (typeof window !== "undefined" ? (window as any).ethereum : null);
  if (!eth?.request) return eth;

  return {
    request: async (args: { method: string; params?: unknown[] }) => {
      if (args.method === "eth_gasPrice") {
        try {
          const reported = await eth.request(args);
          if (!reported || BigInt(reported) < MIN_GAS_PRICE_BIGINT) {
            return MIN_GAS_PRICE_HEX;
          }
          return reported;
        } catch {
          return MIN_GAS_PRICE_HEX;
        }
      }

      if (args.method === "eth_maxPriorityFeePerGas") {
        try {
          const reported = await eth.request(args);
          if (!reported || BigInt(reported) < MIN_PRIORITY_FEE_BIGINT) {
            return MIN_PRIORITY_FEE_HEX;
          }
          return reported;
        } catch {
          return MIN_PRIORITY_FEE_HEX;
        }
      }

      if (args.method === "eth_feeHistory") {
        try {
          const history: any = await eth.request(args);
          if (history?.baseFeePerGas) {
            history.baseFeePerGas = history.baseFeePerGas.map((v: string) => {
              const asBig = v ? BigInt(v) : BigInt(0);
              return asBig < MIN_GAS_PRICE_BIGINT ? MIN_GAS_PRICE_HEX : v;
            });
          }
          if (history?.reward) {
            history.reward = history.reward.map((tier: string[]) =>
              tier.map((v) => {
                const asBig = v ? BigInt(v) : BigInt(0);
                return asBig < MIN_PRIORITY_FEE_BIGINT ? MIN_PRIORITY_FEE_HEX : v;
              })
            );
          }
          return history;
        } catch {
          return { baseFeePerGas: [MIN_GAS_PRICE_HEX], gasUsedRatio: [0], reward: [[MIN_PRIORITY_FEE_HEX]] };
        }
      }

      return eth.request(args);
    },
  };
}

export { MIN_GAS_PRICE_HEX, MIN_PRIORITY_FEE_HEX, toHex };

export async function getGenLayerChain(provider?: any) {
  let chainId: number | undefined;

  const eth = provider || (typeof window !== "undefined" ? (window as any).ethereum : null);
  if (eth && eth.request) {
    try {
      const hexChainId = await eth.request({ method: "eth_chainId" });
      if (hexChainId) {
        chainId = parseInt(hexChainId, 16);
      }
    } catch (e) {
      console.warn("Could not determine wallet chainId:", e);
    }
  }

  if (chainId === testnetBradbury.id) return testnetBradbury;
  if (chainId === studionet.id) return studionet;
  if (chainId === 61127) return localnet;

  // This deployment is on Studionet. Never manufacture a chain object for an
  // unrelated wallet network because that can sign for the wrong chain while
  // still pointing at the configured contract address.
  return studionet;
}
