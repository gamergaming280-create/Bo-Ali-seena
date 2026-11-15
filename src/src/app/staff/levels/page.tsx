import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import ActionForm from "@/components/action-form";
import { Field, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createLevel, updateLevel } from "../actions";

export default async function Levels() {
  await requireModule("levels");
  const { data } = await createClient().from("levels").select("*").order("sequence").order("name");
  return (
    <>
      <PageTitle>Levels</PageTitle>
      <Card title="Add a level">
        <ActionForm action={createLevel} label="Add level" className="grid gap-3 sm:grid-cols-3">
          <Field label="Level name" name="name" required /><Field label="Description" name="description" /><Field label="Order" name="sequence" type="number" defaultValue={0} />
        </ActionForm>
      </Card>
      <Card title="All levels">
        {(data ?? []).length === 0 ? <Empty>No levels yet. Add the first one above.</Empty> : (
          <ul className="divide-y divide-brand-200">{data!.map((l) => (
            <li key={l.id} className="py-4"><ActionForm action={updateLevel} label="Save" tone="quiet" className="grid gap-3 sm:grid-cols-3">
              <Hidden name="id" value={l.id} /><Field label="Name" name="name" defaultValue={l.name} required /><Field label="Description" name="description" defaultValue={l.description} /><Field label="Order" name="sequence" type="number" defaultValue={l.sequence} />
            </ActionForm></li>))}</ul>
        )}
      </Card>
    </>
  );
}
