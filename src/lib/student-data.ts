import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Grade = { min: number; grade: string };
export type Component = { category: string; obtained: number; max: number; pct: number; remarks: string | null };
export type ExamResult = {
  id: string; name: string; date: string; course: string; publishedAt: string | null;
  obtained: number; max: number; pct: number; grade: string | null; passed: boolean | null; components: Component[];
};

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export async function getGradeBoundaries(): Promise<Grade[]> {
  const { data } = await createClient().from("academy_settings").select("value").eq("key", "grade_boundaries").maybeSingle();
  const list = Array.isArray(data?.value) ? (data!.value as Grade[]) : [];
  return [...list].sort((a, b) => b.min - a.min);
}
export const gradeFor = (p: number, b: Grade[]) => b.find((x) => p >= x.min)?.grade ?? null;

/** Published results only (RLS enforces this). Percentages use the sum of component maximums. */
export async function getResults(studentId: string): Promise<ExamResult[]> {
  const supabase = createClient();
  const [{ data }, bounds] = await Promise.all([
    supabase.from("results")
      .select("marks_obtained, remarks, examination_id, assessment_components(max_marks, assessment_categories(name)), examinations(name, exam_date, published_at, passing_marks, courses(name))")
      .eq("student_id", studentId),
    getGradeBoundaries(),
  ]);
  const byExam = new Map<string, ExamResult & { pass: number | null }>();
  for (const r of (data ?? []) as any[]) {
    const e = r.examinations; if (!e) continue;
    const max = Number(r.assessment_components.max_marks), got = Number(r.marks_obtained);
    const ex = byExam.get(r.examination_id) ?? {
      id: r.examination_id, name: e.name, date: e.exam_date, course: e.courses?.name ?? "", publishedAt: e.published_at,
      obtained: 0, max: 0, pct: 0, grade: null, passed: null, components: [] as Component[], pass: e.passing_marks,
    };
    ex.obtained += got; ex.max += max;
    ex.components.push({ category: r.assessment_components.assessment_categories.name, obtained: got, max, pct: pct(got, max), remarks: r.remarks });
    byExam.set(r.examination_id, ex);
  }
  return [...byExam.values()].map((x) => ({
    ...x, pct: pct(x.obtained, x.max), grade: gradeFor(pct(x.obtained, x.max), bounds),
    passed: x.pass == null ? null : x.obtained >= x.pass,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

/** Latest and previous percentage per assessment category, from real results only. */
export function skillSummary(exams: ExamResult[]) {
  const map = new Map<string, { exam: string; pct: number; obtained: number; max: number; remarks: string | null }[]>();
  for (const e of exams) for (const c of e.components) {
    const l = map.get(c.category) ?? []; l.push({ exam: e.name, pct: c.pct, obtained: c.obtained, max: c.max, remarks: c.remarks }); map.set(c.category, l);
  }
  return [...map.entries()].map(([category, l]) => {
    const latest = l[l.length - 1], prev = l.length > 1 ? l[l.length - 2] : null;
    return { category, latest, prev, change: prev ? Math.round((latest.pct - prev.pct) * 10) / 10 : null };
  });
}

export async function getAttendance(studentId: string) {
  const { data } = await createClient().from("attendance").select("class_date,status,batch_id,batches(name)").eq("student_id", studentId).order("class_date", { ascending: false });
  const rows = (data ?? []) as any[];
  const present = rows.filter((r) => r.status === "present").length;
  return { rows, total: rows.length, present, absent: rows.length - present, pct: rows.length ? Math.round((present / rows.length) * 1000) / 10 : null };
}

export async function getEnrolments(studentId: string) {
  const { data } = await createClient().from("enrolments")
    .select("id,status,enrolled_on,batch_id,courses(name,description,duration),levels(name),batches(name,teachers(profiles(full_name)))")
    .eq("student_id", studentId).order("enrolled_on", { ascending: false });
  return (data ?? []) as any[];
}

export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const initials = (n: string) => n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
