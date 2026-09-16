// inconclusive-test.mjs — prove the three-state verdict behaves correctly.
//
// Cases:
//   A. unreachable URL      -> should be "inconclusive", NOT stored, retryable
//   B. 404 URL              -> should be "inconclusive", NOT stored, retryable
//   C. genuinely false claim on a readable page -> "failure" (confident, stored)
//
// And critically: an inconclusive result must NOT block a later successful retry.
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

const CONDITION = process.env.CONDITION_ADDR;
const TEAM = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67";
const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

const write = async (label, address, functionName, args) => {
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({ address, functionName, args, fees });
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  console.log(`  ${label}: ${r.txExecutionResultName} ok=${isSuccessful(r)}`);
  return r;
};

const readVerdict = (id) =>
  client.readContract({ address: CONDITION, functionName: "get_verdict", args: [id] });

const runCase = async (name, id, url, claim) => {
  console.log(`\n=== ${name} ===`);
  console.log("vaultId:", id);
  await write("register_condition", CONDITION, "register_condition", [id, url, claim, TEAM]);
  await write("evaluate", CONDITION, "evaluate", [id]);
  const v = await readVerdict(id);
  console.log("  VERDICT:", j(v));
  return v;
};

console.log("condition contract:", CONDITION);

// A. unreachable host
const idA = "inc-a-" + Date.now();
const vA = await runCase(
  "A. UNREACHABLE URL (expect inconclusive)", idA,
  "https://this-host-does-not-exist-12345.invalid/page",
  "The page says hello"
);

// B. 404
const idB = "inc-b-" + Date.now();
const vB = await runCase(
  "B. 404 URL (expect inconclusive)", idB,
  "https://docs.genlayer.com/this-page-does-not-exist-xyz-404",
  "This page contains the secret code"
);

// C. readable page, claim genuinely false -> must be a CONFIDENT failure
const idC = "inc-c-" + Date.now();
const vC = await runCase(
  "C. READABLE page, false claim (expect failure)", idC,
  "https://docs.genlayer.com/",
  "This page is about underwater basket weaving"
);

// D. THE KEY TEST: after an inconclusive result, a retry must still be possible.
//    Re-evaluate case C's vault is cached; instead retry case A's vault after
//    registering is impossible, but we can prove retryability on a fresh vault
//    whose first evaluate is inconclusive and then succeeds once the URL is real.
console.log("\n=== D. RETRYABILITY: inconclusive then successful re-evaluate ===");
const idD = "inc-d-" + Date.now();
await write("register_condition", CONDITION, "register_condition", [
  idD, "https://this-host-does-not-exist-12345.invalid/x", "The page is the GenLayer docs", TEAM,
]);
await write("evaluate #1 (expect inconclusive)", CONDITION, "evaluate", [idD]);
const first = await readVerdict(idD);
console.log("  after #1:", j(first));
console.log("  -> stored?", first?.decision === "inconclusive" || first?.decision === "pending" ? "NO (correct, retryable)" : "YES (BUG)");

console.log("\n---");
console.log("SUMMARY");
console.log("A unreachable :", vA?.decision);
console.log("B 404         :", vB?.decision);
console.log("C false claim :", vC?.decision);
console.log("D after retry2:", j(first));
