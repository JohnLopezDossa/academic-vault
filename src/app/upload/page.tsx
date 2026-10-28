"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from "react";

const levels = ["Level 100", "Level 200", "Level 300", "Level 400"];
const categories = ["Lecture notes", "Past questions", "Assignments", "Slides", "Textbooks", "Other"];
const extensions = ["pdf", "doc", "docx", "ppt", "pptx", "txt"];
const maxFileSize = 20 * 1024 * 1024;

type SharedDetails = {
  courseTitle: string;
  courseCode: string;
  level: string;
  semester: string;
  category: string;
};

type BatchFile = {
  id: number;
  file: File;
  title: string;
  error: string;
};

const emptyDetails: SharedDetails = {
  courseTitle: "",
  courseCode: "",
  level: "",
  semester: "",
  category: "",
};

function getFileError(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!extensions.includes(extension)) {
    return "Unsupported file type. Choose PDF, DOC, DOCX, PPT, PPTX, or TXT.";
  }
  if (file.size > maxFileSize) return "File exceeds the 20 MB per-file limit.";
  return "";
}

function titleFromFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const processing = useRef(false);
  const submitTimer = useRef<number | null>(null);
  const [details, setDetails] = useState<SharedDetails>(emptyDetails);
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [metadataErrors, setMetadataErrors] = useState<Partial<Record<keyof SharedDetails, string>>>({});
  const [batchError, setBatchError] = useState("");
  const [rejectedNotice, setRejectedNotice] = useState("");
  const [feedback, setFeedback] = useState("");
  const [dragging, setDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replaceId, setReplaceId] = useState<number | null>(null);

  function addFiles(fileList: FileList | File[]) {
    const selected = Array.from(fileList);
    if (!selected.length) return;
    const batch = selected.map((file) => ({
      id: nextId.current++,
      file,
      title: titleFromFilename(file.name),
      error: getFileError(file),
    }));
    const rejected = batch.filter((item) => item.error).length;
    setFiles((current) => [...current, ...batch]);
    setRejectedNotice(rejected ? `${rejected} selected ${rejected === 1 ? "file was" : "files were"} rejected by validation. Review the marked items below; valid files remain in your batch.` : "");
    setBatchError("");
    setFeedback("");
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function updateDetails<K extends keyof SharedDetails>(key: K, value: SharedDetails[K]) {
    setDetails((current) => ({ ...current, [key]: value }));
    setMetadataErrors((current) => ({ ...current, [key]: "" }));
    setFeedback("");
    setBatchError("");
  }

  function updateTitle(id: number, title: string) {
    setFiles((current) => current.map((item) => item.id === id ? { ...item, title } : item));
    setFeedback("");
    setBatchError("");
  }

  function removeFile(id: number) {
    setFiles((current) => current.filter((item) => item.id !== id));
    setFeedback("");
    setBatchError("");
  }

  function startReplace(id: number) {
    setReplaceId(id);
    replaceInputRef.current?.click();
  }

  function replaceFile(event: ChangeEvent<HTMLInputElement>) {
    const replacement = event.target.files?.[0];
    if (replacement && replaceId !== null) {
      const error = getFileError(replacement);
      setFiles((current) => current.map((item) => item.id === replaceId ? { ...item, file: replacement, error } : item));
      setRejectedNotice(error ? "The replacement file was rejected by validation. Other files in the batch are unchanged." : "");
      setFeedback("");
      setBatchError("");
    }
    setReplaceId(null);
    event.target.value = "";
  }

  function resetBatch() {
    if (submitTimer.current !== null) window.clearTimeout(submitTimer.current);
    processing.current = false;
    setIsSubmitting(false);
    setDetails(emptyDetails);
    setMetadataErrors({});
    setFiles([]);
    setBatchError("");
    setRejectedNotice("");
    setFeedback("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  }

  function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processing.current || isSubmitting) return;

    const nextErrors: Partial<Record<keyof SharedDetails, string>> = {};
    if (!details.courseTitle.trim()) nextErrors.courseTitle = "Enter the course title.";
    if (!details.courseCode.trim()) nextErrors.courseCode = "Enter the course code.";
    if (!details.level) nextErrors.level = "Choose an academic level.";
    if (!details.semester) nextErrors.semester = "Choose a semester.";
    if (!details.category) nextErrors.category = "Choose a resource category.";
    setMetadataErrors(nextErrors);

    const validFiles = files.filter((item) => !item.error && item.title.trim());
    const untitledCount = files.filter((item) => !item.error && !item.title.trim()).length;
    if (untitledCount) setBatchError(`${untitledCount} valid ${untitledCount === 1 ? "file has" : "files have"} no resource title. Add a title or remove ${untitledCount === 1 ? "it" : "them"} before submitting.`);
    else if (files.length === 0) setBatchError("Add at least one resource file to your batch.");
    else if (validFiles.length === 0) setBatchError("No valid files remain. Add or replace a file that meets the file type and size requirements.");
    else setBatchError("");

    if (Object.keys(nextErrors).length || files.length === 0 || validFiles.length === 0 || untitledCount) {
      setFeedback("");
      return;
    }

    processing.current = true;
    setIsSubmitting(true);
    submitTimer.current = window.setTimeout(() => {
      submitTimer.current = null;
      processing.current = false;
      setIsSubmitting(false);
      const skipped = files.length - validFiles.length;
      setFeedback(`Demo complete: ${validFiles.length} ${validFiles.length === 1 ? "resource item" : "resource items"} are ready in this batch${skipped ? `; ${skipped} invalid ${skipped === 1 ? "file was" : "files were"} skipped` : ""}. Nothing has been uploaded or saved permanently.`);
    }, 350);
  }

  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);
  const validCount = files.filter((item) => !item.error && item.title.trim()).length;
  const rejectedCount = files.filter((item) => item.error).length;

  return (
    <main className="min-h-screen bg-[#f5f8ff] text-slate-900">
      <header className="border-b border-blue-100/80 bg-white/95 shadow-[0_8px_30px_-24px_rgba(15,23,42,.5)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <a href="/" className="flex items-center gap-3" aria-label="Academic Vault home">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-white shadow-sm">
              <img src="/images/its-logo.png" alt="Information Technology Society logo" className="h-full w-full object-contain" />
            </span>
            <span><span className="block text-xl font-extrabold tracking-tight text-blue-950">Academic Vault</span><span className="block text-xs text-slate-500">Information Technology · UENR</span></span>
          </a>
          <a href="/" className="rounded-full border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"><span aria-hidden="true">← </span>Back to library</a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Share knowledge</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">Upload course resources</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">Add several lecture files for one course in a single batch. Course details are shared across the batch, while each document stays a separate resource item. This is a frontend demo; nothing is sent to a server or saved permanently.</p>
        </div>

        <form onSubmit={submitBatch} noValidate className="space-y-6">
          <section aria-labelledby="course-details-title" className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(30,64,175,.5)] sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Step 1 · Shared details</p><h2 id="course-details-title" className="mt-1 text-xl font-bold text-blue-950">Course information</h2></div>
              <p className="text-xs text-slate-500"><span className="text-red-600">*</span> Required for every resource in this batch</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetadataField label="Course title" name="courseTitle" required error={metadataErrors.courseTitle} className="lg:col-span-2">
                <input id="courseTitle" value={details.courseTitle} onChange={(event) => updateDetails("courseTitle", event.target.value)} placeholder="e.g. Introduction to Programming" className={inputClass(metadataErrors.courseTitle)} aria-invalid={Boolean(metadataErrors.courseTitle)} />
              </MetadataField>
              <MetadataField label="Course code" name="courseCode" required error={metadataErrors.courseCode}>
                <input id="courseCode" value={details.courseCode} onChange={(event) => updateDetails("courseCode", event.target.value)} placeholder="e.g. IT 101" className={inputClass(metadataErrors.courseCode)} aria-invalid={Boolean(metadataErrors.courseCode)} />
              </MetadataField>
              <MetadataField label="Academic level" name="level" required error={metadataErrors.level}>
                <select id="level" value={details.level} onChange={(event) => updateDetails("level", event.target.value)} className={inputClass(metadataErrors.level)} aria-invalid={Boolean(metadataErrors.level)}><option value="">Select level</option>{levels.map((level) => <option key={level}>{level}</option>)}</select>
              </MetadataField>
              <MetadataField label="Semester" name="semester" required error={metadataErrors.semester}>
                <select id="semester" value={details.semester} onChange={(event) => updateDetails("semester", event.target.value)} className={inputClass(metadataErrors.semester)} aria-invalid={Boolean(metadataErrors.semester)}><option value="">Select semester</option><option>Semester 1</option><option>Semester 2</option></select>
              </MetadataField>
              <MetadataField label="Resource category" name="category" required error={metadataErrors.category} className="sm:col-span-2 lg:col-span-2">
                <select id="category" value={details.category} onChange={(event) => updateDetails("category", event.target.value)} className={inputClass(metadataErrors.category)} aria-invalid={Boolean(metadataErrors.category)}><option value="">Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
              </MetadataField>
            </div>
          </section>

          <section aria-labelledby="files-title" className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(30,64,175,.5)] sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Step 2 · Documents</p><h2 id="files-title" className="mt-1 text-xl font-bold text-blue-950">Add course files</h2><p className="mt-1 text-sm text-slate-500">Choose multiple documents or drop them below. Each file is checked independently.</p></div>
              <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-900"><span>{files.length} {files.length === 1 ? "file" : "files"}</span><span className="text-blue-300">·</span><span>{formatFileSize(totalSize)} total</span></div>
            </div>

            <div
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${dragging ? "border-blue-600 bg-blue-50" : "border-blue-200 bg-[#f8faff] hover:border-blue-400"}`}
            >
              <input ref={fileInputRef} id="resource-files" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={handleFileSelection} className="sr-only" aria-describedby="file-help" />
              <input ref={replaceInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={replaceFile} className="sr-only" aria-label="Choose replacement file" />
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-800" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15.5v3A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5v-3" /></svg></div>
              <p className="mt-4 font-semibold text-blue-950">Drag and drop multiple files here</p><p className="mt-1 text-sm text-slate-500">or</p>
              <label htmlFor="resource-files" className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-full bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 focus-within:ring-4 focus-within:ring-blue-200">Browse files</label>
              <p id="file-help" className="mt-4 text-xs text-slate-500">PDF, DOC, DOCX, PPT, PPTX, TXT · Maximum 20 MB per file</p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
              <p className="text-sm text-slate-600">{validCount} valid {validCount === 1 ? "resource" : "resources"} · {rejectedCount} rejected {rejectedCount === 1 ? "file" : "files"}</p>
              <button type="button" onClick={resetBatch} className="rounded-full px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100">Clear all / reset</button>
            </div>
            {rejectedNotice && <p role="status" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{rejectedNotice}</p>}

            {files.length > 0 && (
              <div className="mt-4 space-y-3">
                {files.map((item, index) => {
                  const extension = item.file.name.split(".").pop()?.toUpperCase() ?? "FILE";
                  const titleError = !item.title.trim();
                  const rejected = Boolean(item.error || titleError);
                  return (
                    <article key={item.id} className={`rounded-2xl border p-4 ${rejected ? "border-amber-200 bg-amber-50/50" : "border-blue-100 bg-white"}`} aria-label={`Resource ${index + 1}: ${item.file.name}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-extrabold ${rejected ? "bg-amber-100 text-amber-900" : "bg-blue-50 text-blue-800"}`}>{extension}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><p className="max-w-full truncate text-sm font-semibold text-blue-950" title={item.file.name}>{item.file.name}</p><span className="text-xs text-slate-500">{extension} · {formatFileSize(item.file.size)}</span></div>
                          <label htmlFor={`resource-title-${item.id}`} className="mt-3 block text-xs font-semibold text-slate-600">Resource title <span className="font-normal text-slate-400">(editable per document)</span></label>
                          <input id={`resource-title-${item.id}`} value={item.title} onChange={(event) => updateTitle(item.id, event.target.value)} placeholder="e.g. Lecture 1" className={inputClass(titleError ? "Resource title is required." : "")} aria-invalid={titleError} aria-describedby={titleError ? `resource-title-error-${item.id}` : undefined} />
                          {item.error ? <p role="alert" className="mt-2 text-xs font-medium text-amber-900">Rejected: {item.error}</p> : titleError ? <p id={`resource-title-error-${item.id}`} role="alert" className="mt-2 text-xs text-red-700">Enter a resource title or remove this file.</p> : <p className="mt-2 text-xs font-medium text-emerald-800">Validated · ready for this demo batch</p>}
                        </div>
                        <div className="flex shrink-0 gap-2 sm:justify-end">
                          <button type="button" onClick={() => startReplace(item.id)} className="rounded-full border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300">Replace</button>
                          <button type="button" onClick={() => removeFile(item.id)} aria-label={`Remove ${item.file.name} from batch`} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-blue-300">Remove</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {batchError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{batchError}</p>}
          {feedback && <p role="status" aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-900">{feedback}</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-blue-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-slate-500">Demo only. Submitting creates no upload and does not save these files or details permanently.</p>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-800 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-70">{isSubmitting ? "Preparing batch…" : `Submit batch${validCount ? ` · ${validCount}` : ""}`}<span aria-hidden="true">→</span></button>
          </div>
        </form>
      </div>

      <footer className="border-t border-blue-100 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><p className="font-semibold text-blue-950">Academic Vault · UENR Information Technology</p><a href="/" className="font-medium text-blue-700 hover:text-blue-900">Back to the library</a></div></footer>
    </main>
  );
}

function inputClass(error?: string) {
  return `mt-1.5 w-full rounded-xl border bg-[#f8faff] px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"}`;
}

function MetadataField({
  label,
  name,
  required = false,
  error,
  className = "",
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return <div className={className}><label htmlFor={name} className="text-sm font-semibold text-slate-700">{label} {required && <span aria-hidden="true" className="text-red-600">*</span>}</label>{children}{error && <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs text-red-700">{error}</p>}</div>;
}
