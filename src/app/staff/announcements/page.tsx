import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { isoToLocalInput } from "@/lib/tz";
import ActionForm from "@/components/action-form";
import { Field, SelectField, Hidden } from "@/components/fields";
import { Card, Empty, PageTitle } from "@/components/ui";
import { saveNotice, deleteNotice } from "../ops-actions";

const PRIORITY = [{ value: "normal", label: "Normal" }, { value: "important", label: "Important" }, { value: "urgent", label: "Urgent" }];
const AUDIENCE = [{ value: "all_students", label: "All students" }, { value: "courses", label: "Selected courses" }, { value: "batches", label: "Selected batches" }, { value: "staff_only", label: "Staff only" }];
const BADGE: Record<string, string> = { normal: "bg-brand-50 text-brand-700", important: "bg-amber-100 text-amber-900", urgent: "bg-red-100 text-red-900" };

export default async function Announcements() {
  const { perms } = await requireModule("announcements");
  const manage = perms.includes("notices");
  const s = createClient();
  const [{ data: notices }, { data: courses }, { data: batches }, { data: tzRow }] = await Promise.all([
    s.from("notices").select("*").order("publish_at", { ascending: false }),
    s.from("courses").select("id,name").order("name"), s.from("batches").select("id,name,courses(name)").order("name"),
    s.from("academy_settings").select("value").eq("key", "timezone").maybeSingle(),
  ]);
  const tz = typeof tzRow?.value === "string" ? tzRow.value : "Asia/Karachi";
  const now = new Date().toISOString();
  const state = (n: any) => (n.publish_at > now ? "Scheduled" : n.expires_at && n.expires_at <= now ? "Expired" : "Live");
  const fields = (n?: any) => (<>
    {n && <Hidden name="id" value={n.id} />}{!n && <Hidden name="id" value="" />}
    <div className="grid gap-3 sm:grid-cols-3"><Field label="Title" name="title" defaultValue={n?.title} required /><SelectField label="Priority" name="priority" options={PRIORITY} defaultValue={n?.priority ?? "normal"} /><SelectField label="Audience" name="audience" options={AUDIENCE} defaultValue={n?.audience ?? "all_students"} /></div>
    <label className="block text-sm font-medium">Message<textarea name="body" defaultValue={n?.body} required rows={4} className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm font-normal" /></label>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Publish at (blank = now)" name="publish_at" type="datetime-local" defaultValue={n ? isoToLocalInput(n.publish_at, tz) : ""} /><Field label="Expires at (optional)" name="expires_at" type="datetime-local" defaultValue={isoToLocalInput(n?.expires_at ?? null, tz)} /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <fieldset className="text-sm"><legend className="mb-1 font-medium">Courses (if “Selected courses”)</legend>{(courses ?? []).map((c) => <label key={c.id} className="mr-4 inline-flex items-center gap-1.5"><input type="checkbox" name={`course:${c.id}`} defaultChecked={n?.course_ids?.includes(c.id)} className="h-4 w-4" />{c.name}</label>)}</fieldset>
      <fieldset className="text-sm"><legend className="mb-1 font-medium">Batches (if “Selected batches”)</legend>{(batches ?? []).map((b: any) => <label key={b.id} className="mr-4 inline-flex items-center gap-1.5"><input type="checkbox" name={`batch:${b.id}`} defaultChecked={n?.batch_ids?.includes(b.id)} className="h-4 w-4" />{b.name}</label>)}</fieldset>
    </div>
  </>);
  return (
    <>
      <PageTitle>Announcements</PageTitle>
      {manage && <Card title="New announcement"><ActionForm action={saveNotice} label="Publish" className="space-y-3">{fields()}</ActionForm></Card>}
      <Card title={manage ? "All announcements" : "Staff notices"}>
        {(notices ?? []).length === 0 ? <Empty>No announcements yet.</Empty> : (
          <ul className="divide-y divide-brand-200">{notices!.map((n) => (
            <li key={n.id} className="py-4 text-sm">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{n.title}</span><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${BADGE[n.priority]}`}>{n.priority}</span><span className="text-xs text-brand-700">{AUDIENCE.find((a) => a.value === n.audience)?.label} · {state(n)}</span></div>
              <p className="mt-1 whitespace-pre-line">{n.body}</p>
              {manage && <details className="mt-2"><summary className="cursor-pointer text-brand-700 underline">Edit or delete</summary>
                <div className="mt-3 space-y-3"><ActionForm action={saveNotice} label="Save" tone="quiet" className="space-y-3">{fields(n)}</ActionForm><ActionForm action={deleteNotice} label="Delete" tone="quiet" className="flex"><Hidden name="id" value={n.id} /></ActionForm></div></details>}
            </li>))}</ul>)}
      </Card>
    </>
  );
}
