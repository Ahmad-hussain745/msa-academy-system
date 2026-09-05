import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guard";

const ACTION_LABELS = {
  "fee_payments.reverse": "Fee Payment Reversed",
  "income.reverse": "Income Reversed",
  "expenses.reverse": "Expense Reversed",
  "salary_payments.reverse": "Salary Payment Reversed",
  "salary_record.lock": "Payroll Locked/Approved",
  "user.create": "User Account Created",
  "teacher.link_account": "Teacher Linked to Login",
};

export default async function AuditLogPage() {
  await requireRole(["Super Admin"]);
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, old_value, new_value, created_at, user:users(name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Audit Log</h1>
      <p className="text-sm text-slate-500 mt-1">
        Written automatically by database triggers — reversals, payroll locks, and account creation.
        This can't be edited or deleted from the app; the underlying table has no update/delete policy at all.
      </p>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-6">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">When</th>
              <th className="text-left px-4 py-3">Action</th>
              <th className="text-left px-4 py-3">By</th>
              <th className="text-left px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium text-ink whitespace-nowrap">
                  {ACTION_LABELS[r.action] || r.action}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {r.user?.name || r.user?.email || "—"}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                  {r.new_value ? JSON.stringify(r.new_value) : "—"}
                </td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No audited actions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
