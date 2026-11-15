import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Report, Cell } from "@/lib/report-output";

export const REPORTS = [
  { key: "students", label: "Student performance" }, { key: "courses", label: "Course-wise results" }, { key: "levels", label: "Level-wise performance" },
  { key: "batches", label: "Batch performance" }, { key: "attendance", label: "Attendance" }, { key: "exams", label: "Examinations" }, { key: "trends", label: "Improvement trends" },
] as const;

export type Filters = { course?: string; level?: string; batch?: string; from?: string; to?: string };
const UUID = /^[0-9a-f-]{36}$/i, DATE = /^\d{4}-\d{2}-\d{2}$/;
export function parseFilters(sp: Record<string, string | undefined>): Filters {
  const f: Filters = {};
  if (sp.course && UUID.test(sp.course)) f.course = sp.course;
  if (sp.level && UUID.test(sp.level)) f.level = sp.level;
  if (sp.batch && UUID.test(sp.batch)) f.batch = sp.batch;
  if (sp.from && DATE.test(sp.from)) f.from = sp.from;
  if (sp.to && DATE.test(sp.to)) f.to = sp.to;
  return f;
}

// PostgREST returns at most 1000 rows per request, so every list is read page by page.
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error("Report data could not be loaded");
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
}

type ER = { sid: string; code: string; name: string; examId: string; examName: string; date: string; courseId: string; course: string; levelId: string | null; level: string; batchId: string; batch: string; pct: number; passed: boolean | null };
type AR = { sid: string; batchId: string; batch: string; courseId: string; course: string; levelId: string | null; level: string; present: boolean };

const r1 = (n: number) => Math.round(n * 10) / 10;
const mean = (a: number[]) => (a.length ? r1(a.reduce((x, y) => x + y, 0) / a.length) : null);
const rate = (a: (boolean | null)[]) => { const d = a.filter((x) => x !== null); return d.length ? r1((d.filter(Boolean).length / d.length) * 100) : null; };

async function loadExamRows(s: SupabaseClient, f: Filters): Promise<ER[]> {
  const raw = await fetchAll<any>((a, b) => {
    let q = s.from("results").select("id,student_id,examination_id,marks_obtained,assessment_components(max_marks),examinations!inner(id,name,exam_date,passing_marks,course_id,level_id,batch_id,courses(name),levels(name),batches(name)),students(student_code,profiles(full_name))")
      .eq("examinations.status", "published").order("id").range(a, b);
    if (f.course) q = q.eq("examinations.course_id", f.course);
    if (f.level) q = q.eq("examinations.level_id", f.level);
    if (f.batch) q = q.eq("examinations.batch_id", f.batch);
    if (f.from) q = q.gte("examinations.exam_date", f.from);
    if (f.to) q = q.lte("examinations.exam_date", f.to);
    return q;
  });
  const m = new Map<string, { r: any; got: number; max: number }>();
  for (const r of raw) {
    const k = `${r.examination_id}:${r.student_id}`;
    const e = m.get(k) ?? { r, got: 0, max: 0 };
    e.got += Number(r.marks_obtained); e.max += Number(r.assessment_components.max_marks); m.set(k, e);
  }
  return [...m.values()].map(({ r, got, max }) => {
    const x = r.examinations;
    return { sid: r.student_id, code: r.students?.student_code ?? "", name: r.students?.profiles?.full_name ?? "Student", examId: x.id, examName: x.name, date: x.exam_date, courseId: x.course_id, course: x.courses?.name ?? "", levelId: x.level_id, level: x.levels?.name ?? "No level", batchId: x.batch_id, batch: x.batches?.name ?? "", pct: max ? r1((got / max) * 100) : 0, passed: x.passing_marks == null ? null : got >= Number(x.passing_marks) };
  });
}

async function loadAttendance(s: SupabaseClient, f: Filters): Promise<AR[]> {
  const raw = await fetchAll<any>((a, b) => {
    let q = s.from("attendance").select("id,student_id,batch_id,status,class_date,batches!inner(name,course_id,level_id,courses(name),levels(name))").order("id").range(a, b);
    if (f.batch) q = q.eq("batch_id", f.batch);
    if (f.course) q = q.eq("batches.course_id", f.course);
    if (f.level) q = q.eq("batches.level_id", f.level);
    if (f.from) q = q.gte("class_date", f.from);
    if (f.to) q = q.lte("class_date", f.to);
    return q;
  });
  return raw.map((r) => ({ sid: r.student_id, batchId: r.batch_id, batch: r.batches?.name ?? "", courseId: r.batches?.course_id, course: r.batches?.courses?.name ?? "", levelId: r.batches?.level_id, level: r.batches?.levels?.name ?? "No level", present: r.status === "present" }));
}

const group = <T,>(rows: T[], key: (r: T) => string) => { const m = new Map<string, T[]>(); for (const r of rows) { const k = key(r); (m.get(k) ?? m.set(k, []).get(k)!).push(r); } return m; };
const attPct = (a: AR[]) => (a.length ? r1((a.filter((x) => x.present).length / a.length) * 100) : null);
const PUB = "Based on published results only.";

export async function buildReport(s: SupabaseClient, kind: string, f: Filters): Promise<Report> {
  const num = (label: string, key: string) => ({ key, label, align: "right" as const });

  if (kind === "attendance") {
    const [att, dir] = await Promise.all([loadAttendance(s, f), fetchAll<any>((a, b) => s.from("student_directory").select("id,student_code,full_name").order("id").range(a, b))]);
    const names = new Map(dir.map((d) => [d.id, d]));
    const rows = [...group(att, (r) => `${r.sid}:${r.batchId}`).values()].map((g) => {
      const d = names.get(g[0].sid); const present = g.filter((x) => x.present).length;
      return { code: d?.student_code ?? "", name: d?.full_name ?? "Student", course: g[0].course, batch: g[0].batch, classes: g.length, present, absent: g.length - present, pct: r1((present / g.length) * 100) } as Record<string, Cell>;
    }).sort((a, b) => Number(a.pct) - Number(b.pct) || String(a.name).localeCompare(String(b.name)));
    return { kind, title: "Attendance report", note: "Lowest attendance first.", columns: [{ key: "code", label: "ID" }, { key: "name", label: "Student" }, { key: "course", label: "Course" }, { key: "batch", label: "Batch" }, num("Classes", "classes"), num("Present", "present"), num("Absent", "absent"), num("Attendance %", "pct")], rows };
  }

  if (kind === "exams") {
    const [er, exams] = await Promise.all([loadExamRows(s, f), fetchAll<any>((a, b) => {
      let q = s.from("examinations").select("id,name,exam_date,status,total_marks,courses(name),batches(name)").order("exam_date", { ascending: false }).order("id").range(a, b);
      if (f.course) q = q.eq("course_id", f.course); if (f.level) q = q.eq("level_id", f.level); if (f.batch) q = q.eq("batch_id", f.batch);
      if (f.from) q = q.gte("exam_date", f.from); if (f.to) q = q.lte("exam_date", f.to);
      return q;
    })]);
    const by = group(er, (r) => r.examId);
    const rows = exams.map((e) => {
      const g = by.get(e.id) ?? []; const p = g.map((x) => x.pct);
      return { exam: e.name, date: e.exam_date, course: e.courses?.name ?? "", batch: e.batches?.name ?? "", status: String(e.status).replace("_", " "), graded: g.length || null, avg: mean(p), high: p.length ? Math.max(...p) : null, low: p.length ? Math.min(...p) : null, pass: rate(g.map((x) => x.passed)) } as Record<string, Cell>;
    });
    return { kind, title: "Examination report", note: "Statistics appear for published examinations only.", columns: [{ key: "exam", label: "Examination" }, { key: "date", label: "Date" }, { key: "course", label: "Course" }, { key: "batch", label: "Batch" }, { key: "status", label: "Status" }, num("Students", "graded"), num("Average %", "avg"), num("Highest %", "high"), num("Lowest %", "low"), num("Pass rate %", "pass")], rows };
  }

  const [er, att] = await Promise.all([loadExamRows(s, f), kind === "students" || kind === "courses" || kind === "levels" || kind === "batches" ? loadAttendance(s, f) : Promise.resolve([] as AR[])]);

  if (kind === "students") {
    const attBy = group(att, (r) => r.sid);
    const rows = [...group(er, (r) => r.sid).values()].map((g) => {
      const s2 = [...g].sort((a, b) => a.date.localeCompare(b.date)); const last = s2[s2.length - 1], prev = s2.length > 1 ? s2[s2.length - 2] : null;
      return { code: g[0].code, name: g[0].name, course: last.course, batch: last.batch, exams: s2.length, avg: mean(s2.map((x) => x.pct)), latest: last.pct, change: prev ? r1(last.pct - prev.pct) : null, att: attPct(attBy.get(g[0].sid) ?? []) } as Record<string, Cell>;
    }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return { kind, title: "Student performance report", note: PUB, columns: [{ key: "code", label: "ID" }, { key: "name", label: "Student" }, { key: "course", label: "Course" }, { key: "batch", label: "Batch" }, num("Exams", "exams"), num("Average %", "avg"), num("Latest %", "latest"), num("Change vs previous", "change"), num("Attendance %", "att")], rows };
  }

  if (kind === "courses" || kind === "levels" || kind === "batches") {
    const key = (r: { courseId?: string; levelId?: string | null; batchId?: string }) => (kind === "courses" ? r.courseId : kind === "levels" ? r.levelId : r.batchId) ?? "none";
    const erBy = group(er, key), atBy = group(att, key);
    const rows = [...new Set([...erBy.keys(), ...atBy.keys()])].map((k) => {
      const e = erBy.get(k) ?? [], a = atBy.get(k) ?? [], one = e[0] ?? a[0];
      const label = kind === "courses" ? one.course : kind === "levels" ? one.level : one.batch;
      return { name: label, course: kind === "batches" ? one.course : undefined, students: new Set(e.map((x) => x.sid)).size, exams: new Set(e.map((x) => x.examId)).size, avg: mean(e.map((x) => x.pct)), pass: rate(e.map((x) => x.passed)), att: attPct(a) } as Record<string, Cell>;
    }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const title = kind === "courses" ? "Course-wise results" : kind === "levels" ? "Level-wise performance" : "Batch performance";
    return { kind, title, note: `${PUB} Average is the mean of each student's exam percentage.`,
      columns: [{ key: "name", label: kind === "courses" ? "Course" : kind === "levels" ? "Level" : "Batch" }, ...(kind === "batches" ? [{ key: "course", label: "Course" }] : []), num("Students", "students"), num("Exams", "exams"), num("Average %", "avg"), num("Pass rate %", "pass"), num("Attendance %", "att")],
      rows, chart: { kind: "bar", data: rows.filter((r) => r.avg != null).map((r) => ({ name: String(r.name), value: Number(r.avg) })) } };
  }

  if (kind === "trends") {
    const rows = [...group(er, (r) => r.sid).values()].filter((g) => g.length >= 2).map((g) => {
      const s2 = [...g].sort((a, b) => a.date.localeCompare(b.date)); const first = s2[0], last = s2[s2.length - 1], ch = r1(last.pct - first.pct);
      return { code: first.code, name: first.name, batch: last.batch, exams: s2.length, first: first.pct, latest: last.pct, change: ch, dir: ch > 0 ? "Improved" : ch < 0 ? "Declined" : "No change" } as Record<string, Cell>;
    }).sort((a, b) => Number(b.change) - Number(a.change));
    const byExam = [...group(er, (r) => r.examId).values()].sort((a, b) => a[0].date.localeCompare(b[0].date));
    return { kind: "trends", title: "Student improvement trends", note: `${PUB} Only students with two or more published exams are listed.`,
      columns: [{ key: "code", label: "ID" }, { key: "name", label: "Student" }, { key: "batch", label: "Batch" }, num("Exams", "exams"), num("First %", "first"), num("Latest %", "latest"), num("Change (pts)", "change"), { key: "dir", label: "Trend" }],
      rows, chart: { kind: "trend", data: byExam.map((g) => ({ name: g[0].examName, value: mean(g.map((x) => x.pct)) ?? 0 })) } };
  }
  throw new Error("Unknown report");
}
