"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Languages, LineChart, BookOpen, CalendarCheck, Clock, Megaphone, User } from "lucide-react";

const ITEMS = [
  { href: "/student", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/student/results", label: "My results", Icon: FileText },
  { href: "/student/performance", label: "Performance", Icon: LineChart },
  { href: "/student/courses", label: "My courses", Icon: BookOpen },
  { href: "/student/attendance", label: "Attendance", Icon: CalendarCheck },
  { href: "/student/timetable", label: "Timetable", Icon: Clock },
  { href: "/student/announcements", label: "Announcements", Icon: Megaphone },
  { href: "/student/profile", label: "My profile", Icon: User },
];

export default function StudentNav() {
  const path = usePathname();
  return (
    <nav aria-label="Student portal" className="flex gap-1 overflow-x-auto md:flex-col">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = href === "/student" ? path === href : path.startsWith(href);
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
