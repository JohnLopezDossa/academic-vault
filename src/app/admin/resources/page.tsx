"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteManagedResource, retryQueuedResourceCleanup } from "../actions";
import { AdminShell, formatDate, formatSize, PageHeading, StatusPill } from "../admin-shell";

type ResourceRow = {
  id: string; title: string; category: string; file_name: string; file_extension: string;
  file_size_bytes: number; status: string; created_at: string; storage_path: string;
  uploader_id: string; course_id: string;
  courses: { title: string; course_code: string; academic_level: string; semester: string };
};
type CleanupRow = { id: string; resource_id: string; storage_path: string; requested_at: string; completed_at: string | null };

const categoryNames: Record<string, string> = {
  lecture_notes: "Lecture notes", past_questions: "Past questions", assignments: "Assignments",
  slides: "Slides", textbooks: "Textbooks", other: "Other",
};
const levels = ["level_100", "level_200", "level_300", "level_400"];
const statuses = ["pending", "approved", "rejected"];

function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [cleanup, setCleanup] = useState<CleanupRow[]>([]);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [deletionSchemaAvailable, setDeletionSchemaAvailable] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [level, setLevel] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const [resourceResult, cleanupResult, reviewResult] = await Promise.all([
      supabase.from("resources").select("id, title, category, file_name, file_extension, file_size_bytes, status, created_at, storage_path, uploader_id, course_id, courses!inner(title, course_code, academic_level, semester)").order("created_at", { ascending: false }),
      supabase.from("resource_storage_deletions").select("id, resource_id, storage_path, requested_at, completed_at").is("completed_at", null).order("requested_at", { ascending: false }),
      supabase.from("submission_reviews").select("resource_id"),
    ]);
    if (resourceResult.error) throw resourceResult.error;
    setResources((resourceResult.data ?? []) as unknown as ResourceRow[]);
    if (cleanupResult.error) {
      if (cleanupResult.error.code === "42P01" || cleanupResult.error.code === "PGRST205") { setCleanup([]); setDeletionSchemaAvailable(false); }
      else throw cleanupResult.error;
    } else { setCleanup((cleanupResult.data ?? []) as CleanupRow[]); setDeletionSchemaAvailable(true); }
    if (reviewResult.error) throw reviewResult.error;
    setReviewedIds(new Set((reviewResult.data ?? []).map((item) => item.resource_id)));
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => load()).catch(() => { if (active) setError("Resources could not be loaded. Confirm resource-management permission and database access."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]);

  const visible = useMemo(() => resources.filter((resource) => {
    const searchable = `${resource.title} ${resource.file_name} ${resource.courses.title} ${resource.courses.course_code} ${resource.uploader_id}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase())
      && (status === "all" || resource.status === status)
      && (category === "all" || resource.category === category)
      && (level === "all" || resource.courses.academic_level === level);
  }), [resources, query, status, category, level]);

  async function refresh() {
    setError("");
    try { await load(); } catch { setError("The database operation completed, but the list could not be refreshed. Reload the page."); }
  }

  async function remove(resource: ResourceRow) {
    if (!deletionSchemaAvailable) {
      setError("Safe deletion is unavailable until migration 20261028000300_admin_resource_deletion.sql has been applied and exposed by the Supabase API.");
      return;
    }
    if (reviewedIds.has(resource.id)) {
      setError("This resource has review history. It cannot be deleted because review audit records are preserved.");
      return;
    }
    if (!window.confirm(`Delete “${resource.title}” and queue its private file for cleanup? This cannot be undone.`)) return;
    setBusyId(resource.id); setError(""); setFeedback("");
    const result = await deleteManagedResource(resource.id);
    if (!result.ok) setError(result.error ?? "The resource deletion could not be completed.");
    else if ("queued" in result && result.queued) { setFeedback(result.error ?? "Storage cleanup is pending; retry it from the queue below."); await refresh(); }
    else { setFeedback("Resource record and private file were removed; the deletion receipt was saved."); await refresh(); }
    setBusyId("");
  }

  async function retry(path: string) {
    setBusyId(path); setError(""); setFeedback("");
    const result = await retryQueuedResourceCleanup(path);
    if (!result.ok) setError(result.error ?? "The Storage cleanup could not be completed.");
    else if ("queued" in result && result.queued) setFeedback(result.error ?? "Storage cleanup remains pending.");
    else setFeedback("Private-file cleanup completed and recorded.");
    await refresh(); setBusyId("");
  }

  return <AdminShell pageTitle="Resources">
    <PageHeading eyebrow="Catalogue · live database" title="Resource management" description="Search and inspect resources visible under your database permissions. Resource deletion uses a database cleanup queue so private files can be retried safely." />

    <div className="mb-5 grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
      <p className="self-center text-sm font-semibold text-blue-950">{resources.length} {resources.length === 1 ? "resource" : "resources"}</p>
      <label className="sr-only" htmlFor="resource-search">Search resources</label><input id="resource-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, course, uploader…" className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      <label className="sr-only" htmlFor="resource-status">Filter status</label><select id="resource-status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select>
      <label className="sr-only" htmlFor="resource-category">Filter category</label><select id="resource-category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm"><option value="all">All categories</option>{Object.entries(categoryNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select>
      <label className="sr-only" htmlFor="resource-level">Filter academic level</label><select id="resource-level" value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm"><option value="all">All levels</option>{levels.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
    {feedback && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</p>}
    {!loading && !deletionSchemaAvailable && <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Safe deletion is disabled. Apply <code>20261028000300_admin_resource_deletion.sql</code> in the intended Supabase project and refresh the API schema before using deletion.</p>}

    {cleanup.length > 0 && <section aria-labelledby="cleanup-title" className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5"><h2 id="cleanup-title" className="font-bold text-amber-950">Private file cleanup needs retry</h2><p className="mt-1 text-sm text-amber-900">These resource records were removed, but Storage cleanup is still pending. The files remain private while queued.</p><ul className="mt-4 space-y-2">{cleanup.map((item) => <li key={item.id} className="flex flex-col justify-between gap-2 rounded-2xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center"><span className="break-all text-xs text-slate-700">{item.storage_path}</span><button type="button" disabled={busyId === item.storage_path} onClick={() => void retry(item.storage_path)} className="rounded-full border border-amber-300 px-4 py-2 text-xs font-bold text-amber-950 disabled:opacity-50">{busyId === item.storage_path ? "Retrying…" : "Retry cleanup"}</button></li>)}</ul></section>}

    <section aria-label="Resource catalogue" className="grid gap-4 xl:grid-cols-2">
      {loading ? <p role="status" className="rounded-3xl border border-blue-100 bg-white px-6 py-12 text-center text-sm text-blue-900 xl:col-span-2">Loading resources…</p> : visible.map((resource) => <article key={resource.id} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_14px_38px_-32px_rgba(30,64,175,.55)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">{resource.courses.course_code} · {humanize(resource.courses.academic_level)} · {humanize(resource.courses.semester)}</p><h2 className="mt-1 text-lg font-bold text-blue-950">{resource.title}</h2></div><StatusPill status={humanize(resource.status)} /></div>
        <p className="mt-2 text-sm text-slate-600">{resource.courses.title}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3"><Info label="Type" value={categoryNames[resource.category] ?? humanize(resource.category)} /><Info label="File" value={`${resource.file_extension.toUpperCase()} · ${formatSize(resource.file_size_bytes)}`} /><Info label="Uploader ID" value={resource.uploader_id.slice(0, 8)} /><Info label="Filename" value={resource.file_name} /><Info label="Uploaded" value={formatDate(resource.created_at)} /><Info label="Review history" value={reviewedIds.has(resource.id) ? "Preserved audit exists" : "No review audit"} /></dl>
        <details className="mt-4 rounded-xl bg-[#f7f9fe] px-4 py-3"><summary className="cursor-pointer text-xs font-bold text-blue-800">Resource details</summary><dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><Info label="Resource UUID" value={resource.id} /><Info label="Batch UUID" value="Available in submission review" /><Info label="Storage path" value={resource.storage_path} /></dl></details>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={Boolean(busyId) || reviewedIds.has(resource.id) || !deletionSchemaAvailable} onClick={() => void remove(resource)} title={reviewedIds.has(resource.id) ? "Review history is retained, so this resource cannot be hard-deleted." : undefined} className="rounded-full border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45">{busyId === resource.id ? "Deleting…" : "Delete resource and private file"}</button>{reviewedIds.has(resource.id) && <span className="self-center text-xs text-slate-500">Deletion disabled to preserve audit history.</span>}</div>
      </article>)}
      {!loading && !visible.length && <div className="rounded-3xl border border-dashed border-blue-200 bg-white px-6 py-14 text-center xl:col-span-2"><p className="text-lg font-bold text-blue-950">{resources.length ? "No resources match" : "No resources yet"}</p><p className="mt-1 text-sm text-slate-500">{resources.length ? "Adjust your search or filters." : "Resources will appear here after students submit them."}</p></div>}
    </section>
  </AdminShell>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-all text-sm font-medium text-slate-800">{value}</dd></div>;
}
