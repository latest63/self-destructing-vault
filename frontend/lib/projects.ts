/**
 * Project records — backed by Supabase `projects` table.
 *
 * A project is created/managed by a wallet. Each project has:
 *   - name: project/display name
 *   - github_handle: verified on-chain GitHub identity (nullable until verified)
 *   - avatar_url: link to avatar (can be remote URL or data URL)
 *   - link: project website / evidence URL
 *   - profile_data: arbitrary JSON for extra fields (future-proofing)
 *   - created_at / updated_at
 *
 * If Supabase is not configured or project doesn't exist,
 * a minimal project object is returned with just the wallet_address.
 */

import { createClient } from "@supabase/supabase-js";

export interface Project {
  id: string; // uuid, primary key
  wallet_address: string; // the owner's wallet (indexed)
  name: string | null;
  github_handle: string | null;
  avatar_url: string | null;
  link: string | null;
  profile_data: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const hasSupabase = Boolean(supabaseUrl && supabaseKey);

/** Create a minimal project for a wallet address (local fallback) */
function emptyProject(walletAddress: string): Project {
  return {
    id: `local-${walletAddress.toLowerCase()}`,
    wallet_address: walletAddress.toLowerCase(),
    name: null,
    github_handle: null,
    avatar_url: null,
    link: null,
    profile_data: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch a project by wallet address.
 * Returns the project from Supabase, or a minimal local fallback.
 */
export async function fetchProject(walletAddress: string): Promise<Project> {
  if (!hasSupabase) {
    return emptyProject(walletAddress);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .single();

    if (error || !data) {
      return emptyProject(walletAddress);
    }

    return data;
  } catch (err) {
    console.error("[projects] fetch failed:", err);
    return emptyProject(walletAddress);
  }
}

/**
 * Upsert a project (insert new or update existing).
 * Uses wallet_address as the primary key for the upsert.
 */
export async function upsertProject(
  walletAddress: string,
  partial: Partial<Omit<Project, "id" | "wallet_address" | "created_at" | "updated_at">>
): Promise<Project | null> {
  if (!hasSupabase) {
    console.warn("[projects] Supabase not configured, upsert skipped");
    return { ...emptyProject(walletAddress), ...partial };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("projects")
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
      console.error("[projects] upsert failed:", error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[projects] upsert failed:", err);
    return null;
  }
}

/**
 * Upload an avatar file to Supabase Storage (avatars bucket).
 * Returns the public URL of the uploaded file, or null on failure.
 * Falls back to data URL if Supabase is not configured.
 */
export async function uploadAvatar(
  walletAddress: string,
  file: File
): Promise<{ url: string | null; isDataUrl: boolean }> {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error("File too large — max 5MB");
  }

  if (!hasSupabase) {
    // Fallback: read as data URL for local/preview mode
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, isDataUrl: true });
      reader.onerror = () => resolve({ url: null, isDataUrl: false });
      reader.readAsDataURL(file);
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${walletAddress.toLowerCase()}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("[projects] avatar upload failed:", error.message);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result as string, isDataUrl: true });
        reader.onerror = () => resolve({ url: null, isDataUrl: false });
        reader.readAsDataURL(file);
      });
    }

    const publicResult = supabase.storage.from("avatars").getPublicUrl(data.path);
    return { url: publicResult.data?.publicUrl ?? null, isDataUrl: false };
  } catch (err) {
    console.error("[projects] avatar upload failed:", err);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result as string, isDataUrl: true });
      reader.onerror = () => resolve({ url: null, isDataUrl: false });
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Check whether the wallet has a verified GitHub handle on-chain.
 * This is used as the gate for launching raises.
 */
export async function checkProjectVerified(
  walletAddress: string
): Promise<{ verified: boolean; github_handle: string | null }> {
  if (!hasSupabase) {
    // Local fallback — assume not verified
    return { verified: false, github_handle: null };
  }

  try {
    const project = await fetchProject(walletAddress);
    if (project.github_handle) {
      return { verified: true, github_handle: project.github_handle };
    }
    return { verified: false, github_handle: null };
  } catch {
    return { verified: false, github_handle: null };
  }
}

/**
 * Clear all projects — for local dev/testing only.
 */
export async function clearProjects(): Promise<void> {
  if (!hasSupabase) return;
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("projects").delete().neq("wallet_address", "0x0000000000000000000000000000000000000000");
  } catch (err) {
    console.error("[projects] clear failed:", err);
  }
}
