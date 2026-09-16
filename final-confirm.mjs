// final-confirm.mjs — confirm money movement on the CURRENT deployment, and
// prove the Elche page now yields a confident verdict (truncation fix).
import { createClient, createAccount, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";

const PK = readFileSync(path.join(process.env.HOME, ".hermes/secrets/task-verifier-signer"), "utf8").trim();
const RPC = "https://studio-next.genlayer.com/api";
const client = createClient({
  chain: { ...studioDevnet, rpcUrls: { default: { http: [RPC] } } },
  endpoint: RPC,
  account: createAccount(PK),
});

const VAULT = "0x17F1B041803d5f1B188F34b47EE727152885356C";
const CONDITION = "0x3F3A37d949C5fD03E67C758C38d214645D94f721";
const TEAM = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67";

const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));
const vid = () => `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const write = async (label, address, functionName, args, value) => {
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({ address, functionName, args, value, fees });
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  console.log(`  ${label}: ${r.txExecutionResultName} ok=${isSuccessful(r)}`);
  return r;
};

const writeEmitting = async (label, address, functionName, args) => {
  const fees = await client.estimateTransactionFeesForWrite({
    address, functionName, args, account: client.account,
  });
  console.log(`  ${label}: allocations=${(fees.messageAllocations || []).length}`);
  const tx = await client.writeContract({ address, functionName, args, fees });
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  console.log(`  ${label}: ${r.txExecutionResultName} ok=${isSuccessful(r)}`);
  return r;
};

const vaultState = (id) => client.readContract({ address: VAULT, functionName: "get_vault", args: [id] });

// ============ TEST 1: REAL ELCHE PAGE — does the AI now read the actual result? ============
console.log("=== TEST 1: REAL ELCHE PAGE (truncation fix check) ===");
const id1 = vid();
await write("register_condition", CONDITION, "register_condition", [
  id1,
  "https://www.livescore.com/en/football/spain/laliga/elche-vs-real-madrid/1810661/",
  "This page shows that Elche won their match against Real Madrid",
  TEAM,
]);
await write("evaluate", CONDITION, "evaluate", [id1]);
const v1 = await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [id1] });
console.log("  VERDICT:", j(v1));

// ============ TEST 2: SUCCESS -> RELEASE (money moves) ============
console.log("\n=== TEST 2: condition MET -> release (funds to team) ===");
const id2 = vid();
const dl2 = String(Math.floor(Date.now() / 1000) + 3600);
await write("register_condition", CONDITION, "register_condition", [
  id2, "https://docs.genlayer.com/", "This page is the GenLayer documentation website", TEAM,
]);
await write("evaluate", CONDITION, "evaluate", [id2]);
console.log("  verdict:", j(await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [id2] })));
await write("create_vault", VAULT, "create_vault", [id2, TEAM, dl2, "This page is the GenLayer documentation website", CONDITION]);
await write("deposit", VAULT, "deposit", [id2], 3000000000000000n);
console.log("  BEFORE:", j(await vaultState(id2)));
await writeEmitting("release", VAULT, "release", [id2]);
console.log("  AFTER :", j(await vaultState(id2)));

// ============ TEST 3: FAILURE -> REFUND (money returns) ============
console.log("\n=== TEST 3: condition NOT MET -> refund (funds to depositors) ===");
const id3 = vid();
const dl3 = String(Math.floor(Date.now() / 1000) - 60); // past deadline
await write("register_condition", CONDITION, "register_condition", [
  id3, "https://docs.genlayer.com/", "This page is about underwater basket weaving", TEAM,
]);
await write("evaluate", CONDITION, "evaluate", [id3]);
console.log("  verdict:", j(await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [id3] })));
await write("create_vault", VAULT, "create_vault", [id3, TEAM, dl3, "This page is about underwater basket weaving", CONDITION]);
await write("deposit", VAULT, "deposit", [id3], 3000000000000000n);
console.log("  BEFORE:", j(await vaultState(id3)));
await writeEmitting("refund", VAULT, "refund", [id3]);
console.log("  AFTER :", j(await vaultState(id3)));
console.log("  depositors:", j(await client.readContract({ address: VAULT, functionName: "get_vault_depositors", args: [id3] })));
