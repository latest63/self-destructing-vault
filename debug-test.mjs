// Debug: try to understand why release/refund fail
import { createClient, createAccount, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { readFileSync } from "fs";

const PK = readFileSync(
  process.env.HOME + "/.hermes/secrets/task-verifier-signer",
  "utf8"
).trim();
const client = createClient({
  chain: { ...studioDevnet, rpcUrls: { default: { http: ["https://studio-next.genlayer.com/api"] } } },
  endpoint: "https://studio-next.genlayer.com/api",
  account: createAccount(PK),
});

const CONDITION = "0x3F3A37d949C5fD03E67C758C38d214645D94f721";
const VAULT = "0x17F1B041803d5f1B188F34b47EE727152885356C";
const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

const VID = "debug-" + Date.now();
const TEAM = "0x823f5d1f084448091800FeE6F0BBf5bbe98aa98E";

const write = async (label, address, functionName, args, value) => {
  console.log(`\n=== ${label} ===`);
  try {
    const fees = await client.estimateTransactionFees({});
    const tx = await client.writeContract({ address, functionName, args, value, fees });
    console.log("  tx:", tx);
    const r = await client.waitForTransactionReceipt({
      hash: tx,
      waitUntil: "finalized",
      retries: 600,
      interval: 5000,
    });
    console.log("  exec:", r.txExecutionResultName, "ok:", isSuccessful(r));
    if (!isSuccessful(r) && r.error) console.log("  error:", j(r.error));
    return r;
  } catch (e) {
    console.log("  EXCEPTION:", e.message);
  }
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Register a FALSE condition
  console.log("\nRegistering FALSE condition...");
  await write("register_condition", CONDITION, "register_condition", [
    VID,
    "https://docs.genlayer.com/",
    "This page is completely empty and has no content at all", // FALSE
    TEAM,
  ]);

  // Evaluate it
  console.log("\nEvaluating...");
  await write("evaluate", CONDITION, "evaluate", [VID]);
  const verdict = await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [VID] });
  console.log("  verdict:", j(verdict));

  // Create vault with 10s deadline
  const DEADLINE = String(Math.floor(Date.now() / 1000) + 10);
  await write("create_vault", VAULT, "create_vault", [
    VID,
    TEAM,
    DEADLINE,
    "This page is completely empty",
    CONDITION,
  ]);

  const vault = await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] });
  console.log("  vault:", j(vault));

  // Try release
  console.log("\nTrying release (should fail for failure verdict)...");
  await write("release", VAULT, "release", [VID]);

  // Wait for deadline
  console.log("\nWaiting 15s for deadline...");
  await sleep(15000);

  // Try refund
  console.log("\nTrying refund (should succeed after deadline + failure verdict)...");
  await write("refund", VAULT, "refund", [VID]);

  const finalVault = await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] });
  console.log("  FINAL vault:", j(finalVault));
}

main().catch(console.error);