import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guard";

function fmt(n) {
  return "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US");
}

export default async function SalaryReportsPage() {
  // Teacher is allowed here (their own salary_records rows only — RLS scopes
  // this by current_teacher_id(), this guard just decides who reaches the page).
  await requireRole(["Super Admin", "Accountant", "Principal", "Teacher"]);
  const supabase = createClient();

  const { data: records } = await supabase
    .from("salary_records")
    .select("month, gross_salary, paid_total, status, locked, teacher:teachers(name)")
    .order("month", { ascending: false })
    .limit(500);

  const byMonth = new Map();
  const byTeacher = new Map();
  (records || []).forEach((r) => {
    const m = r.month?.slice(0, 7);
    const cur = byMonth.get(m) || { gross: 0, paid: 0 };
    cur.gross += Number(r.gross_salary);
    cur.paid += Number(r.paid_total);
    byMonth.set(m, cur);

    const name = r.teacher?.name || "Unknown";
    const curT = byTeacher.get(name) || { gross: 0, paid: 0, months: 0 };
    curT.gross += Number(r.gross_salary);
    curT.paid += Number(r.paid_total);
    curT.months += 1;
    byTeacher.set(name, curT);
  });

  const monthRows = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const teacherRows = [...byTeacher.entries()].sort((a, b) => b[1].gross - a[1].gross);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Salary Reports</h1>
      <p className="text-sm text-slate-500 mt-1">
        Aggregated live from salary_records — the same rows Payroll generates and locks.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-ink mb-3">By Month</div>
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase"><tr><th className="text-left py-1">Month</th><th className="text-right py-1">Gross</th><th className="text-right py-1">Paid</th></tr></thead>
            <tbody>
              {monthRows.map(([m, v]) => (
                <tr key={m} className="border-t border-slate-100">
                  <td className="py-2">{m}</td>
                  <td className="py-2 text-right font-mono">{fmt(v.gross)}</td>
                  <td className="py-2 text-right font-mono">{fmt(v.paid)}</td>
                </tr>
              ))}
              {monthRows.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400">No payroll generated yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-ink mb-3">By Teacher (all-time)</div>
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase"><tr><th className="text-left py-1">Teacher</th><th className="text-right py-1">Months</th><th className="text-right py-1">Gross</th><th className="text-right py-1">Paid</th></tr></thead>
            <tbody>
              {teacherRows.map(([name, v]) => (
                <tr key={name} className="border-t border-slate-100">
                  <td className="py-2">{name}</td>
                  <td className="py-2 text-right font-mono">{v.months}</td>
                  <td className="py-2 text-right font-mono">{fmt(v.gross)}</td>
                  <td className="py-2 text-right font-mono">{fmt(v.paid)}</td>
                </tr>
              ))}
              {teacherRows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No payroll generated yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
