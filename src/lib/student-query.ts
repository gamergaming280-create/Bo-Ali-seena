import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PAGE_SIZE = 20;
const SORTS = ["full_name", "student_code", "enrolled_on"];
export type StudentParams = { q?: string; course?: string; status?: string; sort?: string; dir?: string; page?: string };

/** Search/filter/sort over the RLS-scoped directory view. User input is sanitised before use in the filter. */
export function studentQuery(s: SupabaseClient, sp: StudentParams, paged: boolean) {
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N} @._-]/gu, "").trim().slice(0, 60);
  const sort = SORTS.includes(sp.sort ?? "") ? sp.sort! : "full_name";
  let query = s.from("student_directory").select("*", { count: "exact" }).order(sort, { ascending: sp.dir !== "desc" });
  if (q) query = query.or(`full_name.ilike.%${q}%,student_code.ilike.%${q}%,email.ilike.%${q}%`);
  if (sp.course && /^[0-9a-f-]{36}$/i.test(sp.course)) query = query.eq("course_id", sp.course);
  if (sp.status === "active" || sp.status === "inactive") query = query.eq("is_active", sp.status === "active");
  if (paged) { const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1); query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1); }
  return query;
}
