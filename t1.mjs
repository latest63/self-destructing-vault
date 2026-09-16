// t1.mjs — single step: register_condition
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
const VAULT_ID = process.argv[2] || "elche-test-1";
const CHECK_URL = "https://www.livescore.com/en/football/spain/laliga/elche-vs-real-madrid/1810661/";
const COND = "Elche wins the match against Real Madrid";
const TEAM = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67";

console.log("vault_id:", VAULT_ID);
const fees = await client.estimateTransactionFees({});
console.log("feeValue:", fees?.feeValue?.toString());

const tx = await client.writeContract({
  address: CONDITION,
  functionName: "register_condition",
  args: [VAULT_ID, CHECK_URL, COND, TEAM],
  fees,
});
console.log("tx:", tx);
const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 300, interval: 5000 });
console.log("status:", r.statusName, "| exec:", r.txExecutionResultName, "| ok:", isSuccessful(r));
if (r.txExecutionError) console.log("err:", JSON.stringify(r.txExecutionError).slice(0, 800));
console.log("data:", JSON.stringify(r.data).slice(0, 400));
