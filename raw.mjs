// raw.mjs — bypass the SDK, call gen_call directly to see the real error
import { readFileSync } from "fs";
import path from "path";

const RPC = "https://studio-next.genlayer.com/api";
const CONDITION = "0xD3fE04158637C177EeD5724e15E6C89E65239039";

async function call(method, params) {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return { __raw: text.slice(0, 500) };
  }
}

// A read via gen_call to confirm shape
console.log("=== gen_call read get_all_conditions (0x + data) ===");
const enc = (s) => Buffer.from(s, "utf8").toString("hex");
// try variforms
const attempts = [
  ["addr only", [{ to: CONDITION }, "latest"]],
  ["to+function", [{ to: CONDITION, function: "get_all_conditions", args: [] }]],
  ["to+data", [{ to: CONDITION, data: "0x" }, "latest"]],
  ["to+calldata", [{ to: CONDITION, calldata: { method: "get_all_conditions", args: [] } }]],
];
for (const [label, params] of attempts) {
  const j = await call("gen_call", params);
  console.log(`${label}:`, JSON.stringify(j).slice(0, 260));
}

// Inspect the tx that failed to see execution error
console.log("\n=== sim_getFeeConfig ===");
console.log(JSON.stringify(await call("sim_getFeeConfig", [])).slice(0, 400));

console.log("\n=== sim_getConsensusValidators / chain info ===");
for (const m of ["sim_getConsensusValidators", "gen_getConsensusValidators", "net_version", "eth_chainId"]) {
  console.log(m, "=>", JSON.stringify(await call(m, [])).slice(0, 200));
}
