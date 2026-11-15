import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEnrolments, fmtDate } from "@/lib/student-data";
import { Card, PageTitle } from "@/components/ui";
import PhoneForm from "./phone-form";
import { avatarUrl } from "@/lib/guards";

export default async function Profile() {
  const { user, profile } = await requireRole("student");
  const supabase = createClient();
  const [{ data: p }, { data: s }, enrols] = await Promise.all([
    supabase.from("profiles").select("email,phone,is_active,avatar_url").eq("id", user.id).single(),
    supabase.from("students").select("student_code,enrolled_on").eq("id", user.id).maybeSingle(),
    getEnrolments(user.id),
  ]);
  const photo = await avatarUrl(p?.avatar_url ?? null);
  const cur = enrols.find((e) => e.status === "active");
  const row = (k: string, v: string) => <div key={k}><dt className="text-brand-700">{k}</dt><dd>{v}</dd></div>;
  return (
    <>
      <PageTitle>My profile</PageTitle>
      {photo && <img src={photo} alt="Your profile picture" className="h-24 w-24 rounded-full object-cover" />}
      <Card title="Academic record">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {row("Full name", profile.full_name)}{row("Student ID", s?.student_code ?? "—")}{row("Registered email", p?.email ?? "—")}
          {row("Enrolment date", fmtDate(s?.enrolled_on ?? null))}{row("Course", cur?.courses?.name ?? "Not assigned")}
          {row("Level", cur?.levels?.name ?? "Not assigned")}{row("Batch", cur?.batches?.name ?? "Not assigned")}
          {row("Account status", p?.is_active ? "Active" : "Inactive")}
        </dl>
        <p className="mt-3 text-xs text-brand-700">Name, course, level and batch are managed by the academy office.</p>
      </Card>
      <Card title="Contact details"><PhoneForm phone={p?.phone ?? null} /></Card>
    </>
  );
}
