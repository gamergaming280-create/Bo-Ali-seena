import { requireRole } from "@/lib/auth";
import { getAttendance, fmtDate } from "@/lib/student-data";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";

export default async function Attendance() {
  const { user } = await requireRole("student");
  const a = await getAttendance(user.id);
  return (
    <>
      <PageTitle>Attendance</PageTitle>
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total classes" value={a.total} /><Stat label="Present" value={a.present} /><Stat label="Absent" value={a.absent} />
        <Stat label="Attendance" value={a.pct == null ? "—" : `${a.pct}%`} />
      </div>
      <Card title="Date-wise record">
        {a.total === 0 ? <Empty>No attendance has been recorded yet.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Date</th><th>Batch</th><th>Status</th></tr></thead>
            <tbody>{a.rows.map((r: any) => (
              <tr key={r.class_date + r.batch_id} className="border-b border-brand-50">
                <td className="py-2">{fmtDate(r.class_date)}</td><td>{r.batches?.name}</td>
                <td className={r.status === "present" ? "text-green-700" : "text-red-700"}>{r.status === "present" ? "Present" : "Absent"}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
