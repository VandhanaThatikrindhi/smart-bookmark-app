import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

/**
 * Route handler for the Supabase OAuth callback.
 *
 * When a user authenticates with Google, Supabase redirects back to this
 * endpoint with a `code` parameter. The code is exchanged for a session
 * via the Supabase server client, which stores the access and refresh
 * tokens in cookies. After exchanging the code, we redirect the user
 * back to the homepage (or the `next` query param if provided).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}