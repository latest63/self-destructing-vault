/**
 * Open raises — data source backed by Supabase.
 *
 * Uses the same Ecosystem Fund Guardian Supabase project
 * (ervkqbncvboqsgvwjnpq.supabase.co) with a `raises` table.
 *
 * If Supabase is not configured or unavailable, returns seed data.
 */

import { createClient } from "@supabase/supabase-js";

export interface ShippingRaise {
  id: string;
  company: string;
  tagline: string;
  initials: string;
  tint: string;
  raised: string;
  progress: number;
  closes_on: string;
  verified: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const hasSupabase = Boolean(supabaseUrl && supabaseKey);

const SEED_RAISES: ShippingRaise[] = [
  {
    id: "amazon",
    company: "Amazon",
    tagline: "Logistics automation",
    initials: "AM",
    tint: "#ff9900",
    raised: "4.20M",
    progress: 84,
    closes_on: "2026-11-02",
    verified: true,
  },
  {
    id: "apple",
    company: "Apple",
    tagline: "Silicon design tooling",
    initials: "AP",
    tint: "#a3a3a3",
    raised: "6.85M",
    progress: 96,
    closes_on: "2026-10-18",
    verified: true,
  },
  {
    id: "tesla",
    company: "Tesla",
    tagline: "Charging infrastructure",
    initials: "TE",
    tint: "#e82127",
    raised: "3.10M",
    progress: 71,
    closes_on: "2026-12-05",
    verified: false,
  },
  {
    id: "google",
    company: "Google",
    tagline: "On-device inference",
    initials: "GO",
    tint: "#4285f4",
    raised: "5.40M",
    progress: 89,
    closes_on: "2026-11-21",
    verified: true,
  },
  {
    id: "nvidia",
    company: "NVIDIA",
    tagline: "CUDA developer cloud",
    initials: "NV",
    tint: "#76b900",
    raised: "7.60M",
    progress: 93,
    closes_on: "2026-10-30",
    verified: true,
  },
  {
    id: "microsoft",
    company: "Microsoft",
    tagline: "Open source runtime",
    initials: "MS",
    tint: "#00a4ef",
    raised: "2.95M",
    progress: 64,
    closes_on: "2026-12-14",
    verified: false,
  },
  {
    id: "meta",
    company: "Meta",
    tagline: "Spatial compute SDK",
    initials: "ME",
    tint: "#0866ff",
    raised: "4.75M",
    progress: 78,
    closes_on: "2026-11-09",
    verified: true,
  },
  {
    id: "spacex",
    company: "SpaceX",
    tagline: "Ground station network",
    initials: "SX",
    tint: "#005288",
    raised: "8.20M",
    progress: 91,
    closes_on: "2026-10-25",
    verified: true,
  },
];

/**
 * Fetch open raises from Supabase, fallback to seed data.
 */
export async function fetchRaises(): Promise<ShippingRaise[]> {
  if (!hasSupabase) return SEED_RAISES;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("raises")
      .select("*")
      .order("progress", { ascending: false });

    if (error) {
      console.warn("[raises] Supabase query failed, using seed data:", error.message);
      return SEED_RAISES;
    }
    if (!data || data.length === 0) return SEED_RAISES;
    return data as ShippingRaise[];
  } catch (err) {
    console.error("[raises] Supabase fetch failed, falling back to seed:", err);
    return SEED_RAISES;
  }
}
