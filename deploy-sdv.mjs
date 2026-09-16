// deploy-sdv.mjs — deploy Condition Governor + Vault to Studio Next (61997)
//
// ROOT CAUSE of all prior failures (~20 attempts):
//   Only ONE py-genlayer runner hash is registered on Studio Next:
//     5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng   (v0.3.0)
//   The boilerplate branches pin STALE hashes:
//     v2-dev -> 9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0
//     main   -> 1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6
//   Deploying with a stale hash => status ACCEPTED, exec FINISHED_WITH_ERROR, no code.
//   Source of truth: https://sdk.genlayer.com/main/_static/ai/api.txt
//
// Each contract must therefore start with:
//     # v0.3.0
//     # { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
//   and import `from genlayer.types import *`.
//
// Usage: node deploy-sdv.mjs
import { createClient, createAccount, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";

const PRIVATE_KEY = readFileSync(
  path.join(process.env.HOME, ".hermes/secrets/task-verifier-signer"),
  "utf8",
).trim();

const RPC_URL = "https://studio-next.genlayer.com/api";
// studioDevnet is chainId 61997 = Studio Next. Override its default RPC.
const chain = { ...studioDevnet, rpcUrls: { default: { http: [RPC_URL] } } };

const REQUIRED_RUNNER = "5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng";

function assertHeader(file, code) {
  const text = code.toString("utf8");
  const first = text.split("\n").slice(0, 3).join("\n");
  if (!first.includes("# v0.3.0")) {
    throw new Error(`${file}: missing "# v0.3.0" marker line`);
  }
  if (!first.includes(REQUIRED_RUNNER)) {
    const found = first.match(/py-genlayer:([a-z0-9]+)/)?.[1];
    throw new Error(
      `${file}: wrong runner hash (${found}). Studio Next requires ${REQUIRED_RUNNER}`,
    );
  }
  if (!text.includes("from genlayer.types import *")) {
    throw new Error(`${file}: missing "from genlayer.types import *"`);
  }
}

async function deployOne(client, file, label) {
  console.log(`\n=== Deploying ${label} (${file}) ===`);
  const code = new Uint8Array(readFileSync(path.resolve(process.cwd(), file)));
  assertHeader(file, Buffer.from(code));

  const fees = await client.estimateTransactionFees({
    profileTarget: { kind: "deploy" },
    deployTargeted: true,
  });
  console.log("  feeValue:", fees?.feeValue?.toString());

  const tx = await client.deployContract({ code, args: [], fees });
  console.log("  tx:", tx);

  const receipt = await client.waitForTransactionReceipt({
    hash: tx,
    waitUntil: "finalized",
    retries: 300,
    interval: 5000,
  });

  const ok = isSuccessful(receipt);
  console.log(
    `  status=${receipt.statusName} exec=${receipt.txExecutionResultName} isSuccessful=${ok}`,
  );

  const addr =
    receipt.txDataDecoded?.contractAddress ?? receipt.data?.contract_address;
  console.log(`  >>> ${label}: ${addr}`);
  if (!ok) throw new Error(`${label} deploy NOT successful`);
  return addr;
}

// GenVM contracts are NOT EVM bytecode: eth_getCode always returns 0x.
// gen_getContractCode (single address param) is the correct existence check.
async function verifyCode(address, expectedBytes) {
  const r = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "gen_getContractCode",
      params: [address],
    }),
  });
  const j = await r.json();
  const bytes = j.result && j.result !== "0x" ? (j.result.length - 2) / 2 : 0;
  const head = j.result
    ? Buffer.from(j.result.slice(2), "base64").toString("utf8").split("\n")[0]
    : "";
  console.log(`  on-chain code: ${bytes} bytes | ${head}`);
  if (bytes < expectedBytes) {
    throw new Error(`${address}: no code on chain (got ${bytes} bytes)`);
  }
}

async function main() {
  const account = createAccount(PRIVATE_KEY);
  console.log("Deployer:", account.address);

  const client = createClient({ chain, endpoint: RPC_URL, account });

  const cond = await deployOne(client, "contracts/condition.py", "ConditionGovernor");
  await verifyCode(cond, 1000);

  const vault = await deployOne(client, "contracts/vault.py", "Vault");
  await verifyCode(vault, 1000);

  console.log("\n=== DEPLOYMENT COMPLETE (verified) ===");
  console.log(`NEXT_PUBLIC_CONDITION_CONTRACT=${cond}`);
  console.log(`NEXT_PUBLIC_VAULT_CONTRACT=${vault}`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
