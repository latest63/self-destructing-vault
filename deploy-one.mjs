// probe2.mjs — deploy a file WITH explicit fees, using the SDK estimate
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";

const PRIVATE_KEY = readFileSync(
  path.join(process.env.HOME, ".hermes/secrets/task-verifier-signer"),
  "utf8",
).trim();
const RPC_URL = "https://studio-next.genlayer.com/api";
const chain = { ...studioDevnet, rpcUrls: { default: { http: [RPC_URL] } } };
const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain, endpoint: RPC_URL, account });

const file = process.argv[2];
const code = new Uint8Array(readFileSync(path.resolve(process.cwd(), file)));
console.log("deploying", file, "len", code.length);

const fees = await client.estimateTransactionFees({
  profileTarget: { kind: "deploy" },
  deployTargeted: true,
});
console.log("estimated:", JSON.stringify(fees, (k, v) => (typeof v === "bigint" ? v.toString() : v)));

const tx = await client.deployContract({ code, args: [], fees });
console.log("tx:", tx);
const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "decided", retries: 200, interval: 4000 });
console.log("status:", r.status, r.statusName, "| result:", r.result, "| exec:", r.txExecutionResultName);
console.log("contract:", r.txDataDecoded?.contractAddress ?? r.data?.contract_address);
if (r.txExecutionError) console.log("err:", JSON.stringify(r.txExecutionError).slice(0, 1500));
