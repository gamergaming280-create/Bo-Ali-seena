import { createClient } from "@/lib/supabase/server";
import { getStaff } from "@/lib/permissions";
import { fmtDate } from "@/lib/student-data";
import { Card, Stat, Empty, PageTitle } from "@/components/ui";

const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

export default async function StaffDashboard({ searchParams }: { searchParams: { denied?: string } }) {
  const { profile, perms } = await getStaff();
  const s = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const scoped = profile.role === "teacher"; // RLS narrows every query below to the teacher's own assignments
  const head = { count: "exact", head: true } as const;

  const [students, active, teachers, courses, upcoming, recentExams, recentStudents, att, perf] = await Promise.all([
    count(s.from("students").select("id", head)),
    count(s.from("profiles").select("id", head).eq("role", "student").eq("is_active", true)),
    count(s.from("teachers").select("id", head)),
    count(s.from("courses").select("id", head).eq("status", "active")),
    s.from("examinations").select("id,name,exam_date,status").gte("exam_date", today).order("exam_date").limit(5),
    s.from("examinations").select("id,name,status,updated_at").order("updated_at", { ascending: false }).limit(5),
    s.from("students").select("student_code,created_at,profiles(full_name)").order("created_at", { ascending: false }).limit(5),
    s.from("attendance").select("status").gte("class_date", since).limit(10000),
    perms.includes("marks_review")
      ? s.from("results").select("marks_obtained,assessment_components(max_marks),examinations!inner(status)").eq("examinations.status", "published").limit(10000)
      : Promise.resolve({ data: null }),
  ]);

  const attRows = (att.data ?? []) as any[];
  const attPct = attRows.length ? Math.round((attRows.filter((r) => r.status === "present").length / attRows.length) * 1000) / 10 : null;
  const perfRows = (perf.data ?? []) as any[];
  const got = perfRows.reduce((a, r) => a + Number(r.marks_obtained), 0), max = perfRows.reduce((a, r) => a + Number(r.assessment_components.max_marks), 0);
  const perfPct = max ? Math.round((got / max) * 1000) / 10 : null;
  const who = scoped ? "Your " : "";

  return (
    <>
      <PageTitle>Welcome, {profile.full_name}</PageTitle>
      {searchParams.denied && <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Your role doesn't have access to that page.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`${who}students`} value={students} />
        <Stat label={`${who}active students`} value={active} />
        {!scoped && <Stat label="Teachers" value={teachers} />}
        <Stat label="Active courses" value={courses} />
        <Stat label="Attendance, last 30 days" value={attPct == null ? "—" : `${attPct}%`} note={attRows.length ? `${attRows.length} records` : "No records yet"} />
        {perms.includes("marks_review") && <Stat label="Published results average" value={perfPct == null ? "—" : `${perfPct}%`} note={perfRows.length ? "All published marks" : "Nothing published yet"} />}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Upcoming examinations">
          {(upcoming.data ?? []).length === 0 ? <Empty>No upcoming examinations.</Empty> : <ul className="space-y-2 text-sm">{upcoming.data!.map((e: any) => <li key={e.id}><span className="font-medium">{e.name}</span><br /><span className="text-brand-700">{fmtDate(e.exam_date)}</span></li>)}</ul>}
        </Card>
        <Card title="Recent examination activity">
          {(recentExams.data ?? []).length === 0 ? <Empty>No examination activity yet.</Empty> : <ul className="space-y-2 text-sm">{recentExams.data!.map((e: any) => <li key={e.id}><span className="font-medium">{e.name}</span><br /><span className="capitalize text-brand-700">{e.status.replace("_", " ")} · {fmtDate(e.updated_at)}</span></li>)}</ul>}
        </Card>
        <Card title="Recent registrations">
          {(recentStudents.data ?? []).length === 0 ? <Empty>No students registered yet.</Empty> : <ul className="space-y-2 text-sm">{recentStudents.data!.map((r: any) => <li key={r.student_code}><span className="font-medium">{r.profiles?.full_name}</span><br /><span className="text-brand-700">{r.student_code} · {fmtDate(r.created_at)}</span></li>)}</ul>}
        </Card>
      </div>
    </>
  );
}
