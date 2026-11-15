import { requireRole } from "@/lib/auth";
import { getResults, fmtDate } from "@/lib/student-data";
import { Card, Empty, PageTitle } from "@/components/ui";

export default async function Results({ searchParams }: { searchParams: { exam?: string } }) {
  const { user } = await requireRole("student");
  const results = (await getResults(user.id)).reverse();
  // The exam id in the URL is only a filter over rows RLS already limited to this student.
  const open = results.find((r) => r.id === searchParams.exam);
  return (
    <>
      <PageTitle>My results</PageTitle>
      {results.length === 0 && <Empty>No results have been published yet.</Empty>}
      {open && (
        <Card title={`${open.name}: breakdown`}>
          <p className="mb-3 text-sm text-brand-700">{open.course} · {fmtDate(open.date)} · Published {fmtDate(open.publishedAt)}</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Assessment</th><th>Marks</th><th>Percentage</th><th>Teacher remarks</th></tr></thead>
            <tbody>{open.components.map((c) => (
              <tr key={c.category} className="border-b border-brand-50"><td className="py-2">{c.category}</td><td>{c.obtained} / {c.max}</td><td>{c.pct}%</td><td>{c.remarks ?? "—"}</td></tr>
            ))}</tbody>
          </table></div>
        </Card>
      )}
      {results.length > 0 && (
        <Card title="All examinations">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Examination</th><th>Date</th><th>Course</th><th>Marks</th><th>%</th><th>Grade</th><th>Published</th><th /></tr></thead>
            <tbody>{results.map((r, i) => {
              const prev = results[i + 1];
              const diff = prev ? Math.round((r.pct - prev.pct) * 10) / 10 : null;
              return (
                <tr key={r.id} className="border-b border-brand-50">
                  <td className="py-2 font-medium">{r.name}</td><td>{fmtDate(r.date)}</td><td>{r.course}</td>
                  <td>{r.obtained} / {r.max}</td>
                  <td>{r.pct}%{diff != null && <span className={`ml-1 text-xs ${diff >= 0 ? "text-green-700" : "text-red-700"}`}>{diff >= 0 ? "+" : ""}{diff}</span>}</td>
                  <td>{r.grade ?? "—"}</td><td>{fmtDate(r.publishedAt)}</td>
                  <td><a className="text-brand-700 underline" href={`/student/results?exam=${r.id}`}>Details</a></td>
                </tr>
              );
            })}</tbody>
          </table></div>
          <p className="mt-2 text-xs text-brand-700">The small figure beside a percentage is the change from the previous exam.</p>
        </Card>
      )}
    </>
  );
}
