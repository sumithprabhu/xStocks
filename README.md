<p align="center">
  <img src="tap-trade/public/favicon.ico" alt="xGrid logo" width="80" />
</p>

<h1 align="center">xGrid</h1>

<p align="center">
  Real-time prediction market for tokenized equities on Ink.<br/>
  Black-Scholes barrier options, computed entirely on-chain.
</p>

<p align="center">
  <a href="https://explorer-sepolia.inkonchain.com/address/0x338B6a94e8317A7BF5d00224F2e2c7c7B6BBe981">Ink Sepolia</a>
</p>

## What is xGrid

xGrid lets you bet on stock price movements in real time. You see a live price, a grid of multipliers, and a snake cursor racing across the screen. Click a cell, place a bet in gdUSD, and if the price touches your target row before time runs out, you win the multiplier.

Every multiplier is a **barrier-touch option** priced by Black-Scholes and Geometric Brownian Motion, computed on-chain in Solidity fixed-point math. No off-chain pricing engine, no probability oracles.

Built for the Backed xStocks ecosystem. Winners redeem gdUSD for USDC, then swap into real tokenized equities (wQQQx, wSPYx) via Backed's xChange.

## Features

**On-chain math engine** — GridMath.sol implements the full normal CDF (Abramowitz & Stegun 26.2.17) in 18-decimal fixed-point. Touch probability via the reflection principle of Brownian motion. Market-hours volatility scaling (open/close/after-hours/weekend).

**14 stocks** — AAPL, NVDA, TSLA, MSFT, GOOG, AMZN, META, SPY, QQQ, IWM, JPM, GS, COIN, PLTR. Each with individually calibrated volatility.

**Snake grid UX** — a real-time cursor sweeps left-to-right following the live price. Click cells ahead of the snake to bet. Confetti on wins. Zero-popup silent wallet signing via Privy embedded wallet.

**Unified gdUSD token** — 1 gdUSD = 1 USDC, always. Single fungible token replaces per-stock complexity. Minted on USDC deposit, burned on redeem.

**70% LTV vault** — stake real xStock tokens, receive gdUSD for betting. Liquidation at 78%.

**LP pools** — deposit USDC as liquidity. Losing bets stay in the pool, growing LP share NAV over time.

## Architecture

```
User Wallet (Privy)
       |
       v
  +-----------+     +-----------+     +-------------+
  | React App | <-> | Socket.io | <-> | Price Server |
  +-----------+     +-----------+     +------+------+
       |                                      |
       v                                      v
  +------------------+              +------------------+
  |  xStocksGrid.sol |              |  PriceFeed.sol   |
  |  (bets, LP pool) |              |  (oracle writes) |
  +--------+---------+              +------------------+
           |
     +-----+------+
     |             |
+----+----+  +-----+-----+
| gdUSD   |  | xStockVault|
| (ERC-20)|  | (70% LTV)  |
+---------+  +------------+
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin |
| Chain | Ink Sepolia |
| Frontend | React 19, Vite, TypeScript |
| Web3 | wagmi 3, viem, Privy |
| Animation | Framer Motion, Canvas Confetti |
| Charts | Lightweight Charts (TradingView) |

## Contracts (Ink Sepolia)

| Contract | Address |
|----------|---------|
| USDC | `0x6b57475467cd854d36Be7FB614caDa5207838943` |
| gdUSD | `0x6bc52778d12AB1D80b7b6C7A004864648090b7a9` |
| PriceFeed | `0x822872d3E57d7787f9078A869448fE481c37fcbC` |
| xStocksGrid | `0x338B6a94e8317A7BF5d00224F2e2c7c7B6BBe981` |
| xStockVault | `0xba016f01adc29022B72032F1e532BDeaaC7Cb1D3` |

## How It Works

1. **Deposit USDC** to get gdUSD (1:1)
2. **Open the grid** and pick a stock
3. **Click a cell** to place a bet (price row + time column)
4. The contract computes `P_touch = 2 * PHI(-|z|)` using GBM barrier math and sets your multiplier
5. If the price touches your target before the bucket expires, you win `bet * multiplier` in gdUSD
6. Redeem gdUSD back to USDC, or stake xStock tokens in the vault for more gdUSD

## Future Scope

**Mainnet on Ink** with real xStock tokens from Backed's xChange

**Live price feed** polling Backed's API at 500ms with TOUCH resolution (high/low per bucket window)

**LP yield dashboard** showing real-time share NAV and historical returns

**Cross-stock spreads** — bet on QQQ vs SPY in a single grid

**Mobile PWA** — the snake grid is already touch-friendly

**Tournament mode** — weekly leaderboards with prize pools

**More stocks** — expand beyond 14 to cover the full Backed xStocks catalog

## Build & Deploy

```bash
cd contracts
forge build
forge script script/Deploy.s.sol \
  --rpc-url $INK_SEPOLIA_RPC \
  --broadcast \
  --private-key $DEPLOYER_KEY

cd ../tap-trade
npm install
npm run dev
```
