# Self-Destructing Vault Contracts

## Overview

Two contracts implementing a "contracts that govern contracts" pattern for secure fund management with AI-powered condition verification.

## Contracts

### 1. `vault.py` - SelfDestructingVault

The main vault contract that holds funds and manages deposits/releases/refunds.

**Key Features:**
- **Vault Creation**: Create vaults with team address, deadline, conditions, and a reference to a condition contract
- **Deposits**: Users can deposit funds (payable) into active vaults
- **Release**: Funds released to team only when condition contract returns "success" verdict
- **Refund**: Funds refunded to all depositors if condition fails or deadline passes
- **Governance Gate**: Vault reads condition contract verdict before allowing release/refund

**Important Methods:**
- `create_vault()` - Create a new vault
- `deposit()` - Add funds to vault (payable)
- `release()` - Release funds to team (requires success verdict)
- `refund()` - Refund to depositors (requires failure verdict or deadline passed)
- `get_vault()` / `get_all_vaults()` - View vault details
- `get_deposit()` / `get_vault_depositors()` - View deposit information

### 2. `condition.py` - ConditionGovernor

The condition verification contract that uses AI consensus to evaluate plain-English conditions.

**Key Features:**
- **Condition Registration**: Register conditions with URLs and success criteria
- **AI-Powered Verification**: Uses web fetching + LLM + consensus to verify conditions
- **Verdict Storage**: Stores verdicts on-chain for vault contract to read
- **Consensus**: Uses `gl.eq_principle.prompt_comparative` for multi-validator agreement

**Important Methods:**
- `register_condition()` - Register a new condition
- `evaluate()` - Run AI verification and store verdict (WRITE)
- `get_verdict()` - Read verdict (VIEW - called by vault contract)
- `get_condition()` / `get_all_conditions()` - View condition details

## Architecture Flow

```
1. Creator creates vault → references condition contract address
2. Creator registers condition → provides URL and success criteria
3. Users deposit funds → into active vault
4. Someone calls evaluate() on condition contract → AI consensus verifies condition
5. Vault contract reads get_verdict() → to check if condition met
6. If SUCCESS → release() transfers funds to team
7. If FAILURE or deadline passed → refund() returns funds to depositors
```

## Key Design Decisions

1. **Separation of Concerns**: Vault handles funds, condition contract handles verification
2. **AI Consensus**: Uses prompt_comparative for multi-validator agreement on verification
3. **Web.get over web.render**: Avoids validator hangs on Bradbury/Studio
4. **Cached Verdicts**: Once evaluated, verdict is stored and cached
5. **Proportional Refunds**: Each depositor gets back exactly what they deposited

## Import Style

Matches existing boilerplate:
```python
import genlayer as gl
from genlayer.storage import allow as allow_storage
```

## API Usage

- `gl.vm.transfer(address, amount)` for value transfers
- `gl.get_contract_at(address)` for cross-contract calls
- `contract.view().method()` for read-only cross-contract calls
- `gl.nondet.web.get(url)` for web fetching (not web.render)
- `gl.nondet.exec_prompt(prompt)` for LLM calls
- `gl.eq_principle.prompt_comparative()` for consensus verification
