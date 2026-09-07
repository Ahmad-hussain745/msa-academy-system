import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Meant to be hit once a day by a scheduler — Vercel Cron (see vercel.json's
// "crons" entry) or Supabase's own pg_cron calling this URL via
// net.http_get(), whichever this project actually deploys with. Either way,
// this route is the one place a schedule triggers reminders from; nothing
// in the app calls run_fee_reminder_schedule() on its own.
//
// run_fee_reminder_schedule() is granted to `service_role` only (see
// 0027_notifications.sql) — not `authenticated` — specifically so it can
// never be called from a signed-in user's session, only from here using the
// admin client. It only ever QUEUES reminders (status='pending', no
// channel) — nothing gets marked 'sent', and no message is actually
// dispatched, until a staff member opens the Notifications page and clicks
// Send themselves. A cron job should never be the thing that puts a real
// message in a parent's inbox with zero human involved.
//
// Protected by a shared secret rather than left open — anyone who knows
// this URL but not CRON_SECRET gets a 401, since this route can create
// database rows (if it were unauthenticated, hitting it repeatedly could
// spam Notifications-page clutter, even though it can't send anything by
// itself).
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("run_fee_reminder_schedule", { p_as_of: new Date().toISOString().slice(0, 10) });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = data?.[0] || { template_key: null, queued_count: 0 };
  return NextResponse.json({
    ran_at: new Date().toISOString(),
    template: result.template_key,
    queued: result.queued_count,
    note: result.template_key
      ? `Queued ${result.queued_count} '${result.template_key}' reminder(s). Nothing was sent — a staff member still needs to send each one from the Notifications page.`
      : "Not a scheduled reminder day (10th/20th/25th) — nothing to do.",
  });
}
