import "server-only";
import { randomBytes } from "crypto";
import { adminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth";

type Result = { id: string; code: string | null; tempPassword: string } | { error: string };

/** Creates the auth user, profile and role row together; rolls everything back on failure. */
export async function createAccount(a: { role: Role; full_name: string; email: string; phone: string | null }): Promise<Result> {
  const admin = adminClient();
  const tempPassword = randomBytes(9).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email: a.email, password: tempPassword, email_confirm: true });
  if (error || !data.user) return { error: /already|registered/i.test(error?.message ?? "") ? "That email is already registered." : "Couldn't create the account." };
  const id = data.user.id;
  const undo = async (msg: string) => { await admin.auth.admin.deleteUser(id); return { error: msg }; };

  const { error: pe } = await admin.from("profiles").insert({ id, role: a.role, full_name: a.full_name, email: a.email, phone: a.phone });
  if (pe) return undo(pe.code === "23505" ? "That email is already registered." : "Couldn't create the profile.");

  let code: string | null = null;
  if (a.role === "student" || a.role === "teacher") {
    const { data: c } = await admin.rpc(a.role === "student" ? "generate_student_code" : "generate_teacher_code");
    code = c as string;
    const { error: re } = await admin.from(a.role === "student" ? "students" : "teachers").insert(a.role === "student" ? { id, student_code: code } : { id, teacher_code: code });
    if (re) return undo("Couldn't create the account record.");
  }
  return { id, code, tempPassword };
}
