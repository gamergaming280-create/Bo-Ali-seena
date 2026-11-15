import Link from "next/link";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { REPORTS, buildReport, parseFilters } from "@/lib/report-build";
import type { Report } from "@/lib/report-output";
import { TrendChart, AvgBar } from "@/components/charts";
import { Card, Empty, PageTitle } from "@/components/ui";

const SHOW = 500;

export default async function Reports({ searchParams: sp }: { searchParams: Record<string, string | undefined> }) {
  await requireModule("reports");
  const kind = REPORTS.find((r) => r.key === sp.r)?.key ?? "students";
  const filters = parseFilters(sp);
  const s = createClient();
  const [{ data: courses }, { data: levels }, { data: batches }] = await Promise.all([s.from("courses").select("id,name").order("name"), s.from("levels").select("id,name").order("sequence"), s.from("batches").select("id,name").order("name")]);
  let rep: Report | undefined, failed = false;
  try { rep = await buildReport(s, kind, filters); } catch { failed = true; }
  const qs = new URLSearchParams(Object.entries({ ...filters, r: kind }) as [string, string][]);
  const tab = (k: string) => { const u = new URLSearchParams(qs); u.set("r", k); return `/staff/reports?${u}`; };
  const sel = "mt-1 block rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal";
  const opt = (list: { id: string; name: string }[] | null) => (list ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>);
  return (
    <>
      <PageTitle>Academic Reports</PageTitle>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Reports">
        {REPORTS.map((r) => <Link key={r.key} href={tab(r.key)} className={`rounded-full border px-3 py-1 ${r.key === kind ? "border-brand-900 bg-brand-900 text-white" : "border-brand-200 bg-white"}`}>{r.label}</Link>)}
      </nav>
      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="r" value={kind} />
          <label className="text-sm font-medium">Course<select name="course" defaultValue={filters.course ?? ""} className={sel}><option value="">All</option>{opt(courses)}</select></label>
          <label className="text-sm font-medium">Level<select name="level" defaultValue={filters.level ?? ""} className={sel}><option value="">All</option>{opt(levels)}</select></label>
          <label className="text-sm font-medium">Batch<select name="batch" defaultValue={filters.batch ?? ""} className={sel}><option value="">All</option>{opt(batches)}</select></label>
          <label className="text-sm font-medium">From<input type="date" name="from" defaultValue={filters.from} className={sel} /></label>
          <label className="text-sm font-medium">To<input type="date" name="to" defaultValue={filters.to} className={sel} /></label>
          <button className="rounded-lg bg-brand-900 px-4 py-2 text-sm text-white">Apply</button>
        </form>
      </Card>
      {failed || !rep ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">This report couldn't be loaded. Try again, or narrow the filters.</p> : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-display text-2xl">{rep.title}</h2><p className="text-sm text-brand-700">{rep.note} {rep.rows.length} row{rep.rows.length === 1 ? "" : "s"}.</p></div>
            {rep.rows.length > 0 && <div className="flex gap-2 text-sm"><a href={`/staff/reports/export?${qs}&format=csv`} className="rounded-lg border border-brand-200 px-4 py-2 hover:border-brand-500">Export CSV</a><a href={`/staff/reports/export?${qs}&format=pdf`} className="rounded-lg border border-brand-200 px-4 py-2 hover:border-brand-500">Export PDF</a></div>}
          </div>
          {rep.chart && rep.chart.data.length > 1 && <Card title={rep.chart.kind === "trend" ? "Average percentage by examination" : "Average percentage"}>{rep.chart.kind === "trend" ? <TrendChart data={rep.chart.data.map((d) => ({ name: d.name, pct: d.value }))} /> : <AvgBar data={rep.chart.data} />}</Card>}
          <Card>
            {rep.rows.length === 0 ? <Empty>No data matches these filters yet.</Empty> : (
              <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead><tr className="border-b border-brand-200 text-left">{rep.columns.map((c) => <th key={c.key} className={`py-2 pr-3 ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>)}</tr></thead>
                <tbody>{rep.rows.slice(0, SHOW).map((r, i) => <tr key={i} className="border-b border-brand-50">{rep.columns.map((c) => <td key={c.key} className={`py-2 pr-3 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>{r[c.key] ?? "—"}</td>)}</tr>)}</tbody>
              </table></div>
            )}
            {rep.rows.length > SHOW && <p className="mt-3 text-xs text-brand-700">Showing the first {SHOW} rows. The exports include all {rep.rows.length}.</p>}
          </Card>
        </>
      )}
    </>
  );
}
