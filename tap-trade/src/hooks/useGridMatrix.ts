import { useReadContract } from "wagmi";
import { type Address } from "viem";
import { CONTRACTS, GRID_ABI } from "../lib/contracts";

/**
 * Fetches the real multiplier matrix from xStocksGrid.getGridMatrix().
 * Multipliers are returned ×100 from the contract (e.g. 220 = 2.20×).
 *
 * Returns a 2D array [row][col] where each value is the display multiplier
 * as a float (e.g. 2.2), or null while loading.
 *
 * Re-fetches every 15s so multipliers stay in sync with price + vol adjustments.
 */
export function useGridMatrix(tokenAddress: Address | undefined) {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.xStocksGrid,
    abi: GRID_ABI,
    functionName: "getGridMatrix",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress,
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  if (!data) return { matrix: null, prices: null, isLoading };

  const [rawMatrix, rawPrices] = data as [bigint[][], bigint[], bigint];

  // Convert ×100 bigint → float multiplier  (220n → 2.20)
  const matrix: number[][] = rawMatrix.map((row) =>
    row.map((v) => Number(v) / 100)
  );

  // Prices are 6-dec USDC values → float dollars
  const prices: number[] = rawPrices.map((p) => Number(p) / 1_000_000);

  return { matrix, prices, isLoading };
}
