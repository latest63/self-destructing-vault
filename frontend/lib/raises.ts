/**
 * Open raises — data source.
 *
 * Reads from Supabase when it's configured. Until then it serves a seed set so
 * the carousel has something to render in dev and in preview deploys.
 *
 * To go live:
 *   1. npm i @supabase/supabase-js
 *   2. set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   3. create the `raises` table (see the shape below)
 *
 * The row shape matches ShippingRaise exactly, so no mapping layer is needed.
 */

export interface ShippingRaise {
  id: string;
  company: string;
  /** Short line under the company name — what they're building. */
  tagline: string;
  /** Two-letter mark used in the card's logo tile. */
  initials: string;
  /** Brand colour for the logo tile. */
  tint: string;
  /** GEN raised so far, already formatted (e.g. "1.24M"). */
  raised: string;
  /** Progress toward the raise, 0-100. */
  progress: number;
  /** ISO date the raise closes. */
  closes_on: string;
  /** Whether the condition is verified met. */
  verified: boolean;
}

/**
 * Seed data. These are well-known names used to show the card's range and
 * density; they are NOT live raises. Replace by pointing the app at Supabase.
 */
export const SEED_RAISES: ShippingRaise[] = [
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the app has been pointed at a Supabase project. */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Fetch open raises.
 *
 * Uses the Supabase REST endpoint directly via fetch, so no extra dependency is
 * needed. Swap for @supabase/supabase-js if you start needing auth or realtime.
 */
export async function fetchRaises(): Promise<ShippingRaise[]> {
  if (!hasSupabase) return SEED_RAISES;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/raises?select=*&order=progress.desc`,
      {
        headers: {
          apikey: `${SUPABASE_ANON_KEY}`,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        // Carousel data changes slowly; revalidate every 5 minutes.
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
    const rows = (await res.json()) as ShippingRaise[];
    return rows.length > 0 ? rows : SEED_RAISES;
  } catch (err) {
    console.error("[raises] Supabase fetch failed, falling back to seed:", err);
    return SEED_RAISES;
  }
}
