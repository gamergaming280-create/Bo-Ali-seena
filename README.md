# Bo Ali Seena Academic Portal

Student & staff academic management for **Bo Ali Seena English Language and Computer Center**, Peshawar.
*New approach towards linguistic enlightenment.* · *Plants are shaped by cultivation and men by education.*

Next.js 14 (App Router) · TypeScript · Tailwind · Recharts · Supabase (PostgreSQL, Auth, Storage, Row Level Security) · Zod

## What it does
- **One login page, two portals.** Role is read from the database after sign-in; choosing the wrong portal never grants access. No public registration; accounts are created by the academy.
- **Student portal:** dashboard, published results with breakdowns, English-skill performance and analytics, courses, attendance, timetable (with cancellations), announcements, profile.
- **Staff portal** with role-based menus (Director, Academic Manager, Teacher; more roles can be added): students, teachers, courses, levels, batches, enrolments, examinations, marks entry, review/approval/publishing, attendance, timetable, announcements, seven reports with CSV/PDF export, staff accounts and a permission matrix, settings (institution details, logo, grading, assessment categories).
- **Security:** Row Level Security on all tables, server-side checks, audit trail for marks, attendance and exam status, private photo storage, light/dark theme, mobile-friendly.

## Start here
| Guide | For |
|---|---|
| `docs/SETUP.md` | Supabase setup, environment variables, first Director, running locally |
| `docs/DEPLOYMENT.md` | Going live on Vercel, launch checklist, updates |
| `docs/USER_GUIDE.md` | How each role uses it, and the pre-launch walkthrough |
| `docs/SECURITY_TESTING.md` | The 63 automated database checks and the manual checks |
| `docs/DATABASE.md` | Tables, migrations, security model |
| `docs/EXTENDING.md` | How to add roles, permissions, modules, features, and fix things |

## Quick start
```
npm install
cp .env.example .env.local      # fill in your Supabase values
npm run dev
```
Run `supabase/migrations/0001…0008` in the Supabase SQL Editor first, then `supabase/seed/first_director.sql` (see `docs/SETUP.md`).

## What was verified, and what was not
**Verified while building** (in a sandbox, without a live Supabase project):
- All 8 migrations apply cleanly on PostgreSQL, and **63 automated checks pass**: role enforcement, student privacy, the exam workflow (create → marks → submit → approve → publish → student views), audit trail, attendance, timetable, announcements, deactivated accounts, anonymous access.
- TypeScript type-check passes and a production build compiles all 32 routes (Google Fonts were stubbed in the sandbox because it had no internet access to them; they load normally on a real host).
- Run as a server, the login page shows the confirmed branding and every protected page, including the CSV/PDF export endpoints, redirects signed-out visitors.
- Report calculations were checked by hand on sample data; PDF and CSV generation were smoke-tested.

**Not verified (needs a person on the live site: see the checklist in `docs/USER_GUIDE.md`):** real Supabase sign-in for each role through the browser, password-reset email delivery, file uploads to Storage, how screens look on real phones and in dark theme, behaviour with large real data.

## Known limits
- Published results are locked; correcting one is a manual procedure (see `docs/EXTENDING.md`).
- Temporary passwords are not forced to change at first login.
- PDF reports can't print Urdu/Arabic-script names (CSV can).
- Exam categories can't be edited after an exam is created; create a new exam instead.
