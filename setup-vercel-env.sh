#!/bin/bash
# Setup script for ShipGuard Vercel environment
# Run this after configuring Supabase API keys

set -e

echo "=== ShipGuard Environment Setup ==="

# Load secrets
VERCEL_TOKEN=$(cat /home/ubuntu/.hermes/secrets/vercel-new.token 2>/dev/null || echo "")
if [ -z "$VERCEL_TOKEN" ]; then
    echo "Error: Vercel token not found"
    exit 1
fi

echo "✓ Vercel token loaded"

# Project reference
PROJECT_REF="ervkqbncvboqsgvwjnpq"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "✓ Supabase URL: $SUPABASE_URL"

# Required environment variables (fill in anon key from Supabase dashboard)
# Get NEXT_PUBLIC_SUPABASE_ANON_KEY from:
# https://supabase.com/dashboard/project/ervkqbncvboqsgvwjnpq/settings/api
# Copy the "anon" key from "Project API keys"

# Set up the .env.local file
cat > /home/ubuntu/shipguard/frontend/.env.local << 'ENVFILE'
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-next.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio Next
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
NEXT_PUBLIC_VAULT_CONTRACT=0x17F1B041803d5f1B188F34b47EE727152885356C
NEXT_PUBLIC_CONDITION_CONTRACT=0x3F3A37d949C5fD03E67C758C38d214645D94f721
NEXT_PUBLIC_SUPABASE_URL=https://ervkqbncvboqsgvwjnpq.supabase.co
# TODO: Set NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GITHUB_VERIFY_CONTRACT=0x0000000000000000000000000000000000000000
ENVFILE

echo "✓ Created .env.local (you need to set NEXT_PUBLIC_SUPABASE_ANON_KEY manually)"

# Set Vercel environment variables
echo ""
echo "=== Setting up Vercel Environment Variables ==="

# Set production environment variables
vercel env add NEXT_PUBLIC_GENLAYER_RPC_URL "https://studio-next.genlayer.com/api" --token "$VERCEL_TOKEN" --scope latiblack --prod
vercel env add NEXT_PUBLIC_GENLAYER_CHAIN_ID "61997" --token "$VERCEL_TOKEN" --scope latiblack --prod
vercel env add NEXT_PUBLIC_GENLAYER_CHAIN_NAME "GenLayer Studio Next" --token "$VERCEL_TOKEN" --scope latiblack --prod
vercel env add NEXT_PUBLIC_GENLAYER_SYMBOL "GEN" --token "$VERCEL_TOKEN" --scope latiblack --prod
vercel env add NEXT_PUBLIC_VAULT_CONTRACT "0x17F1B041803d5f1B188F34b47EE727152885356C" --token "$VERCEL_TOKEN" --scope latiblack --prod
vercel env add NEXT_PUBLIC_CONDITION_CONTRACT "0x3F3A37d949C5fD03E67C758C38d214645D94f721" --token "$VERCEL_TOKEN" --scope latiblack --prod
vercel env add NEXT_PUBLIC_SUPABASE_URL "https://ervkqbncvboqsgvwjnpq.supabase.co" --token "$VERCEL_TOKEN" --scope latiblack --prod
vercel env add NEXT_PUBLIC_GITHUB_VERIFY_CONTRACT "0x0000000000000000000000000000000000000000" --token "$VERCEL_TOKEN" --scope latiblack --prod

echo "✓ Environment variables configured on Vercel"

echo ""
echo "=== Next Steps ==="
echo "1. Get your Supabase ANON key from:"
echo "   https://supabase.com/dashboard/project/ervkqbncvboqsgvwjnpq/settings/api"
echo "   Copy the 'anon' key (starts with eyJhbG...)"
echo ""
echo "2. Update your .env.local:"
echo "   Edit /home/ubuntu/shipguard/frontend/.env.local"
echo "   Replace '# TODO: Set NEXT_PUBLIC_SUPABASE_ANON_KEY' with your key"
echo ""
echo "3. Set the Supabase key in Vercel:"
echo "   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY \"your-key-here\" --token \"\$VERCEL_TOKEN\" --scope latiblack --prod"
echo ""
echo "4. Run the database migration to rename avatar_url to logo_url:"
echo "   See /home/ubuntu/shipguard/frontend/supabase/migrations/20260920_rename_avatar_to_logo.sql"
echo ""
echo "=== Done ==="