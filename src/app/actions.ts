"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string; message?: string };

const loginSchema = z.object({
  portal: z.enum(["student", "staff"]),
  identifier: z.string().trim().min(1, "Enter your Student ID or email").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

const GENERIC = "Those details didn't match an active account. Check them and try again.";

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { portal, identifier, password } = parsed.data;

  let email = identifier.toLowerCase();
  if (portal === "student" && !email.includes("@")) {
    // Resolve Student ID -> email server-side only; never reveal whether the ID exists.
    const { data } = await adminClient().from("students").select("profiles(email)").eq("student_code", identifier.toUpperCase()).maybeSingle();
    const found = (data as any)?.profiles?.email as string | undefined;
    if (!found) return { error: GENERIC };
    email = found;
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: GENERIC };

  // Verify the REAL role in the database against the chosen portal.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user!.id).single();
  const isStaff = !!profile && profile.role !== "student";
  if (!profile || !profile.is_active || (portal === "staff") !== isStaff) {
    await supabase.auth.signOut();
    return { error: portal === "staff" ? "This account doesn't have staff access. Use the Student Portal." : GENERIC };
  }
  redirect(isStaff ? "/staff" : "/student");
}

export async function requestReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.string().email().safeParse(form.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const origin = headers().get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL!;
  await createClient().auth.resetPasswordForEmail(parsed.data, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  return { message: "If that email is registered, a reset link is on its way." };
}

export async function logout() {
  await createClient().auth.signOut();
  redirect("/");
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirm: z.string(),
  }).refine((v) => v.password === v.confirm, { message: "The two passwords don't match", path: ["confirm"] })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "This reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Couldn't update the password. Try a different one." };
  await supabase.auth.signOut();
  redirect("/?reset=done");
}
