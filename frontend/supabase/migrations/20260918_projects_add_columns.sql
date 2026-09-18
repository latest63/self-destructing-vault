-- Add missing columns to projects table for wallet_address-based lookup
-- These columns are needed for the ShipGuard frontend v2

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS wallet_address text unique;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS github_handle text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS link text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS profile_data jsonb;

-- Create index on wallet_address for fast lookups
CREATE INDEX IF NOT EXISTS projects_wallet_address_idx ON public.projects (wallet_address);

-- Create index on github_handle for fast lookups
CREATE INDEX IF NOT EXISTS projects_github_handle_idx ON public.projects (github_handle);