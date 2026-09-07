"use client";

import { useRouter } from "next/navigation";

export default function ClassSectionPicker({ classes, sections, date, classId, sectionId }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <select
        defaultValue={classId}
        onChange={(e) => router.push(`?date=${date}&class_id=${e.target.value}`)}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
      >
        <option value="">Select a class…</option>
        {(classes || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {classId && (
        <select
          defaultValue={sectionId}
          onChange={(e) => router.push(`?date=${date}&class_id=${classId}&section_id=${e.target.value}`)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All sections</option>
          {(sections || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
    </div>
  );
}
