// sim2.mjs — try positional vs named arg encoding
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
const CONDITION = "0xD3fE04158637C177EeD5724e15E6C89E65239039";

const args = ["sim2-1", "https://example.com", "test condition", "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67"];

// A: args array (what we did)
console.log("=== A: args array ===");
try {
  const r = await client.readContract({ address: CONDITION, functionName: "get_all_conditions", args: [] });
  console.log("read ok (control):", JSON.stringify(r));
} catch (e) { console.log("err:", e.message.slice(0, 200)); }

// B: use simulateWriteContract to see if it errors differently
console.log("\n=== B: simulate with args ===");
try {
  const r = await client.simulateWriteContract({ address: CONDITION, functionName: "register_condition", args });
  console.log("sim:", JSON.stringify(r).slice(0, 800));
} catch (e) { console.log("sim err:", e.message.slice(0, 800)); }

// C: named kwargs
console.log("\n=== C: simulate with kwargs ===");
try {
  const r = await client.simulateWriteContract({
    address: CONDITION, functionName: "register_condition",
    kwargs: { vault_id: "sim3-1", check_url: "https://example.com", success_condition: "test", team_address: "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67" },
  });
  console.log("sim:", JSON.stringify(r).slice(0, 800));
} catch (e) { console.log("sim err:", e.message.slice(0, 800)); }

// D: read a method WITH args to test arg encoding on the read path
console.log("\n=== D: read get_condition with arg ===");
try {
  const r = await client.readContract({ address: CONDITION, functionName: "get_condition", args: ["nonexistent"] });
  console.log("read ok:", JSON.stringify(r));
} catch (e) { console.log("read err:", e.message.slice(0, 400)); }

console.log("\n=== E: read get_verdict with arg (works?) ===");
try {
  const r = await client.readContract({ address: CONDITION, functionName: "get_verdict", args: ["nonexistent"] });
  console.log("read ok:", JSON.stringify(r));
} catch (e) { console.log("read err:", e.message.slice(0, 400)); }
