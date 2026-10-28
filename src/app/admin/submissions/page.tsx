"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AdminShell, formatDate, formatSize, PageHeading, StatusPill } from "../admin-shell";
import { usePrototype } from "../prototype-provider";
import type { SubmissionStatus } from "../prototype-data";

const filters = ["All statuses", "Pending", "Approved", "Rejected"] as const;

export default function SubmissionsPage() {
  const { submissions, decideSubmission } = usePrototype();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("All statuses");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedback, setFeedback] = useState("");

  const visible = useMemo(() => submissions.filter((item) => {
    const text = `${item.filename} ${item.courseTitle} ${item.courseCode} ${item.contributor} ${item.category} ${item.fileType}`.toLowerCase();
    return (status === "All statuses" || item.status === status) && text.includes(query.trim().toLowerCase());
  }), [submissions, query, status]);
  const selected = submissions.find((item) => item.id === selectedId) ?? null;
  const pendingCount = submissions.filter((item) => item.status === "Pending").length;

  function approve(itemId: string) {
    decideSubmission(itemId, "Approved");
    setFeedback("Approved in this prototype session. No permanent change was saved.");
    setSelectedId(null);
  }

  function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !rejectionReason.trim()) return;
    decideSubmission(selected.id, "Rejected", rejectionReason.trim());
    setFeedback("Rejected in this prototype session. No permanent change was saved.");
    setSelectedId(null);
    setRejectionReason("");
  }

  return <AdminShell pageTitle="Submission review">
    <PageHeading eyebrow="Moderation desk · prototype" title="Submission review" description="Review each document on its own, including documents from the same student batch. Approvals and rejections update this session only." />

    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-bold text-blue-950">{pendingCount} pending {pendingCount === 1 ? "document" : "documents"}</p><p className="mt-1 text-xs text-slate-500">A batch may have different decisions for each file.</p></div>
      <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px]">
        <label className="sr-only" htmlFor="submission-search">Search submissions</label><input id="submission-search" value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search file, course, contributor…" className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        <label className="sr-only" htmlFor="status-filter">Filter by status</label><select id="status-filter" value={status} onChange={(event) => setStatus(event.target.value as (typeof filters)[number])} className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">{filters.map((filter) => <option key={filter}>{filter}</option>)}</select>
      </div>
    </div>

    {feedback && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</p>}

    {selected && <section aria-labelledby="review-detail-title" className="mb-5 rounded-3xl border border-blue-200 bg-white p-5 shadow-lg shadow-blue-950/5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Individual document · demo review</p><h2 id="review-detail-title" className="mt-1 text-xl font-bold text-blue-950">{selected.filename}</h2><p className="mt-1 text-sm text-slate-500">Batch {selected.batchId} · decisions remain independent per document</p></div><button type="button" onClick={() => { setSelectedId(null); setRejectionReason(""); }} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300">Close review</button></div>
      <dl className="mt-5 grid gap-x-5 gap-y-4 rounded-2xl bg-[#f7f9fe] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Contributor" value={selected.contributor} /><Detail label="Course" value={`${selected.courseTitle} · ${selected.courseCode}`} /><Detail label="Level & semester" value={`${selected.level} · ${selected.semester}`} /><Detail label="Submitted" value={formatDate(selected.submittedAt)} /><Detail label="Category" value={selected.category} /><Detail label="File details" value={`${selected.fileType} · ${formatSize(selected.size)}`} /><Detail label="Status" value={selected.status} /><Detail label="Description" value={selected.description} />
      </dl>
      {selected.status === "Pending" ? <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
        <button type="button" onClick={() => approve(selected.id)} className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100">Approve · prototype</button>
        <form onSubmit={reject} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1"><label htmlFor="rejection-reason" className="block text-xs font-bold text-slate-700">Rejection reason <span className="font-normal text-slate-500">(required before confirming)</span></label><textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={2} required placeholder="Explain what needs to be corrected" className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8faff] px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></div>
          <button type="submit" disabled={!rejectionReason.trim()} className="rounded-full border border-rose-200 px-5 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50">Confirm reject · prototype</button>
        </form>
      </div> : <p className="mt-4 text-sm font-medium text-slate-600">This document already has a prototype decision: <StatusPill status={selected.status} /></p>}
    </section>}

    <section aria-label="Submission list" className="space-y-3">
      {visible.map((item) => {
        const batchSize = submissions.filter((other) => other.batchId === item.batchId).length;
        return <article key={item.id} className="rounded-3xl border border-blue-100 bg-white p-4 shadow-[0_12px_35px_-30px_rgba(30,64,175,.55)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 font-mono text-[10px] font-extrabold text-blue-800 ring-1 ring-blue-100">{item.fileType}</div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-blue-950">{item.filename}</h3><StatusPill status={item.status} /></div><p className="mt-1 truncate text-sm text-slate-600">{item.courseTitle} <span className="text-blue-300">·</span> {item.courseCode} <span className="text-blue-300">·</span> {item.category}</p><p className="mt-1 text-xs text-slate-500">{item.contributor} · {item.level} · {item.semester} · {formatDate(item.submittedAt)} · {formatSize(item.size)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">{batchSize > 1 ? `Batch ${item.batchId} · document reviewed separately (${batchSize} items)` : "Individual submission"}</p></div>
            <button type="button" onClick={() => { setSelectedId(item.id); setRejectionReason(""); }} className="shrink-0 rounded-full border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100">{item.status === "Pending" ? "Review" : "View details"}</button>
          </div>
        </article>;
      })}
      {!visible.length && <div className="rounded-3xl border border-dashed border-blue-200 bg-white px-6 py-14 text-center"><p className="text-lg font-bold text-blue-950">No submissions match</p><p className="mt-1 text-sm text-slate-500">Try another search or status filter.</p></div>}
    </section>
  </AdminShell>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium leading-5 text-slate-800">{value}</dd></div>;
}
