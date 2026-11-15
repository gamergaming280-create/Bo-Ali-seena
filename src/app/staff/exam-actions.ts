"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { actor } from "@/lib/guards";
import type { FormState } from "../actions";

const NO: FormState = { error: "Your role doesn't have permission to do that." };
const optId = z.union([z.string().uuid(), z.literal("")]).transform((v) => v || null);
const rpcErr = (e: { code?: string; message: string }): FormState =>
  e.code === "P0001" ? { error: e.message } : e.code === "42501" ? { error: "Your role can't change this at its current stage." } : { error: "Couldn't save. Try again." };
const num = (v: FormDataEntryValue | null) => { const t = String(v ?? "").trim(); return t === "" ? null : Number(t); };

export async function createExam(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("exams"); if (!a) return NO;
  const base = z.object({ name: z.string().trim().min(2, "Enter an examination name").max(120), batch_id: z.string().uuid("Choose a batch"), teacher_id: optId, exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the exam date") }).safeParse(Object.fromEntries(f));
  if (!base.success) return { error: base.error.issues[0].message };
  const comps: { category: string; max: number }[] = [];
  for (const [k, v] of f.entries()) if (k.startsWith("cat:") && v === "on") {
    const id = k.slice(4), max = num(f.get(`max:${id}`));
    if (!z.string().uuid().safeParse(id).success || max == null || !(max > 0) || max > 10000) return { error: "Enter maximum marks (above zero) for every category you tick." };
    comps.push({ category: id, max });
  }
  if (!comps.length) return { error: "Tick at least one assessment category." };
  const passing = num(f.get("passing_marks"));
  if (passing != null && !(passing >= 0)) return { error: "Passing marks must be zero or more." };
  const { data, error } = await a.supabase.rpc("create_exam", { p_name: base.data.name, p_batch: base.data.batch_id, p_teacher: base.data.teacher_id, p_date: base.data.exam_date, p_passing: passing, p_components: comps });
  if (error) return rpcErr(error);
  revalidatePath("/staff/examinations");
  redirect(`/staff/examinations/${data}`);
}

export async function updateExam(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("exams"); if (!a) return NO;
  const p = z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(120), exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), teacher_id: optId }).safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  const passing = num(f.get("passing_marks"));
  const { data: ex } = await a.supabase.from("examinations").select("total_marks,status").eq("id", p.data.id).single();
  if (!ex) return { error: "Examination not found." };
  if (ex.status === "published") return { error: "Published examinations are locked." };
  if (passing != null && !(passing >= 0 && passing <= Number(ex.total_marks))) return { error: `Passing marks must be between 0 and ${ex.total_marks}.` };
  const { error } = await a.supabase.from("examinations").update({ name: p.data.name, exam_date: p.data.exam_date, teacher_id: p.data.teacher_id, passing_marks: passing }).eq("id", p.data.id).neq("status", "published");
  if (error) return rpcErr(error);
  revalidatePath(`/staff/examinations/${p.data.id}`); revalidatePath("/staff/examinations");
  return { message: "Saved." };
}

export async function advanceExam(_: FormState, f: FormData): Promise<FormState> {
  const p = z.object({ id: z.string().uuid(), to: z.enum(["marks_open", "under_review", "approved", "published"]) }).safeParse(Object.fromEntries(f));
  if (!p.success) return { error: "Invalid request." };
  const s = createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) return NO;
  const { error } = await s.rpc("advance_exam", { p_exam: p.data.id, p_to: p.data.to });
  if (error) return rpcErr(error);
  for (const path of [`/staff/examinations/${p.data.id}`, `/staff/results/${p.data.id}`, "/staff/examinations", "/staff/results", "/staff", "/student", "/student/results", "/student/performance"]) revalidatePath(path);
  return { message: p.data.to === "published" ? "Results published. Students can now see them." : "Status updated." };
}

export async function saveMarks(_: FormState, f: FormData): Promise<FormState> {
  const s = createClient(); const { data: { user } } = await s.auth.getUser(); if (!user) return NO;
  const id = z.string().uuid().safeParse(f.get("exam")); if (!id.success) return { error: "Invalid request." };
  const rows: { student_id: string; component_id: string; marks: number; remarks: string }[] = [];
  for (const [k, v] of f.entries()) {
    const m = /^m:([0-9a-f-]{36}):([0-9a-f-]{36})$/i.exec(k); if (!m) continue;
    const raw = String(v).trim(); if (raw === "") continue;
    const marks = Number(raw);
    if (!Number.isFinite(marks) || marks < 0) return { error: "Marks must be numbers, zero or more." };
    rows.push({ student_id: m[1], component_id: m[2], marks, remarks: String(f.get(`r:${m[1]}:${m[2]}`) ?? "").trim().slice(0, 500) });
  }
  if (!rows.length) return { error: "Enter at least one mark." };
  const { data, error } = await s.rpc("save_marks", { p_exam: id.data, p_rows: rows, p_reason: String(f.get("reason") ?? "").slice(0, 300) });
  if (error) return /exceed/i.test(error.message) ? { error: error.message } : rpcErr(error);
  revalidatePath(`/staff/results/${id.data}`); revalidatePath(`/staff/examinations/${id.data}`);
  return { message: `Saved ${data} mark${data === 1 ? "" : "s"}.` };
}
