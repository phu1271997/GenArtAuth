/**
 * Extract the most user-actionable message from an on-chain / RPC / SDK error.
 *
 * viem, genlayer-js, and MetaMask each wrap the underlying revert reason in a
 * different envelope (`shortMessage`, `cause`, `data`, `error.error.message`,
 * plain strings). We walk the common shapes so the UI can show a message like
 * "Insufficient submitter bond. Min bond is 5 GEN" instead of the raw JSON-RPC
 * dump.
 */
export function extractContractError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;

  const seen = new Set<unknown>();
  const candidates: string[] = [];

  const walk = (node: any) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    for (const key of ["shortMessage", "reason", "message", "details"]) {
      const v = node[key];
      if (typeof v === "string" && v) candidates.push(v);
    }
    for (const key of ["cause", "error", "data", "innerError"]) {
      if (node[key]) walk(node[key]);
    }
  };
  walk(err);

  const revert =
    candidates.find((c) => /revert(ed)?:? /i.test(c)) ||
    candidates.find((c) => /exception|insufficient|already|not found|cannot|invalid|empty/i.test(c));
  const chosen = revert || candidates[0] || (err as any).message || "Unknown error";

  return chosen.replace(/^execution reverted:?\s*/i, "").trim();
}
