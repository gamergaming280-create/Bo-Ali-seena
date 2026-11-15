import Link from "next/link";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/exam-data";
import { fmtDate } from "@/lib/student-data";
import ActionForm from "@/components/action-form";
import { Field, SelectField } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createExam } from "../exam-actions";

export default async function Examinations() {
  const { perms } = await requireModule("examinations");
  const manage = perms.includes("exams");
  const s = createClient();
  const [{ data: exams }, { data: batches }, { data: teachers }, { data: cats }] = await Promise.all([
    s.from("examinations").select("id,name,exam_date,status,total_marks,courses(name),batches(name)").order("exam_date", { ascending: false }),
    s.from("batches").select("id,name,courses(name)").eq("status", "active").order("name"),
    s.from("teachers").select("id,profiles(full_name)"),
    s.from("assessment_categories").select("id,name").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <>
      <PageTitle>Examinations</PageTitle>
      {manage && (
        <Card title="Create an examination">
          {(batches ?? []).length === 0 || (cats ?? []).length === 0 ? <Empty>You need at least one active batch and one assessment category first.</Empty> : (
            <ActionForm action={createExam} label="Create examination" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Examination name" name="name" required /><Field label="Exam date" name="exam_date" type="date" required />
                <SelectField label="Batch" name="batch_id" options={batches!.map((b: any) => ({ value: b.id, label: `${b.name} (${b.courses?.name})` }))} />
                <SelectField label="Teacher (defaults to the batch teacher)" name="teacher_id" options={(teachers ?? []).map((t: any) => ({ value: t.id, label: t.profiles?.full_name }))} empty="Batch teacher" />
                <Field label="Passing marks (optional)" name="passing_marks" type="number" />
              </div>
              <fieldset><legend className="mb-2 text-sm font-medium">Assessment categories and maximum marks</legend>
                <div className="grid gap-2 sm:grid-cols-2">{cats!.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-brand-200 px-3 py-2 text-sm">
                    <input type="checkbox" name={`cat:${c.id}`} id={`c${c.id}`} className="h-4 w-4" /><label htmlFor={`c${c.id}`} className="flex-1">{c.name}</label>
                    <input name={`max:${c.id}`} type="number" min="0" step="0.01" placeholder="Max" aria-label={`${c.name} maximum marks`} className="w-24 rounded border border-brand-200 px-2 py-1" />
                  </div>))}</div>
              </fieldset>
              <p className="text-xs text-brand-700">Total marks are the sum of the ticked categories. If a passing percentage is set in Settings and you leave passing marks blank, it is calculated from that.</p>
            </ActionForm>)}
        </Card>
      )}
      <Card title={manage ? "All examinations" : "Your examinations"}>
        {(exams ?? []).length === 0 ? <Empty>No examinations yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Examination</th><th>Date</th><th>Course</th><th>Batch</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>{exams!.map((e: any) => (
              <tr key={e.id} className="border-b border-brand-50"><td className="py-2"><Link className="font-medium text-brand-700 underline" href={`/staff/examinations/${e.id}`}>{e.name}</Link></td><td>{fmtDate(e.exam_date)}</td><td>{e.courses?.name}</td><td>{e.batches?.name}</td><td>{e.total_marks}</td><td>{STATUS_LABEL[e.status]}</td></tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
