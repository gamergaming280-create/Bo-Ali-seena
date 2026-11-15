import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getResults, getAttendance, getEnrolments, fmtDate } from "@/lib/student-data";
import { Card, Stat, Empty, PageTitle } from "@/components/ui";
import { TrendChart } from "@/components/charts";

export default async function Dashboard() {
  const { user, profile } = await requireRole("student");
  const supabase = createClient();
  const [{ data: st }, results, att, enrols] = await Promise.all([
    supabase.from("students").select("student_code").eq("id", user.id).maybeSingle(),
    getResults(user.id), getAttendance(user.id), getEnrolments(user.id),
  ]);
  const active = enrols.filter((e) => e.status === "active");
  const latest = results[results.length - 1];
  const avg = results.length ? Math.round((results.reduce((s, r) => s + r.pct, 0) / results.length) * 10) / 10 : null;

  return (
    <>
      <div>
        <PageTitle>Welcome, {profile.full_name}</PageTitle>
        <p className="text-brand-700">Student ID: {st?.student_code ?? "—"}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Attendance" value={att.pct == null ? "—" : `${att.pct}%`} note={att.total ? `${att.present} of ${att.total} classes` : "No classes recorded yet"} />
        <Stat label="Latest result" value={latest ? `${latest.pct}%` : "—"} note={latest ? `${latest.name}${latest.grade ? ` · Grade ${latest.grade}` : ""}` : "No published results yet"} />
        <Stat label="Average across exams" value={avg == null ? "—" : `${avg}%`} note={results.length ? `${results.length} published exam${results.length > 1 ? "s" : ""}` : undefined} />
        <Stat label="Enrolled courses" value={active.length} />
      </div>
      <Card title="Current enrolment">
        {active.length === 0 ? <Empty>You haven't been enrolled in a course yet. The academy office will assign it.</Empty> : (
          <ul className="divide-y divide-brand-200">
            {active.map((e) => (
              <li key={e.id} className="py-3 text-sm">
                <p className="font-medium">{e.courses?.name}</p>
                <p className="text-brand-700">Level: {e.levels?.name ?? "Not assigned"} · Batch: {e.batches?.name ?? "Not assigned"} · Enrolled {fmtDate(e.enrolled_on)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Progress over time">
        {results.length < 2 ? <Empty>Your progress chart appears after two published exams.</Empty> : <TrendChart data={results.map((r) => ({ name: r.name, pct: r.pct }))} />}
      </Card>
    </>
  );
}
