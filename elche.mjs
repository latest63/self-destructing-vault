// elche.mjs — full end-to-end: register -> evaluate (AI+web) -> create vault -> deposit -> release
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

const VAULT_ID = "elche-" + Date.now();
const CHECK_URL = "https://www.livescore.com/en/football/spain/laliga/elche-vs-real-madrid/1810661/";
const SUCCESS_CONDITION = "Elche wins the match against Real Madrid";
const TEAM = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67";

async function write(label, address, functionName, args, value) {
  console.log(`\n--- ${label} ---`);
  const fees = await client.estimateTransactionFees({});
  const tx = await client.writeContract({ address, functionName, args, value, fees });
  console.log("  tx:", tx);
  const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 400, interval: 5000 });
  const ok = isSuccessful(r);
  console.log(`  exec=${r.txExecutionResultName} ok=${ok}`);
  if (!ok) {
    console.log("  messages:", JSON.stringify(r.messages)?.slice(0, 600));
    console.log("  execError:", JSON.stringify(r.txExecutionError)?.slice(0, 600));
  }
  return { ok, receipt: r, tx };
}

const read = async (address, functionName, args = []) => {
  try { return await client.readContract({ address, functionName, args }); }
  catch (e) { return { __error: e.message.slice(0, 300) }; }
};

console.log("Deployer:", createAccount(PK).address);
console.log("Vault ID:", VAULT_ID);

// 1) register the condition
await write("1. register_condition", CONDITION, "register_condition", [VAULT_ID, CHECK_URL, SUCCESS_CONDITION, TEAM]);
console.log("  stored:", JSON.stringify(await read(CONDITION, "get_condition", [VAULT_ID])));

// 2) evaluate — web fetch + AI consensus
await write("2. evaluate", CONDITION, "evaluate", [VAULT_ID]);
console.log("  verdict:", JSON.stringify(await read(CONDITION, "get_verdict", [VAULT_ID])));

// 3) create the vault referencing the condition contract
await write("3. create_vault", VAULT, "create_vault", [VAULT_ID, TEAM, "2099-12-31T23:59:59Z", SUCCESS_CONDITION, CONDITION]);
console.log("  vault:", JSON.stringify(await read(VAULT, "get_vault", [VAULT_ID])));

// 4) deposit 0.001 GEN
await write("4. deposit", VAULT, "deposit", [VAULT_ID], 1000000000000000n);
console.log("  vault:", JSON.stringify(await read(VAULT, "get_vault", [VAULT_ID])));

// 5) release — reads verdict from the condition contract (cross-contract call)
await write("5. release", VAULT, "release", [VAULT_ID]);
console.log("  vault FINAL:", JSON.stringify(await read(VAULT, "get_vault", [VAULT_ID])));

console.log("\nVAULT_ID=" + VAULT_ID);
