"use client";

import { useMemo, useState } from "react";
import { AdminShell, formatDate, PageHeading, StatusPill } from "../admin-shell";
import { usePrototype } from "../prototype-provider";
import type { ResourceStatus } from "../prototype-data";

export default function ResourcesPage() {
  const { resources, setResourceStatus, removeResource } = usePrototype();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [feedback, setFeedback] = useState("");
  const filtered = useMemo(() => resources.filter((resource) => {
    const searchable = `${resource.title} ${resource.courseTitle} ${resource.courseCode} ${resource.category} ${resource.uploader}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase()) && (status === "All statuses" || resource.status === status);
  }), [resources, query, status]);

  function toggle(resourceId: string, currentStatus: ResourceStatus) {
    const next: ResourceStatus = currentStatus === "Published" ? "Unpublished" : "Published";
    setResourceStatus(resourceId, next);
    setFeedback(`${next} in this prototype session. This change has not been saved permanently.`);
  }

  function remove(resourceId: string, title: string) {
    if (!window.confirm(`Remove “${title}” from the demonstration catalogue? This only changes this prototype session.`)) return;
    removeResource(resourceId);
    setFeedback("Resource removed from the demonstration catalogue for this session only.");
  }

  return <AdminShell pageTitle="Resources">
    <PageHeading eyebrow="Catalogue · prototype" title="Resource management" description="Search the fictional catalogue and simulate publication or removal actions. No changes are written to persistent storage." />
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-blue-950">{resources.length} demonstration {resources.length === 1 ? "resource" : "resources"}</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px]"><label htmlFor="resource-search" className="sr-only">Search resources</label><input id="resource-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, course, uploader…" className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /><label htmlFor="resource-status" className="sr-only">Filter resource status</label><select id="resource-status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"><option>All statuses</option><option>Published</option><option>Unpublished</option></select></div>
    </div>
    {feedback && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</p>}
    <section aria-label="Resource catalogue" className="grid gap-4 xl:grid-cols-2">
      {filtered.map((resource) => <article key={resource.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_14px_38px_-32px_rgba(30,64,175,.55)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">{resource.courseCode} · {resource.level}</p><h2 className="mt-1 text-lg font-bold text-blue-950">{resource.title}</h2></div><StatusPill status={resource.status} /></div>
        <p className="mt-2 text-sm text-slate-600">{resource.courseTitle}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3"><Info label="Type" value={resource.category} /><Info label="Uploader" value={resource.uploader} /><Info label="Upload date" value={formatDate(resource.uploadedAt)} /></dl>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => toggle(resource.id, resource.status)} className="rounded-full bg-blue-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-100">{resource.status === "Published" ? "Unpublish · prototype" : "Publish · prototype"}</button><button type="button" onClick={() => remove(resource.id, resource.title)} className="rounded-full border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100">Remove sample · prototype</button></div>
      </article>)}
      {!filtered.length && <div className="rounded-3xl border border-dashed border-blue-200 bg-white px-6 py-14 text-center xl:col-span-2"><p className="text-lg font-bold text-blue-950">No resources match</p><p className="mt-1 text-sm text-slate-500">Adjust your search or publication filter.</p></div>}
    </section>
  </AdminShell>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd></div>;
}
