import { requireRole } from "@/lib/auth";
import { getBrand } from "@/lib/brand";
import Logo from "@/components/logo";
import ThemeToggle from "@/components/theme-toggle";
import { initials } from "@/lib/student-data";
import { logout } from "../actions";
import StudentNav from "@/components/student-nav";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("student");
  const brand = await getBrand();
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-brand-950 p-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <div className="mb-4 flex items-center gap-3 text-white md:mb-8"><Logo src={brand.logo} name={brand.name} size={36} /><p className="font-display text-lg">{brand.portal}</p></div>
        <StudentNav />
        <form action={logout} className="mt-4 hidden md:block"><button className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-brand-200 hover:bg-white/10">Sign out</button></form>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-brand-200 bg-white px-6 py-3"><ThemeToggle />
          <span className="text-sm">{profile.full_name}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-900 text-sm text-white" aria-hidden>{initials(profile.full_name)}</span>
          <form action={logout} className="md:hidden"><button className="text-sm text-brand-700 underline">Sign out</button></form>
        </header>
        <main id="main" className="mx-auto max-w-5xl space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}
