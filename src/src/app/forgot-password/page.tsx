"use client";
import { useFormState } from "react-dom";
import Link from "next/link";
import { requestReset, type FormState } from "../actions";

export default function ForgotPassword() {
  const [state, action] = useFormState<FormState, FormData>(requestReset, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <form action={action} className="space-y-4 rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl">Reset your password</h1>
        <label className="block text-sm font-medium">Registered email
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2.5 font-normal" />
        </label>
        {state.error && <p role="alert" className="text-sm text-red-800">{state.error}</p>}
        {state.message && <p role="status" className="text-sm text-brand-700">{state.message}</p>}
        <button className="w-full rounded-lg bg-brand-900 px-4 py-3 font-medium text-white hover:bg-brand-700">Send reset link</button>
        <Link href="/" className="block text-center text-sm text-brand-700 hover:underline">Back to sign in</Link>
      </form>
    </main>
  );
}
