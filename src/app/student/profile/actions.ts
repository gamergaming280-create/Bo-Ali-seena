"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import type { FormState } from "../../actions";

// Students may change only their own phone number. Identity comes from the session, never from the form.
export async function updatePhone(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.string().trim().regex(/^[+0-9 ()-]{7,20}$/, "Enter a valid phone number").safeParse(form.get("phone"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return { error: "Your session has expired. Sign in again." };
  const { error } = await adminClient().from("profiles").update({ phone: parsed.data }).eq("id", user.id).eq("role", "student");
  if (error) return { error: "Couldn't save your phone number. Try again." };
  revalidatePath("/student/profile");
  return { message: "Phone number saved." };
}
