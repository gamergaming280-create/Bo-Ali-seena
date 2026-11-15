import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import ActionForm from "@/components/action-form";
import { Field, SelectField, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createBatch, updateBatch } from "../actions";

const STATUS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "completed", label: "Completed" }];

export default async function Batches() {
  const { perms } = await requireModule("batches");
  const edit = perms.includes("academics");
  const s = createClient();
  const [{ data: batches }, { data: courses }, { data: levels }, { data: teachers }] = await Promise.all([
    s.from("batches").select("*, courses(name), levels(name), teachers(profiles(full_name))").order("name"),
    s.from("courses").select("id,name").order("name"), s.from("levels").select("id,name").order("sequence"),
    s.from("teachers").select("id,profiles(full_name)"),
  ]);
  const co = (courses ?? []).map((c) => ({ value: c.id, label: c.name }));
  const lv = (levels ?? []).map((l) => ({ value: l.id, label: l.name }));
  const te = (teachers ?? []).map((t: any) => ({ value: t.id, label: t.profiles?.full_name ?? "Teacher" }));
  return (
    <>
      <PageTitle>Batches</PageTitle>
      {edit && (
        <Card title="Add a batch">
          {co.length === 0 ? <Empty>Add a course first.</Empty> : (
            <ActionForm action={createBatch} label="Add batch" className="grid gap-3 sm:grid-cols-3">
              <Field label="Batch name" name="name" required /><SelectField label="Course" name="course_id" options={co} /><SelectField label="Level" name="level_id" options={lv} empty="No level" />
              <SelectField label="Teacher" name="teacher_id" options={te} empty="Not assigned" /><Field label="Schedule note" name="schedule_note" /><SelectField label="Status" name="status" options={STATUS} defaultValue="active" />
            </ActionForm>)}
        </Card>
      )}
      <Card title={edit ? "All batches" : "Your batches"}>
        {(batches ?? []).length === 0 ? <Empty>No batches yet.</Empty> : (
          <ul className="divide-y divide-brand-200">{batches!.map((b: any) => edit ? (
            <li key={b.id} className="py-4"><ActionForm action={updateBatch} label="Save" tone="quiet" className="grid gap-3 sm:grid-cols-3">
              <Hidden name="id" value={b.id} /><Field label="Name" name="name" defaultValue={b.name} required /><SelectField label="Course" name="course_id" options={co} defaultValue={b.course_id} /><SelectField label="Level" name="level_id" options={lv} defaultValue={b.level_id} empty="No level" />
              <SelectField label="Teacher" name="teacher_id" options={te} defaultValue={b.teacher_id} empty="Not assigned" /><Field label="Schedule note" name="schedule_note" defaultValue={b.schedule_note} /><SelectField label="Status" name="status" options={STATUS} defaultValue={b.status} />
            </ActionForm></li>
          ) : <li key={b.id} className="py-3 text-sm"><p className="font-medium">{b.name}</p><p className="text-brand-700">{b.courses?.name} · {b.levels?.name ?? "No level"} · {b.status}</p></li>)}</ul>
        )}
      </Card>
    </>
  );
}
