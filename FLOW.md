# xStocks Grid — User Flow

```mermaid
flowchart TD
    START([User has USDC]) --> DEPOSIT

    %% ── Entry ──────────────────────────────────────────────────────────────
    subgraph ENTRY ["① Entry — Get GridTokens"]
        DEPOSIT["depositUsdc(token, amount)\nxStocksGrid"]
        GT["Receive GridTokens\n1 USDC = 1 GridToken\n(gxQQQx or gxSPYx)"]
        DEPOSIT --> GT
    end

    %% ── Play ───────────────────────────────────────────────────────────────
    subgraph PLAY ["② Play — Place a Bet"]
        BET["placeBet(token, priceTicks, timeBuckets, amount)\n\nPick: direction (UP/DOWN)\nPick: how far (price ticks)\nPick: how long (time buckets)"]
        MULT["GridMath computes multiplier\nGBM + normal CDF\nExample: 1 tick UP in 1 bucket → ~1.4x"]
        BET --> MULT
    end

    %% ── Resolution ─────────────────────────────────────────────────────────
    subgraph RESOLVE ["③ Resolution — TOUCH semantics"]
        BUCKET["Bucket expires\n(e.g. 30 seconds)"]
        FEED["Backend pushes\nhigh + low of bucket\npriceFeed.setResolutionData()"]
        RESOLVEBET["resolveBet(betId)\nUP wins if HIGH ≥ target\nDOWN wins if LOW ≤ target"]
        BUCKET --> FEED --> RESOLVEBET
    end

    %% ── Outcomes ────────────────────────────────────────────────────────────
    WIN(["WIN\nclaimWinnings(betId)\nreceive multiplier × stake"])
    LOSE(["LOSE\nGridTokens stay in LP pool\npool NAV grows for LPs"])

    %% ── Win options ─────────────────────────────────────────────────────────
    subgraph WINOPTS ["④ Win — What to do with GridTokens"]
        direction LR
        KEEPBET["Play again\nuse GridTokens for next bet"]
        REDEEM["redeemForUsdc(token, amount)\nburn GridTokens → get USDC 1:1"]
        XCHANGE["xChange API\nUSDC → real xStock\n(Backed atomic swap)"]
        REALSTOCK(["Real xStock in wallet\nwQQQx / wSPYx"])
        REDEEM --> XCHANGE --> REALSTOCK
    end

    %% ── Vault ───────────────────────────────────────────────────────────────
    subgraph VAULT ["⑤ Stake — xStockVault (optional)"]
        STAKE["stake(xStock, amount)\nLock real xStock as collateral"]
        MINTGT["Mint GridTokens = 70% of stock value\nExample: 1 wQQQx @ $480\n→ 336 gxQQQx GridTokens"]
        HEALTH{"Health factor\n= collateralUSDC × 78%\n       ÷ debtUSDC"}
        SAFE["Safe ≥ 10,000 BPS\nPlay more or unstake anytime"]
        LIQ["Liquidatable < 10,000 BPS\nLiquidator repays debt\ngets collateral + 5% bonus"]
        UNSTAKE["unstake(token, gridTokenAmount)\nBurn GridTokens proportionally\n→ get xStock back"]
        STAKE --> MINTGT --> HEALTH
        HEALTH -->|Healthy| SAFE
        HEALTH -->|Undercollateralised| LIQ
        SAFE --> UNSTAKE
    end

    %% ── Flow connections ────────────────────────────────────────────────────
    GT --> BET
    MULT --> BUCKET
    RESOLVEBET -->|price touched target| WIN
    RESOLVEBET -->|price never touched| LOSE

    WIN --> KEEPBET
    KEEPBET --> BET
    WIN --> REDEEM
    REALSTOCK --> STAKE
    MINTGT --> BET

    %% ── LP path ─────────────────────────────────────────────────────────────
    subgraph LP ["LP — Liquidity Providers (separate)"]
        LPDEPOSIT["depositLiquidity(token, usdcAmount)\nGet LP shares"]
        LPSHARE["Share NAV rises as bettors lose\nPayout capped at 30% of free pool"]
        LPWITHDRAW["withdrawLiquidity(token, shares)\nRedeem USDC proportionally"]
        LPDEPOSIT --> LPSHARE --> LPWITHDRAW
    end

    LOSE -.->|"fees flow to"| LPSHARE

    %% ── Styling ─────────────────────────────────────────────────────────────
    classDef phase fill:#1a1a2e,stroke:#4a90d9,color:#e0e0e0
    classDef action fill:#16213e,stroke:#0f3460,color:#e0e0e0
    classDef outcome fill:#0f3460,stroke:#e94560,color:#fff
    classDef terminal fill:#e94560,stroke:#c73652,color:#fff

    class ENTRY,PLAY,RESOLVE,WINOPTS,VAULT,LP phase
    class DEPOSIT,GT,BET,MULT,BUCKET,FEED,RESOLVEBET,STAKE,MINTGT,HEALTH,SAFE,LIQ,UNSTAKE,KEEPBET,REDEEM,XCHANGE,LPDEPOSIT,LPSHARE,LPWITHDRAW action
    class WIN,LOSE outcome
    class START,REALSTOCK terminal
```

---

## At a Glance

| Step | Who | Action | Result |
|------|-----|--------|--------|
| 1 | User | `depositUsdc(wQQQx, 100_000_000)` | Receive 100 gxQQQx GridTokens |
| 2 | User | `placeBet(wQQQx, +1, 1, 50e18)` | Bet 50 GT that QQQ rises 1 tick in 30s |
| 3 | Backend | `setResolutionData(wQQQx, expiry, close, high, low)` | Push bucket high/low on-chain |
| 4a | Anyone | `resolveBet(betId)` — if high ≥ target | Mark won |
| 4b | User | `claimWinnings(betId)` | Receive ~70 GT (≈1.4x multiplier) |
| 5a | User | `redeemForUsdc(wQQQx, 70e18)` | Receive $70 USDC |
| 5b | User | xChange API + `executeSwap()` | Receive real wQQQx in wallet |
| 6 | User | `stake(wQQQx, 1e18)` (if wQQQx ≈ $480) | Receive 336 gxQQQx GridTokens (70%) |
| 7 | User | `placeBet(...)` again | Cycle repeats |

## Key Invariants

```
1 GridToken  =  1 USDC  (always 1:1, maintained by deposit/redeem)
Stake LTV    =  70%     (stake $480 stock → 336 GridTokens)
Liq trigger  =  78%     (gridTokensMinted > collateral × 78%)
Liq bonus    =  5%      (liquidator gets debt tokens + 5% extra collateral)
```
