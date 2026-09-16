// relfees.mjs — release with an explicit message-fee allocation for the outgoing transfer
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

const VAULT = "0xaDce66075e9D1C6e43aF13EFE88AfC0265A79d33";
const VAULT_ID = process.argv[2];

// The fee config the network reports (policy_snapshot gave us these names).
const fees = await client.estimateTransactionFees({});
console.log("estimated:", JSON.stringify(fees, (k, v) => (typeof v === "bigint" ? v.toString() : v)));

// Manually add a message allocation so the outgoing emit_transfer has a budget.
fees.distribution.maxMessagesPerTx = "4";
fees.distribution.totalMessageFees = "2000000000000000"; // 0.002 GEN for the outgoing msg
fees.feeValue = (BigInt(fees.feeValue) + BigInt(fees.distribution.totalMessageFees)).toString();
console.log("patched:", JSON.stringify(fees, (k, v) => (typeof v === "bigint" ? v.toString() : v)));

const tx = await client.writeContract({ address: VAULT, functionName: "release", args: [VAULT_ID], fees });
console.log("tx:", tx);
const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
console.log("exec:", r.txExecutionResultName, "ok:", isSuccessful(r));
console.log("vault:", JSON.stringify(await client.readContract({ address: VAULT, functionName: "get_vault", args: [VAULT_ID] })));
