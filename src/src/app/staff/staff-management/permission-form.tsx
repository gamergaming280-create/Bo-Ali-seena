"use client";
import { useFormState, useFormStatus } from "react-dom";
import { savePermissions } from "./actions";
import type { FormState } from "../../actions";

function Save() { const { pending } = useFormStatus(); return <button disabled={pending} className="rounded-lg bg-brand-900 px-4 py-2 text-sm text-white disabled:opacity-70">{pending ? "Saving" : "Save permissions"}</button>; }

export default function PermissionForm(props: { roles: { key: string; label: string }[]; permissions: Record<string, string>; granted: Record<string, string[]>; locked: Record<string, string[]>; editable: boolean }) {
  const [s, action] = useFormState<FormState, FormData>(savePermissions, {});
  return (
    <form action={action}>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="border-b border-brand-200 text-left"><th className="py-2">Permission</th>{props.roles.map((r) => <th key={r.key} className="px-3">{r.label}</th>)}</tr></thead>
        <tbody>{Object.entries(props.permissions).map(([p, label]) => (
          <tr key={p} className="border-b border-brand-50"><td className="py-2">{label}</td>
            {props.roles.map((r) => {
              const lock = props.locked[r.key]?.includes(p);
              return <td key={r.key} className="px-3"><input type="checkbox" name={`${r.key}:${p}`} defaultChecked={props.granted[r.key]?.includes(p) || lock} disabled={!props.editable || lock} aria-label={`${r.label}: ${label}`} className="h-4 w-4" /></td>;
            })}
          </tr>))}</tbody>
      </table></div>
      <p className="mt-3 text-xs text-brand-700">The Director always keeps staff and settings access so the system can't be locked out.</p>
      {props.editable && <div className="mt-4 flex items-center gap-3"><Save />{s.error && <p role="alert" className="text-sm text-red-800">{s.error}</p>}{s.message && <p role="status" className="text-sm text-green-800">{s.message}</p>}</div>}
    </form>
  );
}
