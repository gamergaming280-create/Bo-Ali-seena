import Link from "next/link";
import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/exam-data";
import { fmtDate } from "@/lib/student-data";
import { Card, Empty, PageTitle } from "@/components/ui";

export default async function ResultsHome({ searchParams }: { searchParams: { status?: string } }) {
  await requireModule("results");
  const st = searchParams.status && STATUS_LABEL[searchParams.status] ? searchParams.status : "";
  let q = createClient().from("examinations").select("id,name,exam_date,status,courses(name),batches(name)").order("exam_date", { ascending: false });
  if (st) q = q.eq("status", st);
  const { data } = await q;
  return (
    <>
      <PageTitle>Results & Marks</PageTitle>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter by status">
        {[["", "All"], ...Object.entries(STATUS_LABEL)].map(([k, label]) => <Link key={k} href={k ? `/staff/results?status=${k}` : "/staff/results"} className={`rounded-full border px-3 py-1 ${st === k ? "border-brand-900 bg-brand-900 text-white" : "border-brand-200 bg-white"}`}>{label}</Link>)}
      </nav>
      <Card>
        {(data ?? []).length === 0 ? <Empty>No examinations in this view.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Examination</th><th>Date</th><th>Batch</th><th>Status</th><th /></tr></thead>
            <tbody>{data!.map((e: any) => (
              <tr key={e.id} className="border-b border-brand-50"><td className="py-2 font-medium">{e.name}</td><td>{fmtDate(e.exam_date)}</td><td>{e.batches?.name} · {e.courses?.name}</td><td>{STATUS_LABEL[e.status]}</td>
                <td className="space-x-3"><Link className="text-brand-700 underline" href={`/staff/results/${e.id}`}>{e.status === "published" ? "View marks" : "Marks"}</Link><Link className="text-brand-700 underline" href={`/staff/examinations/${e.id}`}>Review</Link></td></tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
