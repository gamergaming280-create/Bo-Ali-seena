import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole, type Role } from "@/lib/auth";

export const ROLES: { key: Role; label: string }[] = [
  { key: "director", label: "Director" },
  { key: "academic_manager", label: "Academic Manager" },
  { key: "teacher", label: "Teacher" },
];

export const PERMISSIONS: Record<string, string> = {
  students: "Manage students and enrolments",
  teachers: "Manage teachers and assignments",
  academics: "Manage courses, levels and batches",
  exams: "Create and manage examinations",
  marks_enter: "Enter marks",
  marks_review: "Review and approve marks",
  results_publish: "Publish results",
  attendance: "Record and view attendance",
  timetable: "Manage timetables",
  notices: "Manage announcements",
  reports: "View and export reports",
  staff: "Manage staff accounts and permissions",
  settings: "Change system settings",
  assigned_view: "View assigned students, courses, batches and exams",
  timetable_view: "View own timetable",
  notices_view: "View announcements",
};
export const LOCKED: Record<string, string[]> = { director: ["staff", "settings"] }; // prevents lock-out

export type Module = { slug: string; label: string; icon: string; anyOf: string[] | null; phase: number; about: string };
export const MODULES: Module[] = [
  { slug: "", label: "Dashboard", icon: "dashboard", anyOf: null, phase: 3, about: "" },
  { slug: "students", label: "Students", icon: "students", anyOf: ["students", "assigned_view"], phase: 4, about: "Register students, assign courses, levels and batches, and review each academic record." },
  { slug: "teachers", label: "Teachers", icon: "teachers", anyOf: ["teachers"], phase: 4, about: "Create teacher accounts and assign courses and batches." },
  { slug: "courses", label: "Courses", icon: "courses", anyOf: ["academics", "assigned_view"], phase: 4, about: "Configure the courses the academy offers." },
  { slug: "levels", label: "Levels", icon: "levels", anyOf: ["academics"], phase: 4, about: "Configure levels and their order." },
  { slug: "batches", label: "Batches", icon: "batches", anyOf: ["academics", "assigned_view"], phase: 4, about: "Group students into batches with a course, level and teacher." },
  { slug: "enrolments", label: "Enrolments", icon: "enrolments", anyOf: ["students"], phase: 4, about: "Enrol students into courses and batches." },
  { slug: "examinations", label: "Examinations", icon: "exams", anyOf: ["exams", "assigned_view"], phase: 5, about: "Create examinations and configure assessment categories and marks." },
  { slug: "results", label: "Results & Marks", icon: "results", anyOf: ["marks_enter", "marks_review"], phase: 5, about: "Enter marks, review, approve and publish results." },
  { slug: "attendance", label: "Attendance", icon: "attendance", anyOf: ["attendance"], phase: 6, about: "Record attendance by batch and date." },
  { slug: "timetable", label: "Timetable", icon: "timetable", anyOf: ["timetable", "timetable_view"], phase: 6, about: "Manage class schedules and temporary changes." },
  { slug: "announcements", label: "Announcements", icon: "notices", anyOf: ["notices", "notices_view"], phase: 6, about: "Publish notices to students or staff." },
  { slug: "reports", label: "Academic Reports", icon: "reports", anyOf: ["reports"], phase: 7, about: "Performance and attendance reports with PDF and CSV export." },
  { slug: "staff-management", label: "Staff Management", icon: "staff", anyOf: ["staff"], phase: 3, about: "" },
  { slug: "settings", label: "Settings", icon: "settings", anyOf: ["settings"], phase: 8, about: "Branding, academic year, grading and assessment categories." },
];

export const can = (perms: string[], m: Module) => !m.anyOf || m.anyOf.some((p) => perms.includes(p));

/** Staff session + permissions read from the database for the signed-in role. */
export async function getStaff() {
  const { user, profile } = await requireRole("staff");
  const { data } = await createClient().from("staff_permissions").select("permission").eq("role", profile.role);
  return { user, profile, perms: (data ?? []).map((r) => r.permission as string) };
}

export async function requireModule(slug: string) {
  const ctx = await getStaff();
  const m = MODULES.find((x) => x.slug === slug);
  if (!m) notFound();
  if (!can(ctx.perms, m)) redirect("/staff?denied=1");
  return { ...ctx, module: m };
}
