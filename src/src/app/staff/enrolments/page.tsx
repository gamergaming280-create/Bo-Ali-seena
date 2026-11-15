import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import ActionForm from "@/components/action-form";
import { Field, SelectField, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createEnrolment, updateEnrolment } from "../actions";

const STATUS = [{ value: "active", label: "Active" }, { value: "completed", label: "Completed" }, { value: "withdrawn", label: "Withdrawn" }];

export default async function Enrolments() {
  await requireModule("enrolments");
  const s = createClient();
  const [{ data: rows }, { data: courses }, { data: levels }, { data: batches }] = await Promise.all([
    s.from("enrolments").select("id,status,level_id,batch_id,enrolled_on,students(student_code,profiles(full_name)),courses(name)").order("enrolled_on", { ascending: false }).limit(100),
    s.from("courses").select("id,name").eq("status", "active").order("name"), s.from("levels").select("id,name").order("sequence"), s.from("batches").select("id,name,courses(name)").eq("status", "active").order("name"),
  ]);
  const co = (courses ?? []).map((c) => ({ value: c.id, label: c.name }));
  const lv = (levels ?? []).map((l) => ({ value: l.id, label: l.name }));
  const ba = (batches ?? []).map((b: any) => ({ value: b.id, label: `${b.name} (${b.courses?.name})` }));
  return (
    <>
      <PageTitle>Enrolments</PageTitle>
      <Card title="Enrol a student">
        <ActionForm action={createEnrolment} label="Enrol" className="grid gap-3 sm:grid-cols-4">
          <Field label="Student ID" name="student_code" required placeholder="BAS-2026-0001" /><SelectField label="Course" name="course_id" options={co} />
          <SelectField label="Level" name="level_id" options={lv} empty="No level" /><SelectField label="Batch" name="batch_id" options={ba} empty="No batch" />
        </ActionForm>
      </Card>
      <Card title="Latest 100 enrolments">
        {(rows ?? []).length === 0 ? <Empty>No enrolments yet.</Empty> : (
          <ul className="divide-y divide-brand-200">{rows!.map((r: any) => (
            <li key={r.id} className="py-4">
              <p className="mb-2 text-sm"><span className="font-medium">{r.students?.profiles?.full_name}</span> <span className="text-brand-700">({r.students?.student_code}) · {r.courses?.name}</span></p>
              <ActionForm action={updateEnrolment} label="Save" tone="quiet" className="grid gap-3 sm:grid-cols-3">
                <Hidden name="id" value={r.id} /><SelectField label="Status" name="status" options={STATUS} defaultValue={r.status} />
                <SelectField label="Level" name="level_id" options={lv} defaultValue={r.level_id} empty="No level" /><SelectField label="Batch" name="batch_id" options={ba} defaultValue={r.batch_id} empty="No batch" />
              </ActionForm></li>))}</ul>
        )}
      </Card>
    </>
  );
}
