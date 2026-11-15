import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/tz";
import { fmtDate } from "@/lib/student-data";
import ActionForm from "@/components/action-form";
import MarkAll from "@/components/mark-all";
import { Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { saveAttendance } from "../ops-actions";

export default async function Attendance({ searchParams: sp }: { searchParams: { batch?: string; date?: string } }) {
  const { profile } = await requireModule("attendance");
  const s = createClient();
  const { data: tzRow } = await s.from("academy_settings").select("value").eq("key", "timezone").maybeSingle();
  const today = todayIn(typeof tzRow?.value === "string" ? tzRow.value : "Asia/Karachi");
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date <= today ? sp.date : today;
  const { data: batches } = await s.from("batches").select("id,name,courses(name)").eq("status", "active").order("name");
  const batch = (batches ?? []).find((b) => b.id === sp.batch);
  const manager = profile.role !== "teacher";

  let roster: any[] = [], existing: any[] = [];
  if (batch) {
    const [r, a] = await Promise.all([
      s.from("enrolments").select("student_id,students(student_code,profiles(full_name))").eq("batch_id", batch.id).eq("status", "active"),
      s.from("attendance").select("student_id,status").eq("batch_id", batch.id).eq("class_date", date),
    ]);
    roster = ((r.data ?? []) as any[]).map((x) => ({ id: x.student_id, name: x.students?.profiles?.full_name, code: x.students?.student_code })).sort((p, q) => p.name.localeCompare(q.name));
    existing = a.data ?? [];
  }

  // Management summary: last 30 days.
  let byBatch: any[] = [], byTeacher: any[] = [];
  if (manager) {
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const { data: rows } = await s.from("attendance").select("batch_id,class_date,status,marked_by").gte("class_date", since).limit(20000);
    const all = (rows ?? []) as any[];
    byBatch = (batches ?? []).map((b: any) => {
      const r = all.filter((x) => x.batch_id === b.id);
      return { name: `${b.name} (${b.courses?.name})`, sessions: new Set(r.map((x) => x.class_date)).size, pct: r.length ? Math.round((r.filter((x) => x.status === "present").length / r.length) * 1000) / 10 : null };
    }).filter((b) => b.sessions > 0);
    const ids = [...new Set(all.map((x) => x.marked_by).filter(Boolean))];
    const { data: people } = ids.length ? await s.from("profiles").select("id,full_name").in("id", ids) : { data: [] as any[] };
    byTeacher = ids.map((id) => ({ name: (people ?? []).find((p: any) => p.id === id)?.full_name ?? "Staff", sessions: new Set(all.filter((x) => x.marked_by === id).map((x) => `${x.batch_id}${x.class_date}`)).size }));
  }
  const prev = (id: string) => existing.find((e) => e.student_id === id)?.status as string | undefined;
  const input = "mt-1 block rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal";
  return (
    <>
      <PageTitle>Attendance</PageTitle>
      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">Batch<select name="batch" defaultValue={batch?.id ?? ""} required className={input}><option value="" disabled>Choose a batch</option>{(batches ?? []).map((b: any) => <option key={b.id} value={b.id}>{b.name} ({b.courses?.name})</option>)}</select></label>
          <label className="text-sm font-medium">Class date<input type="date" name="date" defaultValue={date} max={today} className={input} /></label>
          <button className="rounded-lg bg-brand-900 px-4 py-2 text-sm text-white">Load class</button>
        </form>
      </Card>
      {batch && (
        <Card title={`${batch.name}: ${fmtDate(date)}`}>
          {roster.length === 0 ? <Empty>No active students are enrolled in this batch.</Empty> : (
            <ActionForm action={saveAttendance} label="Save attendance" className="space-y-4">
              <Hidden name="batch" value={batch.id} /><Hidden name="date" value={date} />
              <div id="roster" className="space-y-4">
                <MarkAll formId="roster" />
                <ul className="divide-y divide-brand-200">{roster.map((st) => (
                  <li key={st.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span><span className="font-medium">{st.name}</span> <span className="text-xs text-brand-700">{st.code}</span></span>
                    <span className="flex gap-4">{["present", "absent"].map((v) => <label key={v} className="flex items-center gap-1.5 capitalize"><input type="radio" name={`a:${st.id}`} value={v} defaultChecked={prev(st.id) === v} className="h-4 w-4" />{v}</label>)}</span>
                  </li>))}</ul>
              </div>
              {existing.length > 0 && <label className="block text-sm font-medium">Reason for corrections (required if you change an existing record)<input name="reason" className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal" /></label>}
              <p className="text-xs text-brand-700">Only students you mark are saved. One record per student, batch and date; corrections are logged with the reason.{!manager && " Teachers can record the last 7 days; ask a manager for older dates."}</p>
            </ActionForm>)}
        </Card>
      )}
      {manager && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Batch attendance, last 30 days">{byBatch.length === 0 ? <Empty>No attendance recorded yet.</Empty> : <ul className="space-y-1 text-sm">{byBatch.map((b) => <li key={b.name} className="flex justify-between"><span>{b.name}</span><span>{b.pct}% · {b.sessions} class{b.sessions === 1 ? "" : "es"}</span></li>)}</ul>}</Card>
          <Card title="Who recorded attendance, last 30 days">{byTeacher.length === 0 ? <Empty>No activity yet.</Empty> : <ul className="space-y-1 text-sm">{byTeacher.map((t) => <li key={t.name} className="flex justify-between"><span>{t.name}</span><span>{t.sessions} session{t.sessions === 1 ? "" : "s"}</span></li>)}</ul>}</Card>
        </div>
      )}
    </>
  );
}
