import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import DashboardMonthPicker from "./DashboardMonthPicker";
import AnimatedValue from "@/components/AnimatedValue";

function fmt(n) {
  return "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-US");
}

// Tone drives three things together: the accent bar, the icon wash, and the
// value color — so a card's color always means the same thing everywhere it
// appears on the page (sage = healthy/positive, brick = needs attention).
const TONE = {
  ink: { text: "text-ink", bar: "bg-slate-300", chip: "bg-slate-100 text-slate-500" },
  sage: { text: "text-sage", bar: "bg-sage", chip: "bg-sage-tint text-sage" },
  brick: { text: "text-brick", bar: "bg-brick", chip: "bg-brick-tint text-brick" },
  royal: { text: "text-royal", bar: "bg-royal", chip: "bg-soft-blue text-royal" },
};

function StatCard({ label, value, tone = "ink", icon, wide }) {
  const t = TONE[tone] || TONE.ink;
  return (
    <div
      className={`group relative flex items-start gap-2.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,30,61,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,30,61,0.08)] ${
        wide ? "sm:col-span-2 lg:col-span-4" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${t.bar}`} aria-hidden="true" />
      {icon && (
        <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${t.chip}`}>
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
        <div className={`mt-0.5 truncate font-mono text-base font-semibold ${t.text}`}><AnimatedValue value={value} /></div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="mt-6 mb-2.5 flex items-baseline gap-2 first:mt-0">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      <span className="text-[10.5px] uppercase tracking-wide text-slate-400">{eyebrow}</span>
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
    </div>
  );
}

// Tiny, purposeful line icons — no icon library dependency. Each mirrors the
// stat it sits beside (people for students, a coin for fees, a pulse for
// attendance) rather than being decorative.
const Icon = {
  Students: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5S14.4 16 15 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="8.5" r="2.4" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
      <path d="M15.8 14.7c2.1.3 3.5 1.6 4 4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
    </svg>
  ),
  Coin: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5v9M14.5 9.7c0-1.1-1.1-1.9-2.5-1.9s-2.5.8-2.5 1.9c0 2.6 5 1.3 5 3.9 0 1.1-1.1 1.9-2.5 1.9s-2.5-.8-2.5-1.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12.3l2.3 2.3 4.7-4.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Clock: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v4.3l3 1.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Trend: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <path d="M4 16l5-5 3.5 3.5L20 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h5v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Wallet: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <rect x="3.5" y="6.5" width="17" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16.5 12.3h2.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  Receipt: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3v-17z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  Scale: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <path d="M12 3.5v17M7 3.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 6l-4.5 8h9L12 6zM12 6l4.5 8h-9L12 6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="7.5" cy="17.5" r="1.3" fill="currentColor" />
      <circle cx="16.5" cy="17.5" r="1.3" fill="currentColor" />
    </svg>
  ),
  Pulse: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" {...p}>
      <path d="M3.5 12h3l2-4 3 8 2-6 1.5 2h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

// This whole page is a Server Component: it queries Postgres directly on
// every request (no client-side fetch, no stale cache) and is subject to
// the signed-in user's RLS policies — a Teacher account querying this same
// page only ever sees what their role's policies allow.
export default async function DashboardPage({ searchParams }) {
  const supabase = createClient();

  // Same ?month=YYYY-MM-01 convention Finance > Reports already uses
  // (ReportMonthPicker.js) — the dashboard used to hardcode "today's
  // month" with no way to look back at a prior month's position without
  // leaving the page. A stray/invalid ?month is silently ignored in favor
  // of the current month rather than producing a broken date range.
  const now = new Date();
  const todayMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const requestedMonth = searchParams?.month;
  const isValidRequestedMonth = requestedMonth && /^\d{4}-\d{2}-01$/.test(requestedMonth);
  const monthStartStr = isValidRequestedMonth ? requestedMonth : todayMonthStr;
  const monthStart = new Date(monthStartStr + "T00:00:00");
  const isCurrentMonth = monthStartStr === todayMonthStr;

  // Half-open range [month start, next month start) — a plain .gte() with no
  // upper bound would let anything dated in a future month bleed into "this
  // month"'s figures (a payment recorded for next month, a backdated typo,
  // an attendance row saved with the wrong date, etc). Every date-filtered
  // query below uses this same pair, e.g. for August 2026:
  //   2026-08-01 <= record.date < 2026-09-01
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  const monthEndStr = monthEnd.toISOString().slice(0, 10);

  // Previous month's range, for the "August vs July" KPI comparison —
  // exactly one month back from whatever's selected, so switching months
  // with the picker moves the comparison along with it, not just the main
  // stats.
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthStartStr = prevMonthStart.toISOString().slice(0, 10);

  // Six-month window ending at the selected month, for the Fee Collection
  // Trend strip — same half-open-range reasoning as above, just spanning
  // further back.
  const trendStart = new Date(monthStart);
  trendStart.setMonth(trendStart.getMonth() - 5);
  const trendStartStr = trendStart.toISOString().slice(0, 10);

  const [
    { count: studentCount },
    { data: feeRecords },
    { data: monthTxns },
    { data: prevMonthTxns },
    { data: trendTxns },
    { data: studentAttendance },
    { data: teacherAttendance },
  ] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("fee_records").select("total_payable").eq("month", monthStartStr),
    // The one and only source for every financial figure below —
    // fee_payments/income/expenses/salary_payments all post here via
    // trigger (post_transaction(), 0001_init.sql) the moment they're
    // inserted, and a reversal posts an opposite-direction row rather than
    // deleting the original (0011_immutable_ledger.sql), so summing this
    // table is already reversal-safe without filtering reversed_at
    // anywhere. Finance > Reports and Finance > Monthly Closing group this
    // exact same table the exact same way — if this page ever disagreed
    // with either of those, it would mean a bug in one of the queries, not
    // a legitimate second version of the truth.
    supabase.from("transactions").select("type, amount").gte("txn_date", monthStartStr).lt("txn_date", monthEndStr),
    // Same table, same grouping, just the prior month — for the KPI
    // comparison strip below.
    supabase.from("transactions").select("type, amount").gte("txn_date", prevMonthStartStr).lt("txn_date", monthStartStr),
    // Six months of fee_payment rows for the trend strip. Deliberately just
    // `type` + `amount` + `txn_date` — grouped into months in JS below,
    // same shape as the payment-method grouping on Finance > Reports.
    supabase.from("transactions").select("type, amount, txn_date").eq("type", "fee_payment").gte("txn_date", trendStartStr).lt("txn_date", monthEndStr),
    supabase.from("student_attendance").select("status").gte("date", monthStartStr).lt("date", monthEndStr),
    supabase.from("teacher_attendance").select("status").gte("date", monthStartStr).lt("date", monthEndStr),
  ]);

  const txns = monthTxns || [];
  const sumOf = (type) => txns.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);

  const collected = sumOf("fee_payment");
  const otherIncome = sumOf("income");
  const expensesTotal = sumOf("expense");
  const salaryTotal = sumOf("salary_payment");

  const expected = (feeRecords || []).reduce((a, r) => a + Number(r.total_payable || 0), 0);
  const remaining = Math.max(0, expected - collected);
  const rate = expected > 0 ? (collected / expected) * 100 : 0;
  const totalIncome = collected + otherIncome;
  const net = totalIncome - expensesTotal - salaryTotal;

  // "August vs July" — same sumOf shape, just against the prior month's
  // transactions rows instead of this month's. growth() returns null when
  // there's nothing to compare against (prior month had zero), since a
  // percentage off a zero base isn't a real number — the UI shows "New"
  // for that case instead of a misleading "+∞%" or a silently wrong 0%.
  const prevTxns = prevMonthTxns || [];
  const prevSumOf = (type) => prevTxns.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);
  const prevCollected = prevSumOf("fee_payment");
  const prevOtherIncome = prevSumOf("income");
  const prevExpensesTotal = prevSumOf("expense");
  const prevSalaryTotal = prevSumOf("salary_payment");

  const growth = (curr, prev) => (prev === 0 ? (curr === 0 ? 0 : null) : ((curr - prev) / prev) * 100);
  const prevMonthLabel = prevMonthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const kpiComparisons = [
    { label: "Collection", curr: collected, prev: prevCollected },
    { label: "Other Income", curr: otherIncome, prev: prevOtherIncome },
    { label: "Expenses", curr: expensesTotal, prev: prevExpensesTotal },
    { label: "Teacher Salaries", curr: salaryTotal, prev: prevSalaryTotal },
  ].map((r) => ({ ...r, growth: growth(r.curr, r.prev) }));

  // Fee Collection Trend — six calendar months ending at whatever's
  // selected, grouped from the same trendTxns rows fetched above (all
  // type = 'fee_payment', so no re-filtering needed here, just bucketing
  // by month).
  const trendMonths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(monthStart);
    d.setMonth(d.getMonth() - i);
    trendMonths.push(d);
  }
  const trendKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const trendSums = Object.fromEntries(trendMonths.map((d) => [trendKey(d), 0]));
  (trendTxns || []).forEach((t) => {
    const k = t.txn_date.slice(0, 7);
    if (k in trendSums) trendSums[k] += Number(t.amount);
  });
  const trendMax = Math.max(1, ...trendMonths.map((d) => trendSums[trendKey(d)]));
  const trendLabel = (d) => d.toLocaleDateString("en-US", { month: "short" }) + (d.getFullYear() !== monthStart.getFullYear() ? ` '${String(d.getFullYear()).slice(2)}` : "");

  const studentAttRate = studentAttendance && studentAttendance.length > 0
    ? (studentAttendance.filter((a) => a.status === "present").length / studentAttendance.length) * 100
    : null;
  const teacherAttRate = teacherAttendance && teacherAttendance.length > 0
    ? (teacherAttendance.filter((a) => a.status === "present").length / teacherAttendance.length) * 100
    : null;

  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="relative">
      <span className="credit-tag absolute right-0 top-0 text-[11px] text-slate-400 select-none">
        Developed by <span className="font-medium text-slate-500">Mr. Ahmad Alam</span>
      </span>

      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-soft-blue shadow-sm mb-2.5">
          <Image src="/logo.jpg" alt="Modern Science Academy logo" width={48} height={48} className="w-full h-full object-cover" priority />
        </div>
        <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-royal">MSA FinanceOS</div>
        <h1 className="text-xl md:text-2xl font-semibold text-ink mt-1 tracking-tight">Modern Science Academy</h1>
        <div className="h-0.5 w-12 bg-gradient-to-r from-royal to-soft-blue rounded-full mt-2.5" />
        <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${isCurrentMonth ? "bg-soft-blue text-royal" : "bg-slate-100 text-slate-500"}`}>
          {isCurrentMonth && <span className="h-1.5 w-1.5 rounded-full bg-royal" />}
          {isCurrentMonth ? "Live · " : ""}{monthLabel}
        </span>
        <div className="mt-3">
          <DashboardMonthPicker month={monthStartStr} />
        </div>
      </div>

      {/* Enrollment & Fees */}
      <SectionHeading title="Enrollment & Fees" eyebrow={monthLabel} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Students" value={studentCount ?? 0} icon={<Icon.Students />} />
        <StatCard label="Expected Fees" value={fmt(expected)} icon={<Icon.Receipt />} tone="royal" />
        <StatCard label="Collected" value={fmt(collected)} icon={<Icon.Coin />} tone="sage" />
        <StatCard label="Remaining" value={fmt(remaining)} icon={<Icon.Wallet />} tone={remaining > 0 ? "brick" : "sage"} />
      </div>

      {/* Income & Expenses */}
      <SectionHeading title="Income & Expenses" eyebrow={monthLabel} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Collection %" value={rate.toFixed(1) + "%"} icon={<Icon.Trend />} tone={rate >= 75 ? "sage" : "brick"} />
        <StatCard label="Other Income" value={fmt(otherIncome)} icon={<Icon.Coin />} tone="sage" />
        <StatCard label="Expenses" value={fmt(expensesTotal)} icon={<Icon.Wallet />} tone="brick" />
        <StatCard label="Teacher Salaries" value={fmt(salaryTotal)} icon={<Icon.Wallet />} tone="brick" />
      </div>

      {/* Net position */}
      <div className="mt-4">
        <StatCard
          label="Net Income (Fee Collection + Other Income − Expenses − Teacher Salary)"
          value={fmt(net)}
          icon={<Icon.Scale />}
          tone={net >= 0 ? "sage" : "brick"}
          wide
        />
      </div>

      {/* Month-over-month KPI comparison */}
      <SectionHeading title={`${monthLabel.split(" ")[0]} vs ${prevMonthLabel.split(" ")[0]}`} eyebrow="Month over month" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiComparisons.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="text-xs font-medium text-slate-500 mb-2">{k.label}</div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{prevMonthLabel.split(" ")[0]}</span>
              <span className="font-mono">{fmt(k.prev)}</span>
            </div>
            <div className="flex justify-between text-sm mt-0.5">
              <span className="text-slate-600">{monthLabel.split(" ")[0]}</span>
              <span className="font-mono font-medium text-ink"><AnimatedValue value={fmt(k.curr)} /></span>
            </div>
            <div className={`text-xs font-semibold mt-2 ${
              k.growth === null ? "text-slate-400" : k.growth > 0 ? "text-sage" : k.growth < 0 ? "text-brick" : "text-slate-400"
            }`}>
              {k.growth === null ? "New" : `${k.growth > 0 ? "+" : ""}${k.growth.toFixed(1)}%`}
            </div>
          </div>
        ))}
      </div>

      {/* Fee Collection Trend */}
      <SectionHeading title="Fee Collection Trend" eyebrow="Last 6 months" />
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        {trendMonths.map((d) => {
          const key = trendKey(d);
          const value = trendSums[key];
          const barPct = Math.round((value / trendMax) * 100);
          const isSelected = key === trendKey(monthStart);
          return (
            <div key={key} className="flex items-center gap-3">
              <div className={`w-14 shrink-0 text-xs ${isSelected ? "font-semibold text-royal" : "text-slate-500"}`}>{trendLabel(d)}</div>
              <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isSelected ? "bg-royal" : "bg-soft-blue"}`}
                  style={{ width: `${Math.max(barPct, value > 0 ? 2 : 0)}%` }}
                />
              </div>
              <div className="w-24 shrink-0 text-right text-xs font-mono text-slate-500">{fmt(value)}</div>
            </div>
          );
        })}
      </div>

      {/* Attendance */}
      <SectionHeading title="Attendance" eyebrow={monthLabel} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Student Attendance %"
          value={studentAttRate === null ? "—" : studentAttRate.toFixed(1) + "%"}
          icon={<Icon.Pulse />}
          tone={studentAttRate === null ? "ink" : studentAttRate >= 75 ? "sage" : "brick"}
        />
        <StatCard
          label="Teacher Attendance %"
          value={teacherAttRate === null ? "—" : teacherAttRate.toFixed(1) + "%"}
          icon={<Icon.Clock />}
          tone={teacherAttRate === null ? "ink" : teacherAttRate >= 90 ? "sage" : "brick"}
        />
      </div>

      <div className="mt-8 flex gap-2.5 rounded-xl border border-slate-200 bg-white/60 p-4 text-xs leading-relaxed text-slate-500">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" className="mt-0.5 flex-none text-slate-400">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 11v5.5M12 8v.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <p>
          Every financial figure above (Collected, Other Income, Expenses, Teacher Salaries, Net Income) is
          grouped straight from the unified <code className="font-mono text-slate-600">transactions</code> ledger —
          the same table Finance → Reports and Finance → Monthly Closing read, so all three always agree. Only
          Expected Fees (from fee_records) and attendance figures come from elsewhere, since neither has a ledger
          equivalent.
        </p>
      </div>
    </div>
  );
}
