import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminShell, PageHeading, StatCard, StatusPill } from "./admin-shell";

const shortcuts = [
  { href: "/admin/submissions", number: "01", title: "Review submissions", detail: "Review individual documents and preserve the database audit trail." },
  { href: "/admin/resources", number: "02", title: "Manage resources", detail: "Search the live catalogue and remove eligible resources safely." },
  { href: "/admin/members", number: "03", title: "Committee members", detail: "Manage roles and explicit sub-admin capabilities for registered profiles." },
];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function AdminOverviewContent() {
  const supabase = await createClient();
  const [profiles, resources, pending, approved, courses, recent] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("resources").select("id, title, file_name, uploader_id, status, created_at, course_id").order("created_at", { ascending: false }).limit(5),
  ]);
  const failed = [profiles, resources, pending, approved, courses, recent].some((result) => result.error);
  let recentRows: { id: string; title: string; file_name: string; uploader_id: string; status: string; created_at: string; course_code: string }[] = [];
  let recentError = recent.error;
  if (!recentError && recent.data?.length) {
    const courseIds = [...new Set(recent.data.map((row) => row.course_id))];
    const { data: courseRows, error } = await supabase.from("courses").select("id, course_code").in("id", courseIds);
    recentError = error;
    const codeById = new Map((courseRows ?? []).map((course) => [course.id, course.course_code]));
    recentRows = recent.data.map((row) => ({ ...row, course_code: codeById.get(row.course_id) ?? "Course unavailable" }));
  }

  return <AdminShell pageTitle="Overview">
    <PageHeading eyebrow="UENR · Information Technology" title="Admin overview" description="Live account, resource, submission, and course totals from Academic Vault." action={<Link href="/admin/submissions" className="inline-flex items-center justify-center rounded-full bg-blue-800 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-900/15 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200">Review queue <span className="ml-2">→</span></Link>} />

    {failed ? <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">Dashboard data could not be loaded. Check the connection, administrator role, and database policies, then refresh.</div> : <section aria-label="Live metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard index="A" label="Users" value={profiles.count ?? 0} note="Registered profiles" />
      <StatCard index="B" label="Resources" value={resources.count ?? 0} note="All submission records" />
      <StatCard index="C" label="Pending submissions" value={pending.count ?? 0} note="Awaiting review" />
      <StatCard index="D" label="Approved resources" value={approved.count ?? 0} note="Publicly available" />
      <StatCard index="E" label="Courses" value={courses.count ?? 0} note="Course catalogue" />
    </section>}

    <section aria-label="Admin tools" className="mt-7 grid gap-3 md:grid-cols-3">
      {shortcuts.map((item) => <Link key={item.href} href={item.href} className="group rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_12px_35px_-30px_rgba(30,64,175,.65)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100"><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-blue-400">{item.number}</span><span className="text-blue-700 transition group-hover:translate-x-1" aria-hidden="true">↗</span></div><h2 className="mt-4 font-bold text-blue-950">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p></Link>)}
    </section>

    <section className="mt-7 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_15px_40px_-32px_rgba(30,64,175,.5)]">
      <div className="flex items-end justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Inbox · live data</p><h2 className="mt-1 text-lg font-bold text-blue-950">Recent resource submissions</h2></div><Link href="/admin/submissions" className="text-sm font-semibold text-blue-700 hover:text-blue-950">View review queue <span aria-hidden="true">→</span></Link></div>
      {recentError ? <p role="alert" className="px-6 py-10 text-center text-sm text-red-800">Recent submissions could not be loaded.</p> : <ul className="divide-y divide-slate-100">
        {recentRows.map((item) => <li key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.title} · {item.file_name}</p><p className="mt-1 truncate text-xs text-slate-500">{item.course_code} · Uploader {item.uploader_id.slice(0, 8)} · {dateLabel(item.created_at)}</p></div><StatusPill status={item.status} /></li>)}
        {!recentRows.length && <li className="px-6 py-10 text-center text-sm text-slate-500">No resource submissions yet.</li>}
      </ul>}
    </section>
  </AdminShell>;
}
