import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import ActionForm from "@/components/action-form";
import { Field, SelectField, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createCourse, updateCourse } from "../actions";

const STATUS = [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }];

export default async function Courses() {
  const { perms } = await requireModule("courses");
  const supabase = createClient();
  const edit = perms.includes("academics");
  const { data } = await supabase.from("courses").select("*").order("name");
  return (
    <>
      <PageTitle>Courses</PageTitle>
      {edit && (
        <Card title="Add a course">
          <ActionForm action={createCourse} label="Add course" className="grid gap-3 sm:grid-cols-2">
            <Field label="Course name" name="name" required /><Field label="Duration" name="duration" placeholder="e.g. 3 months" />
            <Field label="Description" name="description" /><SelectField label="Status" name="status" options={STATUS} defaultValue="active" />
          </ActionForm>
        </Card>
      )}
      <Card title={edit ? "All courses" : "Your courses"}>
        {(data ?? []).length === 0 ? <Empty>No courses yet.</Empty> : (
          <ul className="divide-y divide-brand-200">{data!.map((c) => edit ? (
            <li key={c.id} className="py-4"><ActionForm action={updateCourse} label="Save" tone="quiet" className="grid gap-3 sm:grid-cols-4">
              <Hidden name="id" value={c.id} /><Field label="Name" name="name" defaultValue={c.name} required /><Field label="Duration" name="duration" defaultValue={c.duration} />
              <Field label="Description" name="description" defaultValue={c.description} /><SelectField label="Status" name="status" options={STATUS} defaultValue={c.status} />
            </ActionForm></li>
          ) : <li key={c.id} className="py-3 text-sm"><p className="font-medium">{c.name}</p><p className="text-brand-700">{c.description ?? ""}</p></li>)}</ul>
        )}
      </Card>
    </>
  );
}
