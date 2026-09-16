// release-proper.mjs — THE fix: use estimateTransactionFeesForWrite, which runs
// sim_estimateTransactionFees on Studio and returns the authoritative
// messageAllocations + feeValue needed for the outgoing emit_transfer.
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

const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

const write = async (label, address, functionName, args, value) => {
  console.log(`\n=== ${label} ===`);
  const tx = await client.writeContract({ address, functionName, args, value });
  console.log("  tx:", tx);
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
  return r;
};

// ---- STEP A: read the current vault state so we know what we're releasing ----
const VAULT = process.argv[2];
const VID = process.argv[3];
console.log("vault:", VAULT, "id:", VID);
console.log("state BEFORE:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] })));

// ---- STEP B: ask the network what fees release() actually needs ----
console.log("\n=== estimateTransactionFeesForWrite(release) ===");
const fees = await client.estimateTransactionFeesForWrite({
  address: VAULT,
  functionName: "release",
  args: [VID],
  account: client.account,
});
console.log("  feeValue:", fees.feeValue?.toString());
console.log("  messageAllocations:", j(fees.messageAllocations));
console.log("  distribution.totalMessageFees:", fees.distribution?.totalMessageFees?.toString());
console.log("  observed:", j(fees.observed));

// ---- STEP C: submit release with the authoritative fee config ----
console.log("\n=== writeContract(release) WITH messageAllocations ===");
const tx = await client.writeContract({
  address: VAULT,
  functionName: "release",
  args: [VID],
  fees,
});
console.log("  tx:", tx);
const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
if (!isSuccessful(r)) console.log("  FULL RECEIPT:", j(r).slice(0, 1500));

// ---- STEP D: verify the vault actually moved the money ----
console.log("\nstate AFTER:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] })));
