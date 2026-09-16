// err.mjs — dump everything about a failed tx
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
const t = await client.getTransaction({ hash: tx });
console.log("status:", t.statusName, "| exec:", t.txExecutionResultName, "| result:", t.result);
console.log("consensus_data:", JSON.stringify(t.consensus_data, null, 2)?.slice(0, 4000));
console.log("\nmessages:", JSON.stringify(t.messages, null, 2)?.slice(0, 3000));
console.log("\nqueue_type:", t.queue_type, "rounds:", t.num_of_rounds, "last:", t.last_round);
