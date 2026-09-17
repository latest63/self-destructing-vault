/**
 * User profiles — backed by Supabase `profiles` table.
 *
 * Columns:
 *   wallet_address (Primary key, text)
 *   github_handle (text, nullable)
 *   display_name (text, nullable)
 *   avatar_url (text, nullable)
 *   created_at (timestamp)
 *   updated_at (timestamp)
 *
 * If Supabase is not configured or profile doesn't exist,
 * returns a minimal profile object with wallet_address only.
 */

import { createClient } from "@supabase/supabase-js";

export interface Profile {
  wallet_address: string;
  github_handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const hasSupabase = Boolean(supabaseUrl && supabaseKey);

/** Create a minimal profile for a wallet address (local fallback) */
function emptyProfile(walletAddress: string): Profile {
  return {
    wallet_address: walletAddress,
    github_handle: null,
    display_name: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch a user's profile by wallet address.
 * Returns the profile from Supabase, or a minimal local fallback.
 */
export async function fetchProfile(walletAddress: string): Promise<Profile> {
  if (!hasSupabase) {
    return emptyProfile(walletAddress);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single();

    if (error || !data) {
      // Profile doesn't exist — return minimal fallback
      return emptyProfile(walletAddress);
    }

    return data;
  } catch (err) {
    console.error("[profiles] fetch failed:", err);
    return emptyProfile(walletAddress);
  }
}

/**
 * Upsert a profile (insert new or update existing).
 * Uses wallet_address as the primary key for the upsert.
 */
export async function upsertProfile(
  walletAddress: string,
  partial: Partial<Profile>
): Promise<Profile | null> {
  if (!hasSupabase) {
    console.warn("[profiles] Supabase not configured, upsert skipped");
    return { ...emptyProfile(walletAddress), ...partial };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          wallet_address: walletAddress.toLowerCase(),
          ...partial,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wallet_address" }
      )
      .select("*")
      .single();

    if (error) {
      console.error("[profiles] upsert failed:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[profiles] upsert failed:", err);
    return null;
  }
}

/**
 * Clear all profiles — for local dev/testing only.
 */
export async function clearProfiles(): Promise<void> {
  if (!hasSupabase) return;
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("profiles").delete().neq("wallet_address", "0x0000000000000000000000000000000000000000");
  } catch (err) {
    console.error("[profiles] clear failed:", err);
  }
}