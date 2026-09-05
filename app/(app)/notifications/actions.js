"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// One call does both the "render + freeze the message" step and, since a
// channel is always given here (unlike the automated schedule, which
// queues with channel=null), immediately marks it sent — matching that the
// wa.me/sms:/mailto: link has already been opened client-side by the time
// this runs. type='manual' so a WhatsApp send followed by an SMS send for
// the same bill are two distinct rows, not one overwritten (see the
// partial unique index in 0027_notifications.sql).
// Manual sends always render using the fee_reminder_1 template's wording —
// there's no "which stage is this" concept on an ad hoc send triggered
// straight from a fee card, so one consistent, reasonable default message
// is used rather than asking a cashier to pick a template mid-click. The
// scheduled reminder_1/reminder_2/overdue types (see
// run_fee_reminder_schedule()) are what actually vary the wording by stage.
export async function sendFeeNotification(studentId, feeRecordId, channel, recipient) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("queue_fee_notification", {
    p_student_id: studentId,
    p_fee_record_id: feeRecordId,
    p_type: "manual",
    p_template_key: "fee_reminder_1",
    p_channel: channel,
    p_recipient: recipient,
  });
  if (error) return { error: error.message };

  const { data: notification } = await supabase
    .from("notifications").select("rendered_message").eq("id", data).maybeSingle();

  revalidatePath("/notifications");
  return { success: true, message: notification?.rendered_message || "" };
}
