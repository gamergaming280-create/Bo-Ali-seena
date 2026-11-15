"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff, GraduationCap, BriefcaseBusiness, ArrowLeft, Loader2 } from "lucide-react";
import { login, type FormState } from "./actions";

const PORTALS = {
  student: { title: "Student Portal", text: "Access your academic journey, results and progress.", Icon: GraduationCap, label: "Student ID or registered email", type: "text", auto: "username" },
  staff: { title: "Staff Portal", text: "Manage academic operations, students and performance.", Icon: BriefcaseBusiness, label: "Registered staff email", type: "email", auto: "email" },
} as const;

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-900 px-4 py-3 font-medium text-white transition hover:bg-brand-700 disabled:opacity-70">
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {pending ? "Signing in" : "Sign in"}
    </button>
  );
}

export default function LoginForm({ notice }: { notice?: string }) {
  const [portal, setPortal] = useState<keyof typeof PORTALS | null>(null);
  const [show, setShow] = useState(false);
  const [state, action] = useFormState<FormState, FormData>(login, notice ? { error: notice } : {});

  if (!portal) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(PORTALS) as (keyof typeof PORTALS)[]).map((k) => {
          const { title, text, Icon } = PORTALS[k];
          return (
            <button key={k} onClick={() => setPortal(k)} className="group rounded-2xl border border-brand-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md">
              <Icon className="mb-4 h-8 w-8 text-brand-700" aria-hidden />
              <h2 className="font-display text-2xl">{title}</h2>
              <p className="mt-1 text-sm text-brand-700">{text}</p>
            </button>
          );
        })}
      </div>
    );
  }
  const p = PORTALS[portal];
  return (
    <form action={action} className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
      <button type="button" onClick={() => { setPortal(null); setShow(false); }} className="flex items-center gap-1 text-sm text-brand-700 hover:text-brand-950">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Change portal
      </button>
      <h2 className="font-display text-2xl">{p.title}</h2>
      <input type="hidden" name="portal" value={portal} />
      <label className="block text-sm font-medium">{p.label}
        <input name="identifier" type={p.type} autoComplete={p.auto} required className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2.5 font-normal" />
      </label>
      <label className="block text-sm font-medium">Password
        <span className="relative mt-1 block">
          <input name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="w-full rounded-lg border border-brand-200 px-3 py-2.5 pr-11 font-normal" />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 px-3 text-brand-700">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </span>
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>}
      <Submit />
      <Link href="/forgot-password" className="block text-center text-sm text-brand-700 hover:underline">Forgot password?</Link>
    </form>
  );
}
