#!/bin/bash
# Push Supabase migration
export SUPABASE_ACCESS_TOKEN=*** 
cd /home/ubuntu/shipguard
supabase db push --include-all 2>&1 | tail -30
