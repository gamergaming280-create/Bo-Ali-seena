import { notFound } from "next/navigation";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/exam-data";
import ActionForm from "@/components/action-form";
import { Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { saveMarks } from "../../exam-actions";

export default async function MarksEntry({ params }: { params: { id: string } }) {
  const { perms, profile } = await requireModule("results");
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const s = createClient();
  const { data: ex } = await s.from("examinations").select("id,name,status,batch_id,batches(name)").eq("id", params.id).maybeSingle();
  if (!ex) notFound();
  const [{ data: comps }, { data: roster }, { data: results }] = await Promise.all([
    s.from("assessment_components").select("id,max_marks,assessment_categories(name,sort_order)").eq("examination_id", ex.id),
    s.from("enrolments").select("student_id,students(student_code,profiles(full_name))").eq("batch_id", ex.batch_id).eq("status", "active"),
    s.from("results").select("student_id,component_id,marks_obtained,remarks").eq("examination_id", ex.id),
  ]);
  const components = ((comps ?? []) as any[]).sort((a, b) => a.assessment_categories.sort_order - b.assessment_categories.sort_order);
  const students = ((roster ?? []) as any[]).map((r) => ({ id: r.student_id as string, name: r.students?.profiles?.full_name as string, code: r.students?.student_code as string })).sort((a, b) => a.name.localeCompare(b.name));
  const cell = (sid: string, cid: string) => (results ?? []).find((r) => r.student_id === sid && r.component_id === cid);

  const canWrite = perms.includes("marks_enter") && ex.status !== "published" && (profile.role !== "teacher" || ex.status === "draft" || ex.status === "marks_open");
  const needsReason = ex.status === "under_review" || ex.status === "approved";
  return (
    <>
      <div><PageTitle>Marks: {ex.name}</PageTitle><p className="text-sm text-brand-700">{(ex as any).batches?.name} · {STATUS_LABEL[ex.status]}</p></div>
      {!canWrite && <p className="rounded-lg bg-brand-50 px-4 py-3 text-sm">{ex.status === "published" ? "These results are published and locked." : profile.role === "teacher" && ex.status !== "draft" && ex.status !== "marks_open" ? "This examination has been submitted. Marks can't be changed by teachers; a manager can return it for correction." : "You can view marks here, but your role can't enter them."}</p>}
      <Card>
        {students.length === 0 ? <Empty>No active students are enrolled in this batch yet.</Empty> : (
          <ActionForm action={saveMarks} label="Save marks" className="space-y-4" hideSubmit={!canWrite}>
            <Hidden name="exam" value={ex.id} />
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Student</th>{components.map((c) => <th key={c.id} className="px-2">{c.assessment_categories.name} <span className="font-normal text-brand-700">/ {c.max_marks}</span></th>)}</tr></thead>
              <tbody>{students.map((st) => (
                <tr key={st.id} className="border-b border-brand-50 align-top">
                  <td className="py-2 pr-3"><span className="font-medium">{st.name}</span><br /><span className="text-xs text-brand-700">{st.code}</span></td>
                  {components.map((c) => { const r = cell(st.id, c.id); return (
                    <td key={c.id} className="space-y-1 px-2 py-2">
                      <input name={`m:${st.id}:${c.id}`} type="number" step="0.01" min="0" max={c.max_marks} defaultValue={r?.marks_obtained ?? ""} disabled={!canWrite} aria-label={`${st.name}, ${c.assessment_categories.name} marks`} className="w-24 rounded border border-brand-200 px-2 py-1 disabled:bg-brand-50" />
                      <input name={`r:${st.id}:${c.id}`} defaultValue={r?.remarks ?? ""} maxLength={500} placeholder="Remark" disabled={!canWrite} aria-label={`${st.name}, ${c.assessment_categories.name} remark`} className="block w-36 rounded border border-brand-200 px-2 py-1 text-xs disabled:bg-brand-50" />
                    </td>); })}
                </tr>))}</tbody>
            </table></div>
            {needsReason && canWrite && <label className="block text-sm font-medium">Reason for changing marks (required after submission)<input name="reason" required className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal" /></label>}
            <p className="text-xs text-brand-700">Marks can't exceed the maximum for their category. Empty boxes stay empty and are never counted as zero. Every change is recorded in the audit history.</p>
          </ActionForm>
        )}
      </Card>
    </>
  );
}
