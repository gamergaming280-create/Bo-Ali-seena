"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actor, audit } from "@/lib/guards";
import { createAccount } from "@/lib/accounts";
import { adminClient } from "@/lib/supabase/admin";
import type { FormState } from "../actions";

const NO = { error: "Your role doesn't have permission to do that." };
const optId = z.union([z.string().uuid(), z.literal("")]).transform((v) => v || null);
const text = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const phone = z.string().trim().regex(/^([+0-9 ()-]{7,20})?$/, "Enter a valid phone number").transform((v) => v || null);
const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const name = z.string().trim().min(2, "Enter a full name").max(120);

function parse<T extends z.ZodTypeAny>(s: T, f: FormData): { data: z.infer<T> } | { error: string } {
  const r = s.safeParse(Object.fromEntries(f));
  return r.success ? { data: r.data } : { error: r.error.issues[0].message };
}
const dbErr = (e: { code?: string }) => (e.code === "23505" ? { error: "That already exists." } : e.code === "42501" ? NO : { error: "Couldn't save. Check the details and try again." });
const done = (paths: string[], message: string): FormState => { paths.forEach((p) => revalidatePath(p)); return { message }; };

/* ---------- courses, levels, batches ---------- */
const course = z.object({ name: z.string().trim().min(2).max(100), description: text(1000), duration: text(60), status: z.enum(["active", "inactive"]) });
export async function createCourse(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("academics"); if (!a) return NO;
  const p = parse(course, f); if ("error" in p) return p;
  const { error } = await a.supabase.from("courses").insert(p.data);
  return error ? dbErr(error) : done(["/staff/courses"], "Course added.");
}
export async function updateCourse(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("academics"); if (!a) return NO;
  const p = parse(course.extend({ id: z.string().uuid() }), f); if ("error" in p) return p;
  const { id, ...rest } = p.data;
  const { error } = await a.supabase.from("courses").update(rest).eq("id", id);
  return error ? dbErr(error) : done(["/staff/courses"], "Saved.");
}
const level = z.object({ name: z.string().trim().min(1).max(100), description: text(500), sequence: z.coerce.number().int().min(0).max(999) });
export async function createLevel(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("academics"); if (!a) return NO;
  const p = parse(level, f); if ("error" in p) return p;
  const { error } = await a.supabase.from("levels").insert(p.data);
  return error ? dbErr(error) : done(["/staff/levels"], "Level added.");
}
export async function updateLevel(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("academics"); if (!a) return NO;
  const p = parse(level.extend({ id: z.string().uuid() }), f); if ("error" in p) return p;
  const { id, ...rest } = p.data;
  const { error } = await a.supabase.from("levels").update(rest).eq("id", id);
  return error ? dbErr(error) : done(["/staff/levels"], "Saved.");
}
const batch = z.object({ name: z.string().trim().min(1).max(100), course_id: z.string().uuid("Choose a course"), level_id: optId, teacher_id: optId, schedule_note: text(300), status: z.enum(["active", "inactive", "completed"]) });
export async function createBatch(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("academics"); if (!a) return NO;
  const p = parse(batch, f); if ("error" in p) return p;
  const { error } = await a.supabase.from("batches").insert(p.data);
  return error ? dbErr(error) : done(["/staff/batches"], "Batch added.");
}
export async function updateBatch(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("academics"); if (!a) return NO;
  const p = parse(batch.extend({ id: z.string().uuid() }), f); if ("error" in p) return p;
  const { id, ...rest } = p.data;
  const { error } = await a.supabase.from("batches").update(rest).eq("id", id);
  return error ? dbErr(error) : done(["/staff/batches"], "Saved.");
}

/* ---------- enrolments ---------- */
export async function createEnrolment(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("students"); if (!a) return NO;
  const p = parse(z.object({ student_code: z.string().trim().toUpperCase().min(3), course_id: z.string().uuid("Choose a course"), level_id: optId, batch_id: optId }), f);
  if ("error" in p) return p;
  const { data: st } = await a.supabase.from("students").select("id").eq("student_code", p.data.student_code).maybeSingle();
  if (!st) return { error: "No student with that ID." };
  const { error } = await a.supabase.from("enrolments").insert({ student_id: st.id, course_id: p.data.course_id, level_id: p.data.level_id, batch_id: p.data.batch_id });
  return error ? dbErr(error) : done(["/staff/enrolments", `/staff/students/${st.id}`], "Enrolled.");
}
export async function updateEnrolment(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("students"); if (!a) return NO;
  const p = parse(z.object({ id: z.string().uuid(), status: z.enum(["active", "completed", "withdrawn"]), level_id: optId, batch_id: optId }), f);
  if ("error" in p) return p;
  const { id, ...rest } = p.data;
  const { error } = await a.supabase.from("enrolments").update(rest).eq("id", id);
  return error ? dbErr(error) : done(["/staff/enrolments", "/staff/students"], "Saved.");
}

/* ---------- accounts ---------- */
const shown = (code: string | null, pw: string) => `${code ? `ID ${code}. ` : ""}Temporary password: ${pw}. Share it privately; it is shown only once, and they can change it with “Forgot password”.`;

export async function createStudent(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("students"); if (!a) return NO;
  const p = parse(z.object({ full_name: name, email, phone, course_id: optId, level_id: optId, batch_id: optId }), f); if ("error" in p) return p;
  const r = await createAccount({ role: "student", full_name: p.data.full_name, email: p.data.email, phone: p.data.phone });
  if ("error" in r) return r;
  await audit(a.user.id, "create_student", "students", r.id, { code: r.code });
  if (p.data.course_id) await a.supabase.from("enrolments").insert({ student_id: r.id, course_id: p.data.course_id, level_id: p.data.level_id, batch_id: p.data.batch_id });
  return done(["/staff/students", "/staff"], `Student created. ${shown(r.code, r.tempPassword)}`);
}
export async function createTeacher(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("teachers"); if (!a) return NO;
  const p = parse(z.object({ full_name: name, email, phone }), f); if ("error" in p) return p;
  const r = await createAccount({ role: "teacher", ...p.data });
  if ("error" in r) return r;
  await audit(a.user.id, "create_teacher", "teachers", r.id, { code: r.code });
  return done(["/staff/teachers"], `Teacher created. ${shown(r.code, r.tempPassword)}`);
}
export async function createStaff(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("staff"); if (!a || a.role !== "director") return { error: "Only the Director can create staff accounts." };
  const p = parse(z.object({ full_name: name, email, phone, role: z.enum(["director", "academic_manager", "teacher"]) }), f); if ("error" in p) return p;
  const r = await createAccount(p.data);
  if ("error" in r) return r;
  await audit(a.user.id, "create_staff", "profiles", r.id, { role: p.data.role });
  return done(["/staff/staff-management", "/staff/teachers"], `Account created. ${shown(r.code, r.tempPassword)}`);
}

export async function setActive(_: FormState, f: FormData): Promise<FormState> {
  const p = parse(z.object({ id: z.string().uuid(), kind: z.enum(["student", "teacher", "staff"]), active: z.enum(["true", "false"]) }), f); if ("error" in p) return p;
  const a = await actor(p.data.kind === "student" ? "students" : p.data.kind === "teacher" ? "teachers" : "staff"); if (!a) return NO;
  if (p.data.kind === "staff" && a.role !== "director") return NO;
  if (p.data.id === a.user.id) return { error: "You can't deactivate your own account." };
  const admin = adminClient();
  const { data: t } = await admin.from("profiles").select("role").eq("id", p.data.id).single();
  const ok = t && (p.data.kind === "staff" ? t.role !== "student" : t.role === p.data.kind);
  if (!ok) return { error: "Account not found." };
  const on = p.data.active === "true";
  const { error } = await admin.from("profiles").update({ is_active: on }).eq("id", p.data.id);
  if (error) return { error: "Couldn't update the account." };
  await audit(a.user.id, on ? "activate" : "deactivate", "profiles", p.data.id, {});
  return done(["/staff/students", `/staff/students/${p.data.id}`, "/staff/teachers", `/staff/teachers/${p.data.id}`, "/staff/staff-management"], on ? "Account activated." : "Account deactivated.");
}

export async function updateStudent(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("students"); if (!a) return NO;
  const p = parse(z.object({ id: z.string().uuid(), full_name: name, phone }), f); if ("error" in p) return p;
  const { error } = await adminClient().from("profiles").update({ full_name: p.data.full_name, phone: p.data.phone }).eq("id", p.data.id).eq("role", "student");
  if (error) return { error: "Couldn't save." };
  await audit(a.user.id, "update_student", "profiles", p.data.id, { full_name: p.data.full_name });
  return done(["/staff/students", `/staff/students/${p.data.id}`], "Saved.");
}

export async function uploadAvatar(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("students"); if (!a) return NO;
  const id = z.string().uuid().safeParse(f.get("id")); const file = f.get("file");
  if (!id.success || !(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[file.type];
  if (!ext) return { error: "Use a JPG, PNG or WebP image." };
  if (file.size > 2 * 1024 * 1024) return { error: "The image must be under 2 MB." };
  const admin = adminClient();
  const { data: t } = await admin.from("profiles").select("avatar_url").eq("id", id.data).eq("role", "student").single();
  if (!t) return { error: "Student not found." };
  const path = `${id.data}/avatar-${Date.now()}.${ext}`;
  const { error } = await admin.storage.from("avatars").upload(path, file, { contentType: file.type });
  if (error) return { error: "Upload failed. Try again." };
  await admin.from("profiles").update({ avatar_url: path }).eq("id", id.data);
  if (t.avatar_url) await admin.storage.from("avatars").remove([t.avatar_url]);
  return done([`/staff/students/${id.data}`], "Photo updated.");
}

/* ---------- teacher assignments ---------- */
export async function assignTeacher(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("teachers"); if (!a) return NO;
  const p = parse(z.object({ teacher_id: z.string().uuid(), course_id: optId, batch_id: optId }), f); if ("error" in p) return p;
  if (!p.data.course_id && !p.data.batch_id) return { error: "Choose a course or a batch." };
  const { error } = await a.supabase.from("teacher_assignments").insert(p.data);
  return error ? dbErr(error) : done([`/staff/teachers/${p.data.teacher_id}`, "/staff/teachers"], "Assigned.");
}
export async function removeAssignment(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("teachers"); if (!a) return NO;
  const p = parse(z.object({ id: z.string().uuid(), teacher_id: z.string().uuid() }), f); if ("error" in p) return p;
  const { error } = await a.supabase.from("teacher_assignments").delete().eq("id", p.data.id);
  return error ? dbErr(error) : done([`/staff/teachers/${p.data.teacher_id}`, "/staff/teachers"], "Removed.");
}
