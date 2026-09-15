# GenLayer Self-Destructing Vault

A decentralized application for creating self-destructing vaults on the GenLayer blockchain. Vaults automatically release or refund funds based on AI-verified conditions.

## Features

- **Create Vaults**: Set up vaults with conditions, deadlines, and team addresses
- **Deposit Funds**: Lock GEN tokens in vaults until conditions are met
- **Automatic Resolution**: GenLayer's AI verifies conditions and releases funds
- **Refund Mechanism**: Get funds back if conditions aren't met by deadline
- **Real-time Tracking**: Monitor vault status, deposits, and verdicts
- **Glass-morphism UI**: Premium dark theme with OKLCH colors and smooth animations

## Quick Start

### Prerequisites

- Node.js 18+ 
- MetaMask wallet
- GenLayer Studio (for development)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Environment Configuration

Edit `.env` file with your contract addresses:

```env
# GenLayer RPC API URL
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-next.genlayer.com/api

# GenLayer Network Configuration
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio Next
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN

# Self-Destructing Vault Contract Addresses
NEXT_PUBLIC_VAULT_CONTRACT=your_vault_contract_address
NEXT_PUBLIC_CONDITION_CONTRACT=your_condition_contract_address
```

## Usage

1. **Connect Wallet**: Click "Connect Wallet" to connect your MetaMask
2. **Create Vault**: Click "Create Vault" to set up a new vault with:
   - Team address (receives funds if condition is met)
   - Deadline (when refund becomes available)
   - Condition (what needs to be verified)
   - Check URL (where to verify the condition)
3. **Deposit Funds**: Click "Deposit" on any active vault to add GEN tokens
4. **Monitor Status**: Watch for condition verification and verdicts
5. **Release/Refund**: Funds automatically release or can be refunded after deadline

## Architecture

```
frontend/
├── app/
│   ├── page.tsx              # Main page with vault list and creation
│   ├── layout.tsx            # Root layout with providers
│   └── providers.tsx         # React Query and other providers
├── components/
│   ├── VaultList.tsx         # Display all vaults with actions
│   ├── CreateVaultModal.tsx  # Modal for creating new vaults
│   ├── WalletConnectButton.tsx # Wallet connection button
│   ├── Navbar.tsx            # Navigation bar
│   └── ui/                   # Reusable UI components
├── lib/
│   ├── contracts/
│   │   ├── SelfDestructingVault.ts  # Contract interaction class
│   │   └── types.ts         # TypeScript type definitions
│   ├── hooks/
│   │   └── useVault.ts      # React hooks for vault operations
│   └── genlayer/
│       ├── client.ts        # GenLayer client configuration
│       ├── wallet.ts        # Wallet context and hooks
│       └── network.ts       # Network configuration
└── public/                   # Static assets
```

## Contract Interaction

The frontend interacts with two contracts:

1. **Vault Contract**: Manages vault creation, deposits, releases, and refunds
2. **Condition Contract**: Handles condition verification and verdicts

### Key Methods

- `create_vault(team_address, deadline, condition, check_url)` - Create new vault
- `deposit(vault_id)` - Deposit GEN tokens (payable)
- `release(vault_id)` - Release funds to team (after condition met)
- `refund(vault_id)` - Refund to depositors (after deadline)
- `get_vault(vault_id)` - Get vault details
- `get_all_vaults()` - Get all vaults
- `get_verdict(vault_id)` - Get condition verdict
- `get_condition(vault_id)` - Get vault condition

## Development

### Running Tests

```bash
# Run unit tests
npm test

# Run integration tests (requires Studio)
npm run test:integration
```

### Building for Production

```bash
npm run build
npm start
```

## Network Configuration

- **Chain ID**: 61997
- **RPC URL**: https://studio-next.genlayer.com/api
- **Explorer**: https://explorer-studio-dev.genlayer.com/

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC

## Support

- [GenLayer Documentation](https://docs.genlayer.com/)
- [GenLayer Studio](https://studio-next.genlayer.com)
- [GitHub Issues](https://github.com/genlayerlabs/genlayer-project-boilerplate/issues)