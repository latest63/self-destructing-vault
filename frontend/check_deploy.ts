import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

async function main() {
  const client = createClient({ chain: studionet });
  
  const txHash = "0x74a677da8cf71715d7b3a44037f3464d23eaaf437ff4e1e0eaa2eea97ad0a594" as any;
  
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      waitUntil: "decided",
      retries: 50,
    });
    
    console.log("Status:", receipt.status);
    console.log("Contract Address:", (receipt as any).data?.contract_address || "NOT IN DATA");
    console.log("Exec Result:", (receipt as any).txExecutionResultName);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

main();