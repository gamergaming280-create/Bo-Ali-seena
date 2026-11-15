import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getGradeBoundaries, gradeFor, fmtDate } from "@/lib/student-data";
import { STATUS_LABEL, nextSteps } from "@/lib/exam-data";
import ActionForm from "@/components/action-form";
import { Field, SelectField, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { updateExam, advanceExam } from "../../exam-actions";

export default async function ExamDetail({ params }: { params: { id: string } }) {
  const { perms } = await requireModule("examinations");
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const s = createClient();
  const { data: ex } = await s.from("examinations").select("*, courses(name), levels(name), batches(name)").eq("id", params.id).maybeSingle();
  if (!ex) notFound();
  const [{ data: comps }, { data: results }, { data: roster }, { data: teachers }, bounds] = await Promise.all([
    s.from("assessment_components").select("id,max_marks,assessment_categories(name,sort_order)").eq("examination_id", ex.id),
    s.from("results").select("student_id,component_id,marks_obtained").eq("examination_id", ex.id),
    s.from("enrolments").select("student_id,students(student_code,profiles(full_name))").eq("batch_id", ex.batch_id).eq("status", "active"),
    s.from("teachers").select("id,profiles(full_name)"), getGradeBoundaries(),
  ]);
  const components = ((comps ?? []) as any[]).sort((a, b) => a.assessment_categories.sort_order - b.assessment_categories.sort_order);
  const cat = new Map(components.map((c) => [c.id, c.assessment_categories.name]));
  const rows = ((roster ?? []) as any[]).map((r) => {
    const mine = (results ?? []).filter((x) => x.student_id === r.student_id);
    const got = mine.reduce((a, x) => a + Number(x.marks_obtained), 0);
    const max = components.filter((c) => mine.some((x) => x.component_id === c.id)).reduce((a, c) => a + Number(c.max_marks), 0);
    const pct = max ? Math.round((got / max) * 1000) / 10 : null;
    return { id: r.student_id, name: r.students?.profiles?.full_name as string, code: r.students?.student_code as string, got, pct, missing: components.length - mine.length, complete: mine.length === components.length, passed: ex.passing_marks == null || mine.length === 0 ? null : got >= Number(ex.passing_marks) };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const missingTotal = rows.reduce((a, r) => a + r.missing, 0);

  // Audit history: managers and the Director can read it (RLS).
  let history: any[] = [];
  if (perms.includes("marks_review")) {
    const { data } = await s.from("audit_logs").select("id,action,old_data,new_data,reason,actor_id,created_at").eq("new_data->>examination_id", ex.id).order("created_at", { ascending: false }).limit(25);
    history = data ?? [];
  }
  const actorIds = [...new Set(history.map((h) => h.actor_id).filter(Boolean))];
  const { data: actors } = actorIds.length ? await s.from("profiles").select("id,full_name").in("id", actorIds) : { data: [] as any[] };
  const who = (id: string) => (actors ?? []).find((a: any) => a.id === id)?.full_name ?? "Staff";
  const student = (id: string) => rows.find((r) => r.id === id)?.name ?? "Student";
  const steps = nextSteps(ex.status, perms);
  const locked = ex.status === "published";

  return (
    <>
      <div><PageTitle>{ex.name}</PageTitle>
        <p className="text-sm text-brand-700">{ex.courses?.name} · {ex.levels?.name ?? "No level"} · {ex.batches?.name} · {fmtDate(ex.exam_date)} · Total {ex.total_marks}{ex.passing_marks != null ? ` · Pass at ${ex.passing_marks}` : ""}</p></div>
      <Card title={`Status: ${STATUS_LABEL[ex.status]}`}>
        <div className="flex flex-wrap items-center gap-3">
          {steps.map((st) => <ActionForm key={st.to} action={advanceExam} label={st.label} tone={st.to === "published" || st.to === "approved" ? "primary" : "quiet"} className="flex"><Hidden name="id" value={ex.id} /><Hidden name="to" value={st.to} /></ActionForm>)}
          {!locked && (perms.includes("marks_enter") || perms.includes("marks_review")) && <Link href={`/staff/results/${ex.id}`} className="rounded-lg border border-brand-200 px-4 py-2 text-sm hover:border-brand-500">{ex.status === "under_review" || ex.status === "approved" ? "View or correct marks" : "Enter marks"}</Link>}
          {steps.length === 0 && locked && <p className="text-sm text-brand-700">Published {fmtDate(ex.published_at)}. Results are locked.</p>}
        </div>
        {ex.status === "marks_open" && missingTotal > 0 && <p className="mt-3 text-sm text-amber-900">{missingTotal} mark{missingTotal === 1 ? " is" : "s are"} still empty. Empty marks stay empty; they are never counted as zero.</p>}
      </Card>
      {perms.includes("exams") && !locked && (
        <Card title="Details">
          <ActionForm action={updateExam} label="Save details" className="grid gap-3 sm:grid-cols-4">
            <Hidden name="id" value={ex.id} /><Field label="Name" name="name" defaultValue={ex.name} required /><Field label="Date" name="exam_date" type="date" defaultValue={ex.exam_date} required />
            <SelectField label="Teacher" name="teacher_id" options={(teachers ?? []).map((t: any) => ({ value: t.id, label: t.profiles?.full_name }))} defaultValue={ex.teacher_id} empty="Not assigned" />
            <Field label="Passing marks" name="passing_marks" type="number" defaultValue={ex.passing_marks} />
          </ActionForm>
        </Card>
      )}
      <Card title="Assessment categories"><ul className="flex flex-wrap gap-2 text-sm">{components.map((c) => <li key={c.id} className="rounded-full bg-brand-50 px-3 py-1">{c.assessment_categories.name}: {c.max_marks}</li>)}</ul></Card>
      <Card title="Results overview">
        {rows.length === 0 ? <Empty>No active students are enrolled in this batch.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Student</th><th>ID</th><th>Marks</th><th>%</th><th>Grade</th><th>Result</th><th>Empty</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-b border-brand-50"><td className="py-2">{r.name}</td><td>{r.code}</td><td>{r.pct == null ? "—" : r.got}</td><td>{r.pct == null ? "—" : `${r.pct}%`}</td><td>{r.pct == null ? "—" : gradeFor(r.pct, bounds) ?? "—"}</td><td>{r.passed == null ? "—" : r.passed ? "Pass" : "Fail"}</td><td>{r.missing || ""}</td></tr>))}</tbody>
          </table></div>
        )}
        {bounds.length === 0 && <p className="mt-2 text-xs text-brand-700">No grade boundaries are set yet, so grades show as “—”. The Director can set them in Settings.</p>}
      </Card>
      {perms.includes("marks_review") && (
        <Card title="Change history">
          {history.length === 0 ? <Empty>No changes recorded yet.</Empty> : (
            <ul className="divide-y divide-brand-200 text-sm">{history.map((h) => (
              <li key={h.id} className="py-2">
                {h.action === "status_change" ? <span>Status changed from <b>{STATUS_LABEL[h.old_data?.status]}</b> to <b>{STATUS_LABEL[h.new_data?.status]}</b></span>
                  : <span>{student(h.new_data.student_id)}, {cat.get(h.new_data.component_id) ?? "category"}: {h.action === "update" ? <>{h.old_data?.marks_obtained} → <b>{h.new_data.marks_obtained}</b></> : <>entered <b>{h.new_data.marks_obtained}</b></>}</span>}
                <span className="block text-xs text-brand-700">{who(h.actor_id)} · {new Date(h.created_at).toLocaleString("en-GB")}{h.reason ? ` · Reason: ${h.reason}` : ""}</span>
              </li>))}</ul>)}
        </Card>
      )}
    </>
  );
}
