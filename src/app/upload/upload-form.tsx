"use client";
import { createCourseAction } from "./action";
import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const categories = [
  ["lecture_notes", "Lecture notes"],
  ["past_questions", "Past questions"],
  ["assignments", "Assignments"],
  ["slides", "Slides"],
  ["textbooks", "Textbooks"],
  ["other", "Other"],
] as const;
const mimeTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
};
const maxFileSize = 20 * 1024 * 1024;

type Course = {
  id: string;
  course_code: string;
  title: string;
  academic_level: "level_100" | "level_200" | "level_300" | "level_400";
  semester: "semester_1" | "semester_2";
};
type FileStatus = "ready" | "uploading" | "uploaded" | "failed";
type BatchFile = {
  id: number;
  file: File;
  title: string;
  error: string;
  status: FileStatus;
  resourceId?: string;
  storagePath?: string;
  uploadError?: string;
};
type PreparedBatch = {
  batchId: string;
  courseId: string;
  category: string;
  itemIds: Record<number, { resourceId: string; storagePath: string }>;
};

function getFileError(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!Object.hasOwn(mimeTypes, extension)) return "Unsupported file type. Choose PDF, DOC, DOCX, PPT, PPTX, or TXT.";
  if (file.size < 1) return "This file is empty.";
  if (file.size > maxFileSize) return "File exceeds the 20 MiB per-file limit.";
  if (file.name.length > 255) return "Filename is too long (maximum 255 characters).";
  return "";
}

function titleFromFilename(filename: string) {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function enumLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}


export default function UploadForm({
  courses,
  courseLoadError = "",
  canCreateCourse = false,
}: {
  courses: Course[];
  courseLoadError?: string;
  canCreateCourse?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const replaceId = useRef<number | null>(null);
  const processing = useRef(false);
  const [courseId, setCourseId] = useState("");
  
const [availableCourses, setAvailableCourses] = useState<Course[]>(courses);
const [showCreateCourse, setShowCreateCourse] = useState(false);
const [newCourseCode, setNewCourseCode] = useState("");
const [newCourseTitle, setNewCourseTitle] = useState("");
const [newCourseLevel, setNewCourseLevel] =
  useState<Course["academic_level"]>("level_100");
const [newCourseSemester, setNewCourseSemester] =
  useState<Course["semester"]>("semester_1");
const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [batch, setBatch] = useState<PreparedBatch | null>(null);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [rejectedNotice, setRejectedNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  function addFiles(fileList: FileList | File[]) {
    const selected = Array.from(fileList);
    if (!selected.length) return;
    if (batch) {
      setFormError("This batch has already been prepared. Finish or clean it up before changing its files.");
      return;
    }
    const added = selected.map((file) => ({
      id: nextId.current++, file, title: titleFromFilename(file.name), error: getFileError(file), status: "ready" as const,
    }));
    const rejected = added.filter((item) => item.error).length;
    setFiles((current) => [...current, ...added]);
    setRejectedNotice(rejected ? `${rejected} selected ${rejected === 1 ? "file was" : "files were"} rejected by validation. Other valid files remain available.` : "");
    setFormError("");
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

  function updateTitle(id: number, title: string) {
    if (batch) return;
    setFiles((current) => current.map((item) => item.id === id ? { ...item, title } : item));
    setFormError("");
    setFeedback("");
  }

  function removeFile(id: number) {
    if (batch) return;
    setFiles((current) => current.filter((item) => item.id !== id));
    setFormError("");
    setFeedback("");
  }

  function replaceFile(event: ChangeEvent<HTMLInputElement>) {
    const replacement = event.target.files?.[0];
    const id = replaceId.current;
    if (replacement && id !== null) {
      const error = getFileError(replacement);
      setFiles((current) => current.map((item) => item.id === id ? { ...item, file: replacement, error } : item));
      setRejectedNotice(error ? `Replacement rejected: ${error}` : "");
      setFeedback("");
      setFormError("");
    }
    replaceId.current = null;
    event.target.value = "";
  }

  async function prepareRows(
    supabase: ReturnType<typeof createClient>,
    userId: string,
    selectedCourse: Course,
    categoryValue: string,
    batchState: PreparedBatch,
    selectedFiles: BatchFile[],
  ) {
    const { error: batchError } = await supabase.from("resource_batches").insert({
      id: batchState.batchId,
      course_id: selectedCourse.id,
      uploaded_by: userId,
    });
    if (batchError) {
      const existing = await supabase.from("resource_batches").select("id").eq("id", batchState.batchId).maybeSingle();
      if (existing.error || !existing.data) {
        setBatch(null);
        throw new Error(`Could not create the batch: ${batchError.message}`);
      }
    }

    const rows = selectedFiles.map((item) => {
      const identity = batchState.itemIds[item.id];
      const extension = item.file.name.split(".").pop()!.toLowerCase();
      return {
        id: identity.resourceId,
        batch_id: batchState.batchId,
        course_id: selectedCourse.id,
        uploader_id: userId,
        title: item.title.trim(),
        category: categoryValue,
        file_name: item.file.name,
        file_extension: extension,
        mime_type: mimeTypes[extension],
        file_size_bytes: item.file.size,
        storage_path: identity.storagePath,
        status: "pending" as const,
      };
    });
    const inserted = await supabase.from("resources").insert(rows);
    if (inserted.error) {
      const found = await supabase.from("resources").select("id").in("id", rows.map((row) => row.id));
      if (found.error) throw new Error(`Resource metadata was not confirmed: ${inserted.error.message}`);
      const present = new Set((found.data ?? []).map((row) => row.id));
      const missing = rows.filter((row) => !present.has(row.id));
      if (missing.length) {
        const retry = await supabase.from("resources").insert(missing);
        if (retry.error) throw new Error(`Could not create all resource records: ${retry.error.message}`);
      }
    }
  }

async function handleCreateCourse() {
  if (!canCreateCourse || isCreatingCourse || batch) return;

  setFormError("");
  setFeedback("");

  if (!newCourseCode.trim() || !newCourseTitle.trim()) {
    setFormError("Enter both the course code and course title.");
    return;
  }

  setIsCreatingCourse(true);

  try {
    const result = await createCourseAction({
      course_code: newCourseCode.trim(),
      title: newCourseTitle.trim(),
      academic_level: newCourseLevel,
      semester: newCourseSemester,
    });

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    const createdCourse = result.course as Course;

    setAvailableCourses((current) => {
      const exists = current.some(
        (course) => course.id === createdCourse.id
      );
      return exists ? current : [...current, createdCourse];
    });

    setCourseId(createdCourse.id);
    setShowCreateCourse(false);
    setNewCourseCode("");
    setNewCourseTitle("");
    setFeedback(
      `Course ${createdCourse.course_code} created and selected.`
    );
  } catch {
    setFormError("Could not create the course. Please try again.");
  } finally {
    setIsCreatingCourse(false);
  }
}


  async function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processing.current || isSubmitting || isCleaning) return;
    setFormError("");
    setFeedback("");

    const validFiles = files.filter((item) => !item.error && item.title.trim() && item.title.trim().length <= 200);
    const titleProblems = files.filter((item) => !item.error && (!item.title.trim() || item.title.trim().length > 200));
    if (!courseId) return setFormError("Select an existing course.");
    if (!category) return setFormError("Choose a resource category.");
    if (!files.length) return setFormError("Add at least one resource file to the batch.");
    if (!validFiles.length) return setFormError("No valid files remain. Add or replace a file that passes validation.");
    if (titleProblems.length) return setFormError("Each valid file needs a title of 1 to 200 characters.");

    processing.current = true;
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData.user;
      if (authError || !user) throw new Error("Your session has expired. Sign in again before uploading.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, can_upload")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError || !profile) throw new Error("Your account profile could not be verified. Contact an administrator.");
      if (profile.role !== "student" && profile.role !== "admin" && !(profile.role === "sub_admin" && profile.can_upload)) {
        throw new Error("Your account does not have permission to upload resources.");
      }

const selectedCourse = availableCourses.find(
  (course) => course.id === courseId
);
      if (!selectedCourse) throw new Error("That course is no longer available. Reload the page and select an existing course.");

      let activeBatch = batch;
      if (!activeBatch) {
        const batchId = crypto.randomUUID();
        const itemIds = Object.fromEntries(validFiles.map((item) => {
          const resourceId = crypto.randomUUID();
          const extension = item.file.name.split(".").pop()!.toLowerCase();
          return [item.id, { resourceId, storagePath: `${user.id}/${resourceId}/${resourceId}.${extension}` }];
        }));
        activeBatch = { batchId, courseId, category, itemIds };
        setBatch(activeBatch);
        await prepareRows(supabase, user.id, selectedCourse, category, activeBatch, validFiles);
        setFiles((current) => current.map((item) => activeBatch!.itemIds[item.id]
          ? { ...item, ...activeBatch!.itemIds[item.id], status: "ready", uploadError: "" }
          : item));
      } else {
        if (activeBatch.courseId !== courseId || activeBatch.category !== category) {
          throw new Error("This prepared batch uses different course details. Clean it up before changing the selection.");
        }
        await prepareRows(supabase, user.id, selectedCourse, category, activeBatch, validFiles);
      }

      let uploadedNow = 0;
      const attempted = validFiles.filter((item) => {
        const latest = files.find((file) => file.id === item.id);
        return latest?.status !== "uploaded";
      });
      for (const item of attempted) {
        const identity = activeBatch.itemIds[item.id];
        if (!identity) continue;
        setFiles((current) => current.map((file) => file.id === item.id ? { ...file, status: "uploading", uploadError: "" } : file));
        const extension = item.file.name.split(".").pop()!.toLowerCase();
        const latest = files.find((file) => file.id === item.id);
        if (latest?.status === "failed") {
          const removed = await supabase.storage.from("academic-resources").remove([identity.storagePath]);
          if (removed.error) {
            setFiles((current) => current.map((file) => file.id === item.id ? { ...file, status: "failed", uploadError: `Could not clear a previous partial file: ${removed.error!.message}` } : file));
            continue;
          }
        }
        const result = await supabase.storage.from("academic-resources").upload(identity.storagePath, item.file, {
          contentType: mimeTypes[extension],
          upsert: false,
        });
        
if (result.error) {
  setFiles((current) =>
    current.map((file) =>
      file.id === item.id
        ? {
            ...file,
            status: "failed",
            uploadError: result.error!.message,
          }
        : file
    )
  );
} else {
  // Admin uploads are approved immediately after the file is stored.
  // Student and sub-admin uploads retain the existing review workflow.
  if (profile.role === "admin") {
    const { error: approvalError } = await supabase.rpc(
      "review_resource",
      {
        p_resource_id: identity.resourceId,
        p_decision: "approved",
        p_rejection_reason: null,
      }
    );

    if (approvalError) {
      setFiles((current) =>
        current.map((file) =>
          file.id === item.id
            ? {
                ...file,
                status: "failed",
                uploadError:
                  "The file uploaded, but automatic publication failed. " +
                  approvalError.message,
              }
            : file
        )
      );
      continue;
    }
  }

  uploadedNow += 1;

  setFiles((current) =>
    current.map((file) =>
      file.id === item.id
        ? { ...file, status: "uploaded", uploadError: "" }
        : file
    )
  );
}

      }

      const latestFiles = files;
      const priorUploaded = latestFiles.filter((item) => item.status === "uploaded").length;
      const successCount = priorUploaded + uploadedNow;
      const failedCount = validFiles.length - successCount;
      
if (failedCount) {
  setFeedback(
    `${successCount} of ${validFiles.length} files uploaded successfully. ${failedCount} failed or could not be published.`
  );
} else {
  setFeedback(
    profile.role === "admin"
      ? `${successCount} ${successCount === 1 ? "resource" : "resources"} published successfully and available in the public library.`
      : `${successCount} ${successCount === 1 ? "resource" : "resources"} submitted successfully and pending review.`
  );
}

    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The batch could not be prepared. Please try again.");
    } finally {
      processing.current = false;
      setIsSubmitting(false);
    }
  }

  async function resetBatch() {
    if (processing.current || isCleaning) return;
    if (batch && uploadedCount < validCount) {
      const supabase = createClient();
      const resourceIds = Object.values(batch.itemIds).map((item) => item.resourceId);
      const paths = Object.values(batch.itemIds).map((item) => item.storagePath);
      setIsCleaning(true);
      setFormError("");
      setFeedback("");
      try {
        const existingResources = await supabase.from("resources").select("id, storage_path").in("id", resourceIds);
        if (existingResources.error) throw new Error(`Could not verify pending resource records: ${existingResources.error.message}`);
        const knownPaths = new Set((existingResources.data ?? []).map((resource) => resource.storage_path));
        const pathsToClean = paths.filter((path) => knownPaths.has(path));
        if (pathsToClean.length) {
          const removed = await supabase.storage.from("academic-resources").remove(pathsToClean);
          if (removed.error) throw new Error(`Files could not be removed. Pending records were kept: ${removed.error.message}`);
        }
        const existingIds = (existingResources.data ?? []).map((resource) => resource.id);
        if (existingIds.length) {
          const deletedResources = await supabase.from("resources").delete().in("id", existingIds).select("id");
          if (deletedResources.error || (deletedResources.data?.length ?? 0) !== existingIds.length) {
            throw new Error("Not all pending resource records could be removed. The batch remains available for retry.");
          }
        }
        const existingBatch = await supabase.from("resource_batches").select("id").eq("id", batch.batchId).maybeSingle();
        if (existingBatch.error) throw new Error(`Could not verify batch cleanup: ${existingBatch.error.message}`);
        if (existingBatch.data) {
          const deletedBatch = await supabase.from("resource_batches").delete().eq("id", batch.batchId).select("id");
          if (deletedBatch.error || deletedBatch.data?.length !== 1) {
            throw new Error("Resources were cleaned up, but the empty batch could not be removed. Contact an administrator.");
          }
        }
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Cleanup failed. Your pending records were retained.");
        setIsCleaning(false);
        return;
      }
      setIsCleaning(false);
    }
    setBatch(null);
    setCourseId("");
    setCategory("");
    setFiles([]);
    setFormError("");
    setRejectedNotice("");
    setFeedback("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (replaceInputRef.current) replaceInputRef.current.value = "";
  }

  const selectedCourse = courses.find((course) => course.id === courseId);
  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);
  const validCount = files.filter((item) => !item.error && item.title.trim() && item.title.length <= 200).length;
  const rejectedCount = files.filter((item) => item.error || !item.title.trim() || item.title.length > 200).length;
  const uploadedCount = files.filter((item) => item.status === "uploaded").length;
  const failedUploadCount = files.filter((item) => item.status === "failed").length;

  return (
    <main className="min-h-screen bg-[#f5f8ff] text-slate-900">
      <header className="border-b border-blue-100/80 bg-white/95 shadow-[0_8px_30px_-24px_rgba(15,23,42,.5)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Academic Vault home">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-white shadow-sm"><img src="/images/its-logo.png" alt="Information Technology Society logo" className="h-full w-full object-contain" /></span>
            <span><span className="block text-xl font-extrabold tracking-tight text-blue-950">Academic Vault</span><span className="block text-xs text-slate-500">Information Technology · UENR</span></span>
          </Link>
          <Link href="/" className="rounded-full border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"><span aria-hidden="true">← </span>Back to library</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-blue-700">Share knowledge</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">Upload course resources</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">Add several lecture files for one existing course in a single batch. Each document is stored privately and reviewed separately before appearing in the public library.</p>
        </div>

        {courseLoadError && <p role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Courses could not be loaded: {courseLoadError}</p>}
        <form onSubmit={submitBatch} noValidate className="space-y-6">
          <section aria-labelledby="course-details-title" className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(30,64,175,.5)] sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Step 1 · Shared details</p><h2 id="course-details-title" className="mt-1 text-xl font-bold text-blue-950">Course information</h2></div><p className="text-xs text-slate-500">Select an existing course; students cannot create courses.</p></div>
            <label htmlFor="course" className="text-sm font-semibold text-slate-700">Course <span aria-hidden="true" className="text-red-600">*</span></label>
            <select id="course" required disabled={Boolean(batch) || Boolean(courseLoadError) || !courses.length} value={courseId} onChange={(event) => { setCourseId(event.target.value); setFormError(""); }} className={inputClass()}>
              <option value="">{courses.length ? "Select a course" : "No courses available"}</option>
              {availableCourses.map((course) => <option key={course.id} value={course.id}>{course.course_code} · {course.title}</option>)}
            </select>
            {selectedCourse && <dl className="mt-4 grid gap-3 rounded-2xl bg-blue-50/70 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Info label="Course title" value={selectedCourse.title} /><Info label="Course code" value={selectedCourse.course_code} /><Info label="Academic level" value={enumLabel(selectedCourse.academic_level)} /><Info label="Semester" value={enumLabel(selectedCourse.semester)} /></dl>}
            
{canCreateCourse && !batch && (
  <div className="mt-4">
    <button
      type="button"
      onClick={() => {
        setShowCreateCourse((current) => !current);
        setFormError("");
      }}
      className="rounded-full border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50"
    >
      {showCreateCourse ? "Cancel" : "+ Create New Course"}
    </button>

    {showCreateCourse && (
      <div className="mt-4 space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <h3 className="font-bold text-blue-950">Create a course</h3>

        <div>
          <label htmlFor="new-course-code" className="text-sm font-semibold">
            Course code
          </label>
          <input
            id="new-course-code"
            maxLength={40}
            value={newCourseCode}
            onChange={(event) => setNewCourseCode(event.target.value)}
            placeholder="e.g. INFT 301"
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="new-course-title" className="text-sm font-semibold">
            Course title
          </label>
          <input
            id="new-course-title"
            maxLength={200}
            value={newCourseTitle}
            onChange={(event) => setNewCourseTitle(event.target.value)}
            placeholder="e.g. Data Mining"
            className={inputClass()}
          />
        </div>

        <div>
          <label htmlFor="new-course-level" className="text-sm font-semibold">
            Academic level
          </label>
          <select
            id="new-course-level"
            value={newCourseLevel}
            onChange={(event) =>
              setNewCourseLevel(
                event.target.value as Course["academic_level"]
              )
            }
            className={inputClass()}
          >
            <option value="level_100">Level 100</option>
            <option value="level_200">Level 200</option>
            <option value="level_300">Level 300</option>
            <option value="level_400">Level 400</option>
          </select>
        </div>

        <div>
          <label htmlFor="new-course-semester" className="text-sm font-semibold">
            Semester
          </label>
          <select
            id="new-course-semester"
            value={newCourseSemester}
            onChange={(event) =>
              setNewCourseSemester(
                event.target.value as Course["semester"]
              )
            }
            className={inputClass()}
          >
            <option value="semester_1">Semester 1</option>
            <option value="semester_2">Semester 2</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleCreateCourse}
          disabled={isCreatingCourse || Boolean(batch)}
          className="rounded-full bg-blue-800 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-60"
        >
          {isCreatingCourse ? "Creating..." : "Create and Select Course"}
        </button>
      </div>
    )}
  </div>
)}

            <div className="mt-4 max-w-sm"><label htmlFor="category" className="text-sm font-semibold text-slate-700">Resource category <span aria-hidden="true" className="text-red-600">*</span></label><select id="category" required disabled={Boolean(batch)} value={category} onChange={(event) => { setCategory(event.target.value); setFormError(""); }} className={inputClass()}><option value="">Select category</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          </section>

          <section aria-labelledby="files-title" className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(30,64,175,.5)] sm:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">Step 2 · Documents</p><h2 id="files-title" className="mt-1 text-xl font-bold text-blue-950">Add course files</h2><p className="mt-1 text-sm text-slate-500">Choose multiple documents or drop them below. Each file is checked independently.</p></div><div className="flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-900"><span>{files.length} {files.length === 1 ? "file" : "files"}</span><span className="text-blue-300">·</span><span>{formatFileSize(totalSize)} total</span></div></div>
            <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={handleDrop} className={`rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${dragging ? "border-blue-600 bg-blue-50" : "border-blue-200 bg-[#f8faff] hover:border-blue-400"}`}>
              <input ref={fileInputRef} id="resource-files" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={handleFileSelection} className="sr-only" aria-describedby="file-help" />
              <input ref={replaceInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" onChange={replaceFile} className="sr-only" aria-label="Choose replacement file" />
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-800" aria-hidden="true">⇧</div><p className="mt-4 font-semibold text-blue-950">Drag and drop multiple files here</p><p className="mt-1 text-sm text-slate-500">or</p>
              <label htmlFor="resource-files" className={`mt-3 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm focus-within:ring-4 focus-within:ring-blue-200 ${batch ? "cursor-not-allowed bg-slate-400" : "cursor-pointer bg-blue-800 hover:bg-blue-900"}`}>Browse files</label>
              <p id="file-help" className="mt-4 text-xs text-slate-500">PDF, DOC, DOCX, PPT, PPTX, TXT · Maximum 20 MiB per file</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2" aria-live="polite"><p className="text-sm text-slate-600">{validCount} valid resources · {rejectedCount} rejected · {uploadedCount} uploaded</p><button type="button" onClick={resetBatch} disabled={isSubmitting || isCleaning} className="rounded-full px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50">{isCleaning ? "Cleaning…" : batch && uploadedCount < validCount ? "Clean up / reset" : "Clear all / new batch"}</button></div>
            {rejectedNotice && <p role="status" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{rejectedNotice}</p>}
            {files.length > 0 && <div className="mt-4 space-y-3">{files.map((item, index) => {
              const extension = item.file.name.split(".").pop()?.toUpperCase() ?? "FILE";
              const titleError = !item.title.trim() || item.title.length > 200;
              const invalid = Boolean(item.error || titleError);
              const statusLabel = item.status === "uploaded" ? "Uploaded · pending review" : item.status === "uploading" ? "Uploading…" : item.status === "failed" ? "Upload failed" : invalid ? "Needs attention" : "Validated · ready";
              return <article key={item.id} className={`rounded-2xl border p-4 ${invalid ? "border-amber-200 bg-amber-50/50" : "border-blue-100 bg-white"}`} aria-label={`Resource ${index + 1}: ${item.file.name}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[10px] font-extrabold text-blue-800">{extension}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="max-w-full truncate text-sm font-semibold text-blue-950" title={item.file.name}>{item.file.name}</p><span className="text-xs text-slate-500">{extension} · {formatFileSize(item.file.size)}</span></div><label htmlFor={`resource-title-${item.id}`} className="mt-3 block text-xs font-semibold text-slate-600">Resource title (editable)</label><input id={`resource-title-${item.id}`} disabled={Boolean(batch)} maxLength={200} value={item.title} onChange={(event) => updateTitle(item.id, event.target.value)} placeholder="e.g. Lecture 1" className={inputClass(titleError ? "Enter a title of 1 to 200 characters." : "")} aria-invalid={titleError} />{item.error && <p role="alert" className="mt-2 text-xs font-medium text-amber-900">Rejected: {item.error}</p>}{item.uploadError && <p role="alert" className="mt-2 text-xs font-medium text-red-800">{item.uploadError}</p>}<p className={`mt-2 text-xs font-medium ${item.status === "uploaded" ? "text-emerald-800" : item.status === "failed" || invalid ? "text-amber-900" : "text-slate-500"}`}>{statusLabel}</p></div><div className="flex shrink-0 gap-2 sm:justify-end"><button type="button" disabled={Boolean(batch)} onClick={() => { replaceId.current = item.id; replaceInputRef.current?.click(); }} className="rounded-full border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50 disabled:opacity-40">Replace</button><button type="button" disabled={Boolean(batch)} onClick={() => removeFile(item.id)} aria-label={`Remove ${item.file.name} from batch`} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40">Remove</button></div></div>
              </article>;
            })}</div>}
          </section>

          {formError && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{formError}</p>}
          {feedback && <p role="status" aria-live="polite" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-900">{feedback}</p>}
          {isSubmitting && <p role="status" aria-live="polite" className="text-sm font-semibold text-blue-900">Uploading {uploadedCount} of {validCount} valid files…</p>}
          <div className="flex flex-col-reverse gap-3 border-t border-blue-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-xs leading-5 text-slate-500">Files are submitted as private pending resources. Authorized reviewers must approve each file before it appears publicly.</p><button type="submit" disabled={isSubmitting || isCleaning || !availableCourses.length || Boolean(batch && uploadedCount === validCount && validCount > 0)} className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-800 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-70">{isSubmitting ? "Uploading…" : batch && failedUploadCount ? `Retry failed files · ${failedUploadCount}` : batch && uploadedCount === validCount ? "Batch submitted" : `Submit batch${validCount ? ` · ${validCount}` : ""}`}<span aria-hidden="true">→</span></button></div>
        </form>
      </div>
    </main>
  );
}

function inputClass(error?: string) {
  return `mt-1.5 w-full rounded-xl border bg-[#f8faff] px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${error ? "border-red-300 focus:border-red-500 focus:ring-red-100" : "border-slate-200 focus:border-blue-600 focus:ring-blue-100"}`;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-blue-700">{label}</dt><dd className="mt-1 font-semibold text-blue-950">{value}</dd></div>;
}

