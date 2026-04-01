# xStocks Grid — Prediction Market for xStocks Tokenized Equities

A Chart.win-style binary prediction grid built on top of the xStocks platform.

Play any stock grid. Win → earn that stock's equivalent in USDC value.
Use your winnings as collateral → borrow USDC → keep playing.

---

## What we build vs what xStocks provides

| Layer | Who builds it |
|---|---|
| xAAPL, xTSLA, … real tokenized equities | **xStocks / Backed** — we don't touch these |
| xChange atomic swap (USDC ↔ real xAAPL) | **Backed** — we call their API |
| Grid prediction market | **Us** |
| GridTokens (gxAAPL, gxTSLA — infra tokens) | **Us** — USDC-backed, used only in the grid |
| Vault: borrow USDC against GridTokens | **Us** |

---

## GridTokens — the infrastructure token

We introduce one GridToken per stock (gxAAPL, gxTSLA, …). These are **not** real stock tokens and make no claim to be.

- **Always USDC-backed**: every gxAAPL is backed by $190 USDC (or whatever spot price is)
- **Always redeemable**: `redeemForUsdc()` burns gxAAPL → returns USDC at current price
- **Purpose**: internal unit of account for the grid — simplifies bet math, payouts, and LP shares
- **Real stock path**: users who want real xAAPL take their USDC winnings and use xChange (Backed's atomic swap) off-chain

```
1 gxAAPL  =  (spotPrice USDC)  =  ≈ 1 xAAPL in value
             always redeemable
```

---

## Architecture

```
 xStocks API
 /public/assets/{symbol}/price-data
         │
         │  (backend polls every tick)
         ▼
   Backend (Node.js)
         │                              ┌──────────────────────────┐
         │  setPrice() + market state   │  xChange (Backed API)    │
         ▼                              │  USDC ↔ real xAAPL       │
    PriceFeed.sol                       │  atomic swap off-chain   │
    /         \                         └──────────────────────────┘
   ▼           ▼                                    ▲
xStocksGrid   xStockVault              user calls xChange
   ▲                                   after winning (optional)
   │
GridToken.sol (gxAAPL, gxTSLA, …)
   ↑ minted by grid on USDC deposit
   ↑ burned by grid on redeem
```

---

## Mathematical Model

### Geometric Brownian Motion

Stock prices follow GBM: `dS = μS dt + σS dW`

Log returns are normally distributed: `ln(S_T / S_0) ~ N(μT, σ²T)`

### TOUCH Probability

A bet wins if price ever reaches the target during the bucket (not just at close):

```
P(touch) = 2 · Φ(-|z|)

z = requiredMove / σ_window
requiredMove = |priceTicks × tickSize| / currentPrice
σ_window = σ_annual × √(windowSeconds / 31_536_000)
```

### Multiplier Formula

```
1. z = requiredMove / σ_window
2. P = 2 × Φ(-|z|)              ← Abramowitz & Stegun 26.2.17 (error < 7.5e-8)
3. mult_fair = 1 / P
4. mult_display = mult_fair × (1 - houseEdge)
5. clamped to [1.1x, 100x]
```

### Volatility Adjustments (Tivnan et al.)

```
Opening 30min:  σ_eff = σ × 2.5   (max dislocation → lower multipliers)
Normal hours:   σ_eff = σ × 1.0
Closing 30min:  σ_eff = σ × 1.8
After-hours:    σ_eff = σ × 0.4
Weekend:        σ_eff = σ × 0.2
```

Higher vol → price more likely to touch targets → lower multipliers.

### Bet Limits by Market Hours

| State         | Min bet    | Max bet    |
|---------------|------------|------------|
| Normal        | config min | config max |
| Opening 30min | 3× min     | max ÷ 2    |
| After-hours   | config min | max ÷ 2    |
| Weekend       | config min | $10        |

---

## Token Calibration

| Token | Annual σ | Tick size | Bucket | Nearest cell (T+1, 1 tick) |
|-------|----------|-----------|--------|---------------------------|
| xAAPL | 25%      | $0.05     | 30s    | ≈1.4x                     |
| xMSFT | 28%      | $0.08     | 30s    | ≈1.4x                     |
| xGS   | 32%      | $0.15     | 60s    | ≈1.4x                     |
| xTSLA | 65%      | $0.20     | 30s    | ≈1.5x                     |
| xJPM  | 30%      | $0.10     | 60s    | ≈1.4x                     |

---

## Full User Flow

### Step 1 — Deposit USDC, get GridTokens

```
User has $190 USDC.

usdc.approve(gridAddress, 190_000_000)
grid.depositUsdc(xAAPL_token_id, 190_000_000)

  spot = $190.24
  gxAAPL minted = $190 / $190.24 = 0.9987 gxAAPL

User now holds 0.9987 gxAAPL (our USDC-backed grid token).
```

### Step 2 — Play the grid

```
// Preview first (no gas)
grid.previewMultiplier(xAAPL, +3, 2)
  → multiplier=x2.2, target=$190.54, payout for $190=$418

// Place bet
gxAAPL.approve(gridAddress, 0.9987e18)
grid.placeBet(xAAPL, +3, 2, 0.9987e18)

  GridMath computes multiplier from GBM / normal-CDF
  Potential payout: 0.9987 × 2.2 = 2.197 gxAAPL
```

### Step 3 — Bucket closes, TOUCH resolution

```
// Backend pushes high/low for the bucket
priceFeed.setResolutionData(xAAPL, expiry, close=190.45, high=190.61, low=190.10)

// Anyone resolves
grid.resolveBet(betId)
  → UP bet: high(190.61) >= target(190.54) → WON
```

### Step 4a — WIN: claim and optionally get real xAAPL

```
grid.claimWinnings(betId)
  → User receives 2.197 gxAAPL

Option A — keep gxAAPL and bet again (no action needed)

Option B — redeem for USDC
  grid.redeemForUsdc(xAAPL, 2.197e18)
  → User receives ≈$417.93 USDC

Option C — get real xAAPL via xChange (Backed's atomic swap)
  1. Call xChange API to create a quote (USDC → xAAPL)
  2. Execute executeSwap() on AtomicSwap contract
  → Real xAAPL deposited in user's wallet by Backed
```

### Step 4b — LOSE: nothing

```
Bet lost → gxAAPL stays in pool
Pool grows → LP share NAV increases
User keeps any gxAAPL they didn't bet
```

### Step 5 — Borrow USDC against winnings, play again

```
// Deposit gxAAPL as collateral
gxAAPL.approve(vaultAddress, 2.197e18)
vault.deposit(xAAPL, 2.197e18)

// Borrow 70% of value
// collateral value = 2.197 × $190.24 = $417.86
// max borrow = $417.86 × 70% = $292.50

vault.borrow(xAAPL, 290_000_000)   // borrow $290 USDC (leaves buffer)
  → 0.5% fee deducted → receive $288.55 USDC

// Use borrowed USDC to deposit and play more
grid.depositUsdc(xAAPL, 288_550_000)
  → receive ≈1.516 gxAAPL → play more
```

---

## Risk Controls

```
Single bet potential payout  ≤ 30% of free pool GridTokens
Bucket total potential payout ≤ 30% of pool GridTokens
Single bet USDC equivalent   ≤ 5% of pool USDC value
```

---

## Smart Contracts

```
contracts/
├── GridToken.sol      USDC-backed ERC-20 (one per stock) — minted/burned by grid
├── GridMath.sol       GBM-based multiplier library (pure functions, no state)
├── PriceFeed.sol      Stores prices + market state + high/low resolution data
├── xStocksGrid.sol    Grid prediction market
└── xStockVault.sol    70% LTV USDC borrowing against GridToken collateral
```

### Deploy order

```
1. PriceFeed(backendWalletAddress)
2. xStocksGrid(usdcAddress, priceFeedAddress)
3. GridToken("Grid xAAPL", "gxAAPL", gridAddress)   ← one per stock
4. xStockVault(usdcAddress, priceFeedAddress)

Post-deploy:
  # Register stock on the grid
  grid.configureToken(
    xAAPL_id,           // identifier (can be real xAAPL address)
    gxAAPL_address,     // GridToken just deployed
    annualVolBps=2500,
    tickSizeUsdc=50000, // $0.05
    bucketSeconds=30,
    houseEdgeBps=1000,  // 10%
    minBetUsdc=1_000_000,
    maxBetUsdc=500_000_000,
    gridWidth=5,
    gridHalfHeight=6
  )

  # Seed LP pool with USDC
  usdc.approve(gridAddress, seedAmount)
  grid.depositLiquidity(xAAPL_id, seedAmount)

  # Register in vault
  vault.addSupportedToken(xAAPL_id)

  # Fund vault USDC lending pool
  usdc.approve(vaultAddress, poolAmount)
  vault.fundPool(poolAmount)

  # Backend pushes first price
  priceFeed.setPrice(xAAPL_id, 190_240_000, true, false, false, false, false)
```

---

## Contract API Reference

### GridToken.sol

Infrastructure ERC-20 token, one deployed per stock.

- `mint(to, amount)` — only callable by xStocksGrid
- `burn(from, amount)` — only callable by xStocksGrid
- `setMinter(newMinter)` — owner only (to migrate to new grid contract)

### GridMath.sol

Pure math library. No state, no imports.

- `calculateMultiplier(priceTicks, timeBuckets, currentPrice, volParams, marketState)` → `(multiplier×100, probability)`
- `computePayout(amount, multiplier)` → payout

### PriceFeed.sol

Backend hot wallet writes here. All prices are **6-decimal USDC**.

- `setPrice(token, price, isOpen, isOpeningWindow, isClosingWindow, isAfterHours, isWeekend)`
- `setPriceBatch(tokens[], prices[])` — batch price-only updates
- `setResolutionData(token, expiry, price, high, low)` — TOUCH data after bucket closes
- `setResolutionDataBatch(...)` — catch-up
- `getMarketState(token)` → `(isOpen, isOpeningWindow, isClosingWindow, isAfterHours, isWeekend)`
- `getResolutionData(token, expiry)` → `(price, high, low, available)`

### xStocksGrid.sol

- `depositUsdc(token, usdcAmount)` → GridTokens minted to user
- `redeemForUsdc(token, gridTokenAmount)` → USDC returned, GridTokens burned
- `depositLiquidity(token, usdcAmount)` → LP shares issued
- `withdrawLiquidity(token, shares)` → USDC returned
- `shareNAV(token)` → USDC value per LP share
- `placeBet(token, priceTicks, timeBuckets, gridTokenAmount)` → betId
- `resolveBet(betId)` — TOUCH resolution
- `resolveBets(betIds[])` — batch
- `claimWinnings(betId)` → GridTokens paid to winner
- `claimMultiple(betIds[])` — batch
- `previewMultiplier(token, priceTicks, timeBuckets)` → `(multiplier, probability, targetPrice, payoutFor100USDC)`
- `getGridMatrix(token)` → `(multipliers[][], prices[], currentPrice)`

### xStockVault.sol

Collateral = GridTokens. Debt = USDC.

- `deposit(token, amount)` + `borrow(token, usdcAmount)` or combined `depositAndBorrow`
- `repay(token, usdcAmt)` — reduce debt
- `withdraw(token, amt)` — pull back collateral (LTV enforced)
- `liquidate(user, token)` — open when health < 78%
- `getHealthFactor(user, token)` — BPS, ≥ 10_000 = safe
- `getMaxBorrow(user, token)` — max USDC borrowable now

---

## Backend Integration

```typescript
// On every price tick from xStocks API
const { price, marketState } = await fetchXStocksPrice('AAPL')

await priceFeed.setPrice(
  xAAPL_id,
  toUsdc6(price),                 // e.g. 190_240_000 for $190.24
  marketState.isOpen,
  marketState.isOpeningWindow,
  marketState.isClosingWindow,
  marketState.isAfterHours,
  marketState.isWeekend
)

// After bucket closes: push TOUCH data (high + low of the window)
const { close, high, low } = await fetchBucketRange('AAPL', fromTs, toTs)
await priceFeed.setResolutionData(xAAPL_id, bucketExpiry, close, high, low)

// Batch resolve expired bets (keeper job)
await grid.resolveBets([...expiredBetIds])
```

## xChange Integration (optional — for users who want real xAAPL)

After a user wins and redeems their GridTokens for USDC, they can use Backed's
xChange atomic swap to get real xAAPL:

```typescript
// 1. Create quote (USDC → xAAPL)
const quote = await fetch('https://api.backed.fi/api/v1/quotes/create', {
  method: 'POST',
  headers: { 'X-API-KEY': apiKey },
  body: JSON.stringify({
    identifier: 'AAPLx',
    side: 'Buy',
    quantity: usdcWinningsInShares.toString(),
    network: 'Ethereum',
    paymentWalletIdentifier:   userWallet,
    receivingWalletIdentifier: userWallet
  })
})
const { signature, signaturePayload } = await quote.json()

// 2. Approve USDC and execute on-chain
await usdc.approve(atomicSwapAddress, usdcAmount)
await atomicSwap.executeSwap(signaturePayload.message, signature, emptyPermit)
// → Real xAAPL (Backed tokenized equity) deposited in user's wallet
```

---

## Build & Deploy

```bash
cd contracts
forge build

forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --broadcast \
  --private-key $DEPLOYER_KEY
```

Supported chains (xStocks/Backed): Ethereum, Ink.
