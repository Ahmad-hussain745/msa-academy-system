import { createClient } from "@/lib/supabase/server";

function fmt(n) {
  return "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US");
}

export default async function FeeReportsPage() {
  const supabase = createClient();

  const { data: records } = await supabase
    .from("fee_records")
    .select("month, total_payable, paid_total, student:students(class:classes(name))")
    .order("month", { ascending: false })
    .limit(2000);

  const byMonth = new Map();
  const byClass = new Map();
  (records || []).forEach((r) => {
    const m = r.month?.slice(0, 7);
    const cur = byMonth.get(m) || { expected: 0, collected: 0 };
    cur.expected += Number(r.total_payable);
    cur.collected += Number(r.paid_total);
    byMonth.set(m, cur);

    const cls = r.student?.class?.name || "Unassigned";
    const curC = byClass.get(cls) || { expected: 0, collected: 0 };
    curC.expected += Number(r.total_payable);
    curC.collected += Number(r.paid_total);
    byClass.set(cls, curC);
  });

  const monthRows = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const classRows = [...byClass.entries()].sort((a, b) => b[1].expected - a[1].expected);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Fee Reports</h1>
      <p className="text-sm text-slate-500 mt-1">
        Collection by month and by class, aggregated live from fee_records — nothing pre-computed or stored separately.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-ink mb-3">Monthly Collection</div>
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase"><tr><th className="text-left py-1">Month</th><th className="text-right py-1">Expected</th><th className="text-right py-1">Collected</th><th className="text-right py-1">%</th></tr></thead>
            <tbody>
              {monthRows.map(([m, v]) => (
                <tr key={m} className="border-t border-slate-100">
                  <td className="py-2">{m}</td>
                  <td className="py-2 text-right font-mono">{fmt(v.expected)}</td>
                  <td className="py-2 text-right font-mono">{fmt(v.collected)}</td>
                  <td className="py-2 text-right font-mono">{v.expected > 0 ? ((v.collected / v.expected) * 100).toFixed(0) : 0}%</td>
                </tr>
              ))}
              {monthRows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No data yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-ink mb-3">Class-wise Collection (all-time)</div>
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase"><tr><th className="text-left py-1">Class</th><th className="text-right py-1">Expected</th><th className="text-right py-1">Collected</th><th className="text-right py-1">%</th></tr></thead>
            <tbody>
              {classRows.map(([cls, v]) => (
                <tr key={cls} className="border-t border-slate-100">
                  <td className="py-2">{cls}</td>
                  <td className="py-2 text-right font-mono">{fmt(v.expected)}</td>
                  <td className="py-2 text-right font-mono">{fmt(v.collected)}</td>
                  <td className="py-2 text-right font-mono">{v.expected > 0 ? ((v.collected / v.expected) * 100).toFixed(0) : 0}%</td>
                </tr>
              ))}
              {classRows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
