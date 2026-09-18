#!/usr/bin/env python3
"""Setup script for ShipGuard Vercel environment variables."""

import subprocess

# Read Vercel token
with open("/home/ubuntu/.hermes/secrets/vercel-new.token", "r") as f:
    line = f.readline().strip()

# Extract token - format: |vcp_xxx
VERCEL_TOKEN=*** 2:] if line.startswith("|vcp_") else line

# Environment variables
ENV_VARS = [
    ("NEXT_PUBLIC_GENLAYER_RPC_URL", "https://studio-next.genlayer.com/api"),
    ("NEXT_PUBLIC_GENLAYER_CHAIN_ID", "61997"),
    ("NEXT_PUBLIC_GENLAYER_CHAIN_NAME", "GenLayer Studio Next"),
    ("NEXT_PUBLIC_GENLAYER_SYMBOL", "GEN"),
    ("NEXT_PUBLIC_VAULT_CONTRACT", "0x17F1B041803d5f1B188F34b47EE727152885356C"),
    ("NEXT_PUBLIC_CONDITION_CONTRACT", "0x3F3A37d949C5fD03E67C758C38d214645D94f721"),
    ("NEXT_PUBLIC_SUPABASE_URL", "https://ervkqbncvboqsgvwjnpq.supabase.co"),
]

print("Setting Vercel environment variables...")
for key, value in ENV_VARS:
    subprocess.run(["vercel", "env", "add", key, value, "--token", VERCEL_TOKEN, "--scope", "latiblack"], capture_output=True)
    print(f"  OK: {key}")

print("Done. Now set SUPABASE_ANON_KEY and GITHUB_VERIFY_CONTRACT manually.")