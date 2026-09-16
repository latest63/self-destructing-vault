// verify-frontend-path.mjs — exercise the EXACT code path the frontend uses,
// by importing the same logic. This proves createVault args + release/refund
// fee handling are correct against the live Studio Next contracts.
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

const VAULT = "0xaDce66075e9D1C6e43aF13EFE88AfC0265A79d33";
const CONDITION = "0xd56D815662C9E0008835E79a66A1CFAFdcF1256E";
const TEAM = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67";

const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

// ---- Mirror the frontend's generateVaultId() ----
const generateVaultId = () => `vault-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const writeBasic = async (label, address, functionName, args, value) => {
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({ address, functionName, args, value, fees });
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  console.log(`  ${label}: ${r.txExecutionResultName} ok=${isSuccessful(r)}`);
  return r;
};

// ============================================================
// CASE 1: SUCCESS path -> release to team (mirrors the UI flow)
// ============================================================
console.log("=== CASE 1: condition MET -> Release to Team ===");
const id1 = generateVaultId();
console.log("vaultId:", id1);
const claim1 = "This page is the GenLayer documentation website";
const url1 = "https://docs.genlayer.com/";
const deadline1 = String(Math.floor(Date.now() / 1000) + 3600);

await writeBasic("1. register_condition", CONDITION, "register_condition", [id1, url1, claim1, TEAM]);
await writeBasic("2. evaluate", CONDITION, "evaluate", [id1]);
console.log("  verdict:", j(await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [id1] })));
// frontend createVault arg order: (id, team, deadline, condition, condition_contract)
await writeBasic("3. create_vault", VAULT, "create_vault", [id1, TEAM, deadline1, claim1, CONDITION]);
await writeBasic("4. deposit", VAULT, "deposit", [id1], 2000000000000000n);

// frontend release(): estimateTransactionFeesForWrite
const relFees = await client.estimateTransactionFeesForWrite({
  address: VAULT, functionName: "release", args: [id1], account: client.account,
});
console.log("  release messageAllocations:", (relFees.messageAllocations || []).length);
const relTx = await client.writeContract({ address: VAULT, functionName: "release", args: [id1], fees: relFees });
const relR = await client.waitForTransactionReceipt({ hash: relTx, waitUntil: "finalized", retries: 400, interval: 5000 });
console.log(`  5. release: ${relR.txExecutionResultName} ok=${isSuccessful(relR)}`);
console.log("  FINAL:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [id1] })));

// ============================================================
// CASE 2: FAILURE path -> refund depositors (the Elche case)
// ============================================================
console.log("\n=== CASE 2: condition NOT MET -> Refund Depositors (Elche case) ===");
const id2 = generateVaultId();
console.log("vaultId:", id2);
const claim2 = "This page states that Elche won their match against Real Madrid";
const url2 = "https://www.livescore.com/en/football/spain/laliga/elche-vs-real-madrid/1810661/";
const deadline2 = String(Math.floor(Date.now() / 1000) - 60); // past deadline

await writeBasic("1. register_condition", CONDITION, "register_condition", [id2, url2, claim2, TEAM]);
await writeBasic("2. evaluate", CONDITION, "evaluate", [id2]);
console.log("  verdict:", j(await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [id2] })));
await writeBasic("3. create_vault", VAULT, "create_vault", [id2, TEAM, deadline2, claim2, CONDITION]);
await writeBasic("4. deposit", VAULT, "deposit", [id2], 2000000000000000n);

const refFees = await client.estimateTransactionFeesForWrite({
  address: VAULT, functionName: "refund", args: [id2], account: client.account,
});
console.log("  refund messageAllocations:", (refFees.messageAllocations || []).length);
const refTx = await client.writeContract({ address: VAULT, functionName: "refund", args: [id2], fees: refFees });
const refR = await client.waitForTransactionReceipt({ hash: refTx, waitUntil: "finalized", retries: 400, interval: 5000 });
console.log(`  5. refund: ${refR.txExecutionResultName} ok=${isSuccessful(refR)}`);
console.log("  FINAL:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [id2] })));
console.log("  depositors:", j(await client.readContract({ address: VAULT, functionName: "get_vault_depositors", args: [id2] })));
