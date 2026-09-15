"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import SelfDestructingVault from "../contracts/SelfDestructingVault";
import { getVaultContractAddress, getConditionContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { configError } from "../utils/toast";
import type { Vault, CreateVaultParams, DepositParams } from "../contracts/types";

/**
 * Hook to get the SelfDestructingVault contract instance
 *
 * Returns null if contract addresses are not configured.
 * The contract instance is recreated whenever the wallet address changes.
 * Read-only operations (getVault, getAllVaults, etc.) work without a connected wallet.
 */
export function useVaultContract(): SelfDestructingVault | null {
  const { address } = useWallet();
  const vaultAddress = getVaultContractAddress();
  const conditionAddress = getConditionContractAddress();
  const contract = useMemo(() => {
    // Validate contract addresses are configured
    if (!vaultAddress || !conditionAddress) {
      configError(
        "Setup Required",
        "Contract addresses not configured. Please set NEXT_PUBLIC_VAULT_CONTRACT and NEXT_PUBLIC_CONDITION_CONTRACT in your .env file.",
        {
          label: "Setup Guide",
          onClick: () => window.open("/docs/setup", "_blank")
        }
      );
      // Return null to indicate contract is not available
      return null;
    }

    // Contract instance is recreated when address changes to ensure
    // the genlayer-js client is properly configured with the current account
    return new SelfDestructingVault(vaultAddress, conditionAddress, address);
  }, [vaultAddress, conditionAddress, address]);

  return contract;
}

/**
 * Hook to fetch all vaults
 * Refetches on window focus and after mutations
 * Returns empty array if contract is not configured
 */
export function useVaults() {
  const contract = useVaultContract();

  return useQuery<Vault[], Error>({
    queryKey: ["vaults"],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve([]);
      }
      return contract.getAllVaults();
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract, // Only run query if contract is available
  });
}

/**
 * Hook to fetch a single vault by ID
 * Refetches on window focus and after mutations
 * Returns null if contract is not configured or vault doesn't exist
 */
export function useVault(id: string) {
  const contract = useVaultContract();

  return useQuery<Vault | null, Error>({
    queryKey: ["vault", id],
    queryFn: () => {
      if (!contract) {
        return Promise.resolve(null);
      }
      return contract.getVault(id);
    },
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!id && !!contract, // Require both id and contract
  });
}

/**
 * Hook to create a new vault
 * Returns a mutation function that creates a vault and invalidates the vaults query
 */
export function useCreateVault() {
  const contract = useVaultContract();
  const invalidateVaultsData = useInvalidateVaultsData();

  return useMutation({
    mutationFn: async (params: CreateVaultParams) => {
      if (!contract) {
        throw new Error("Contract not available");
      }
      return contract.createVault(params);
    },
    onSuccess: () => {
      invalidateVaultsData();
    },
  });
}

/**
 * Hook to deposit GEN tokens into a vault
 * Returns a mutation function that deposits and invalidates the vaults query
 */
export function useDeposit() {
  const contract = useVaultContract();
  const invalidateVaultsData = useInvalidateVaultsData();

  return useMutation({
    mutationFn: async (params: DepositParams) => {
      if (!contract) {
        throw new Error("Contract not available");
      }
      return contract.deposit(params);
    },
    onSuccess: () => {
      invalidateVaultsData();
    },
  });
}

/**
 * Hook to release funds from a vault (after condition is met)
 * Returns a mutation function that releases and invalidates the vaults query
 */
export function useRelease() {
  const contract = useVaultContract();
  const invalidateVaultsData = useInvalidateVaultsData();

  return useMutation({
    mutationFn: async (vaultId: string) => {
      if (!contract) {
        throw new Error("Contract not available");
      }
      return contract.release(vaultId);
    },
    onSuccess: () => {
      invalidateVaultsData();
    },
  });
}

/**
 * Hook to refund funds from a vault (after deadline without condition met)
 * Returns a mutation function that refunds and invalidates the vaults query
 */
export function useRefund() {
  const contract = useVaultContract();
  const invalidateVaultsData = useInvalidateVaultsData();

  return useMutation({
    mutationFn: async (vaultId: string) => {
      if (!contract) {
        throw new Error("Contract not available");
      }
      return contract.refund(vaultId);
    },
    onSuccess: () => {
      invalidateVaultsData();
    },
  });
}

/**
 * Hook to invalidate all vault-related queries
 * Useful after mutations to refetch the latest data
 */
export function useInvalidateVaultsData() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["vaults"] });
    queryClient.invalidateQueries({ queryKey: ["vault"] });
  }, [queryClient]);
}