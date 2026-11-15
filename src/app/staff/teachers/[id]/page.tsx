import { notFound } from "next/navigation";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import ActionForm from "@/components/action-form";
import { SelectField, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { assignTeacher, removeAssignment, setActive } from "../../actions";

export default async function TeacherDetail({ params }: { params: { id: string } }) {
  await requireModule("teachers");
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const s = createClient();
  const { data: t } = await s.from("teachers").select("id,teacher_code,profiles(full_name,email,phone,is_active)").eq("id", params.id).maybeSingle();
  if (!t) notFound();
  const p: any = t.profiles;
  const [{ data: assigns }, { data: taught }, { data: courses }, { data: batches }] = await Promise.all([
    s.from("teacher_assignments").select("id,courses(name),batches(name)").eq("teacher_id", t.id),
    s.from("batches").select("id,name,status,courses(name)").eq("teacher_id", t.id),
    s.from("courses").select("id,name").order("name"), s.from("batches").select("id,name,courses(name)").order("name"),
  ]);
  const { count } = await s.from("enrolments").select("id", { count: "exact", head: true }).in("batch_id", (taught ?? []).map((b) => b.id).concat(["00000000-0000-0000-0000-000000000000"]));
  return (
    <>
      <div><PageTitle>{p?.full_name}</PageTitle><p className="text-sm text-brand-700">{t.teacher_code} · {p?.email} · {p?.is_active ? "Active" : "Inactive"} · {count ?? 0} enrolled students in their batches</p></div>
      <Card title="Assignments">
        {(assigns ?? []).length === 0 ? <Empty>No courses or batches assigned.</Empty> : <ul className="divide-y divide-brand-200">{assigns!.map((a: any) => (
          <li key={a.id} className="flex items-center justify-between py-2 text-sm"><span>{a.batches ? `Batch: ${a.batches.name}` : `Course: ${a.courses?.name}`}</span>
            <ActionForm action={removeAssignment} label="Remove" tone="quiet" className="flex"><Hidden name="id" value={a.id} /><Hidden name="teacher_id" value={t.id} /></ActionForm></li>))}</ul>}
        <div className="mt-4 border-t border-brand-200 pt-4"><ActionForm action={assignTeacher} label="Assign" className="grid gap-3 sm:grid-cols-3">
          <Hidden name="teacher_id" value={t.id} />
          <SelectField label="Course" name="course_id" options={(courses ?? []).map((c) => ({ value: c.id, label: c.name }))} empty="None" />
          <SelectField label="Batch" name="batch_id" options={(batches ?? []).map((b: any) => ({ value: b.id, label: `${b.name} (${b.courses?.name})` }))} empty="None" />
        </ActionForm></div>
      </Card>
      <Card title="Batches they teach">
        {(taught ?? []).length === 0 ? <Empty>Set this teacher on a batch from the Batches page.</Empty> : <ul className="space-y-1 text-sm">{taught!.map((b: any) => <li key={b.id}>{b.name} · {b.courses?.name} · {b.status}</li>)}</ul>}
      </Card>
      <Card title="Account"><ActionForm action={setActive} label={p?.is_active ? "Deactivate account" : "Activate account"} tone="quiet"><Hidden name="id" value={t.id} /><Hidden name="kind" value="teacher" /><Hidden name="active" value={String(!p?.is_active)} /></ActionForm></Card>
    </>
  );
}
