// deploy-gh-verify.mjs — deploy GitHubVerifier to Studio Next (61997)
import { createClient, createAccount, isSuccessful } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import path from "path";

const PRIVATE_KEY = readFileSync(
  path.join(process.env.HOME, ".hermes/secrets/task-verifier-signer"),
  "utf8",
).trim();

const RPC_URL = "https://studio-next.genlayer.com/api";
const chain = { ...studioDevnet, rpcUrls: { default: { http: [RPC_URL] } } };

async function main() {
  const account = createAccount(PRIVATE_KEY);
  console.log("Deployer:", account.address);

  const client = createClient({ chain, endpoint: RPC_URL, account });

  console.log("\n=== Deploying GitHubVerifier ===");
  const code = new Uint8Array(readFileSync(path.resolve(process.cwd(), "contracts/github_verify.py")));
  const text = Buffer.from(code).toString("utf8");

  // Sanity checks
  if (!text.includes("# v0.3.0")) throw new Error("missing # v0.3.0 marker");
  if (!text.includes("5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng")) throw new Error("wrong runner hash");
  if (!text.includes("from genlayer.types import *")) throw new Error("missing types import");

  const fees = await client.estimateTransactionFees({
    profileTarget: { kind: "deploy" },
    deployTargeted: true,
  });
  console.log("  feeValue:", fees?.feeValue?.toString());

  const tx = await client.deployContract({ code, args: [], fees });
  console.log("  tx:", tx);

  const receipt = await client.waitForTransactionReceipt({
    hash: tx,
    waitUntil: "finalized",
    retries: 300,
    interval: 5000,
  });

  const ok = isSuccessful(receipt);
  console.log(`  status=${receipt.statusName} exec=${receipt.txExecutionResultName} isSuccessful=${ok}`);

  const addr = receipt.txDataDecoded?.contractAddress ?? receipt.data?.contract_address;
  console.log(`\n=== DEPLOYED: ${addr} ===`);
  if (!ok) throw new Error("deploy NOT successful");

  // Verify on-chain
  const r = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "gen_getContractCode", params: [addr] }),
  });
  const j = await r.json();
  const bytes = j.result && j.result !== "0x" ? (j.result.length - 2) / 2 : 0;
  console.log(`  on-chain code: ${bytes} bytes`);
  if (bytes < 100) throw new Error("no code on chain");

  console.log(`\nNEXT_PUBLIC_GITHUB_VERIFY_CONTRACT=${addr}`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
