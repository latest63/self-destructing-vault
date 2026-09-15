import { createClient } from "genlayer-js";
import { GENLAYER_CHAIN } from "../genlayer/client";
import type { Vault, CreateVaultParams, DepositParams } from "./types";

/**
 * SelfDestructingVault contract class for interacting with the GenLayer Vault contract
 */
class SelfDestructingVault {
  private vaultAddress: `0x${string}`;
  private conditionAddress: `0x${string}`;
  private client: any;

  constructor(vaultAddress: string, conditionAddress: string, address?: string | null) {
    this.vaultAddress = vaultAddress as `0x${string}`;
    this.conditionAddress = conditionAddress as `0x${string}`;

    const config: any = {
      chain: GENLAYER_CHAIN,
    };

    if (address) {
      config.account = address as `0x${string}`;
    }

    this.client = createClient(config);
  }

  /**
   * Update the address used for transactions
   */
  updateAccount(address: string): void {
    const config: any = {
      chain: GENLAYER_CHAIN,
      account: address as `0x${string}`,
    };
    this.client = createClient(config);
  }

  /**
   * Create a new vault
   */
  async createVault(params: CreateVaultParams): Promise<string> {
    try {
      const result = await this.client.writeContract({
        address: this.vaultAddress,
        functionName: "create_vault",
        args: [
          params.team_address,
          params.deadline,
          params.condition,
          params.check_url,
        ],
      });
      return result.hash;
    } catch (error) {
      console.error("Error creating vault:", error);
      throw new Error("Failed to create vault");
    }
  }

  /**
   * Deposit GEN tokens into a vault
   */
  async deposit(params: DepositParams): Promise<string> {
    try {
      const result = await this.client.writeContract({
        address: this.vaultAddress,
        functionName: "deposit",
        args: [params.vault_id],
        value: BigInt(params.amount),
      });
      return result.hash;
    } catch (error) {
      console.error("Error depositing to vault:", error);
      throw new Error("Failed to deposit to vault");
    }
  }

  /**
   * Release funds from a vault (after condition is met)
   */
  async release(vaultId: string): Promise<string> {
    try {
      const result = await this.client.writeContract({
        address: this.vaultAddress,
        functionName: "release",
        args: [vaultId],
      });
      return result.hash;
    } catch (error) {
      console.error("Error releasing vault:", error);
      throw new Error("Failed to release vault");
    }
  }

  /**
   * Refund funds from a vault (after deadline without condition met)
   */
  async refund(vaultId: string): Promise<string> {
    try {
      const result = await this.client.writeContract({
        address: this.vaultAddress,
        functionName: "refund",
        args: [vaultId],
      });
      return result.hash;
    } catch (error) {
      console.error("Error refunding vault:", error);
      throw new Error("Failed to refund vault");
    }
  }

  /**
   * Get a single vault by ID
   */
  async getVault(vaultId: string): Promise<Vault | null> {
    try {
      const vault: any = await this.client.readContract({
        address: this.vaultAddress,
        functionName: "get_vault",
        args: [vaultId],
      });

      if (!vault) return null;

      // Convert Map structure to plain object
      if (vault instanceof Map) {
        const vaultObj = Array.from(vault.entries()).reduce(
          (obj: any, [key, value]: any) => {
            obj[key] = value;
            return obj;
          },
          {} as Record<string, any>
        ) as Vault;
        return vaultObj;
      }

      return vault as Vault;
    } catch (error) {
      console.error("Error fetching vault:", error);
      throw new Error("Failed to fetch vault");
    }
  }

  /**
   * Get all vaults
   */
  async getAllVaults(): Promise<Vault[]> {
    try {
      const vaults: any = await this.client.readContract({
        address: this.vaultAddress,
        functionName: "get_all_vaults",
        args: [],
      });

      // Convert GenLayer Map structure to typed array
      if (vaults instanceof Map) {
        return Array.from(vaults.entries()).map(([id, vaultData]: any) => {
          const vaultObj = Array.from((vaultData as any).entries()).reduce(
            (obj: any, [key, value]: any) => {
              obj[key] = value;
              return obj;
            },
            {} as Record<string, any>
          ) as Vault;
          vaultObj.id = id;
          return vaultObj;
        });
      }

      return [];
    } catch (error) {
      console.error("Error fetching vaults:", error);
      throw new Error("Failed to fetch vaults from contract");
    }
  }

  /**
   * Get the verdict of a vault's condition
   */
  async getVerdict(vaultId: string): Promise<boolean | null> {
    try {
      const verdict = await this.client.readContract({
        address: this.vaultAddress,
        functionName: "get_verdict",
        args: [vaultId],
      });
      return verdict as boolean;
    } catch (error) {
      console.error("Error fetching verdict:", error);
      return null;
    }
  }

  /**
   * Get the condition details for a vault
   */
  async getCondition(vaultId: string): Promise<string> {
    try {
      const condition = await this.client.readContract({
        address: this.vaultAddress,
        functionName: "get_condition",
        args: [vaultId],
      });
      return condition as string;
    } catch (error) {
      console.error("Error fetching condition:", error);
      return "";
    }
  }
}

export default SelfDestructingVault;