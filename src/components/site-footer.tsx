import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-blue-100 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-sm sm:px-8 md:flex-row md:items-center md:justify-between">
        <p className="font-semibold text-blue-950">Academic Vault · UENR Information Technology</p>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-slate-600">
          <Link href="/#resources" className="font-medium hover:text-blue-800">Browse Resources</Link>
          <Link href="/upload" className="font-medium hover:text-blue-800">Upload Resources</Link>
        </nav>
        <div className="flex flex-col gap-1 text-slate-500 md:items-end">
          <p>© 2026 Academic Vault</p>
          <p>Sponsored by <strong className="font-bold text-blue-900">2026/2027 ITDS EXECUTIVES</strong></p>
        </div>
      </div>
    </footer>
  );
}
