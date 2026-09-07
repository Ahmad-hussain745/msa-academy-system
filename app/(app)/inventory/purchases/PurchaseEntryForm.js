"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const METHODS = ["Cash", "Bank Transfer", "Cheque", "Easypaisa", "JazzCash", "Card"];

// record_inventory_purchase() (0028_inventory.sql) does the real work in one
// transaction — inserts the expense (which the existing trg_expenses_ledger
// trigger turns into a transactions row and moves the account balance),
// the purchase row, and the stock-in movement. This form is just the input
// screen; it recomputes nothing and trusts the RPC's numbers, not its own.
export default function PurchaseEntryForm({ items, suppliers }) {
  const supabase = createClient();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(formRef.current);
    const itemId = formData.get("item_id")?.toString();
    const supplierId = formData.get("supplier_id")?.toString() || null;
    const quantity = Number(formData.get("quantity"));
    const unitPrice = Number(formData.get("unit_price"));
    const purchaseDate = formData.get("purchase_date")?.toString() || new Date().toISOString().slice(0, 10);
    const method = formData.get("method")?.toString() || "Cash";

    if (!itemId) { setError("Select an item."); return; }
    if (!quantity || quantity <= 0) { setError("Enter a quantity greater than 0."); return; }
    if (unitPrice == null || unitPrice < 0 || Number.isNaN(unitPrice)) { setError("Enter a unit price of 0 or more."); return; }

    startTransition(async () => {
      const { error } = await supabase.rpc("record_inventory_purchase", {
        p_item_id: itemId,
        p_supplier_id: supplierId,
        p_quantity: quantity,
        p_unit_price: unitPrice,
        p_purchase_date: purchaseDate,
        p_method: method,
      });
      if (error) {
        if (error.message?.includes("MONTH_CLOSED")) {
          setError("That accounting month is closed and can't take new purchases. Post this in the current month instead.");
          return;
        }
        setError(error.message.replace(/^[A-Z_]+:\s*/, ""));
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Item</label>
          <select name="item_id" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Select —</option>
            {(items || []).map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Supplier (optional)</label>
          <select name="supplier_id" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— None —</option>
            {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
          <input name="quantity" type="number" min="0.01" step="0.01" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price (Rs.)</label>
          <input name="unit_price" type="number" min="0" step="0.01" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
          <select name="method" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input name="purchase_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {error && <p className="text-sm text-brick">{error}</p>}

      <button type="submit" disabled={pending} className="bg-royal hover:bg-royal-dark text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60">
        {pending ? "Recording…" : "Record Purchase"}
      </button>
    </form>
  );
}
