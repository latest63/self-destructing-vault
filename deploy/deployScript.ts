import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { localnet } from "genlayer-js/chains";

// Generous explicit fee: covers consensus timeunits + execution + rotations.
// Network rejected the SDK default (0.025 GEN) with InsufficientFees.
const GENEROUS_FEES = {
  distribution: {
    leaderTimeunitsAllocation: "100",
    validatorTimeunitsAllocation: "200",
    appealRounds: "0",
    executionBudgetPerRound: "25000000000000000",
    executionConsumed: "0",
    totalMessageFees: "0",
    rotations: ["3"],
    maxPriceGenPerTimeUnit: "2",
    storageFeeMaxGasPrice: "300000000",
    receiptFeeMaxGasPrice: "300000000",
  },
  feeValue: "1000000000000000000", // 1 GEN
};

async function deployOne(
  client: GenLayerClient<any>,
  file: string,
  label: string,
): Promise<string | undefined> {
  const code = new Uint8Array(readFileSync(path.resolve(process.cwd(), file)));
  console.log(`Deploying ${label}...`);

  const tx = await client.deployContract({
    code,
    args: [],
    fees: GENEROUS_FEES,
  } as any);
  console.log(`  tx: ${tx}`);

  const receipt = await client.waitForTransactionReceipt({
    hash: tx as TransactionHash,
    waitUntil: "decided",
    retries: 200,
  });

  console.log(
    `  status=${receipt.status} result=${(receipt as any).result} exec=${(receipt as any).txExecutionResultName}`,
  );

  const addr =
    (client.chain as GenLayerChain).id === localnet.id
      ? receipt.data?.contract_address
      : ((receipt.txDataDecoded as DecodedDeployData)?.contractAddress ??
        receipt.data?.contract_address);

  return addr as string | undefined;
}

export default async function main(client: GenLayerClient<any>) {
  await client.initializeConsensusSmartContract();

  const conditionAddress = await deployOne(
    client,
    "contracts/condition.py",
    "Condition Governor",
  );
  console.log(`Condition Governor: ${conditionAddress}`);

  const vaultAddress = await deployOne(
    client,
    "contracts/vault.py",
    "Self-Destructing Vault",
  );
  console.log(`Vault: ${vaultAddress}`);

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log(`NEXT_PUBLIC_CONDITION_CONTRACT=${conditionAddress}`);
  console.log(`NEXT_PUBLIC_VAULT_CONTRACT=${vaultAddress}`);
}
