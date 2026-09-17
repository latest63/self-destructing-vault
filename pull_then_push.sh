#!/bin/bash
# Pull current schema first, then push
export SUPABASE_ACCESS_TOKEN=*** 
cd /home/ubuntu/shipguard

echo "=== Pulling current schema ==="
supabase db pull --schema public 2>&1 | tail -20

echo "=== Pushing migrations ==="
supabase db push --include-all 2>&1 | tail -20
