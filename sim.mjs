// sim.mjs — simulate the write to see the real error without spending fees
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
const VAULT = "0xCA999A8551A7c6486BB37696e99faCd3E6d7166b";

// First: try a pure read to confirm the contract is callable at all
console.log("=== read get_all_conditions ===");
try {
  const r = await client.readContract({
    address: CONDITION,
    functionName: "get_all_conditions",
    args: [],
  });
  console.log("OK:", JSON.stringify(r));
} catch (e) {
  console.log("read err:", e.message.slice(0, 600));
}

console.log("\n=== read get_verdict(nonexistent) ===");
try {
  const r = await client.readContract({
    address: CONDITION,
    functionName: "get_verdict",
    args: ["nonexistent"],
  });
  console.log("OK:", JSON.stringify(r));
} catch (e) {
  console.log("read err:", e.message.slice(0, 600));
}

console.log("\n=== read get_all_vaults (vault contract) ===");
try {
  const r = await client.readContract({ address: VAULT, functionName: "get_all_vaults", args: [] });
  console.log("OK:", JSON.stringify(r));
} catch (e) {
  console.log("read err:", e.message.slice(0, 600));
}

console.log("\n=== simulate register_condition ===");
try {
  const r = await client.simulateWriteContract({
    address: CONDITION,
    functionName: "register_condition",
    args: ["sim-test-1", "https://example.com", "test condition", "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67"],
  });
  console.log("sim result:", JSON.stringify(r).slice(0, 1500));
} catch (e) {
  console.log("sim err:", e.message.slice(0, 1500));
}
