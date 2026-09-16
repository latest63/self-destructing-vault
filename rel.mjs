// rel.mjs — isolate the release failure: read the verdict via the vault's own path
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
const VAULT_ID = process.argv[2];

// 1) Is the verdict readable from the condition contract right now?
console.log("verdict:", JSON.stringify(await client.readContract({
  address: CONDITION, functionName: "get_verdict", args: [VAULT_ID],
})));

// 2) Simulate release to surface the real error
console.log("\n=== simulate release ===");
try {
  const r = await client.simulateWriteContract({ address: VAULT, functionName: "release", args: [VAULT_ID] });
  console.log("sim ok:", JSON.stringify(r).slice(0, 500));
} catch (e) {
  console.log("sim err:", e.message.slice(0, 900));
  if (e.cause) console.log("cause:", String(e.cause).slice(0, 900));
  if (e.details) console.log("details:", String(e.details).slice(0, 900));
}

// 3) Also confirm simulate on a passing read path
console.log("\n=== simulate create_vault (control, should succeed) ===");
try {
  const r = await client.simulateWriteContract({
    address: VAULT, functionName: "create_vault",
    args: ["ctrl-" + Date.now(), "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67", "2099-12-31T23:59:59Z", "test", CONDITION],
  });
  console.log("sim ok:", JSON.stringify(r).slice(0, 300));
} catch (e) {
  console.log("sim err:", e.message.slice(0, 600));
}
