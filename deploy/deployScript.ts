import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { localnet } from "genlayer-js/chains";

export const isSuccessfulDeploymentReceipt = (receipt: {
  status?: number | string;
  statusName?: string;
}): boolean => {
  const numericStatus = Number(receipt.status);
  return (
    numericStatus === 5 ||
    numericStatus === 7 ||
    receipt.statusName === "ACCEPTED" ||
    receipt.statusName === "FINALIZED"
  );
};

export default async function main(client: GenLayerClient<any>) {
  // Step 1: Deploy Condition Governor
  const conditionPath = path.resolve(process.cwd(), "contracts/condition.py");
  console.log("Deploying Condition Governor...");

  try {
    const conditionCode = new Uint8Array(readFileSync(conditionPath));
    await client.initializeConsensusSmartContract();

    const conditionTx = await client.deployContract({
      code: conditionCode,
      args: [],
    });

    console.log(`Condition tx hash: ${conditionTx}`);

    const conditionReceipt = await client.waitForTransactionReceipt({
      hash: conditionTx as TransactionHash,
      waitUntil: "decided",
      retries: 200,
    });

    console.log(`Condition receipt:`, JSON.stringify(conditionReceipt, null, 2));

    if (!isSuccessfulDeploymentReceipt(conditionReceipt)) {
      throw new Error(`Condition deployment failed. Receipt: ${JSON.stringify(conditionReceipt)}`);
    }

    // Try multiple ways to get the contract address
    const conditionAddress =
      (client.chain as GenLayerChain).id === localnet.id
        ? conditionReceipt.data?.contract_address
        : (conditionReceipt.txDataDecoded as DecodedDeployData)?.contractAddress
          ?? conditionReceipt.data?.contract_address
          ?? conditionReceipt.contract_address;

    if (!conditionAddress) {
      console.log("Receipt keys:", Object.keys(conditionReceipt));
      console.log("Receipt.data:", conditionReceipt.data);
      console.log("Receipt.txDataDecoded:", conditionReceipt.txDataDecoded);
      throw new Error("Condition deployment receipt did not contain a contract address");
    }

    console.log(`✅ Condition Governor deployed at: ${conditionAddress}`);

    // Step 2: Deploy Vault
    const vaultPath = path.resolve(process.cwd(), "contracts/vault.py");
    console.log("Deploying Self-Destructing Vault...");

    const vaultCode = new Uint8Array(readFileSync(vaultPath));

    const vaultTx = await client.deployContract({
      code: vaultCode,
      args: [],
    });

    console.log(`Vault tx hash: ${vaultTx}`);

    const vaultReceipt = await client.waitForTransactionReceipt({
      hash: vaultTx as TransactionHash,
      waitUntil: "decided",
      retries: 200,
    });

    console.log(`Vault receipt:`, JSON.stringify(vaultReceipt, null, 2));

    if (!isSuccessfulDeploymentReceipt(vaultReceipt)) {
      throw new Error(`Vault deployment failed. Receipt: ${JSON.stringify(vaultReceipt)}`);
    }

    const vaultAddress =
      (client.chain as GenLayerChain).id === localnet.id
        ? vaultReceipt.data?.contract_address
        : (vaultReceipt.txDataDecoded as DecodedDeployData)?.contractAddress
          ?? vaultReceipt.data?.contract_address
          ?? vaultReceipt.contract_address;

    if (!vaultAddress) {
      throw new Error("Vault deployment receipt did not contain a contract address");
    }

    console.log(`✅ Self-Destructing Vault deployed at: ${vaultAddress}`);

    console.log("\n=== DEPLOYMENT COMPLETE ===");
    console.log(`Condition Governor: ${conditionAddress}`);
    console.log(`Vault: ${vaultAddress}`);
    console.log(`\nUpdate frontend/.env with:`);
    console.log(`NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS=${vaultAddress}`);
    console.log(`NEXT_PUBLIC_CONDITION_CONTRACT_ADDRESS=${conditionAddress}`);

  } catch (error) {
    throw new Error(`Error during deployment: ${error}`);
  }
}
