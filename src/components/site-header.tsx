"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthNavigation } from "@/components/auth/auth-navigation";

const navLinkClass = "inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 md:rounded-full";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function closeMenu() { setMenuOpen(false); }

  return (
    <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/95 shadow-[0_8px_30px_-24px_rgba(15,23,42,.5)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:flex md:items-center md:gap-4 md:px-8">
        <div className="flex min-h-[68px] items-center justify-between gap-3 md:min-h-[76px] lg:min-h-[76px]">
          <Link href="/" onClick={closeMenu} className="flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" aria-label="Academic Vault home">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-white shadow-sm sm:h-11 sm:w-11">
              <img src="/images/its-logo.png" alt="Information Technology Society logo" className="h-full w-full object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[16px] font-extrabold leading-tight tracking-tight text-blue-950 sm:text-lg">Academic Vault</span>
              <span className="block truncate text-[10px] leading-4 text-slate-500 sm:text-xs">Information Technology · UENR</span>
            </span>
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-950 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="site-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            <span aria-hidden="true" className="flex w-5 flex-col gap-[5px]">
              <span className={`h-0.5 w-full rounded bg-current transition-transform duration-200 ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-full rounded bg-current transition-opacity duration-200 ${menuOpen ? "opacity-0" : "opacity-100"}`} />
              <span className={`h-0.5 w-full rounded bg-current transition-transform duration-200 ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>

        <div id="site-navigation" className={`${menuOpen ? "grid" : "hidden"} gap-2 border-t border-blue-100 py-3 md:flex md:flex-1 md:items-center md:justify-end md:gap-2 md:border-0 md:py-0 lg:gap-3`}>
          <nav aria-label="Main navigation" className="grid gap-1 md:flex md:items-center md:gap-1">
            <a href="#resources" onClick={closeMenu} className={navLinkClass}>Browse Resources</a>
            <Link href="/upload" onClick={closeMenu} className={navLinkClass}>Upload Resources</Link>
          </nav>
          <div className="flex items-center justify-start border-t border-blue-100 pt-2 md:border-0 md:pt-0">
            <AuthNavigation onNavigate={closeMenu} />
          </div>
        </div>
      </div>
    </header>
  );
}
