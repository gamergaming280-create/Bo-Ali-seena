import { getBrand } from "@/lib/brand";
import Logo from "@/components/logo";
import ThemeToggle from "@/components/theme-toggle";
import { getStaff, MODULES, can, ROLES } from "@/lib/permissions";
import { initials } from "@/lib/student-data";
import { logout } from "../actions";
import StaffNav from "@/components/staff-nav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { profile, perms } = await getStaff();
  const items = MODULES.filter((m) => can(perms, m)).map((m) => ({ href: `/staff${m.slug ? `/${m.slug}` : ""}`, label: m.label, icon: m.icon }));
  const roleLabel = ROLES.find((r) => r.key === profile.role)?.label ?? profile.role;
  const brand = await getBrand();
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-brand-950 p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
        <div className="mb-1 flex items-center gap-3 text-white"><Logo src={brand.logo} name={brand.name} size={36} /><p className="font-display text-lg">{brand.portal}</p></div>
        <p className="mb-4 text-xs text-brand-200 md:mb-6">Staff</p>
        <StaffNav items={items} />
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-brand-200 bg-white px-6 py-3"><ThemeToggle />
          <div className="text-right text-sm leading-tight"><p>{profile.full_name}</p><p className="text-xs text-brand-700">{roleLabel}</p></div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm text-white" aria-hidden>{initials(profile.full_name)}</span>
          <form action={logout}><button className="text-sm text-brand-700 underline">Sign out</button></form>
        </header>
        <main id="main" className="mx-auto max-w-6xl space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}
