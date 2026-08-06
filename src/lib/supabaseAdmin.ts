import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente Supabase com service_role — usar SOMENTE em código de servidor. */
export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env (veja .env.example)"
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
