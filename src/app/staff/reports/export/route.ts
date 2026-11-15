import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actor } from "@/lib/guards";
import { REPORTS, buildReport, parseFilters } from "@/lib/report-build";
import { toCsv, toPdf } from "@/lib/report-output";

// Requires the 'reports' permission; every query still runs as the signed-in user, so RLS applies.
export async function GET(req: NextRequest) {
  const a = await actor("reports");
  if (!a) return new NextResponse("Forbidden", { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const kind = REPORTS.find((r) => r.key === sp.r)?.key;
  if (!kind || (sp.format !== "csv" && sp.format !== "pdf")) return new NextResponse("Bad request", { status: 400 });
  try {
    const filters = parseFilters(sp);
    const rep = await buildReport(createClient(), kind, filters);
    const file = `${kind}-report`;
    if (sp.format === "csv") return new NextResponse(toCsv(rep), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}.csv"` } });
    const { data } = await createClient().from("academy_settings").select("value").eq("key", "institution_name").maybeSingle();
    const desc = Object.entries(filters).map(([k, v]) => `${k} ${v}`).join(", ");
    const bytes = await toPdf(rep, { institution: typeof data?.value === "string" ? data.value : "", filters: desc });
    return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file}.pdf"` } });
  } catch {
    return new NextResponse("The report could not be generated.", { status: 500 });
  }
}
