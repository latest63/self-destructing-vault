-- Rename avatar_url to logo_url to match codebase expectations
-- This fixes the mismatch between database schema and frontend code
ALTER TABLE public.projects RENAME COLUMN IF EXISTS avatar_url TO logo_url;

-- Verify the column exists with the new name
-- After running this migration, the projects table will have:
-- id, wallet_address, name, github_handle, logo_url, link, profile_data, created_at, updated_at