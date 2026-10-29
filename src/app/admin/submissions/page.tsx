"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminShell, formatDate, formatSize, PageHeading } from "../admin-shell";

type ReviewStatus = "pending" | "approved" | "rejected";
type ReviewResource = {
  id: string;
  batch_id: string;
  uploader_id: string;
  title: string;
  category: string;
  file_name: string;
  file_extension: string;
  file_size_bytes: number;
  status: ReviewStatus;
  created_at: string;
  courses: { course_code: string; title: string; academic_level: string; semester: string };
};
type ReviewAudit = {
  id: string;
  decision: Exclude<ReviewStatus, "pending">;
  rejection_reason: string | null;
  reviewed_at: string;
  reviewer_id: string;
};

const filters = ["all", "pending", "approved", "rejected"] as const;
const categories: Record<string, string> = {
  lecture_notes: "Lecture notes",
  past_questions: "Past questions",
  assignments: "Assignments",
  slides: "Slides",
  textbooks: "Textbooks",
  other: "Other",
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: ReviewStatus) {
  if (status === "approved") return "bg-emerald-50 text-emerald-800";
  if (status === "rejected") return "bg-rose-50 text-rose-800";
  return "bg-amber-50 text-amber-900";
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<ReviewResource[]>([]);
  const [audit, setAudit] = useState<ReviewAudit[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSubmissions = useCallback(async () => {
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from("resources")
      .select("id, batch_id, uploader_id, title, category, file_name, file_extension, file_size_bytes, status, created_at, courses!inner(course_code, title, academic_level, semester)")
      .order("created_at", { ascending: false });
    if (loadError) throw loadError;
    setSubmissions((data ?? []) as unknown as ReviewResource[]);
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(() => loadSubmissions())
      .catch(() => { if (alive) setError("The review queue could not be loaded. Check your connection and try again."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadSubmissions]);

  const visible = useMemo(() => submissions.filter((item) => {
    const text = `${item.file_name} ${item.title} ${item.courses.title} ${item.courses.course_code} ${item.category} ${item.file_extension}`.toLowerCase();
    return (status === "all" || item.status === status) && text.includes(query.trim().toLowerCase());
  }), [submissions, query, status]);
  const selected = submissions.find((item) => item.id === selectedId) ?? null;
  const pendingCount = submissions.filter((item) => item.status === "pending").length;

  async function openReview(item: ReviewResource) {
    setSelectedId(item.id);
    setAudit([]);
    setError("");
    const supabase = createClient();
    const { data, error: auditError } = await supabase
      .from("submission_reviews")
      .select("id, decision, rejection_reason, reviewed_at, reviewer_id")
      .eq("resource_id", item.id)
      .order("reviewed_at", { ascending: false });
    if (auditError) setError("Review history could not be loaded.");
    else setAudit((data ?? []) as ReviewAudit[]);
  }

  async function decide(decision: Exclude<ReviewStatus, "pending">, reason: string | null) {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    setFeedback("");
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("review_resource", {
      p_resource_id: selected.id,
      p_decision: decision,
      p_rejection_reason: reason,
    });
    if (rpcError) {
      setError(rpcError.message.includes("permission") ? "Your account is not permitted to review this submission." : "The decision could not be saved. The submission remains unchanged.");
      setSaving(false);
      return;
    }
    try {
      await loadSubmissions();
      const { data: history } = await supabase
        .from("submission_reviews")
        .select("id, decision, rejection_reason, reviewed_at, reviewer_id")
        .eq("resource_id", selected.id)
        .order("reviewed_at", { ascending: false });
      setAudit((history ?? []) as ReviewAudit[]);
      setFeedback(decision === "approved" ? "Resource approved. It is now visible in the public catalogue." : "Resource rejected. The reason has been added to its review history.");
      setRejectionReason("");
    } catch {
      setError("The review decision was saved, but the queue could not be refreshed. Reload the page to see the current state.");
    } finally {
      setSaving(false);
    }
  }

  function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectionReason.trim() || rejectionReason.trim().length > 2000) return;
    void decide("rejected", rejectionReason.trim());
  }

  return <AdminShell pageTitle="Submission review">
    <PageHeading eyebrow="Moderation desk · live permissions" title="Submission review" description="Review each document independently. Decisions are recorded by the database review_resource function with an audit entry." />

    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-sm font-bold text-blue-950">{pendingCount} pending {pendingCount === 1 ? "document" : "documents"}</p><p className="mt-1 text-xs text-slate-500">A batch may have different decisions for each file.</p></div>
      <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px]">
        <label className="sr-only" htmlFor="submission-search">Search submissions</label><input id="submission-search" value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search file, course, title…" className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        <label className="sr-only" htmlFor="status-filter">Filter by status</label><select id="status-filter" value={status} onChange={(event) => setStatus(event.target.value as (typeof filters)[number])} className="rounded-xl border border-slate-200 bg-[#f8faff] px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">{filters.map((filter) => <option key={filter} value={filter}>{filter === "all" ? "All statuses" : label(filter)}</option>)}</select>
      </div>
    </div>

    {feedback && <p role="status" aria-live="polite" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

    {selected && <section aria-labelledby="review-detail-title" className="mb-5 rounded-3xl border border-blue-200 bg-white p-5 shadow-lg shadow-blue-950/5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-blue-600">Individual document · database review</p><h2 id="review-detail-title" className="mt-1 text-xl font-bold text-blue-950">{selected.title}</h2><p className="mt-1 text-sm text-slate-500">Batch {selected.batch_id} · each document receives its own decision</p></div><button type="button" onClick={() => { setSelectedId(null); setRejectionReason(""); }} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300">Close review</button></div>
      <dl className="mt-5 grid gap-x-5 gap-y-4 rounded-2xl bg-[#f7f9fe] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Filename" value={selected.file_name} /><Detail label="Course" value={`${selected.courses.title} · ${selected.courses.course_code}`} /><Detail label="Level & semester" value={`${label(selected.courses.academic_level)} · ${label(selected.courses.semester)}`} /><Detail label="Submitted" value={formatDate(selected.created_at)} /><Detail label="Category" value={categories[selected.category] ?? label(selected.category)} /><Detail label="File details" value={`${selected.file_extension.toUpperCase()} · ${formatSize(selected.file_size_bytes)}`} /><Detail label="Uploader ID" value={selected.uploader_id.slice(0, 8)} /><Detail label="Status" value={label(selected.status)} />
      </dl>
      <div className="mt-4 flex flex-wrap gap-2"><a href={`/api/resources/${selected.id}/file?mode=${selected.file_extension === "pdf" ? "review-preview" : "review-download"}`} target={selected.file_extension === "pdf" ? "_blank" : undefined} rel={selected.file_extension === "pdf" ? "noopener noreferrer" : undefined} className="rounded-full border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50">{selected.file_extension === "pdf" ? "Preview PDF" : "Download for review"}</a></div>
      {audit.length > 0 && <div className="mt-5 rounded-2xl border border-slate-100 p-4"><h3 className="text-sm font-bold text-blue-950">Review history</h3><ul className="mt-2 space-y-2">{audit.map((entry) => <li key={entry.id} className="text-sm text-slate-700"><span className="font-semibold">{label(entry.decision)}</span> · {formatDate(entry.reviewed_at)}{entry.rejection_reason && <p className="mt-1 text-slate-500">Reason: {entry.rejection_reason}</p>}</li>)}</ul></div>}
      {selected.status === "pending" ? <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start">
        <button type="button" disabled={saving} onClick={() => void decide("approved", null)} className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-50">{saving ? "Saving…" : "Approve resource"}</button>
        <form onSubmit={reject} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end"><div className="flex-1"><label htmlFor="rejection-reason" className="block text-xs font-bold text-slate-700">Rejection reason <span className="font-normal text-slate-500">(required, max 2,000 characters)</span></label><textarea id="rejection-reason" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={2} maxLength={2000} required placeholder="Explain what needs to be corrected" className="mt-1 w-full rounded-xl border border-slate-200 bg-[#f8faff] px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></div><button type="submit" disabled={saving || !rejectionReason.trim()} className="rounded-full border border-rose-200 px-5 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving…" : "Reject submission"}</button></form>
      </div> : <p className="mt-4 text-sm font-medium text-slate-600">This document has a recorded decision: <span className={`ml-1 rounded-full px-3 py-1 text-xs font-bold ${statusClass(selected.status)}`}>{label(selected.status)}</span></p>}
    </section>}

    <section aria-label="Submission list" className="space-y-3">
      {loading ? <p role="status" className="rounded-3xl border border-blue-100 bg-white px-6 py-12 text-center text-sm text-blue-900">Loading review queue…</p> : visible.map((item) => {
        const batchSize = submissions.filter((other) => other.batch_id === item.batch_id).length;
        return <article key={item.id} className="rounded-3xl border border-blue-100 bg-white p-4 shadow-[0_12px_35px_-30px_rgba(30,64,175,.55)] sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 font-mono text-[10px] font-extrabold text-blue-800 ring-1 ring-blue-100">{item.file_extension.toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-blue-950">{item.title}</h3><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass(item.status)}`}>{label(item.status)}</span></div><p className="mt-1 truncate text-sm text-slate-600">{item.file_name} <span className="text-blue-300">·</span> {item.courses.title} <span className="text-blue-300">·</span> {item.courses.course_code}</p><p className="mt-1 text-xs text-slate-500">{categories[item.category] ?? label(item.category)} · {label(item.courses.academic_level)} · {label(item.courses.semester)} · {formatDate(item.created_at)} · {formatSize(item.file_size_bytes)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">{batchSize > 1 ? `Batch ${item.batch_id} · document reviewed separately (${batchSize} items)` : "Individual submission"}</p></div><button type="button" onClick={() => void openReview(item)} className="shrink-0 rounded-full border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-800 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100">{item.status === "pending" ? "Review" : "View details"}</button></div></article>;
      })}
      {!loading && !visible.length && <div className="rounded-3xl border border-dashed border-blue-200 bg-white px-6 py-14 text-center"><p className="text-lg font-bold text-blue-950">No submissions match</p><p className="mt-1 text-sm text-slate-500">The queue is empty or your search/status filter has no matches.</p></div>}
    </section>
  </AdminShell>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium leading-5 text-slate-800">{value}</dd></div>;
}
