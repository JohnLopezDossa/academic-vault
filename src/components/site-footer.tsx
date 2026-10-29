import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-blue-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 text-sm sm:px-6 md:grid-cols-2 md:items-center md:py-7 lg:flex lg:justify-between lg:px-8">
        <p className="min-w-0 break-words font-semibold text-blue-950">Academic Vault · UENR Information Technology</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-slate-600 md:justify-end lg:justify-center">
          <Link href="/#resources" className="inline-flex min-h-10 items-center rounded-lg font-medium hover:text-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Browse Resources</Link>
          <Link href="/upload" className="inline-flex min-h-10 items-center rounded-lg font-medium hover:text-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Upload Resources</Link>
        </nav>
        <div className="min-w-0 flex flex-col gap-1 text-xs leading-5 text-slate-500 sm:text-sm md:col-span-2 md:flex-row md:items-center md:justify-between lg:col-span-1 lg:flex-col lg:items-end">
          <p>© 2026 Academic Vault</p>
          <p className="break-words">Sponsored by <strong className="font-bold text-blue-900">2026/2027 ITDS EXECUTIVES</strong></p>
        </div>
      </div>
    </footer>
  );
}
