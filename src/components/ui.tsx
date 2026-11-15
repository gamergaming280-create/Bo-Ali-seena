export const Card = ({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-brand-200 bg-white p-5 ${className}`}>
    {title && <h2 className="mb-3 font-display text-xl">{title}</h2>}{children}
  </section>
);
export const Stat = ({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) => (
  <div className="rounded-2xl border border-brand-200 bg-white p-5">
    <p className="text-sm text-brand-700">{label}</p>
    <p className="mt-1 font-display text-3xl">{value}</p>
    {note && <p className="mt-1 text-xs text-brand-700">{note}</p>}
  </div>
);
export const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-xl border border-dashed border-brand-200 px-4 py-8 text-center text-sm text-brand-700">{children}</p>
);
export const PageTitle = ({ children }: { children: React.ReactNode }) => <h1 className="font-display text-3xl">{children}</h1>;
