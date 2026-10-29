
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

const adminLinks = [
  { href: "/admin", label: "Overview", mark: "01" },
  { href: "/admin/submissions", label: "Submission review", mark: "02" },
  { href: "/admin/resources", label: "Resources", mark: "03" },
  { href: "/admin/members", label: "Committee members", mark: "04" },
  { href: "/committee", label: "Committee workspace", mark: "05" },
];

export function AdminShell({
  children,
  pageTitle,
}: {
  children: ReactNode;
  pageTitle: string;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  function isActive(href: string) {
    return href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderNavLinks(mobile = false) {
    return adminLinks.map((link) => {
      const active = isActive(link.href);

      return (
        <Link
          key={link.href}
          href={link.href}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            if (mobile) setMobileNavOpen(false);
          }}
          className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
            active
              ? "bg-blue-600 text-white shadow-md shadow-blue-950/20"
              : "text-blue-100/80 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span className="shrink-0 font-mono text-[10px] opacity-60">
            {link.mark}
          </span>
          <span className="min-w-0 break-words">{link.label}</span>
        </Link>
      );
    });
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f4f7fd] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-3 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-4 md:px-7">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <Link
              href="/admin"
              className="flex min-w-0 items-center gap-2.5 sm:gap-3"
              aria-label="Academic Vault admin overview"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-white sm:h-11 sm:w-11">
                <img
                  src="/images/its-logo.png"
                  alt="ITS logo"
                  className="h-full w-full object-contain"
                />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold leading-tight tracking-tight text-blue-950 sm:text-lg">
                  Academic Vault
                </span>
                <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600 sm:text-[10px] sm:tracking-[0.16em]">
                  Administration
                </span>
              </span>
            </Link>

            <span className="hidden shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 sm:inline-flex md:hidden lg:inline-flex">
              LIVE DATABASE
            </span>
          </div>

          <div className="flex min-w-0 items-center gap-2 md:justify-end md:gap-3">
            <Link
              href="/"
              className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 sm:flex-none sm:px-4 sm:text-sm"
            >
              Public homepage
            </Link>

            <LogoutButton className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-blue-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:text-sm" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1480px] min-w-0 grid-cols-1 gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 md:px-7 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-6">
        <aside className="h-fit min-w-0 rounded-2xl bg-[#091d50] p-3 text-white shadow-xl shadow-blue-950/10 sm:rounded-3xl sm:p-4 lg:sticky lg:top-28">
          <div className="flex items-center justify-between gap-3 px-2 pb-3 pt-2 sm:px-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/70">
                Workspace
              </p>
              <p className="mt-1 text-sm font-semibold">
                Role-verified workspace
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 font-mono text-[10px] text-blue-100/70 lg:hidden">
              ADMIN
            </span>
          </div>

          <nav
            aria-label="Admin navigation"
            className="hidden space-y-1 lg:block"
          >
            {renderNavLinks()}
          </nav>

          <div className="lg:hidden">
            <button
              type="button"
              aria-expanded={mobileNavOpen}
              aria-controls="admin-mobile-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <span className="min-w-0 truncate">
                {mobileNavOpen ? "Close navigation" : `Navigation · ${pageTitle}`}
              </span>
              <svg
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 transition-transform ${
                  mobileNavOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="m5 7.5 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {mobileNavOpen && (
              <nav
                id="admin-mobile-navigation"
                aria-label="Admin navigation"
                className="mt-2 grid gap-1 border-t border-white/10 pt-2"
              >
                {renderNavLinks(true)}
              </nav>
            )}
          </div>

          <div className="mt-4 hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-xs leading-5 text-blue-100/70 lg:block">
            Changes are sent through your Supabase session and enforced by
            database permissions.
          </div>
        </aside>

        <main className="min-w-0 w-full">{children}</main>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-600">
          {eyebrow}
        </p>
        <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-[#0b1f4b] sm:text-3xl md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>

      {action && (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center">
          {action}
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const style =
    status === "Approved" || status === "Published" || status === "Active"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : status === "Rejected" || status === "Inactive"
        ? "bg-rose-50 text-rose-800 ring-rose-200"
        : status === "Pending"
          ? "bg-amber-50 text-amber-900 ring-amber-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}

export function StatCard({
  label,
  value,
  note,
  index,
}: {
  label: string;
  value: number;
  note: string;
  index: string;
}) {
  return (
    <article className="relative min-w-0 overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_15px_40px_-32px_rgba(30,64,175,.55)] sm:rounded-3xl sm:p-5">
      <span className="absolute right-4 top-3 font-mono text-xs font-bold text-blue-200">
        {index}
      </span>
      <p className="break-words pr-8 text-sm font-semibold text-slate-500">
        {label}
      </p>
      <p className="mt-3 break-words text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">
        {value}
      </p>
      <p className="mt-2 break-words text-xs leading-5 text-slate-500">
        {note}
      </p>
      <span className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-blue-800 via-blue-500 to-sky-200" />
    </article>
  );
}


export function formatDate(date: string | null | undefined) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsedDate);
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
