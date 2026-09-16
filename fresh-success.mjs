// fresh-success.mjs — build a brand-new vault whose condition is genuinely TRUE,
// so release() must actually transfer the funds.
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

const CONDITION = "0xd56D815662C9E0008835E79a66A1CFAFdcF1256E";
const VAULT = "0xaDce66075e9D1C6e43aF13EFE88AfC0265A79d33";
const TEAM = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67";

const VID = "rel-" + Date.now();
const URL = "https://docs.genlayer.com/";
const CLAIM = "This page is the GenLayer documentation website";
const DEADLINE = Math.floor(Date.now() / 1000) + 3600; // 1h from now

const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

const write = async (label, address, functionName, args, value) => {
  console.log(`\n=== ${label} ===`);
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({ address, functionName, args, value, fees });
  console.log("  tx:", tx);
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  console.log(`  exec=${r.txExecutionResultName} ok=${isSuccessful(r)}`);
  if (!isSuccessful(r)) console.log("  RECEIPT:", j(r).slice(0, 1200));
  return r;
};

console.log("VAULT_ID:", VID);
await write("1. register_condition", CONDITION, "register_condition", [VID, URL, CLAIM, TEAM]);
await write("2. evaluate", CONDITION, "evaluate", [VID]);
console.log("  VERDICT:", j(await client.readContract({ address: CONDITION, functionName: "get_verdict", args: [VID] })));

// deadline is passed as a string per the contract signature
await write("3. create_vault", VAULT, "create_vault", [VID, TEAM, String(DEADLINE), CLAIM, CONDITION]);
await write("4. deposit", VAULT, "deposit", [VID], 1000000000000000n);
console.log("  STATE:", j(await client.readContract({ address: VAULT, functionName: "get_vault", args: [VID] })));
console.log("\nVAULT=" + VAULT);
console.log("VID=" + VID);
