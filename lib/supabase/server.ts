import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Creates a Supabase client that runs on the server. This client uses the
 * service role key which has elevated privileges and can bypass row‑level
 * security (RLS). Because of this, the service role key MUST be kept
 * secret and never exposed to the browser. The Supabase client created
 * here automatically attaches and refreshes authentication cookies via the
 * provided cookie store, allowing protected requests on behalf of the
 * authenticated user.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}