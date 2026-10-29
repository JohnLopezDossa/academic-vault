import Link from "next/link";
import type { ReactNode } from "react";

export function AuthFrame({ eyebrow, title, description, children, compact = false }: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <main className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f7fd] px-4 text-slate-900 sm:px-6 ${compact ? "py-6 sm:py-7" : "py-10"}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_32px_90px_-44px_rgba(15,43,101,.45)] md:grid-cols-[.82fr_1.18fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#071b52] via-[#0b3a91] to-[#176be0] p-9 text-white md:flex lg:p-11">
          <div className="absolute -bottom-16 -right-14 h-64 w-64 rounded-full border-[36px] border-white/10" />
          <Link href="/" className="relative flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white p-1"><img src="/images/its-logo.png" alt="ITS logo" className="h-full w-full object-contain" /></span>
            <span><span className="block text-lg font-extrabold leading-tight">Academic Vault</span><span className="block text-xs text-blue-100">UENR · Information Technology</span></span>
          </Link>
          <div className="relative py-12">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-sky-200">Your learning library</p>
            <p className="mt-4 max-w-sm text-4xl font-extrabold leading-tight tracking-[-.035em]">A clearer path through your IT studies.</p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">Sign in to reach your Academic Vault account and member workspace.</p>
          </div>
          <p className="relative text-xs text-blue-100/75">Department of Information Technology · UENR</p>
        </aside>
        <div className={compact ? "p-5 sm:p-7 lg:p-9" : "p-6 sm:p-9 lg:p-12"}>
          <Link href="/" className="text-sm font-bold text-blue-800 hover:text-blue-950 md:hidden">← Academic Vault</Link>
          <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[.22em] text-blue-600 md:mt-2">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0b1f4b] sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
          <div className={compact ? "mt-5" : "mt-7"}>{children}</div>
        </div>
      </section>
    </main>
  );
}
