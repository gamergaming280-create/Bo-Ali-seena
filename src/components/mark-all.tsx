"use client";
export default function MarkAll({ formId }: { formId: string }) {
  const set = (v: string) => document.querySelectorAll<HTMLInputElement>(`#${formId} input[type=radio][value=${v}]`).forEach((r) => (r.checked = true));
  return (
    <div className="flex gap-2 text-sm">
      <button type="button" onClick={() => set("present")} className="rounded-lg border border-brand-200 px-3 py-1.5 hover:border-brand-500">Mark all present</button>
      <button type="button" onClick={() => set("absent")} className="rounded-lg border border-brand-200 px-3 py-1.5 hover:border-brand-500">Mark all absent</button>
    </div>
  );
}
