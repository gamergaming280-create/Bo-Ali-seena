import { getBrand } from "@/lib/brand";
import Logo from "@/components/logo";
import ThemeToggle from "@/components/theme-toggle";
import LoginForm from "./login-form";

export default async function Home({ searchParams }: { searchParams: { error?: string; reset?: string } }) {
  const brand = await getBrand();
  const notice = searchParams.error === "inactive" ? "This account is inactive. Contact the academy office." : searchParams.error === "link" ? "That link has expired. Request a new one." : undefined;
  return (
    <main id="main" className="flex min-h-screen flex-col">
      <section className="bg-brand-950 px-6 pb-16 pt-8 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between"><Logo src={brand.logo} name={brand.name} /><ThemeToggle className="text-white/80 hover:bg-white/10" /></div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">{brand.name}</h1>
          <p className="mt-3 font-display text-lg italic text-brand-200">{brand.tagline}</p>
        </div>
      </section>
      <section className="mx-auto -mt-8 w-full max-w-4xl flex-1 px-6">
        {searchParams.reset === "done" && <p role="status" className="mb-4 rounded-lg bg-white px-4 py-3 text-center text-sm text-green-800">Your password was updated. Sign in with the new one.</p>}
        <p className="mb-5 text-center font-medium tracking-wide text-brand-700">Welcome to the Academic Portal</p>
        <LoginForm notice={notice} />
      </section>
      <footer className="px-6 py-10 text-center font-display text-brand-700">{brand.motto}</footer>
    </main>
  );
}
