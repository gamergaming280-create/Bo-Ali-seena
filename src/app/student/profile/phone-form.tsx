"use client";
import { useFormState, useFormStatus } from "react-dom";
import { updatePhone } from "./actions";
import type { FormState } from "../../actions";

function Save() { const { pending } = useFormStatus(); return <button disabled={pending} className="rounded-lg bg-brand-900 px-4 py-2 text-sm text-white disabled:opacity-70">{pending ? "Saving" : "Save phone number"}</button>; }

export default function PhoneForm({ phone }: { phone: string | null }) {
  const [s, action] = useFormState<FormState, FormData>(updatePhone, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="text-sm font-medium">Phone<input name="phone" defaultValue={phone ?? ""} className="mt-1 block rounded-lg border border-brand-200 px-3 py-2 font-normal" /></label>
      <Save />
      {s.error && <p role="alert" className="text-sm text-red-800">{s.error}</p>}
      {s.message && <p role="status" className="text-sm text-green-800">{s.message}</p>}
    </form>
  );
}
