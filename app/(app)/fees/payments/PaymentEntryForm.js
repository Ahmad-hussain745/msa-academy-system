"use client";

import { useState, useEffect, useTransition } from "react";
import { getBillPreview, recordPayment } from "./actions";
import Receipt from "./Receipt";
import StudentPicker from "@/components/StudentPicker";

function fmt(n) {
  return "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US");
}

export default function PaymentEntryForm({ initialStudentId = "", initialStudentName = "" }) {
  const [studentId, setStudentId] = useState("");
  const [bill, setBill] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [loadingBill, startLoadingBill] = useTransition();
  const [saving, startSaving] = useTransition();

  const remaining = bill ? Math.max(0, Number(bill.total_payable) - Number(bill.paid_total)) : 0;

  const handleStudentChange = (id) => {
    setStudentId(id);
    setBill(null);
    setAmount("");
    setError("");
    setReceipt(null);
    if (!id) return;
    startLoadingBill(async () => {
      const res = await getBillPreview(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setBill(res.record);
      const rem = Math.max(0, Number(res.record.total_payable) - Number(res.record.paid_total));
      setAmount(rem > 0 ? String(rem) : "");
    });
  };

  // Arriving from Global Search's "Collect Fee" already names the student
  // — load their bill immediately instead of making the cashier pick again.
  useEffect(() => {
    if (initialStudentId) handleStudentChange(initialStudentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStudentId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setReceipt(null);

    // Quick client-side check for instant feedback — recordPayment() re-checks
    // this against a fresh read of fee_records regardless (the bill shown here
    // could be stale if someone else recorded a payment in the meantime), and
    // the database trigger enforces it either way.
    if (Number(amount) > remaining) {
      setError(`${fmt(amount)} exceeds the remaining balance of ${fmt(remaining)}.`);
      return;
    }

    const formData = new FormData();
    formData.set("fee_record_id", bill.id);
    formData.set("student_id", studentId);
    formData.set("month", bill.month);
    formData.set("amount", amount);
    formData.set("method", method);
    formData.set("remarks", remarks);

    startSaving(async () => {
      const res = await recordPayment(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setReceipt(res.receipt);
      setStudentId("");
      setBill(null);
      setAmount("");
      setRemarks("");
    });
  };

  if (receipt) {
    return <Receipt receipt={receipt} onClose={() => setReceipt(null)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Student</label>
        <StudentPicker
          initialName={initialStudentName}
          placeholder="Search student by name or ID…"
          onSelect={(s) => handleStudentChange(s?.id || "")}
        />
      </div>

      {loadingBill && <p className="text-sm text-slate-400">Loading this month's bill…</p>}

      {bill && !loadingBill && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-slate-500">Monthly Fee</span><span className="font-mono">{fmt(bill.monthly_fee)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Previous Balance</span><span className="font-mono">{fmt(bill.previous_balance)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="font-mono">− {fmt(bill.discount)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-medium"><span>Total Payable</span><span className="font-mono">{fmt(bill.total_payable)}</span></div>
          <div className="flex justify-between text-sage"><span>Already Paid</span><span className="font-mono">{fmt(bill.paid_total)}</span></div>
          <div className="flex justify-between font-semibold"><span>Remaining</span><span className="font-mono">{fmt(remaining)}</span></div>
        </div>
      )}

      {/* A genuine Rs. 0 total_payable is either a real fee waiver or —
          much more often — nobody has set up a fee structure for this
          student's class (or a student-specific override) yet. Say so
          plainly instead of leaving the cashier staring at "Maximum Rs. 0"
          with no explanation. */}
      {bill && !loadingBill && Number(bill.total_payable) <= 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
          <p className="font-medium">No payable fee found for this month.</p>
          <p className="mt-1">
            Check that this student's class has a fee structure set up (Fees → Fee Structure),
            or that a student-specific override exists (Fees → Student Fee Override) — unless this
            student genuinely has a waived/free fee, in which case this is expected.
          </p>
        </div>
      )}

      {bill && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Amount Received (Rs.)</label>
            <input
              type="number" min="0" max={remaining} step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">Max {fmt(remaining)} — overpayment/advance isn't supported yet.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {["Cash", "Bank Transfer", "Cheque", "Easypaisa", "JazzCash", "Card"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Remarks (optional)</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-brick">{error}</p>}

      {bill && (
        <button type="submit" disabled={saving} className="bg-royal hover:bg-royal-dark text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60">
          {saving ? "Saving…" : "Record Payment"}
        </button>
      )}
    </form>
  );
}
