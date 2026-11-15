"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { actor } from "@/lib/guards";
import { adminClient } from "@/lib/supabase/admin";
import type { FormState } from "../actions";

const NO: FormState = { error: "Only roles with settings access can change this." };

export async function saveGrading(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("settings"); if (!a) return NO;
  const pctRaw = String(f.get("pass_pct") ?? "").trim();
  const pct = pctRaw === "" ? null : Number(pctRaw);
  if (pct != null && !(pct >= 0 && pct <= 100)) return { error: "Passing percentage must be between 0 and 100." };
  const bounds: { min: number; grade: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const min = String(f.get(`min_${i}`) ?? "").trim(), grade = String(f.get(`grade_${i}`) ?? "").trim();
    if (!min && !grade) continue;
    const n = Number(min);
    if (!min || !grade || !(n >= 0 && n <= 100) || grade.length > 8) return { error: "Each grade needs a minimum percentage (0–100) and a short label." };
    bounds.push({ min: n, grade });
  }
  if (new Set(bounds.map((b) => b.min)).size !== bounds.length) return { error: "Two grades can't share the same minimum percentage." };
  bounds.sort((x, y) => y.min - x.min);
  const e1 = (await a.supabase.from("academy_settings").update({ value: bounds }).eq("key", "grade_boundaries")).error;
  const e2 = (await a.supabase.from("academy_settings").update({ value: pct }).eq("key", "pass_percentage")).error;
  if (e1 || e2) return { error: "Couldn't save grading settings." };
  revalidatePath("/staff/settings"); revalidatePath("/student", "layout");
  return { message: "Grading saved. It applies to how results are shown; stored marks are unchanged." };
}

export async function saveCategory(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("settings"); if (!a) return NO;
  const p = z.object({ id: z.union([z.string().uuid(), z.literal("")]), name: z.string().trim().min(2, "Enter a category name").max(60), sort_order: z.coerce.number().int().min(0).max(99) }).safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  const is_active = f.get("is_active") === "on";
  const { id, ...rest } = p.data;
  const { error } = id ? await a.supabase.from("assessment_categories").update({ ...rest, is_active }).eq("id", id) : await a.supabase.from("assessment_categories").insert({ ...rest, is_active: true });
  if (error) return { error: error.code === "23505" ? "That category already exists." : "Couldn't save." };
  revalidatePath("/staff/settings"); revalidatePath("/staff/examinations");
  return { message: id ? "Saved." : "Category added." };
}

/* ---------- institution details ---------- */
const validZone = (tz: string) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };

export async function saveInstitution(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("settings"); if (!a) return NO;
  const p = z.object({
    institution_name: z.string().trim().min(3, "Enter the institution name").max(150), tagline: z.string().trim().max(200), motto: z.string().trim().max(200),
    phone: z.string().trim().max(40), email: z.union([z.string().trim().email("Enter a valid contact email"), z.literal("")]), address: z.string().trim().max(300),
    academic_year: z.string().trim().max(30), timezone: z.string().trim().min(3).max(60),
  }).safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  if (!validZone(p.data.timezone)) return { error: "That isn't a valid time zone name (for example Asia/Karachi)." };
  const d = p.data, contact = { phone: d.phone || null, email: d.email || null, address: d.address || null };
  const rows = [
    { key: "institution_name", value: d.institution_name }, { key: "tagline", value: d.tagline || null }, { key: "motto", value: d.motto || null },
    { key: "contact", value: contact }, { key: "academic_year", value: d.academic_year || null }, { key: "timezone", value: d.timezone },
  ];
  const { error } = await a.supabase.from("academy_settings").upsert(rows, { onConflict: "key" });
  if (error) return { error: "Couldn't save the institution details." };
  revalidatePath("/", "layout");
  return { message: "Institution details saved." };
}

export async function uploadLogo(_: FormState, f: FormData): Promise<FormState> {
  const a = await actor("settings"); if (!a) return NO;
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  const ext = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<string, string>)[file.type];
  if (!ext) return { error: "Use a PNG, JPG or WebP image (SVG isn't accepted for safety)." };
  if (file.size > 1024 * 1024) return { error: "The logo must be under 1 MB." };
  const admin = adminClient();
  const { data: old } = await admin.from("academy_settings").select("value").eq("key", "logo_url").maybeSingle();
  const path = `logo-${Date.now()}.${ext}`;
  const { error } = await admin.storage.from("branding").upload(path, file, { contentType: file.type, cacheControl: "3600" });
  if (error) return { error: "Upload failed. Try again." };
  const url = admin.storage.from("branding").getPublicUrl(path).data.publicUrl;
  const { error: e2 } = await a.supabase.from("academy_settings").upsert({ key: "logo_url", value: url }, { onConflict: "key" });
  if (e2) return { error: "The image uploaded but couldn't be saved as the logo." };
  const prev = typeof old?.value === "string" ? old.value.split("/branding/")[1] : null;
  if (prev) await admin.storage.from("branding").remove([prev]);
  revalidatePath("/", "layout");
  return { message: "Logo updated." };
}
