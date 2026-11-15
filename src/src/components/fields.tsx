const box = "mt-1 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-normal";
export const Field = ({ label, name, type = "text", defaultValue, required, placeholder }: { label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean; placeholder?: string }) => (
  <label className="block text-sm font-medium">{label}<input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} placeholder={placeholder} className={box} /></label>
);
export const SelectField = ({ label, name, options, defaultValue, empty }: { label: string; name: string; options: { value: string; label: string }[]; defaultValue?: string | null; empty?: string }) => (
  <label className="block text-sm font-medium">{label}
    <select name={name} defaultValue={defaultValue ?? ""} className={box}>{empty !== undefined && <option value="">{empty}</option>}{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
  </label>
);
export const Hidden = ({ name, value }: { name: string; value: string }) => <input type="hidden" name={name} value={value} />;
