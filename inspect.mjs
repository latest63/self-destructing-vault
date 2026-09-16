// inspect.mjs — decode the calldata of a failed write tx
import { createClient, createAccount } from "genlayer-js";
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

const tx = process.argv[2];

// raw RPC view of the tx
const r = await fetch(RPC, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [tx] }),
});
const j = await r.json();
console.log("raw tx keys:", j.result ? Object.keys(j.result) : j);
if (j.result) {
  console.log("to:", j.result.to);
  console.log("input:", (j.result.input || "").slice(0, 400));
}

const t = await client.getTransaction({ hash: tx });
console.log("\nstatus:", t.statusName, "| exec:", t.txExecutionResultName);
console.log("txExecutionError:", JSON.stringify(t.txExecutionError));
console.log("calldata:", JSON.stringify(t.data?.calldata)?.slice(0, 800));
console.log("messages:", JSON.stringify(t.messages)?.slice(0, 1200));
console.log("all keys:", Object.keys(t));
