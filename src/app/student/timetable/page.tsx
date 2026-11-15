import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/student-data";
import { Card, Empty, PageTitle } from "@/components/ui";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const t = (s: string) => s.slice(0, 5);

export default async function Timetable() {
  await requireRole("student");
  const { data } = await createClient().from("schedules")
    .select("id,day_of_week,start_time,end_time,one_off_date,is_temporary,cancelled,note,teachers(profiles(full_name)),batches(name,courses(name),teachers(profiles(full_name)))");
  const rows = (data ?? []) as any[];
  const today = new Date().toISOString().slice(0, 10);
  const regular = rows.filter((r) => !r.is_temporary && r.day_of_week != null);
  const changes = rows.filter((r) => r.is_temporary && (!r.one_off_date || r.one_off_date >= today))
    .sort((a, b) => (a.one_off_date ?? "").localeCompare(b.one_off_date ?? ""));
  const line = (r: any) => `${r.batches?.courses?.name} · ${r.batches?.name} · ${r.teachers?.profiles?.full_name ?? r.batches?.teachers?.profiles?.full_name ?? "Teacher to be confirmed"}`;
  return (
    <>
      <PageTitle>Timetable</PageTitle>
      {changes.length > 0 && (
        <Card title="Temporary changes" className="border-amber-300 bg-amber-50">
          <ul className="space-y-2 text-sm">{changes.map((r) => (
            <li key={r.id}><span className="font-medium">{fmtDate(r.one_off_date)} · {t(r.start_time)}–{t(r.end_time)}</span>{r.cancelled && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-900">Cancelled</span>}: {line(r)}{r.note && ` (${r.note})`}</li>
          ))}</ul>
        </Card>
      )}
      <Card title="Weekly classes">
        {regular.length === 0 ? <Empty>Your class schedule hasn't been published yet.</Empty> : (
          <ul className="divide-y divide-brand-200">{DAYS.map((d, i) => regular.filter((r) => r.day_of_week === i).map((r) => (
            <li key={r.id} className="py-3 text-sm"><p className="font-medium">{d}, {t(r.start_time)}–{t(r.end_time)}</p><p className="text-brand-700">{line(r)}</p></li>
          )))}</ul>
        )}
      </Card>
    </>
  );
}
