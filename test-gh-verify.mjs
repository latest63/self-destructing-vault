// test-gh-verify.mjs — end-to-end test of the deployed GitHubVerifier contract
// Tests: submit() validation + view reads. (verify() consensus needs real
// GitHub evidence, so we test the submit path + error handling + views.)
import { createClient, createAccount, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";

const PK = readFileSync(path.join(process.env.HOME, ".hermes/secrets/task-verifier-signer"), "utf8").trim();
const RPC = "https://studio-next.genlayer.com/api";
const account = createAccount(PK);
const client = createClient({
  chain: { ...studioDevnet, rpcUrls: { default: { http: [RPC] } } },
  endpoint: RPC,
  account,
});

const GH = "0x80beB72A81bF94E5d1A0D186AD5A9774d2335051";
const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

async function read(label, functionName, args) {
  const r = await client.readContract({ address: GH, functionName, args });
  console.log(`${label}:`, j(r));
  return r;
}

async function write(label, functionName, args, expectFail = false) {
  console.log(`\n=== ${label} ===`);
  try {
    const fees = await client.estimateTransactionFees({});
    const tx = await client.writeContract({ address: GH, functionName, args, fees });
    console.log("  tx:", tx);
    const r = await client.waitForTransactionReceipt({ hash: tx, waitUntil: "finalized", retries: 300, interval: 5000 });
    const ok = isSuccessful(r);
    console.log(`  exec=${r.txExecutionResultName} ok=${ok} (expected fail=${expectFail})`);
    if (!ok && !expectFail) {
      // dump stderr
      const s = j(r);
      const m = s.match(/"stderr\\?":\\?"([^"]{0,400})/);
      if (m) console.log("  stderr:", m[1]);
    }
    return r;
  } catch (e) {
    console.log("  ERROR:", e.message?.slice(0, 300));
  }
}

console.log("=== Views (baseline) ===");
await read("get_count", "get_count", []);
await read("get_gh_handle (random)", "get_gh_handle", ["0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67"]);
await read("is_verified (random)", "is_verified", ["0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67"]);

console.log("\n=== submit(): bad user_type (org) should fail ===");
await write(
  "submit (org)",
  "submit",
  [
    "0x823f5d1f084448091800FeE6F0BBf5bbe98aa98E",
    "octocat",
    "abcd1234",
    "octocat",
    "Organization",  // wrong type
    "https://github.com/octocat",
    true,
    "https://gist.github.com/octocat/abc",
  ],
  true
);

console.log("\n=== submit(): bad html_url mismatch should fail ===");
await write(
  "submit (bad url)",
  "submit",
  [
    "0x823f5d1f084448091800FeE6F0BBf5bbe98aa98E",
    "octocat",
    "abcd1234",
    "octocat",
    "User",
    "https://github.com/WRONG",  // mismatch
    true,
    "https://gist.github.com/octocat/abc",
  ],
  true
);

console.log("\n=== submit(): valid evidence (gist_found=true) ===");
const validWallet = "0x0a0c13fa7566b010a4d47b13cb0494d9867f1f67"; // random team wallet
await write(
  "submit (valid)",
  "submit",
  [
    validWallet,
    "octocat",
    "abcd1234",
    "octocat",
    "User",
    "https://github.com/octocat",
    true,
    "https://gist.github.com/octocat/12345",
  ],
  false
);

console.log("\n=== Views after submit ===");
await read("get_verification", "get_verification", [validWallet]);
await read("is_verified", "is_verified", [validWallet]);
await read("get_gh_handle", "get_gh_handle", [validWallet]);

console.log("\n=== verify(): run consensus on the valid submission ===");
await write("verify", "verify", [validWallet], false);

console.log("\n=== Views after verify ===");
await read("get_verification", "get_verification", [validWallet]);
await read("get_gh_handle", "get_gh_handle", [validWallet]);
await read("is_verified", "is_verified", [validWallet]);

console.log("\n=== TEST COMPLETE ===");
