"use client";

import Link from "next/link";
import { usePrototype } from "./prototype-provider";
import { AdminShell, formatDate, PageHeading, StatCard, StatusPill } from "./admin-shell";

const shortcuts = [
  { href: "/admin/submissions", number: "01", title: "Review submissions", detail: "Assess individual documents and record a demo decision." },
  { href: "/admin/resources", number: "02", title: "Manage resources", detail: "Explore the sample catalogue and simulate publication changes." },
  { href: "/admin/members", number: "03", title: "Committee members", detail: "Edit sample roles, permissions, and active status." },
];

export default function AdminOverviewPage() {
  const { submissions, resources, members, activity } = usePrototype();
  const pending = submissions.filter((submission) => submission.status === "Pending").length;
  const rejected = submissions.filter((submission) => submission.status === "Rejected").length;
  const published = resources.filter((resource) => resource.status === "Published").length;
  const activeCommittee = members.filter((member) => member.role === "Sub-admin" && member.status === "Active").length;
  const latest = [...submissions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 5);

  return <AdminShell pageTitle="Overview">
    <PageHeading eyebrow="UENR · Information Technology" title="Admin overview" description="A working view of the Academic Vault prototype. Use the demo actions to explore how moderation and resource management could work." action={<Link href="/admin/submissions" className="inline-flex items-center justify-center rounded-full bg-blue-800 px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-900/15 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200">Review queue <span className="ml-2">→</span></Link>} />

    <section aria-label="Demonstration metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard index="A" label="Total resources" value={resources.length} note="Sample catalogue" />
      <StatCard index="B" label="Published" value={published} note="Visible in demo catalogue" />
      <StatCard index="C" label="Pending submissions" value={pending} note="Awaiting a prototype decision" />
      <StatCard index="D" label="Rejected" value={rejected} note="Simulated decisions" />
      <StatCard index="E" label="Active committee" value={activeCommittee} note="Sub-admin demo accounts" />
    </section>

    <section aria-label="Admin tools" className="mt-7 grid gap-3 md:grid-cols-3">
      {shortcuts.map((item) => <Link key={item.href} href={item.href} className="group rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_12px_35px_-30px_rgba(30,64,175,.65)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100"><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-blue-400">{item.number}</span><span className="text-blue-700 transition group-hover:translate-x-1" aria-hidden="true">↗</span></div><h2 className="mt-4 font-bold text-blue-950">{item.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p></Link>)}
    </section>

    <section className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_15px_40px_-32px_rgba(30,64,175,.5)]">
        <div className="flex items-end justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Inbox</p><h2 className="mt-1 text-lg font-bold text-blue-950">Recent submissions</h2></div><Link href="/admin/submissions" className="text-sm font-semibold text-blue-700 hover:text-blue-950">View all <span aria-hidden="true">→</span></Link></div>
        <ul className="divide-y divide-slate-100">
          {latest.map((item) => <li key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.filename}</p><p className="mt-1 truncate text-xs text-slate-500">{item.courseCode} · {item.contributor} · {formatDate(item.submittedAt)}</p></div><StatusPill status={item.status} /></li>)}
          {!latest.length && <li className="px-6 py-10 text-center text-sm text-slate-500">No demonstration submissions.</li>}
        </ul>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_15px_40px_-32px_rgba(30,64,175,.5)] sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Prototype log</p><h2 className="mt-1 text-lg font-bold text-blue-950">Recent activity</h2>
        <ol className="mt-5 space-y-5">
          {activity.slice(0, 5).map((entry, index) => <li key={entry.id} className="relative flex gap-3"><span className="relative mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-extrabold text-blue-800">{index + 1}{index < 4 && <span className="absolute left-1/2 top-5 h-8 w-px -translate-x-1/2 bg-blue-100" />}</span><div><p className="text-sm font-semibold text-slate-800">{entry.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{entry.detail}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600">{entry.time}</p></div></li>)}
        </ol>
      </div>
    </section>
  </AdminShell>;
}
