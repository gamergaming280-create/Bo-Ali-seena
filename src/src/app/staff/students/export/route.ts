import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { actor } from "@/lib/guards";
import { studentQuery } from "@/lib/student-query";

// CSV export: requires the 'students' permission; rows are still limited by RLS.
const cell = (v: unknown) => {
  let t = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`; // neutralise spreadsheet formula injection
  return `"${t.replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest) {
  if (!(await actor("students"))) return new NextResponse("Forbidden", { status: 403 });
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const { data } = await studentQuery(createClient(), sp, false).limit(5000);
  const cols = ["student_code", "full_name", "email", "phone", "course_name", "level_name", "batch_name", "enrolled_on", "is_active"];
  const csv = [cols.join(","), ...(data ?? []).map((r: any) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="students.csv"' } });
}
