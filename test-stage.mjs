// Continue the contract test in stages so a slow AI step doesn't kill the run.
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
const client = createClient({
  chain: { ...studioDevnet, rpcUrls: { default: { http: [RPC] } } },
  endpoint: RPC,
  account,
});

const CONDITION = "0x3F3A37d949C5fD03E67C758C38d214645D94f721";
const VAULT = "0x17F1B041803d5f1B188F34b47EE727152885356C";
const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

const VID = process.argv[2];
if (!VID) {
  console.log("usage: node test-stage.mjs <vault_id>");
  process.exit(1);
}

const write = async (label, address, functionName, args, value) => {
  console.log(`\n=== ${label} ===`);
  try {
    const fees = await client.estimateTransactionFees({});
    const tx = await client.writeContract({ address, functionName, args, value, fees });
    console.log("  tx:", tx);
    const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 600, interval: 5000 });
    console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
    if (!isSuccessful(r)) console.log("  RECEIPT:", j(r).slice(0, 1500));
    return r;
  } catch (e) {
    console.log("  ERROR:", e.message || e);
    return null;
  }
};

const step = process.argv[3] || "all";

if (step === "evaluate" || step === "all") {
  await write("evaluate (AI consensus, may take ~1-2 min)", CONDITION, "evaluate", [VID]);
  const verdict = await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [VID] });
  console.log("  VERDICT:", j(verdict));
}

if (step === "create" || step === "all") {
  const CLAIM = "This page is an underwater coral reef guide";
  const TEAM = account.address;
  const DEADLINE = String(Math.floor(Date.now() / 1000) + 120);
  await write("create_vault (120s deadline)", VAULT, "create_vault", [VID, TEAM, DEADLINE, CLAIM, CONDITION]);
  await write("deposit 0.0001 GEN", VAULT, "deposit", [VID], 100000000000000n);
  const state = await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] });
  console.log("  STATE:", j(state));
}

if (step === "release" || step === "all") {
  await write("release BEFORE deadline (expect fail)", VAULT, "release", [VID]);
  await write("refund BEFORE deadline (expect fail)", VAULT, "refund", [VID]);
}

if (step === "postdeadline") {
  await write("refund AFTER deadline", VAULT, "refund", [VID]);
  const state2 = await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] });
  console.log("  FINAL STATE:", j(state2));
}

console.log("\n=== done:", step, "===");
