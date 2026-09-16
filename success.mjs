// success.mjs — prove the RELEASE (success) path: condition that is genuinely TRUE
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

const VAULT_ID = "ok-" + Date.now();
// GenLayer's own docs site is stable and its content plainly satisfies this.
const CHECK_URL = "https://docs.genlayer.com/";
const SUCCESS_CONDITION = "This page is the GenLayer documentation website";
const TEAM = process.env.HOME ? "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67" : "";

async function write(label, address, functionName, args, value) {
  console.log(`\n--- ${label} ---`);
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({ address, functionName, args, value, fees });
  console.log("  tx:", tx);
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  const ok = isSuccessful(r);
  console.log(`  exec=${r.txExecutionResultName} ok=${ok}`);
  return { ok, receipt: r };
}

const read = async (address, functionName, args = []) =>
  client.readContract({ address, functionName, args }).catch((e) => ({ __error: e.message.slice(0, 200) }));

console.log("Vault ID:", VAULT_ID);

await write("1. register_condition", CONDITION, "register_condition", [VAULT_ID, CHECK_URL, SUCCESS_CONDITION, TEAM]);
await write("2. evaluate", CONDITION, "evaluate", [VAULT_ID]);
const verdict = await read(CONDITION, "get_verdict", [VAULT_ID]);
console.log("  VERDICT:", JSON.stringify(verdict));

if (verdict?.decision !== "success") {
  console.log("\nVerdict was not success — release would (correctly) refuse. Stopping.");
  console.log("VAULT_ID=" + VAULT_ID);
  process.exit(0);
}

await write("3. create_vault", VAULT, "create_vault", [VAULT_ID, TEAM, "2099-12-31T23:59:59Z", SUCCESS_CONDITION, CONDITION]);
await write("4. deposit", VAULT, "deposit", [VAULT_ID], 1000000000000000n);
console.log("  before release:", JSON.stringify(await read(VAULT, "get_vault", [VAULT_ID])));

const rel = await write("5. release", VAULT, "release", [VAULT_ID]);
console.log("  after release:", JSON.stringify(await read(VAULT, "get_vault", [VAULT_ID])));
console.log("  depositors:", JSON.stringify(await read(VAULT, "get_vault_depositors", [VAULT_ID])));
console.log("\nRELEASE OK:", rel.ok);
console.log("VAULT_ID=" + VAULT_ID);
