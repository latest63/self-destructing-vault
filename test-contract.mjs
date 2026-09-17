// Test the deployed contracts end-to-end
import { createClient, createAccount, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";

const PK = readFileSync(
  path.join(process.env.HOME, ".hermes/secrets/task-verifier-signer"),
  "utf8"
).trim();
const RPC = "https://studio-next.genlayer.com/api";
const account = createAccount(PK);
console.log("Test account:", account.address);

const client = createClient({
  chain: { ...studioDevnet, rpcUrls: { default: { http: [RPC] } } },
  endpoint: RPC,
  account,
});

const CONDITION = "0x3F3A37d949C5fD03E67C758C38d214645D94f721";
const VAULT = "0x17F1B041803d5f1B188F34b47EE727152885356C";

const j = (v) =>
  JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

const write = async (label, address, functionName, args, value) => {
  console.log(`\n=== ${label} ===`);
  try {
    const fees = await client.estimateTransactionFees({});
    console.log("  fees:", j(fees));
    const tx = await client.writeContract({
      address,
      functionName,
      args,
      value,
      fees,
    });
    console.log("  tx:", tx);
    const r = await client.waitForTransactionReceipt({
      hash: tx,
      waitUntil: "finalized",
      retries: 400,
      interval: 5000,
    });
    console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
    if (!isSuccessful(r)) console.log("  RECEIPT:", j(r).slice(0, 1500));
    return r;
  } catch (e) {
    console.log("  ERROR:", e.message || e);
    return null;
  }
};

// 1. Balance check
console.log("=== Balance ===");
try {
  const bal = await client.getBalance(account.address);
  console.log("  GEN balance:", bal.toString());
} catch (e) {
  console.log("  balance read err:", e.message);
}

// 2. Register condition — deliberately a FALSE condition so refund is valid
const VID = "test-" + Date.now();
const URL = "https://docs.genlayer.com/";
const CLAIM = "This page is an underwater coral reef guide"; // FALSE
const TEAM = account.address;

console.log("\nVAULT_ID:", VID);
await write("register_condition", CONDITION, "register_condition", [
  VID,
  URL,
  CLAIM,
  TEAM,
]);

// 3. Evaluate — should return "failure"
await write("evaluate", CONDITION, "evaluate", [VID]);
const verdict = await client.readContract({
  address: CONDITION,
  functionName: "get_verdict",
  args: [VID],
});
console.log("  VERDICT:", j(verdict));

// 4. Create vault with 90s deadline
const DEADLINE = String(Math.floor(Date.now() / 1000) + 90);
await write(
  "create_vault",
  VAULT,
  "create_vault",
  [VID, TEAM, DEADLINE, CLAIM, CONDITION]
);

// 5. Deposit 0.0001 GEN
await write("deposit", VAULT, "deposit", [VID], 100000000000000n);

const state = await client.readContract({
  address: VAULT,
  functionName: "get_vault",
  args: [VID],
});
console.log("  STATE:", j(state));

// 6. Try release before deadline (should fail — not success)
await write("release (expect fail)", VAULT, "release", [VID]);

// 7. Try refund before deadline (should fail — deadline not passed)
await write("refund before deadline (expect fail)", VAULT, "refund", [VID]);

// 8. Wait 95s for deadline to pass
console.log("\nWaiting 95s for deadline to pass...");
await new Promise((r) => setTimeout(r, 95000));

// 9. Refund after deadline (should succeed)
await write("refund after deadline", VAULT, "refund", [VID]);

const state2 = await client.readContract({
  address: VAULT,
  functionName: "get_vault",
  args: [VID],
});
console.log("  FINAL STATE:", j(state2));

console.log("\n=== TEST COMPLETE ===");
console.log("VAULT_ID=" + VID);
