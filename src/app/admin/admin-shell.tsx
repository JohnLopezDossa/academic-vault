"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

const adminLinks = [
  { href: "/admin", label: "Overview", mark: "01" },
  { href: "/admin/submissions", label: "Submission review", mark: "02" },
  { href: "/admin/resources", label: "Resources", mark: "03" },
  { href: "/admin/members", label: "Committee members", mark: "04" },
  { href: "/committee", label: "Committee workspace", mark: "05" },
];

export function AdminShell({ children, pageTitle }: { children: ReactNode; pageTitle: string }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#f4f7fd] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-7">
          <Link href="/admin" className="flex items-center gap-3" aria-label="Academic Vault admin overview">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-white"><img src="/images/its-logo.png" alt="ITS logo" className="h-full w-full object-contain" /></span>
            <span><span className="block text-lg font-extrabold leading-tight tracking-tight text-blue-950">Academic Vault</span><span className="block text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Administration</span></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 sm:inline-flex">LIVE DATABASE</span>
            <Link href="/" className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 sm:px-4 sm:text-sm">Public homepage</Link>
            <LogoutButton className="rounded-full bg-blue-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-900 sm:px-4 sm:text-sm" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-5 px-4 py-5 sm:px-7 sm:py-7 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl bg-[#091d50] p-4 text-white shadow-xl shadow-blue-950/10 lg:sticky lg:top-24">
          <div className="px-3 pb-3 pt-2"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-200/70">Workspace</p><p className="mt-1 text-sm font-semibold">Role-verified workspace</p></div>
          <nav aria-label="Admin navigation" className="hidden space-y-1 lg:block">
            {adminLinks.map((link) => {
              const active = link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href);
              return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-950/25" : "text-blue-100/75 hover:bg-white/10 hover:text-white"}`}><span className="font-mono text-[10px] opacity-60">{link.mark}</span>{link.label}</Link>;
            })}
          </nav>
          <details className="group lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl bg-white/10 px-3 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300">{pageTitle}<span aria-hidden="true" className="transition group-open:rotate-180">⌄</span></summary>
            <nav aria-label="Admin navigation" className="mt-2 grid gap-1">
              {adminLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2.5 text-sm text-blue-100 hover:bg-white/10">{link.label}</Link>)}
            </nav>
          </details>
          <div className="mt-5 hidden rounded-2xl border border-white/10 bg-white/[.06] p-3 text-xs leading-5 text-blue-100/70 lg:block">Changes are sent through your Supabase session and enforced by database permissions.</div>
        </aside>

        <main className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-blue-600">{eyebrow}</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#0b1f4b] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></div>{action}</div>;
}

export function StatusPill({ status }: { status: string }) {
  const style = status === "Approved" || status === "Published" || status === "Active"
    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
    : status === "Rejected" || status === "Inactive"
      ? "bg-rose-50 text-rose-800 ring-rose-200"
      : status === "Pending"
        ? "bg-amber-50 text-amber-900 ring-amber-200"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${style}`}>{status}</span>;
}

export function StatCard({ label, value, note, index }: { label: string; value: number; note: string; index: string }) {
  return <article className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_15px_40px_-32px_rgba(30,64,175,.55)]"><span className="absolute right-4 top-3 font-mono text-xs font-bold text-blue-200">{index}</span><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-3 text-4xl font-extrabold tracking-tight text-blue-950">{value}</p><p className="mt-2 text-xs text-slate-500">{note}</p><span className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-blue-800 via-blue-500 to-sky-200" /></article>;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
