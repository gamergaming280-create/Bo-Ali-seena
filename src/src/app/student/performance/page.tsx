import { requireRole } from "@/lib/auth";
import { getResults, skillSummary } from "@/lib/student-data";
import { Card, Empty, PageTitle, Stat } from "@/components/ui";
import { TrendChart, SkillChart } from "@/components/charts";

export default async function Performance() {
  const { user } = await requireRole("student");
  const results = await getResults(user.id);
  const skills = skillSummary(results);
  if (results.length === 0) return (<><PageTitle>Performance</PageTitle><Empty>Analytics appear once your first results are published.</Empty></>);

  const avg = Math.round((results.reduce((s, r) => s + r.pct, 0) / results.length) * 10) / 10;
  const ranked = [...skills].sort((a, b) => b.latest.pct - a.latest.pct);
  const strongest = ranked.slice(0, Math.min(2, ranked.length));
  const weakest = ranked.length > 2 ? ranked.slice(-2).reverse() : [];

  return (
    <>
      <PageTitle>Performance</PageTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Overall average" value={`${avg}%`} note={`${results.length} published exam${results.length > 1 ? "s" : ""}`} />
        <Stat label="Strongest area" value={strongest[0]?.category ?? "—"} note={strongest[0] ? `${strongest[0].latest.pct}% in ${strongest[0].latest.exam}` : undefined} />
        <Stat label="Needs most work" value={weakest[0]?.category ?? "—"} note={weakest[0] ? `${weakest[0].latest.pct}% in ${weakest[0].latest.exam}` : "Needs three or more categories"} />
      </div>
      <Card title="Performance over time">
        {results.length < 2 ? <Empty>A trend line needs at least two published exams.</Empty> : <TrendChart data={results.map((r) => ({ name: r.name, pct: r.pct }))} />}
      </Card>
      <Card title="English language skills">
        <SkillChart data={skills.map((s) => ({ category: s.category, latest: s.latest.pct, previous: s.prev?.pct ?? null }))} />
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Skill</th><th>Latest</th><th>Percentage</th><th>Previous</th><th>Change</th><th>Teacher feedback</th></tr></thead>
          <tbody>{skills.map((s) => (
            <tr key={s.category} className="border-b border-brand-50">
              <td className="py-2 font-medium">{s.category}</td><td>{s.latest.obtained} / {s.latest.max}</td><td>{s.latest.pct}%</td>
              <td>{s.prev ? `${s.prev.pct}%` : "—"}</td>
              <td className={s.change == null ? "" : s.change >= 0 ? "text-green-700" : "text-red-700"}>{s.change == null ? "—" : `${s.change >= 0 ? "Improved" : "Declined"} ${Math.abs(s.change)} pts`}</td>
              <td>{s.latest.remarks ?? "—"}</td>
            </tr>))}</tbody>
        </table></div>
      </Card>
    </>
  );
}
