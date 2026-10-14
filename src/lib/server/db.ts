import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Server-only Supabase client using the secret (service-role) key. Never import this from client code. */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example)");
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export interface ProgressRow {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_played_date: string | null;
  xp: number;
  best_score: number;
}

export interface RoundRow {
  id: number;
  user_id: string;
  date: string;
  score: number;
  accuracy: number;
  submitted_at: string | null;
}
