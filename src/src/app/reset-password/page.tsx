"use client";
import { useFormState } from "react-dom";
import { updatePassword, type FormState } from "../actions";

export default function ResetPassword() {
  const [state, action] = useFormState<FormState, FormData>(updatePassword, {});
  const input = "mt-1 w-full rounded-lg border border-brand-200 px-3 py-2.5 font-normal";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <form action={action} className="space-y-4 rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl">Choose a new password</h1>
        <label className="block text-sm font-medium">New password<input name="password" type="password" autoComplete="new-password" required className={input} /></label>
        <label className="block text-sm font-medium">Confirm password<input name="confirm" type="password" autoComplete="new-password" required className={input} /></label>
        {state.error && <p role="alert" className="text-sm text-red-800">{state.error}</p>}
        <button className="w-full rounded-lg bg-brand-900 px-4 py-3 font-medium text-white hover:bg-brand-700">Save new password</button>
      </form>
    </main>
  );
}
