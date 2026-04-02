import { useState } from "react";
import {
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  useConfig,
} from "wagmi";
import { waitForTransactionReceipt, readContract } from "@wagmi/core";
import { parseUnits, type Address, maxUint256 } from "viem";
import { CONTRACTS, ERC20_ABI, VAULT_ABI, GRID_ABI } from "../lib/contracts";

type Step = "idle" | "approving" | "staking" | "depositing" | "done" | "error";

interface UseGridItReturn {
  step: Step;
  txHash: `0x${string}` | undefined;
  error: string | null;
  /** Stake a collateral token (wQQQx / wSPYx) → mints gdUSD */
  stakeToken: (tokenAddress: Address, amount: string, decimals: number) => Promise<void>;
  /** Deposit USDC → mints gdUSD 1:1 for the given stock's grid */
  depositUsdc: (stockToken: Address, usdcAmount: string) => Promise<void>;
  reset: () => void;
}

export function useGridIt(onSuccess?: () => void): UseGridItReturn {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash && (step === "staking" || step === "depositing") },
  });

  if (txConfirmed && step !== "done") {
    setStep("done");
    onSuccess?.();
  }

  // ── Helper: approve only if allowance is insufficient ──────────────────────
  async function ensureAllowance(
    token: Address,
    spender: Address,
    amount: bigint,
    owner: Address,
  ) {
    const allowance = await readContract(config, {
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    }) as bigint;

    if (allowance >= amount) return; // already approved

    setStep("approving");
    const approveTx = await writeContractAsync({
      address: token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, maxUint256],
    });
    // Wait for approval to be mined before proceeding
    await waitForTransactionReceipt(config, { hash: approveTx });
  }

  // ── Stake xStock → mint gdUSD ──────────────────────────────────────────────
  const stakeToken = async (tokenAddress: Address, amount: string, decimals: number) => {
    setError(null);
    try {
      const amountWei = parseUnits(amount, decimals);

      // We need the user's address for allowance check — read it from the connected account
      const accounts = config.state.connections;
      const owner = [...accounts.values()][0]?.accounts[0] as Address | undefined;
      if (!owner) throw new Error("No connected wallet");

      await ensureAllowance(tokenAddress, CONTRACTS.xStockVault, amountWei, owner);

      setStep("staking");
      const stakeTx = await writeContractAsync({
        address: CONTRACTS.xStockVault,
        abi: VAULT_ABI,
        functionName: "stake",
        args: [tokenAddress, amountWei],
      });
      setTxHash(stakeTx);
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // ── Deposit USDC → mint gdUSD 1:1 ─────────────────────────────────────────
  const depositUsdc = async (stockToken: Address, usdcAmount: string) => {
    setError(null);
    try {
      const amountWei = parseUnits(usdcAmount, 6);

      const accounts = config.state.connections;
      const owner = [...accounts.values()][0]?.accounts[0] as Address | undefined;
      if (!owner) throw new Error("No connected wallet");

      await ensureAllowance(CONTRACTS.USDC, CONTRACTS.xStocksGrid, amountWei, owner);

      setStep("depositing");
      const depositTx = await writeContractAsync({
        address: CONTRACTS.xStocksGrid,
        abi: GRID_ABI,
        functionName: "depositUsdc",
        args: [stockToken, amountWei],
      });
      setTxHash(depositTx);
    } catch (e) {
      setStep("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const reset = () => {
    setStep("idle");
    setError(null);
    setTxHash(undefined);
  };

  return { step, txHash, error, stakeToken, depositUsdc, reset };
}

// Read staked position for a token
export function useVaultPosition(user: Address | undefined, tokenAddress: Address) {
  return useReadContract({
    address: CONTRACTS.xStockVault,
    abi: VAULT_ABI,
    functionName: "positions",
    args: user ? [user, tokenAddress] : undefined,
    query: { enabled: !!user, refetchInterval: 8_000 },
  });
}
