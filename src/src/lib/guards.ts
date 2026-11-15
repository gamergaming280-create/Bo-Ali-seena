import "server-only";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth";

/** Server-action guard: signed in, active, and the DB says this role holds `perm`. */
export async function actor(perm: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  if (!p?.is_active) return null;
  const { data: g } = await supabase.from("staff_permissions").select("permission").eq("role", p.role).eq("permission", perm);
  if (!g?.length) return null;
  return { user, role: p.role as Role, supabase };
}

export const audit = (actorId: string, action: string, table: string, recordId: string | null, data: object) =>
  adminClient().from("audit_logs").insert({ table_name: table, record_id: recordId, action, new_data: data, actor_id: actorId });

export async function avatarUrl(path: string | null) {
  if (!path) return null;
  const { data } = await adminClient().storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
