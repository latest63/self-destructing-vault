# ShipGuard — Escrowed Raises on GenLayer

ShipGuard lets teams raise funds with a single condition, one evidence URL, and a close date. Backers deposit GEN into the contract. When the work ships, funds release — otherwise every backer refunds. No middleman, no guesswork.

**Live contracts on Studio Next (chainId 61997):**
- ConditionGovernor: `0x3F3A37d949C5fD03E67C758C38d214645D94f721`
- Vault: `0x17F1B041803d5f1B188F34b47EE727152885356C`

## What's included

- **Intelligent contract** — Python-based condition governor with AI verification via GenLayer's equivalence principle
- **Frontend** — Next.js app with Lemon UI theme, RainbowKit wallet integration, and a responsive landing page
- **Condition setup** — Single condition, single evidence URL, single team address per raise
- **Dual settlement** — Release to team if condition met, refund backers if not (or after close date)

## Project Structure

```
contracts/              # Python intelligent contracts
tests/
  direct/               # Fast in-memory tests
frontend/               # Next.js 16 app (TypeScript, Tailwind v4, RainbowKit)
deploy/                 # Deployment scripts
```

## Quick Start

### 1. Set up Python environment

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Deploy the contract

```shell
genlayer network studio-next  # Select Studio Next (chainId 61997)
genlayer deploy
```

### 3. Set up the frontend

```shell
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:3000/

### 4. Wallet connection

The frontend uses RainbowKit with your WalletConnect projectId. Configure in `frontend/lib/wagmi-setup.tsx`:

```typescript
const { connectors } = getDefaultWallets({
  appName: "ShipGuard",
  projectId: "YOUR_PROJECT_ID",
});
```

## How It Works

1. **Open a raise** — Set team address, condition, evidence URL, and close date
2. **Backers deposit** — Anyone can deposit GEN into the raise contract
3. **AI reads evidence** — At close date, GenLayer validators verify the condition against the evidence URL
4. **Release or refund** — Funds go to the team if verified, or refund to backers if not

## License

MIT
