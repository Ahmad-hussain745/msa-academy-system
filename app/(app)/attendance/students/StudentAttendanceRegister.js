"use client";

import { useState, useRef } from "react";
import { saveStudentAttendance } from "./actions";

const STATUSES = [
  { key: "present", label: "Present" },
  { key: "absent", label: "Absent" },
  { key: "late", label: "Late" },
  { key: "leave", label: "Leave" },
];

export default function StudentAttendanceRegister({ students, existingByStudentId, date, classId, sectionId }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState(() => {
    const initial = {};
    for (const s of students) {
      initial[s.id] = existingByStudentId[s.id]?.status || "";
    }
    return initial;
  });
  const formRef = useRef(null);

  const setStatus = (studentId, status) => setDraft((prev) => ({ ...prev, [studentId]: status }));
  const markAllPresent = () => {
    const next = {};
    for (const s of students) next[s.id] = "present";
    setDraft(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.set("date", date);
    formData.set("class_id", classId);
    if (sectionId) formData.set("section_id", sectionId);
    for (const s of students) {
      if (draft[s.id]) formData.set(`status_${s.id}`, draft[s.id]);
    }
    setPending(true);
    saveStudentAttendance(formData).then((res) => {
      setPending(false);
      if (res?.error) { setError(res.error); return; }
      setMessage(`Saved attendance for ${res.count} student${res.count === 1 ? "" : "s"}.`);
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={markAllPresent} className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
          Mark All Present
        </button>
        <button type="submit" disabled={pending} className="bg-royal hover:bg-royal-dark text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60">
          {pending ? "Saving…" : "Save Attendance"}
        </button>
      </div>

      {error && <p className="text-sm text-brick mb-2">{error}</p>}
      {message && <p className="text-sm text-sage mb-2">{message}</p>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Student</th>
              {STATUSES.map((s) => <th key={s.key} className="text-center px-2 py-3">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                {STATUSES.map((st) => (
                  <td key={st.key} className="text-center px-2 py-3">
                    <input
                      type="radio" name={`radio_${s.id}`} checked={draft[s.id] === st.key}
                      onChange={() => setStatus(s.id, st.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No students in this class/section.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </form>
  );
}
