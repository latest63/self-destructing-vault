/**
 * TypeScript types for GenLayer Self-Destructing Vault contract
 *
 * These mirror the on-chain return shapes exactly. Note that the contracts
 * return dicts, not primitives, for condition/verdict reads.
 */

/** A vault as returned by `get_vault` / `get_all_vaults` (all values are strings). */
export interface Vault {
  id: string;
  creator: string;
  team_address: string;
  deadline: string;          // unix seconds, as a string
  condition: string;         // the success-condition description
  condition_contract: string;
  total_deposited: string;   // wei string
  status: 'active' | 'released' | 'refunded';
  verdict: string;           // "" | "success" | "failure"
  verdict_reason: string;
  evaluated_at: string;
}

/** Raw verdict dict from the ConditionGovernor. */
export interface Verdict {
  decision: 'success' | 'failure' | 'pending';
  reason: string;
}

/** Raw condition dict from the ConditionGovernor. */
export interface VaultCondition {
  vault_id: string;
  check_url: string;
  success_condition: string;
  team_address: string;
  created_at: string;
}

export interface CreateVaultParams {
  team_address: string;
  deadline: string;
  condition: string;
  check_url: string;
}

export interface DepositParams {
  vault_id: string;
  amount: string; // In GEN (wei string)
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}
