"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Shared by /inventory/stock-in and /inventory/stock-out — same fields
// either way, just a different movement_type passed to
// record_stock_movement() (0028_inventory.sql). That RPC itself blocks a
// Stock Out from taking any item below zero and requires a reason for
// either direction — this form just surfaces whatever it says back.
export default function StockMovementForm({ items, movementType }) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef(null);
  const isOut = movementType === "stock_out";

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(formRef.current);
    const itemId = formData.get("item_id")?.toString();
    const quantity = Number(formData.get("quantity"));
    const reason = formData.get("reason")?.toString().trim();
    const movementDate = formData.get("movement_date")?.toString() || new Date().toISOString().slice(0, 10);

    if (!itemId) { setError("Select an item."); return; }
    if (!quantity || quantity <= 0) { setError("Enter a quantity greater than 0."); return; }
    if (!reason) { setError("A reason is required."); return; }

    startTransition(async () => {
      const { error } = await supabase.rpc("record_stock_movement", {
        p_item_id: itemId,
        p_movement_type: movementType,
        p_quantity: quantity,
        p_reason: reason,
        p_movement_date: movementDate,
      });
      if (error) {
        setError(error.message.replace(/^[A-Z_]+:\s*/, ""));
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Item</label>
          <select name="item_id" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Select —</option>
            {(items || []).map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
          <input name="quantity" type="number" min="0.01" step="0.01" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input name="movement_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
          <input name="reason" required placeholder={isOut ? "Issued to office, Damaged…" : "Donation, Count correction…"} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {error && <p className="text-sm text-brick">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 ${isOut ? "bg-brick hover:bg-red-700" : "bg-sage hover:bg-green-700"}`}
      >
        {pending ? "Saving…" : isOut ? "Record Stock Out" : "Record Stock In"}
      </button>
    </form>
  );
}
