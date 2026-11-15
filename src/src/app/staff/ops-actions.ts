"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actor } from "@/lib/guards";
import { zonedToIso } from "@/lib/tz";
import type { FormState } from "../actions";

const NO: FormState = { error: "Your role doesn't have permission to do that." };
const optId = z.union([z.string().uuid(), z.literal("")]).transform((v) => v || null);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Choose a valid time");
const dbErr = (e: { code?: string; message: string }): FormState =>
  e.code === "P0001" ? { error: e.message } : e.code === "42501" ? NO : e.code === "23514" ? { error: "Check the times and dates: the end must be after the start, and each entry needs a day or a date." } : { error: "Couldn't save. Try again." };

async function tzOf(s: ReturnType<typeof createClient>) {
  const { data } = await s.from("academy_settings").select("value").eq("key", "timezone").maybeSingle();
  return typeof data?.value === "string" ? data.value : "Asia/Karachi";
}

/* ---------- attendance ---------- */
export async function saveAttendance(_: FormState, f: FormData): Promise<FormState> {
  const s = createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) return NO;
  const p = z.object({ batch: z.string().uuid(), date }).safeParse({ batch: f.get("batch"), date: f.get("date") });
  if (!p.success) return { error: "Choose a batch and a date." };
  const rows: { student_id: string; status: string }[] = [];
  for (const [k, v] of f.entries()) { const m = /^a:([0-9a-f-]{36})$/i.exec(k); if (m && (v === "present" || v === "absent")) rows.push({ student_id: m[1], status: v }); }
  if (!rows.length) return { error: "Mark at least one student present or absent." };
  const { data, error } = await s.rpc("save_attendance", { p_batch: p.data.batch, p_date: p.data.date, p_rows: rows, p_reason: String(f.get("reason") ?? "").slice(0, 300) });
  if (error) return dbErr(error);
  for (const path of ["/staff/attendance", "/staff", "/student/attendance", "/student"]) revalidatePath(path);
  return { message: `Attendance saved for ${data} student${data === 1 ? "" : "s"}.` };
}

/* ---------- timetable ---------- */
const sched = z.object({
  batch_id: z.string().uuid("Choose a batch"), teacher_id: optId, kind: z.enum(["weekly", "oneoff"]),
  day_of_week: z.union([z.coerce.number().int().min(0).max(6), z.literal("")]).transform((v) => (v === "" ? null : v)),
  one_off_date: z.union([date, z.literal("")]).transform((v) => v || null),
  start_time: time, end_time: time, note: z.string().trim().max(300).transform((v) => v || null),
});
function shape(d: z.infer<typeof sched>, cancelled: boolean) {
  const temp = d.kind === "oneoff";
  if (temp && !d.one_off_date) return { error: "Choose the date of the one-off change." };
  if (!temp && d.day_of_week == null) return { error: "Choose the class day." };
  if (d.end_time <= d.start_time) return { error: "The end time must be after the start time." };
  return { row: { batch_id: d.batch_id, teacher_id: d.teacher_id, is_temporary: temp, cancelled: temp && cancelled, day_of_week: temp ? null : d.day_of_week, one_off_date: temp ? d.one_off_date : null, start_time: d.start_time, end_time: d.end_time, note: d.note } };
}
async function clash(s: ReturnType<typeof createClient>, row: any, ignoreId?: string) {
  if (row.is_temporary || !row.teacher_id) return null;
  let q = s.from("schedules").select("id,start_time,end_time,batches(name)").eq("teacher_id", row.teacher_id).eq("is_temporary", false).eq("day_of_week", row.day_of_week).lt("start_time", row.end_time).gt("end_time", row.start_time);
  if (ignoreId) q = q.neq("id", ignoreId);
  const { data } = await q.limit(1);
  return data?.[0] ? `That teacher already teaches ${(data[0] as any).batches?.name} at that time.` : null;
}
export async function createSchedule(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("timetable"); if (!a) return NO;
  const p = sched.safeParse(Object.fromEntries(f)); if (!p.success) return { error: p.error.issues[0].message };
  const r = shape(p.data, f.get("cancelled") === "on"); if ("error" in r) return r;
  const { data: b } = await a.supabase.from("batches").select("teacher_id").eq("id", r.row.batch_id).single();
  const row = { ...r.row, teacher_id: r.row.teacher_id ?? b?.teacher_id ?? null };
  const c = await clash(a.supabase, row); if (c) return { error: c };
  const { error } = await a.supabase.from("schedules").insert(row);
  if (error) return dbErr(error);
  revalidatePath("/staff/timetable"); revalidatePath("/student/timetable");
  return { message: row.is_temporary ? "Temporary change published." : "Class added." };
}
export async function updateSchedule(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("timetable"); if (!a) return NO;
  const id = z.string().uuid().safeParse(f.get("id")); const p = sched.safeParse(Object.fromEntries(f));
  if (!id.success || !p.success) return { error: p.success ? "Invalid request." : p.error.issues[0].message };
  const r = shape(p.data, f.get("cancelled") === "on"); if ("error" in r) return r;
  const c = await clash(a.supabase, r.row, id.data); if (c) return { error: c };
  const { error } = await a.supabase.from("schedules").update(r.row).eq("id", id.data);
  if (error) return dbErr(error);
  revalidatePath("/staff/timetable"); revalidatePath("/student/timetable");
  return { message: "Saved." };
}
export async function deleteSchedule(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("timetable"); if (!a) return NO;
  const id = z.string().uuid().safeParse(f.get("id")); if (!id.success) return { error: "Invalid request." };
  const { error } = await a.supabase.from("schedules").delete().eq("id", id.data);
  if (error) return dbErr(error);
  revalidatePath("/staff/timetable"); revalidatePath("/student/timetable");
  return { message: "Removed." };
}

/* ---------- announcements ---------- */
export async function saveNotice(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("notices"); if (!a) return NO;
  const p = z.object({ id: z.union([z.string().uuid(), z.literal("")]), title: z.string().trim().min(2, "Enter a title").max(150), body: z.string().trim().min(2, "Write the announcement").max(5000),
    priority: z.enum(["normal", "important", "urgent"]), audience: z.enum(["all_students", "courses", "batches", "staff_only"]), publish_at: z.string(), expires_at: z.string() }).safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  const ids = (prefix: string) => [...f.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)).filter((x) => z.string().uuid().safeParse(x).success);
  const course_ids = p.data.audience === "courses" ? ids("course:") : [], batch_ids = p.data.audience === "batches" ? ids("batch:") : [];
  if (p.data.audience === "courses" && !course_ids.length) return { error: "Tick at least one course." };
  if (p.data.audience === "batches" && !batch_ids.length) return { error: "Tick at least one batch." };
  const tz = await tzOf(a.supabase);
  const publish = p.data.publish_at ? zonedToIso(p.data.publish_at, tz) : new Date().toISOString();
  const expires = p.data.expires_at ? zonedToIso(p.data.expires_at, tz) : null;
  if (!publish || (p.data.expires_at && !expires)) return { error: "Check the publication and expiry dates." };
  if (expires && expires <= publish) return { error: "The expiry must be after the publication date." };
  const row = { title: p.data.title, body: p.data.body, priority: p.data.priority, audience: p.data.audience, course_ids, batch_ids, publish_at: publish, expires_at: expires };
  const { error } = p.data.id ? await a.supabase.from("notices").update(row).eq("id", p.data.id) : await a.supabase.from("notices").insert({ ...row, created_by: a.user.id });
  if (error) return dbErr(error);
  revalidatePath("/staff/announcements"); revalidatePath("/student/announcements");
  return { message: p.data.id ? "Saved." : "Announcement published." };
}
export async function deleteNotice(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("notices"); if (!a) return NO;
  const id = z.string().uuid().safeParse(f.get("id")); if (!id.success) return { error: "Invalid request." };
  const { error } = await a.supabase.from("notices").delete().eq("id", id.data);
  if (error) return dbErr(error);
  revalidatePath("/staff/announcements"); revalidatePath("/student/announcements");
  return { message: "Deleted." };
}
