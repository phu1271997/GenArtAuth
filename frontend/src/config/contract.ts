import { testnetBradbury, studionet, localnet } from "genlayer-js/chains";

export const GENLAYER_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ||
  "0xC3B94461a00Ed36432f32e76C4a05C391ab91A0E"
) as `0x${string}`;

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

  if (chainId === 4221) return testnetBradbury;
  if (chainId === 61999 || chainId === 5042002) return studionet;
  if (chainId === 61127) return localnet;

  if (chainId) {
    const base = chainId === 5042002 ? studionet : testnetBradbury;
    return {
      ...base,
      id: chainId,
      name: `GenLayer Network (${chainId})`,
    };
  }

  return testnetBradbury;
}
