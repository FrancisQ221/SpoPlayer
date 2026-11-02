import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL =
  (import.meta.env?.VITE_SUPABASE_URL as string) ||
  "https://nmqjoehuyhnwxlcezhuv.supabase.co";

export const SUPABASE_ANON_KEY =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) ||
  "sb_publishable_tFghE9hfzjl_XKf-YiLTtQ_qBXsB60-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
