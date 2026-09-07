import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRoleContext } from "@/lib/auth/roles";
import StudentAttendanceRegister from "./StudentAttendanceRegister";
import ClassSectionPicker from "./ClassSectionPicker";

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function StudentAttendancePage({ searchParams }) {
  const supabase = createClient();
  const date = searchParams?.date || new Date().toISOString().slice(0, 10);
  const classId = searchParams?.class_id || "";
  const sectionId = searchParams?.section_id || "";

  // Reuses the same request-memoized lookup app/(app)/layout.js already ran
  // for the sidebar (see lib/auth/roles.js) instead of this page redoing its
  // own auth.getUser() + users query — was a fully redundant round trip on
  // every load of this page. roleContext.teacherId also replaces what used
  // to be a third query here just to find "this user's teacher row".
  const roleContext = await getRoleContext();
  const isTeacherOnly = roleContext?.isTeacher;

  let classesQuery = supabase.from("classes").select("id, name").order("sort_order");
  if (isTeacherOnly) {
    const { data: myClasses } = roleContext.teacherId
      ? await supabase.from("teacher_classes").select("class_id").eq("teacher_id", roleContext.teacherId)
      : { data: [] };
    const ids = [...new Set((myClasses || []).map((c) => c.class_id))];
    classesQuery = ids.length ? classesQuery.in("id", ids) : classesQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  const { data: classes } = await classesQuery;

  const { data: sections } = classId
    ? await supabase.from("sections").select("id, name").eq("class_id", classId).order("name")
    : { data: [] };

  let students = [];
  let existingByStudentId = {};
  if (classId) {
    let sq = supabase.from("students").select("id, name").eq("class_id", classId).eq("status", "active").order("name");
    if (sectionId) sq = sq.eq("section_id", sectionId);
    const { data } = await sq;
    students = data || [];

    const studentIds = students.map((s) => s.id);
    if (studentIds.length) {
      const { data: existing } = await supabase
        .from("student_attendance")
        .select("student_id, status")
        .eq("date", date).eq("class_id", classId).is("subject_id", null)
        .in("student_id", studentIds);
      existingByStudentId = Object.fromEntries((existing || []).map((r) => [r.student_id, r]));
    }
  }

  const qs = (overrides) => {
    const p = new URLSearchParams({ date, class_id: classId, section_id: sectionId, ...overrides });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `?${p.toString()}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Student Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Pick a class, mark the register, save.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link href={qs({ date: shiftDate(date, -1) })} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">← Prev</Link>
          <span className="px-2.5 py-1.5 rounded-lg border border-slate-300">{date}</span>
          <Link href={qs({ date: new Date().toISOString().slice(0, 10) })} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">Today</Link>
          <Link href={qs({ date: shiftDate(date, 1) })} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">Next →</Link>
        </div>
      </div>

      <ClassSectionPicker classes={classes} sections={sections} date={date} classId={classId} sectionId={sectionId} />

      {!classId && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
          Select a class above to load its register.
        </div>
      )}

      {classId && (
        <StudentAttendanceRegister students={students} existingByStudentId={existingByStudentId} date={date} classId={classId} sectionId={sectionId} />
      )}
    </div>
  );
}
