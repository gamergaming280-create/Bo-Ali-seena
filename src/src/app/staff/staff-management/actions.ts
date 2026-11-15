"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { ROLES, PERMISSIONS, LOCKED } from "@/lib/permissions";
import type { FormState } from "../../actions";

export async function savePermissions(_: FormState, form: FormData): Promise<FormState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).eq("is_active", true).single();
  if (me?.role !== "director") return { error: "Only the Director can change permissions." };

  for (const { key: role } of ROLES) {
    const want = Object.keys(PERMISSIONS).filter((p) => form.get(`${role}:${p}`) === "on");
    for (const p of LOCKED[role] ?? []) if (!want.includes(p)) want.push(p);
    const { data: before } = await supabase.from("staff_permissions").select("permission").eq("role", role);
    const old = (before ?? []).map((r) => r.permission).sort();
    if (JSON.stringify(old) === JSON.stringify([...want].sort())) continue;

    // RLS (director-only) is the real gate; these calls run as the signed-in Director.
    const del = supabase.from("staff_permissions").delete().eq("role", role);
    const { error: e1 } = want.length ? await del.not("permission", "in", `(${want.join(",")})`) : await del;
    const { error: e2 } = await supabase.from("staff_permissions").upsert(want.map((permission) => ({ role, permission })));
    if (e1 || e2) return { error: `Couldn't save permissions for ${role}. Nothing further was changed.` };
    await adminClient().from("audit_logs").insert({ table_name: "staff_permissions", action: "update", old_data: { role, permissions: old }, new_data: { role, permissions: want.sort() }, actor_id: user.id });
  }
  revalidatePath("/staff", "layout");
  return { message: "Permissions saved." };
}
