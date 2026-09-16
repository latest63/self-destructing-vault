// release-final.mjs — release a vault using the network's OWN fee estimate.
// The outgoing emit_transfer needs a message-fee allocation declared at
// submission; estimateTransactionFeesForWrite asks Studio (sim_estimateTransactionFees)
// for the authoritative messageAllocations + feeValue.
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
const VAULT = process.argv[2];
const VID = process.argv[3];

console.log("state BEFORE:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] })));

// Ask the network exactly what this specific call needs.
console.log("\n=== estimateTransactionFeesForWrite(release) ===");
const fees = await client.estimateTransactionFeesForWrite({
  address: VAULT,
  functionName: "release",
  args: [VID],
  account: client.account,
});
console.log("  feeValue:", fees.feeValue?.toString());
console.log("  messageAllocations:", j(fees.messageAllocations));
console.log("  totalMessageFees:", fees.distribution?.totalMessageFees?.toString());

console.log("\n=== writeContract(release) ===");
const tx = await client.writeContract({ address: VAULT, functionName: "release", args: [VID], fees });
console.log("  tx:", tx);
const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
if (!isSuccessful(r)) console.log("  RECEIPT:", j(r).slice(0, 2000));

console.log("\nstate AFTER:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] })));
console.log("team balance:", j(await client.readContract({ address: VAULT, functionName: "get_deposit", args: [VID, "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67"] }).catch(e => e.message)));
