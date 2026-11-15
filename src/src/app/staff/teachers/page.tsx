import Link from "next/link";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import ActionForm from "@/components/action-form";
import { Field } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createTeacher } from "../actions";

export default async function Teachers() {
  await requireModule("teachers");
  const s = createClient();
  const [{ data: teachers }, { data: batches }, { data: assigns }] = await Promise.all([
    s.from("teachers").select("id,teacher_code,profiles(full_name,email,phone,is_active)").order("teacher_code"),
    s.from("batches").select("teacher_id"), s.from("teacher_assignments").select("teacher_id"),
  ]);
  const n = (list: any[] | null, id: string) => (list ?? []).filter((x) => x.teacher_id === id).length;
  return (
    <>
      <PageTitle>Teachers</PageTitle>
      <Card title="Add a teacher">
        <ActionForm action={createTeacher} label="Create teacher account" className="grid gap-3 sm:grid-cols-3">
          <Field label="Full name" name="full_name" required /><Field label="Email" name="email" type="email" required /><Field label="Phone" name="phone" />
        </ActionForm>
      </Card>
      <Card title="All teachers">
        {(teachers ?? []).length === 0 ? <Empty>No teachers yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Name</th><th>ID</th><th>Email</th><th>Batches taught</th><th>Assignments</th><th>Status</th></tr></thead>
            <tbody>{teachers!.map((t: any) => (
              <tr key={t.id} className="border-b border-brand-50"><td className="py-2"><Link className="font-medium text-brand-700 underline" href={`/staff/teachers/${t.id}`}>{t.profiles?.full_name}</Link></td><td>{t.teacher_code}</td><td>{t.profiles?.email}</td><td>{n(batches, t.id)}</td><td>{n(assigns, t.id)}</td><td>{t.profiles?.is_active ? "Active" : "Inactive"}</td></tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
