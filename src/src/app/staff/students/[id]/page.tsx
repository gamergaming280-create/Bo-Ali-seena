import { notFound } from "next/navigation";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/guards";
import { fmtDate, initials } from "@/lib/student-data";
import ActionForm from "@/components/action-form";
import { Field, SelectField, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { updateStudent, setActive, uploadAvatar, createEnrolment, updateEnrolment } from "../../actions";

const STATUS = [{ value: "active", label: "Active" }, { value: "completed", label: "Completed" }, { value: "withdrawn", label: "Withdrawn" }];

export default async function StudentDetail({ params }: { params: { id: string } }) {
  const { perms } = await requireModule("students");
  const manage = perms.includes("students");
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const s = createClient();
  // RLS decides whether this staff member may see this student; no row means 404.
  const { data: st } = await s.from("student_directory").select("*").eq("id", params.id).maybeSingle();
  if (!st) notFound();
  const [{ data: enrols }, { data: att }, { data: res }, { data: courses }, { data: levels }, { data: batches }, photo] = await Promise.all([
    s.from("enrolments").select("id,status,level_id,batch_id,enrolled_on,courses(name)").eq("student_id", st.id).order("enrolled_on", { ascending: false }),
    s.from("attendance").select("status").eq("student_id", st.id),
    s.from("results").select("marks_obtained,remarks,assessment_components(max_marks,assessment_categories(name)),examinations(name,exam_date,status)").eq("student_id", st.id),
    s.from("courses").select("id,name").order("name"), s.from("levels").select("id,name").order("sequence"), s.from("batches").select("id,name,courses(name)").order("name"),
    avatarUrl(st.avatar_url),
  ]);
  const a = att ?? [], present = a.filter((r) => r.status === "present").length;
  const lv = (levels ?? []).map((l) => ({ value: l.id, label: l.name }));
  const ba = (batches ?? []).map((b: any) => ({ value: b.id, label: `${b.name} (${b.courses?.name})` }));
  const rows = ((res ?? []) as any[]).sort((x, y) => y.examinations.exam_date.localeCompare(x.examinations.exam_date));
  return (
    <>
      <div className="flex items-center gap-4">
        {photo ? <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-900 text-xl text-white" aria-hidden>{initials(st.full_name)}</span>}
        <div><PageTitle>{st.full_name}</PageTitle><p className="text-sm text-brand-700">{st.student_code} · {st.email} · {st.is_active ? "Active" : "Inactive"}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Classes recorded" value={a.length} /><Stat label="Attendance" value={a.length ? `${Math.round((present / a.length) * 1000) / 10}%` : "—"} /><Stat label="Enrolled since" value={fmtDate(st.enrolled_on)} />
      </div>
      {manage && (
        <Card title="Details">
          <ActionForm action={updateStudent} label="Save details" className="grid gap-3 sm:grid-cols-3"><Hidden name="id" value={st.id} /><Field label="Full name" name="full_name" defaultValue={st.full_name} required /><Field label="Phone" name="phone" defaultValue={st.phone} /></ActionForm>
          <div className="mt-4 grid gap-4 border-t border-brand-200 pt-4 sm:grid-cols-2">
            <ActionForm action={uploadAvatar} label="Upload photo"><Hidden name="id" value={st.id} /><label className="block text-sm font-medium">Profile picture (JPG, PNG or WebP, up to 2 MB)<input type="file" name="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm font-normal" /></label></ActionForm>
            <ActionForm action={setActive} label={st.is_active ? "Deactivate account" : "Activate account"} tone="quiet"><Hidden name="id" value={st.id} /><Hidden name="kind" value="student" /><Hidden name="active" value={String(!st.is_active)} /></ActionForm>
          </div>
        </Card>
      )}
      <Card title="Enrolments">
        {(enrols ?? []).length === 0 ? <Empty>Not enrolled in any course.</Empty> : <ul className="divide-y divide-brand-200">{enrols!.map((e: any) => manage ? (
          <li key={e.id} className="py-3"><p className="mb-2 text-sm font-medium">{e.courses?.name}</p>
            <ActionForm action={updateEnrolment} label="Save" tone="quiet" className="grid gap-3 sm:grid-cols-3"><Hidden name="id" value={e.id} /><SelectField label="Status" name="status" options={STATUS} defaultValue={e.status} /><SelectField label="Level" name="level_id" options={lv} defaultValue={e.level_id} empty="No level" /><SelectField label="Batch" name="batch_id" options={ba} defaultValue={e.batch_id} empty="No batch" /></ActionForm></li>
        ) : <li key={e.id} className="py-3 text-sm">{e.courses?.name} · {e.status}</li>)}</ul>}
        {manage && <div className="mt-4 border-t border-brand-200 pt-4"><ActionForm action={createEnrolment} label="Add enrolment" className="grid gap-3 sm:grid-cols-4"><Hidden name="student_code" value={st.student_code} /><SelectField label="Course" name="course_id" options={(courses ?? []).map((c) => ({ value: c.id, label: c.name }))} /><SelectField label="Level" name="level_id" options={lv} empty="No level" /><SelectField label="Batch" name="batch_id" options={ba} empty="No batch" /></ActionForm></div>}
      </Card>
      <Card title="Academic history">
        {rows.length === 0 ? <Empty>No marks recorded yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Examination</th><th>Date</th><th>Category</th><th>Marks</th><th>Remarks</th><th>State</th></tr></thead>
            <tbody>{rows.map((r, i) => (<tr key={i} className="border-b border-brand-50"><td className="py-2">{r.examinations.name}</td><td>{fmtDate(r.examinations.exam_date)}</td><td>{r.assessment_components.assessment_categories.name}</td><td>{r.marks_obtained} / {r.assessment_components.max_marks}</td><td>{r.remarks ?? "—"}</td><td className="capitalize">{r.examinations.status.replace("_", " ")}</td></tr>))}</tbody></table></div>
        )}
      </Card>
    </>
  );
}
