"use client";
import { useFormState, useFormStatus } from "react-dom";

export type FormState = { error?: string; message?: string };

function Submit({ label, tone }: { label: string; tone: "primary" | "quiet" }) {
  const { pending } = useFormStatus();
  const cls = tone === "primary" ? "bg-brand-900 text-white hover:bg-brand-700" : "border border-brand-200 bg-white hover:border-brand-500";
  return <button disabled={pending} className={`rounded-lg px-4 py-2 text-sm disabled:opacity-70 ${cls}`}>{pending ? "Saving" : label}</button>;
}

export default function ActionForm({ action, label, children, className = "space-y-3", tone = "primary", hideSubmit = false }: {
  action: (s: FormState, f: FormData) => Promise<FormState>; label: string; children?: React.ReactNode; className?: string; tone?: "primary" | "quiet"; hideSubmit?: boolean;
}) {
  const [s, run] = useFormState(action, {} as FormState);
  return (
    <form action={run} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3">{!hideSubmit && <Submit label={label} tone={tone} />}
        {s.error && <p role="alert" className="text-sm text-red-800">{s.error}</p>}
        {s.message && <p role="status" className="text-sm text-green-800">{s.message}</p>}
      </div>
    </form>
  );
}
