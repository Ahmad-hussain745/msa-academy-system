import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guard";
import ReportMonthPicker from "./ReportMonthPicker";
import AnimatedValue from "@/components/AnimatedValue";

function fmt(n) {
  return "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US");
}
function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function nextMonthStr(month) {
  const d = new Date(month + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

const TYPE_LABEL = {
  fee_payment: "Fee Payment",
  income: "Other Income",
  expense: "Expense",
  salary_payment: "Salary Payment",
};

export default async function FinancialReportsPage({ searchParams }) {
  await requireRole(["Super Admin", "Accountant", "Principal"]);
  const supabase = createClient();
  const month = searchParams?.month || currentMonthStr();
  const monthEnd = nextMonthStr(month);

  const [{ data: accounts }, { data: monthTxns }, { data: monthPayments }] = await Promise.all([
    supabase.from("accounts").select("id, name, kind, current_balance").eq("status", "active").order("name"),
    supabase
      .from("transactions")
      .select("id, type, direction, amount, txn_date, description, account:accounts(name)")
      .gte("txn_date", month).lt("txn_date", monthEnd)
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    // Payment method isn't on `transactions` at all (it posts by account, not
    // by method) — this has to come straight from fee_payments, the one
    // place method is actually recorded.
    supabase.from("fee_payments").select("amount, method").gte("paid_on", month).lt("paid_on", monthEnd),
  ]);

  const txns = monthTxns || [];
  const sumOf = (type) => txns.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);

  // The whole point: these four numbers are never entered anywhere — they're
  // just fee_payments/income/expenses/salary_payments grouped by type, off
  // the same unified transactions table Payment Entry, Finance Income/
  // Expenses and Payroll already post to.
  const studentFeeIncome = sumOf("fee_payment");
  const otherIncome = sumOf("income");
  const teacherSalary = sumOf("salary_payment");
  const otherExpenses = sumOf("expense");

  const totalIncome = studentFeeIncome + otherIncome;
  const totalOutflow = teacherSalary + otherExpenses;
  const net = totalIncome - totalOutflow;

  // payment_method (0001_init.sql) has six values — Easypaisa/JazzCash/Card
  // are grouped under "Online" here since they're all digital wallet/card
  // rails a cashier never physically touches, same distinction Cashier
  // Closing (0024_daily_cashier_closing.sql) draws between Cash and
  // everything else. Cash, Bank Transfer and Cheque stay their own line
  // since each behaves differently for reconciliation (Cash needs a
  // physical count, Cheque can bounce, Bank Transfer is fire-and-forget).
  const METHOD_BUCKET = {
    Cash: "Cash",
    "Bank Transfer": "Bank Transfer",
    Cheque: "Cheque",
    Easypaisa: "Online",
    JazzCash: "Online",
    Card: "Online",
  };
  const METHOD_ORDER = ["Cash", "Bank Transfer", "Online", "Cheque"];
  const methodTotals = Object.fromEntries(METHOD_ORDER.map((m) => [m, 0]));
  (monthPayments || []).forEach((p) => {
    const bucket = METHOD_BUCKET[p.method] || "Online";
    methodTotals[bucket] = (methodTotals[bucket] || 0) + Number(p.amount);
  });
  const methodTotal = METHOD_ORDER.reduce((a, m) => a + methodTotals[m], 0);
  const maxMethodTotal = Math.max(1, ...METHOD_ORDER.map((m) => methodTotals[m]));

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Financial Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every figure below is grouped straight from the unified transactions ledger — no separate
            income/expense/salary totals kept anywhere else.
          </p>
        </div>
        <ReportMonthPicker month={month} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Income</div>
          <div className="text-lg font-semibold font-mono text-sage"><AnimatedValue value={fmt(totalIncome)} /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Outflow</div>
          <div className="text-lg font-semibold font-mono text-brick"><AnimatedValue value={fmt(totalOutflow)} /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Fee Collection</div>
          <div className="text-lg font-semibold font-mono text-ink"><AnimatedValue value={fmt(studentFeeIncome)} /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Net</div>
          <div className={`text-lg font-semibold font-mono ${net >= 0 ? "text-sage" : "text-brick"}`}><AnimatedValue value={fmt(net)} /></div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-ink mb-3">Income Breakdown</div>
          <div className="flex justify-between text-sm py-1.5 border-t border-slate-100">
            <span className="text-slate-600">Student Fee Income</span>
            <span className="font-mono">{fmt(studentFeeIncome)}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-t border-slate-100">
            <span className="text-slate-600">Other Income</span>
            <span className="font-mono">{fmt(otherIncome)}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-t border-slate-200 font-medium">
            <span>Total</span>
            <span className="font-mono">{fmt(totalIncome)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-ink mb-3">Outflow Breakdown</div>
          <div className="flex justify-between text-sm py-1.5 border-t border-slate-100">
            <span className="text-slate-600">Teacher Salary</span>
            <span className="font-mono">{fmt(teacherSalary)}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-t border-slate-100">
            <span className="text-slate-600">Other Expenses</span>
            <span className="font-mono">{fmt(otherExpenses)}</span>
          </div>
          <div className="flex justify-between text-sm py-1.5 border-t border-slate-200 font-medium">
            <span>Total</span>
            <span className="font-mono">{fmt(totalOutflow)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mt-6">
        <div className="text-sm font-semibold text-ink mb-1">Payment Method Breakdown — {month.slice(0, 7)}</div>
        <p className="text-xs text-slate-400 mb-3">
          Grouped straight from fee_payments.method for the month — Easypaisa, JazzCash and Card are combined under
          "Online" since none of them touch physical cash.
        </p>
        <table className="w-full text-sm mb-4">
          <tbody>
            {METHOD_ORDER.map((m) => (
              <tr key={m} className="border-t border-slate-100">
                <td className="py-1.5 text-slate-600">{m}</td>
                <td className="py-1.5 text-right font-mono">{fmt(methodTotals[m])}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 font-medium">
              <td className="py-1.5">Total</td>
              <td className="py-1.5 text-right font-mono">{fmt(methodTotal)}</td>
            </tr>
          </tbody>
        </table>

        <div className="space-y-2">
          {METHOD_ORDER.map((m) => {
            const pct = methodTotal > 0 ? Math.round((methodTotals[m] / methodTotal) * 100) : 0;
            const barPct = Math.round((methodTotals[m] / maxMethodTotal) * 100);
            return (
              <div key={m} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-xs text-slate-500">{m}</div>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-royal rounded-full"
                    style={{ width: `${Math.max(barPct, methodTotals[m] > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <div className="w-14 shrink-0 text-right text-xs font-mono text-slate-500">{pct}%</div>
              </div>
            );
          })}
          {methodTotal === 0 && <p className="text-sm text-slate-400">No fee payments recorded for this month.</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-2">
        {(accounts || []).map((a) => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xs text-slate-500 capitalize">{a.name} ({a.kind}) — current balance</div>
            <div className="text-lg font-semibold font-mono text-ink"><AnimatedValue value={fmt(a.current_balance)} /></div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mb-6">Account balances are as of today, not scoped to the selected month.</p>

      <div className="text-sm font-semibold text-ink mb-2">Transaction Ledger — {month.slice(0, 7)}</div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Account</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="text-right px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-600">{t.txn_date}</td>
                <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[t.type] || t.type}</td>
                <td className="px-4 py-3 text-slate-600">{t.account?.name}</td>
                <td className="px-4 py-3 text-slate-600">{t.description || "—"}</td>
                <td className={`px-4 py-3 text-right font-mono ${t.direction === "in" ? "text-sage" : "text-brick"}`}>
                  {t.direction === "in" ? "+" : "−"} {fmt(t.amount)}
                </td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No transactions posted for this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
