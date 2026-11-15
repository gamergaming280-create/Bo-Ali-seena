import { createClient } from "@/lib/supabase/server";
import { requireModule, ROLES, PERMISSIONS, LOCKED } from "@/lib/permissions";
import { Card, PageTitle } from "@/components/ui";
import PermissionForm from "./permission-form";
import ActionForm from "@/components/action-form";
import { Field, SelectField, Hidden } from "@/components/fields";
import { createStaff, setActive } from "../actions";

export default async function StaffManagement() {
  const { profile, user } = await requireModule("staff-management");
  const s = createClient();
  const [{ data: perms }, { data: staff }] = await Promise.all([
    s.from("staff_permissions").select("role,permission"),
    s.from("profiles").select("id,full_name,email,role,is_active").neq("role", "student").order("full_name"),
  ]);
  const granted: Record<string, string[]> = {};
  for (const r of perms ?? []) (granted[r.role] ??= []).push(r.permission);
  return (
    <>
      <PageTitle>Staff Management</PageTitle>
      <Card title="Roles and permissions">
        <PermissionForm roles={ROLES} permissions={PERMISSIONS} granted={granted} locked={LOCKED} editable={profile.role === "director"} />
      </Card>
      {profile.role === "director" && (
        <Card title="Create a staff account">
          <ActionForm action={createStaff} label="Create account" className="grid gap-3 sm:grid-cols-4">
            <Field label="Full name" name="full_name" required /><Field label="Email" name="email" type="email" required /><Field label="Phone" name="phone" />
            <SelectField label="Role" name="role" options={ROLES.map((r) => ({ value: r.key, label: r.label }))} defaultValue="teacher" />
          </ActionForm>
        </Card>
      )}
      <Card title="Staff accounts">
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Name</th><th>Email</th><th>Role</th><th>Status</th>{profile.role === "director" && <th />}</tr></thead>
          <tbody>{(staff ?? []).map((m) => (
            <tr key={m.id} className="border-b border-brand-50"><td className="py-2">{m.full_name}</td><td>{m.email}</td><td>{ROLES.find((r) => r.key === m.role)?.label}</td><td>{m.is_active ? "Active" : "Inactive"}</td>{profile.role === "director" && <td>{m.id !== user.id && <ActionForm action={setActive} label={m.is_active ? "Deactivate" : "Activate"} tone="quiet" className="flex"><Hidden name="id" value={m.id} /><Hidden name="kind" value="staff" /><Hidden name="active" value={String(!m.is_active)} /></ActionForm>}</td>}</tr>))}</tbody>
        </table></div>
        
      </Card>
    </>
  );
}
