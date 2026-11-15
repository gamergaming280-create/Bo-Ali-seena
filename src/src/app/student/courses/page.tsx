import { requireRole } from "@/lib/auth";
import { getEnrolments, getAttendance, fmtDate } from "@/lib/student-data";
import { Card, Empty, PageTitle } from "@/components/ui";

export default async function Courses() {
  const { user } = await requireRole("student");
  const [enrols, att] = await Promise.all([getEnrolments(user.id), getAttendance(user.id)]);
  return (
    <>
      <PageTitle>My courses</PageTitle>
      {enrols.length === 0 && <Empty>No enrolments yet.</Empty>}
      {enrols.map((e) => {
        const rows = att.rows.filter((r) => r.batch_id === e.batch_id);
        const p = rows.length ? Math.round((rows.filter((r) => r.status === "present").length / rows.length) * 100) : null;
        return (
          <Card key={e.id} title={e.courses?.name}>
            {e.courses?.description && <p className="mb-3 text-sm">{e.courses.description}</p>}
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-brand-700">Level</dt><dd>{e.levels?.name ?? "Not assigned"}</dd></div>
              <div><dt className="text-brand-700">Batch</dt><dd>{e.batches?.name ?? "Not assigned"}</dd></div>
              <div><dt className="text-brand-700">Teacher</dt><dd>{e.batches?.teachers?.profiles?.full_name ?? "Not assigned"}</dd></div>
              <div><dt className="text-brand-700">Status</dt><dd className="capitalize">{e.status} · since {fmtDate(e.enrolled_on)}</dd></div>
              <div><dt className="text-brand-700">Duration</dt><dd>{e.courses?.duration ?? "Not specified"}</dd></div>
              <div><dt className="text-brand-700">Attendance in this batch</dt><dd>{p == null ? "No classes recorded" : `${p}%`}</dd></div>
            </dl>
          </Card>
        );
      })}
    </>
  );
}
