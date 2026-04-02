import { useReadContract } from "wagmi";
import { formatUnits, type Address } from "viem";
import { CONTRACTS, ERC20_ABI } from "../lib/contracts";

export function useGdUsdBalance(address: Address | undefined) {
  const { data, refetch } = useReadContract({
    address: CONTRACTS.gdUSD,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5_000,
    },
  });

  const raw = (data as bigint | undefined) ?? 0n;
  const formatted = parseFloat(formatUnits(raw, 18));

  return { raw, formatted, refetch };
}
