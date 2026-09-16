// t2.mjs — read then evaluate
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

const CONDITION = "0x8778a698a665Ce8f85267F9456f460C3c4e3b061";
const VAULT_ID = process.argv[2];

console.log("=== get_condition ===");
console.log(JSON.stringify(await client.readContract({ address: CONDITION, functionName: "get_condition", args: [VAULT_ID] })));

console.log("\n=== get_all_conditions ===");
console.log(JSON.stringify(await client.readContract({ address: CONDITION, functionName: "get_all_conditions", args: [] })));

console.log("\n=== evaluate (AI consensus + web fetch) ===");
const fees = await client.estimateTransactionFees({});
const tx = await client.writeContract({
  address: CONDITION,
  functionName: "evaluate",
  args: [VAULT_ID],
  fees,
});
console.log("tx:", tx);
const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
console.log("status:", r.statusName, "| exec:", r.txExecutionResultName, "| ok:", isSuccessful(r));
if (r.txExecutionError) console.log("err:", JSON.stringify(r.txExecutionError).slice(0, 800));
console.log("result:", JSON.stringify(r.txDataDecoded || r.data?.calldata?.readable)?.slice(0, 600));

console.log("\n=== get_verdict AFTER ===");
console.log(JSON.stringify(await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [VAULT_ID] })));
