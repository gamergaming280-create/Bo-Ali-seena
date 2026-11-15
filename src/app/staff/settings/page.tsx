import { requireModule } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { getGradeBoundaries } from "@/lib/student-data";
import ActionForm from "@/components/action-form";
import { Field, Hidden } from "@/components/fields";
import { Card, PageTitle } from "@/components/ui";
import { saveGrading, saveCategory, saveInstitution, uploadLogo } from "../settings-actions";
import Logo from "@/components/logo";

export default async function Settings() {
  await requireModule("settings");
  const s = createClient();
  const [bounds, { data: pass }, { data: cats }] = await Promise.all([
    getGradeBoundaries(), s.from("academy_settings").select("value").eq("key", "pass_percentage").maybeSingle(),
    s.from("assessment_categories").select("*").order("sort_order").order("name"),
  ]);
  const { data: all } = await s.from("academy_settings").select("key,value");
  const v = (k: string) => (all ?? []).find((r) => r.key === k)?.value as any;
  const text = (k: string) => (typeof v(k) === "string" ? (v(k) as string) : "");
  const contact = (v("contact") ?? {}) as { phone?: string; email?: string; address?: string };
  const pct = typeof pass?.value === "number" ? pass.value : null;
  return (
    <>
      <PageTitle>Settings</PageTitle>
      <Card title="Institution">
        <ActionForm action={saveInstitution} label="Save institution details" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Institution name" name="institution_name" defaultValue={text("institution_name")} required /><Field label="Academic year" name="academic_year" defaultValue={text("academic_year")} placeholder="e.g. 2026–27" />
            <Field label="Tagline" name="tagline" defaultValue={text("tagline")} /><Field label="Motto" name="motto" defaultValue={text("motto")} />
            <Field label="Contact phone" name="phone" defaultValue={contact.phone} /><Field label="Contact email" name="email" type="email" defaultValue={contact.email} />
            <Field label="Address" name="address" defaultValue={contact.address} /><Field label="Time zone" name="timezone" defaultValue={text("timezone") || "Asia/Karachi"} required />
          </div>
          <p className="text-xs text-brand-700">The time zone controls attendance dates and announcement times. Contact details and academic year are blank until you enter them.</p>
        </ActionForm>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-brand-200 pt-4">
          <Logo src={typeof v("logo_url") === "string" ? v("logo_url") : null} name={text("institution_name")} size={64} className="text-brand-700" />
          <ActionForm action={uploadLogo} label="Upload logo" className="space-y-2"><label className="block text-sm font-medium">Logo (PNG, JPG or WebP, up to 1 MB)<input type="file" name="file" accept="image/png,image/jpeg,image/webp" className="mt-1 block text-sm font-normal" /></label></ActionForm>
        </div>
      </Card>
      <Card title="Grading">
        <ActionForm action={saveGrading} label="Save grading" className="space-y-4">
          <div className="max-w-xs"><Field label="Passing percentage (optional)" name="pass_pct" type="number" defaultValue={pct} /></div>
          <fieldset><legend className="mb-2 text-sm font-medium">Grade boundaries: minimum percentage for each grade</legend>
            <div className="grid gap-2 sm:grid-cols-2">{Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="flex gap-2"><input name={`min_${i}`} type="number" min="0" max="100" step="0.1" defaultValue={bounds[i]?.min ?? ""} placeholder="Min %" aria-label={`Grade ${i + 1} minimum percentage`} className="w-28 rounded-lg border border-brand-200 px-3 py-2 text-sm" /><input name={`grade_${i}`} maxLength={8} defaultValue={bounds[i]?.grade ?? ""} placeholder="Grade" aria-label={`Grade ${i + 1} label`} className="w-28 rounded-lg border border-brand-200 px-3 py-2 text-sm" /></div>))}</div>
          </fieldset>
          <p className="text-xs text-brand-700">Leave rows blank if unused. A student gets the highest grade whose minimum they reach. Nothing is assumed: with no boundaries set, grades are not shown.</p>
        </ActionForm>
      </Card>
      <Card title="Assessment categories">
        <ul className="divide-y divide-brand-200">{(cats ?? []).map((c) => (
          <li key={c.id} className="py-3"><ActionForm action={saveCategory} label="Save" tone="quiet" className="flex flex-wrap items-end gap-3">
            <Hidden name="id" value={c.id} /><Field label="Name" name="name" defaultValue={c.name} required /><Field label="Order" name="sort_order" type="number" defaultValue={c.sort_order} />
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={c.is_active} className="h-4 w-4" />Active</label>
          </ActionForm></li>))}</ul>
        <div className="mt-4 border-t border-brand-200 pt-4"><ActionForm action={saveCategory} label="Add category" className="flex flex-wrap items-end gap-3"><Hidden name="id" value="" /><Field label="New category" name="name" required /><Field label="Order" name="sort_order" type="number" defaultValue={0} /></ActionForm></div>
        <p className="mt-2 text-xs text-brand-700">Deactivating a category hides it from new examinations; existing results keep it.</p>
      </Card>
      <Card><p className="text-sm text-brand-700">Courses, levels and batches are managed from their own pages; staff roles and permissions are in Staff Management.</p></Card>
    </>
  );
}
