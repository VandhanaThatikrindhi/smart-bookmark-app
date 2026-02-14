import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in the browser.
 *
 * The client uses the project's public URL and anonymous key. These values are
 * provided via environment variables. See `.env.local.example` for details.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}