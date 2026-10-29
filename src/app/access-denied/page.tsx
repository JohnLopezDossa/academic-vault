import Link from "next/link";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = reason === "profile"
    ? "We couldn't find a profile for this account. Contact the Academic Vault administrator for help."
    : "Your account does not have a role that can open this page.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7fd] px-5 py-12 text-slate-900">
      <section className="w-full max-w-lg rounded-[2rem] border border-blue-100 bg-white p-7 shadow-xl shadow-blue-950/5 sm:p-10">
        <Link href="/" className="text-sm font-bold text-blue-700 hover:text-blue-950">Academic Vault</Link>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[.2em] text-blue-600">Access restricted</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-blue-950">This area is for authorized members</h1>
        <p className="mt-3 leading-7 text-slate-600">{message}</p>
        <Link href="/" className="mt-7 inline-flex rounded-full bg-blue-800 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900">Return to the library</Link>
      </section>
    </main>
  );
}
