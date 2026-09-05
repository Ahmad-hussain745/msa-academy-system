import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Runs on every request. Refreshes the Supabase auth session (so it never
// silently expires mid-use) and redirects signed-out users away from
// protected pages to /login. This is a UX convenience — the REAL security
// boundary is Row Level Security in Postgres (see supabase/migrations),
// which is enforced even if someone bypasses this middleware entirely.
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // /register (see app/register/actions.js) must be reachable by someone
  // who is, by definition, not signed in yet — that's the entire point of
  // a self-service "request an account" page. Omitting it here means every
  // unauthenticated visitor who clicks "Request one" on the login page
  // gets bounced straight back to /login before the register page ever
  // renders, silently breaking the one flow this check exists to protect.
  const isPublic = request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/register" ||
    request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
