import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Use this inside Server Components, Server Actions, and Route Handlers.
// Reads/writes the auth cookie so the session survives navigation and
// refreshes, and still enforces RLS as the signed-in user (not an admin).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component - safe to ignore because
            // middleware.js below refreshes the session on every request.
          }
        },
      },
    }
  );
}

// Admin client — SERVICE ROLE KEY, bypasses RLS entirely. Only ever import
// this inside Route Handlers / Server Actions that first check the caller's
// role themselves (e.g. "Approve & Lock Payroll", which only Accountant/
// Super Admin may do). Never import this in a Client Component.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
