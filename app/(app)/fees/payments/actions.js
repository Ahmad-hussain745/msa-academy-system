"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// Called the moment a cashier picks a student in Payment Entry. This is the
// "enter once" pipeline starting to work: it doesn't ask anyone to type the
// monthly fee, previous balance or discount — get_or_create_fee_record()
// (0003_fee_generation.sql) derives all three from fee_structures,
// fee_discounts and last month's fee_records, and returns the one bill the
// cashier is allowed to collect against.
export async function getBillPreview(studentId) {
  if (!studentId) return { error: "Pick a student first." };
  const supabase = createClient();
  const month = currentMonthStr();

  const { data: feeRecordId, error: rpcError } = await supabase.rpc("get_or_create_fee_record", {
    p_student_id: studentId,
    p_month: month,
  });
  if (rpcError) return { error: rpcError.message };

  const { data: record, error: recError } = await supabase
    .from("fee_records")
    .select("id, month, monthly_fee, previous_balance, discount, total_payable, paid_total, status")
    .eq("id", feeRecordId)
    .single();
  if (recError) return { error: recError.message };

  return { record };
}

// The actual "Ahmed paid Rs. 8,000" moment. This inserts exactly one row.
// Everything else — fee_records.paid_total/status, the cash/bank ledger and
// account balance, and (at next payroll generation) the teacher's
// percentage share — is picked up automatically by the triggers already
// wired in 0001_init.sql. Nothing else is written here on purpose.
//
// remaining = total_payable - paid_total, and amount > remaining is
// rejected — re-checked here against a FRESH read of fee_records (not
// whatever the form loaded with), because the bill could have changed since
// the page opened (another payment recorded elsewhere, a discount added,
// etc). 0007_fee_payment_validation.sql enforces the same rule as a BEFORE
// INSERT trigger regardless of what this action does, so this check exists
// to give a clear message before that trigger would abort the insert — not
// because the trigger can be bypassed.
export async function recordPayment(formData) {
  const supabase = createClient();

  const feeRecordId = formData.get("fee_record_id")?.toString();
  const studentId = formData.get("student_id")?.toString();
  const month = formData.get("month")?.toString();
  const amount = Number(formData.get("amount") || 0);
  const method = formData.get("method")?.toString() || "Cash";
  const remarks = formData.get("remarks")?.toString().trim() || null;

  if (!feeRecordId || !studentId || !month) {
    return { error: "Pick a student to load their bill before recording a payment." };
  }
  if (!amount || amount <= 0) {
    return { error: "Enter an amount greater than 0." };
  }

  const { data: bill, error: billError } = await supabase
    .from("fee_records")
    .select("total_payable, paid_total")
    .eq("id", feeRecordId)
    .single();
  if (billError) return { error: billError.message };

  const remaining = Number(bill.total_payable) - Number(bill.paid_total);
  if (amount > remaining) {
    return {
      error: `Rs. ${amount.toLocaleString()} exceeds the remaining balance of Rs. ${remaining.toLocaleString()} (total payable Rs. ${Number(bill.total_payable).toLocaleString()}, already paid Rs. ${Number(bill.paid_total).toLocaleString()}). Overpayment/advance isn't supported yet.`,
    };
  }

  const { data: payment, error } = await supabase
    .from("fee_payments")
    .insert({ fee_record_id: feeRecordId, student_id: studentId, month, amount, method, remarks })
    .select("id, receipt_no, amount, method, paid_on, remarks")
    .single();
  if (error) {
    if (error.message?.includes("PAYMENT_EXCEEDS_REMAINING")) {
      return { error: "That payment exceeds the remaining balance — someone else may have just recorded a payment for this bill. Refresh and try again." };
    }
    if (error.message?.includes("MONTH_CLOSED")) {
      return { error: "That accounting month is closed and can't take new payments. If this corrects a closed month, reverse the original payment and post the correction in the current month instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/fees/payments");
  revalidatePath("/fees/pending");
  revalidatePath("/fees/records");
  revalidatePath("/dashboard");

  // Everything a receipt needs, gathered fresh right after the insert — the
  // bill numbers below (previous_balance, paid_total, etc) are the
  // post-payment state, exactly what the receipt should show as "as of this
  // payment", not what the form had loaded before it was submitted.
  const [{ data: { user } }, { data: freshBill }, { data: student }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("fee_records").select("month, monthly_fee, previous_balance, discount, total_payable, paid_total").eq("id", feeRecordId).single(),
    supabase.from("students").select("name, student_code, class:classes(name)").eq("id", studentId).single(),
  ]);
  const { data: me } = user
    ? await supabase.from("users").select("name").eq("auth_user_id", user.id).maybeSingle()
    : { data: null };

  return {
    success: true,
    receipt: {
      paymentId: payment.id,
      receiptNo: payment.receipt_no,
      studentName: student?.name || "",
      studentCode: student?.student_code || "",
      className: student?.class?.name || "",
      month: freshBill?.month,
      currentFee: freshBill?.monthly_fee,
      previousBalance: freshBill?.previous_balance,
      discount: freshBill?.discount,
      paid: payment.amount,
      remaining: freshBill ? Math.max(0, Number(freshBill.total_payable) - Number(freshBill.paid_total)) : 0,
      method: payment.method,
      date: payment.paid_on,
      receivedBy: me?.name || user?.email || "—",
    },
  };
}
