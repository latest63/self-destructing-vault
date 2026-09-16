// test-elche.mjs — end-to-end test of the SDV on Studio Next
// Case: Elche vs Real Madrid. Condition: "Elche wins".
import { createClient, createAccount, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";

const PK = readFileSync(
  path.join(process.env.HOME, ".hermes/secrets/task-verifier-signer"),
  "utf8",
).trim();
const RPC = "https://studio-next.genlayer.com/api";
const chain = { ...studioDevnet, rpcUrls: { default: { http: [RPC] } } };
const account = createAccount(PK);
const client = createClient({ chain, endpoint: RPC, account });

const CONDITION = "0xD3fE04158637C177EeD5724e15E6C89E65239039";
const VAULT = "0xCA999A8551A7c6486BB37696e99faCd3E6d7166b";

const VAULT_ID = "elche-real-" + Date.now();
const CHECK_URL =
  "https://www.livescore.com/en/football/spain/laliga/elche-vs-real-madrid/1810661/";
const SUCCESS_CONDITION = "Elche wins the match against Real Madrid";
const TEAM_ADDRESS = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67";

async function send(label, address, functionName, args) {
  console.log(`\n--- ${label} ---`);
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({
    address,
    functionName,
    args,
    fees,
  });
  console.log("  tx:", tx);
  const r = await client.waitForTransactionReceipt({
    hash: tx,
    waitUntil: "finalized",
    retries: 300,
    interval: 5000,
  });
  console.log(
    `  status=${r.statusName} exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`,
  );
  if (r.txExecutionError)
    console.log("  err:", JSON.stringify(r.txExecutionError).slice(0, 500));
  return r;
}

async function read(address, functionName, args = []) {
  try {
    return await client.readContract({ address, functionName, args });
  } catch (e) {
    return { __error: e.message.slice(0, 400) };
  }
}

console.log("Deployer:", account.address);
console.log("Vault ID:", VAULT_ID);

// 1. register the condition
await send("1. register_condition", CONDITION, "register_condition", [
  VAULT_ID,
  CHECK_URL,
  SUCCESS_CONDITION,
  TEAM_ADDRESS,
]);

// 2. verify it stored
console.log("\n--- read get_condition ---");
console.log(JSON.stringify(await read(CONDITION, "get_condition", [VAULT_ID])));

// 3. evaluate (AI consensus + web fetch)
await send("2. evaluate", CONDITION, "evaluate", [VAULT_ID]);

// 4. read verdict
console.log("\n--- read get_verdict ---");
console.log(JSON.stringify(await read(CONDITION, "get_verdict", [VAULT_ID])));

// 5. create vault pointing at condition contract
await send("3. create_vault", VAULT, "create_vault", [
  VAULT_ID,
  TEAM_ADDRESS,
  "2026-09-16T23:59:59",
  SUCCESS_CONDITION,
  CONDITION,
]);

// 6. deposit
console.log("\n--- 4. deposit ---");
try {
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({
    address: VAULT,
    functionName: "deposit",
    args: [VAULT_ID],
    value: 1000000000000000n, // 0.001 GEN
    fees,
  });
  console.log("  tx:", tx);
  const r = await client.waitForTransactionReceipt({
    hash: tx,
    waitUntil: "finalized",
    retries: 300,
    interval: 5000,
  });
  console.log(
    `  status=${r.statusName} exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`,
  );
  if (r.txExecutionError)
    console.log("  err:", JSON.stringify(r.txExecutionError).slice(0, 500));
} catch (e) {
  console.log("  deposit failed:", e.message.slice(0, 400));
}

// 7. read vault state
console.log("\n--- read get_vault ---");
console.log(JSON.stringify(await read(VAULT, "get_vault", [VAULT_ID])));

// 8. release (reads verdict from condition contract — the cross-contract call)
await send("5. release", VAULT, "release", [VAULT_ID]);

console.log("\n--- read get_vault after release ---");
console.log(JSON.stringify(await read(VAULT, "get_vault", [VAULT_ID])));

console.log("\nVAULT_ID=" + VAULT_ID);
