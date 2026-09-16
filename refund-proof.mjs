// refund-proof.mjs — PROVE the refund path fails without a message fee allocation,
// then prove it SUCCEEDS with one. Creates a vault with a deadline in the PAST.
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

const CONDITION = "0xd56D815662C9E0008835E79a66A1CFAFdcF1256E";
const VAULT = "0xaDce66075e9D1C6e43aF13EFE88AfC0265A79d33";
const TEAM = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67";

const VID = "rf-" + Date.now();
const URL = "https://docs.genlayer.com/";
// A claim we KNOW is false → verdict will be "failure" → refund permitted
const CLAIM = "This page is a page about underwater basket weaving";
// Deadline in the PAST so the deadline gate is satisfied
const DEADLINE = Math.floor(Date.now() / 1000) - 60;

const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

const writeBasic = async (label, address, functionName, args, value) => {
  console.log(`\n=== ${label} ===`);
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({ address, functionName, args, value, fees });
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
  if (!isSuccessful(r)) console.log("  RECEIPT:", j(r).slice(0, 900));
  return r;
};

console.log("VAULT_ID:", VID);
await writeBasic("1. register_condition", CONDITION, "register_condition", [VID, URL, CLAIM, TEAM]);
await writeBasic("2. evaluate", CONDITION, "evaluate", [VID]);
const verdict = await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [VID] });
console.log("  VERDICT:", j(verdict));
await writeBasic("3. create_vault", VAULT, "create_vault", [VID, TEAM, String(DEADLINE), CLAIM, CONDITION]);
await writeBasic("4. deposit", VAULT, "deposit", [VID], 1000000000000000n);
console.log("  STATE:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] })));

// ---- A: the NAIVE call (broken) ----
console.log("\n=== 5a. refund with naive estimateTransactionFees({}) — EXPECT FAILURE ===");
try {
  const naive = await client.estimateTransactionFees({});
  console.log("  naive messageAllocations:", j(naive.messageAllocations));
  const tx = await client.writeContract({ address: VAULT, functionName: "refund", args: [VID], fees: naive });
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
} catch (e) {
  console.log("  THREW:", e.message.slice(0, 400));
}

// ---- B: the CORRECT call ----
console.log("\n=== 5b. refund with estimateTransactionFeesForWrite — EXPECT SUCCESS ===");
const fees = await client.estimateTransactionFeesForWrite({
  address: VAULT, functionName: "refund", args: [VID], account: client.account,
});
console.log("  feeValue:", fees.feeValue?.toString());
console.log("  messageAllocations:", j(fees.messageAllocations));
const tx = await client.writeContract({ address: VAULT, functionName: "refund", args: [VID], fees });
console.log("  tx:", tx);
const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
if (!isSuccessful(r)) console.log("  RECEIPT:", j(r).slice(0, 1500));

console.log("\nstate AFTER:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] })));
console.log("\nVAULT=" + VAULT + "\nVID=" + VID);
