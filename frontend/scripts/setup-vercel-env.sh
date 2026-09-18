#!/bin/bash
# Setup ShipGuard Vercel environment variables

echo "🔧 Setting up ShipGuard environment variables..."

# Vercel token from hermes secrets
TOKEN_FILE="/home/ubuntu/.hermes/secrets/vercel-new.token"

if [ ! -f "$TOKEN_FILE" ]; then
    echo "❌ Error: Token file not found"
    exit 1
fi

# Read the token and extract
VERCEL_TOKEN=*** '$TOKEN_FILE' | head -1 | sed 's/^|vcp_//' | sed 's/\n$//'

echo "Token: vcp_${VERCEL_TOKEN:0:8}..."

# Set environment variables
vercel env add NEXT_PUBLIC_GENLAYER_RPC_URL "https://studio-next.genlayer.com/api" --token "$VERCEL_TOKEN" --scope latiblack
vercel env add NEXT_PUBLIC_GENLAYER_CHAIN_ID "61997" --token "$VERCEL_TOKEN" --scope latiblack
vercel env add NEXT_PUBLIC_GENLAYER_CHAIN_NAME "GenLayer Studio Next" --token "$VERCEL_TOKEN" --scope latiblack
vercel env add NEXT_PUBLIC_GENLAYER_SYMBOL "GEN" --token "$VERCEL_TOKEN" --scope latiblack
vercel env add NEXT_PUBLIC_VAULT_CONTRACT "0x17F1B041803d5f1B188F34b47EE727152885356C" --token "$VERCEL_TOKEN" --scope latiblack
vercel env add NEXT_PUBLIC_CONDITION_CONTRACT "0x3F3A37d949C5fD03E67C758C38d214645D94f721" --token "$VERCEL_TOKEN" --scope latiblack
vercel env add NEXT_PUBLIC_SUPABASE_URL "https://ervkqbncvboqsgvwjnpq.supabase.co" --token "$VERCEL_TOKEN" --scope latiblack

echo ""
echo "✅ Done. Now set these manually:"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase Settings → API)"
echo "   - NEXT_PUBLIC_GITHUB_VERIFY_CONTRACT"