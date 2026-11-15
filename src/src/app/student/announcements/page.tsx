import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/student-data";
import { Card, Empty, PageTitle } from "@/components/ui";

const BADGE: Record<string, string> = { normal: "bg-brand-50 text-brand-700", important: "bg-amber-100 text-amber-900", urgent: "bg-red-100 text-red-900" };

export default async function Announcements() {
  await requireRole("student");
  const { data } = await createClient().from("notices").select("id,title,body,priority,publish_at").order("publish_at", { ascending: false });
  const rank = { urgent: 0, important: 1, normal: 2 } as Record<string, number>;
  const list = ((data ?? []) as any[]).sort((a, b) => rank[a.priority] - rank[b.priority]);
  return (
    <>
      <PageTitle>Announcements</PageTitle>
      {list.length === 0 && <Empty>No announcements right now.</Empty>}
      {list.map((n) => (
        <Card key={n.id}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl">{n.title}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs capitalize ${BADGE[n.priority]}`}>{n.priority}</span>
          </div>
          <p className="text-xs text-brand-700">{fmtDate(n.publish_at)}</p>
          <p className="mt-2 whitespace-pre-line text-sm">{n.body}</p>
        </Card>
      ))}
    </>
  );
}
