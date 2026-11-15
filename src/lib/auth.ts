import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "student" | "teacher" | "academic_manager" | "director";

/** Reads the role from the database (never from the client) and enforces the portal. */
export async function requireRole(portal: "student" | "staff") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("full_name, role, is_active").eq("id", user.id).single();
  if (!profile || !profile.is_active) { await supabase.auth.signOut(); redirect("/?error=inactive"); }
  const isStaff = profile.role !== "student";
  if ((portal === "staff") !== isStaff) redirect(isStaff ? "/staff" : "/student");
  return { user, profile: profile as { full_name: string; role: Role; is_active: boolean } };
}
