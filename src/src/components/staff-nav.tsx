"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserCog, BookOpen, Layers, Boxes, ClipboardList, FileText, FileSpreadsheet, CalendarCheck, Clock, Megaphone, BarChart3, ShieldCheck, Settings } from "lucide-react";

const ICONS: Record<string, any> = { dashboard: LayoutDashboard, students: Users, teachers: UserCog, courses: BookOpen, levels: Layers, batches: Boxes, enrolments: ClipboardList, exams: FileText, results: FileSpreadsheet, attendance: CalendarCheck, timetable: Clock, notices: Megaphone, reports: BarChart3, staff: ShieldCheck, settings: Settings };

export default function StaffNav({ items }: { items: { href: string; label: string; icon: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Staff portal" className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon }) => {
        const Icon = ICONS[icon]; const active = href === "/staff" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? "bg-white/15 text-white" : "text-brand-200 hover:bg-white/10"}`}>
            <Icon className="h-4 w-4" aria-hidden />{label}
          </Link>
        );
      })}
    </nav>
  );
}
