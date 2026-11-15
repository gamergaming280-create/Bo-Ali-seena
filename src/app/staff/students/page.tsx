import Link from "next/link";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { studentQuery, PAGE_SIZE, type StudentParams } from "@/lib/student-query";
import ActionForm from "@/components/action-form";
import { Field, SelectField } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { fmtDate } from "@/lib/student-data";
import { createStudent } from "../actions";

export default async function Students({ searchParams: sp }: { searchParams: StudentParams }) {
  const { perms } = await requireModule("students");
  const manage = perms.includes("students");
  const s = createClient();
  const [{ data, count }, { data: courses }, { data: levels }, { data: batches }] = await Promise.all([
    studentQuery(s, sp, true),
    s.from("courses").select("id,name").order("name"), s.from("levels").select("id,name").order("sequence"), s.from("batches").select("id,name,courses(name)").eq("status", "active").order("name"),
  ]);
  const co = (courses ?? []).map((c) => ({ value: c.id, label: c.name }));
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1), pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const link = (over: Record<string, string>) => { const u = new URLSearchParams(); for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) u.set(k, String(v)); return `/staff/students?${u}`; };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();
  const sortLink = (col: string, label: string) => <Link href={link({ sort: col, dir: sp.sort === col && sp.dir !== "desc" ? "desc" : "asc", page: "1" })} className="underline-offset-2 hover:underline">{label}{sp.sort === col ? (sp.dir === "desc" ? " ↓" : " ↑") : ""}</Link>;
  return (
    <>
      <PageTitle>Students</PageTitle>
      {manage && (
        <Card title="Register a student">
          <ActionForm action={createStudent} label="Register student" className="grid gap-3 sm:grid-cols-3">
            <Field label="Full name" name="full_name" required /><Field label="Email" name="email" type="email" required /><Field label="Phone" name="phone" />
            <SelectField label="Course" name="course_id" options={co} empty="Assign later" />
            <SelectField label="Level" name="level_id" options={(levels ?? []).map((l) => ({ value: l.id, label: l.name }))} empty="No level" />
            <SelectField label="Batch" name="batch_id" options={(batches ?? []).map((b: any) => ({ value: b.id, label: `${b.name} (${b.courses?.name})` }))} empty="No batch" />
          </ActionForm>
          <p className="mt-2 text-xs text-brand-700">A unique Student ID is generated automatically.</p>
        </Card>
      )}
      <Card>
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">Search<input name="q" defaultValue={sp.q ?? ""} placeholder="Name, ID or email" className="mt-1 block rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal" /></label>
          <label className="text-sm font-medium">Course<select name="course" defaultValue={sp.course ?? ""} className="mt-1 block rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal"><option value="">All</option>{co.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
          <label className="text-sm font-medium">Status<select name="status" defaultValue={sp.status ?? ""} className="mt-1 block rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal"><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <button className="rounded-lg bg-brand-900 px-4 py-2 text-sm text-white">Filter</button>
          {manage && <a href={`/staff/students/export?${exportQs}`} className="rounded-lg border border-brand-200 px-4 py-2 text-sm hover:border-brand-500">Export CSV</a>}
        </form>
        {(data ?? []).length === 0 ? <Empty>{sp.q || sp.course || sp.status ? "No students match those filters." : "No students yet."}</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">{sortLink("full_name", "Name")}</th><th>{sortLink("student_code", "ID")}</th><th>Course</th><th>Level</th><th>Batch</th><th>{sortLink("enrolled_on", "Enrolled")}</th><th>Status</th></tr></thead>
            <tbody>{data!.map((r: any) => (
              <tr key={r.id} className="border-b border-brand-50"><td className="py-2"><Link className="font-medium text-brand-700 underline" href={`/staff/students/${r.id}`}>{r.full_name}</Link></td><td>{r.student_code}</td><td>{r.course_name ?? "—"}</td><td>{r.level_name ?? "—"}</td><td>{r.batch_name ?? "—"}</td><td>{fmtDate(r.enrolled_on)}</td><td>{r.is_active ? "Active" : "Inactive"}</td></tr>))}</tbody>
          </table></div>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-brand-700">{count ?? 0} student{count === 1 ? "" : "s"} · page {page} of {pages}</span>
          <span className="flex gap-3">{page > 1 && <Link href={link({ page: String(page - 1) })} className="underline">Previous</Link>}{page < pages && <Link href={link({ page: String(page + 1) })} className="underline">Next</Link>}</span>
        </div>
      </Card>
    </>
  );
}
