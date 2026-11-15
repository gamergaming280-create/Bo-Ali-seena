import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/student-data";
import ActionForm from "@/components/action-form";
import { Field, SelectField, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { createSchedule, updateSchedule, deleteSchedule } from "../ops-actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => ({ value: String(i), label: d }));
const KIND = [{ value: "weekly", label: "Weekly class" }, { value: "oneoff", label: "One-off change" }];
const t = (x: string) => x.slice(0, 5);

export default async function Timetable() {
  const { perms } = await requireModule("timetable");
  const manage = perms.includes("timetable");
  const s = createClient();
  const [{ data }, { data: batches }, { data: teachers }] = await Promise.all([
    s.from("schedules").select("*, batches(name,courses(name)), teachers(profiles(full_name))").order("start_time"),
    s.from("batches").select("id,name,courses(name)").eq("status", "active").order("name"),
    s.from("teachers").select("id,profiles(full_name)"),
  ]);
  const ba = (batches ?? []).map((b: any) => ({ value: b.id, label: `${b.name} (${b.courses?.name})` }));
  const te = (teachers ?? []).map((x: any) => ({ value: x.id, label: x.profiles?.full_name }));
  const rows = (data ?? []) as any[];
  const today = new Date().toISOString().slice(0, 10);
  const weekly = rows.filter((r) => !r.is_temporary), changes = rows.filter((r) => r.is_temporary && r.one_off_date >= today).sort((a, b) => a.one_off_date.localeCompare(b.one_off_date));

  const fields = (r?: any) => (<>
    {r && <Hidden name="id" value={r.id} />}
    <SelectField label="Batch" name="batch_id" options={ba} defaultValue={r?.batch_id} /><SelectField label="Teacher (blank = batch teacher)" name="teacher_id" options={te} defaultValue={r?.teacher_id} empty="Batch teacher" />
    <SelectField label="Type" name="kind" options={KIND} defaultValue={r?.is_temporary ? "oneoff" : "weekly"} />
    <SelectField label="Day (weekly)" name="day_of_week" options={DAYS} defaultValue={r?.day_of_week != null ? String(r.day_of_week) : ""} empty="—" /><Field label="Date (one-off)" name="one_off_date" type="date" defaultValue={r?.one_off_date} />
    <Field label="Start" name="start_time" type="time" defaultValue={r ? t(r.start_time) : ""} required /><Field label="End" name="end_time" type="time" defaultValue={r ? t(r.end_time) : ""} required />
    <Field label="Note (shown to students)" name="note" defaultValue={r?.note} />
    <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="cancelled" defaultChecked={r?.cancelled} className="h-4 w-4" />Class cancelled (one-off only)</label>
  </>);
  const row = (r: any) => (
    <li key={r.id} className="py-3 text-sm">
      <p><span className="font-medium">{r.is_temporary ? `${fmtDate(r.one_off_date)}` : DAYS[r.day_of_week].label}, {t(r.start_time)}–{t(r.end_time)}</span>{r.cancelled && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-900">Cancelled</span>}</p>
      <p className="text-brand-700">{r.batches?.name} · {r.batches?.courses?.name} · {r.teachers?.profiles?.full_name ?? "No teacher"}{r.note ? ` · ${r.note}` : ""}</p>
      {manage && <details className="mt-2"><summary className="cursor-pointer text-brand-700 underline">Edit or remove</summary>
        <div className="mt-3 space-y-3"><ActionForm action={updateSchedule} label="Save" tone="quiet" className="grid gap-3 sm:grid-cols-3">{fields(r)}</ActionForm>
          <ActionForm action={deleteSchedule} label="Remove" tone="quiet" className="flex"><Hidden name="id" value={r.id} /></ActionForm></div></details>}
    </li>);
  return (
    <>
      <PageTitle>Timetable</PageTitle>
      {manage && <Card title="Add a class or publish a change">{ba.length === 0 ? <Empty>Add an active batch first.</Empty> : <ActionForm action={createSchedule} label="Add to timetable" className="grid gap-3 sm:grid-cols-3">{fields()}</ActionForm>}</Card>}
      {changes.length > 0 && <Card title="Upcoming one-off changes" className="border-amber-300 bg-amber-50"><ul className="divide-y divide-amber-200">{changes.map(row)}</ul></Card>}
      <Card title={manage ? "Weekly timetable" : "Your timetable"}>{weekly.length === 0 ? <Empty>No classes scheduled yet.</Empty> : <ul className="divide-y divide-brand-200">{DAYS.flatMap((d) => weekly.filter((r) => r.day_of_week === Number(d.value)).map(row))}</ul>}</Card>
    </>
  );
}
