"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// One insert. The ledger trigger (trg_expenses_ledger, 0001_init.sql) posts
// the matching transactions row (direction 'out') and moves the account
// balance by itself.
export async function recordExpense(formData) {
  const supabase = createClient();

  const payload = {
    category: formData.get("category")?.toString().trim(),
    description: formData.get("description")?.toString().trim() || null,
    amount: Number(formData.get("amount") || 0),
    method: formData.get("method")?.toString() || "Cash",
    expense_date: formData.get("expense_date")?.toString() || new Date().toISOString().slice(0, 10),
  };

  if (!payload.category) return { error: "Category is required." };
  if (!payload.amount || payload.amount <= 0) return { error: "Enter an amount greater than 0." };

  const { error } = await supabase.from("expenses").insert(payload);
  if (error) {
    if (error.message?.includes("MONTH_CLOSED")) {
      return { error: "That accounting month is closed and can't take new expense entries. If this corrects a closed month, reverse the original entry and post the correction in the current month instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/finance/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}
