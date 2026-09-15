/**
 * TypeScript types for GenLayer Self-Destructing Vault contract
 */

export interface Vault {
  id: string;
  team_address: string;
  deadline: string;
  condition: string;
  check_url: string;
  total_deposited: string; // In GEN (wei string)
  status: 'active' | 'released' | 'refunded';
  verdict?: boolean;
  created_at: string;
  creator: string;
}

export interface VaultCondition {
  id: string;
  description: string;
  check_url: string;
  result?: boolean;
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