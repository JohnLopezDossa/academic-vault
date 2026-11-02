import { createPublicStorageClient } from "@/lib/supabase/client";
import { createStreamingZip } from "@/lib/zip-stream";

const MIB = 1024 * 1024;
const MAX_FILES = 50;
const MAX_ARCHIVE_BYTES = 100 * MIB;
const categoryFolders: Record<string, string> = {
  lecture_notes: "Lecture-Notes", slides: "Lecture-Slides", past_questions: "Past-Questions",
  assignments: "Assignments", textbooks: "Textbooks", other: "Other",
};

export type LibraryDownloadResource = {
  id: string;
  title: string;
  category: string;
  file_name: string;
  file_size_bytes: number;
  storage_path: string;
  courses: { id: string; course_code: string; academic_level: string };
};

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: { suggestedName: string }) => Promise<{
    createWritable: () => Promise<WritableStream<Uint8Array>>;
  }>;
};

const clean = (value: string) => value.normalize("NFKD").replace(/[^\w .()-]/g, "_").replace(/[. ]+$/g, "").trim().slice(0, 120) || "Resource";

export async function downloadLibraryZip(resources: LibraryDownloadResource[], suggestedName: string) {
  const picker = (window as SavePickerWindow).showSaveFilePicker;
  if (!picker) {
    throw new Error("Your browser cannot save a large ZIP as a stream. Use a supported desktop or Android browser, or download individual files.");
  }
  if (resources.length > MAX_FILES) {
    throw new Error("This collection has more than 50 files. Download individual course collections or files instead.");
  }
  if (resources.length === 0) throw new Error("There are no approved files in this collection yet.");

  const files = resources.map((resource) => ({
    name: `${clean(resource.courses.course_code)}/${categoryFolders[resource.category] ?? "Other"}/${clean(resource.file_name)}`,
    storagePath: resource.storage_path,
    expectedSize: Number(resource.file_size_bytes),
  }));
  const totalBytes = files.reduce((total, file) => total + file.expectedSize, 0);
  const encoder = new TextEncoder();
  const archiveBytes = totalBytes + files.reduce((total, file) => total + 92 + encoder.encode(file.name).length * 2, 0) + 22;
  if (archiveBytes > MAX_ARCHIVE_BYTES) {
    throw new Error("This collection exceeds the 100 MiB ZIP limit. Download individual course collections or files instead.");
  }

  // Start the save picker directly from the user's click, then get short-lived
  // URLs for approved private objects. Storage RLS enforces approval.
  const handle = await picker.call(window, { suggestedName });
  const supabase = createPublicStorageClient();
  const { data: signed, error } = await supabase.storage
    .from("academic-resources")
    .createSignedUrls(files.map((file) => file.storagePath), 300, { download: true });
  if (error || !signed || signed.length !== files.length) {
    throw new Error("Could not authorize the approved files. Please try again.");
  }
  const zipFiles = files.map((file, index) => {
    const item = signed[index];
    return item?.signedUrl && !item.error
      ? { name: file.name, url: item.signedUrl, expectedSize: file.expectedSize }
      : null;
  });
  const failedIndex = zipFiles.findIndex((file) => file === null);
  if (failedIndex >= 0) throw new Error(`Could not authorize “${resources[failedIndex].file_name}” for download.`);

  await createStreamingZip(zipFiles as Array<{ name: string; url: string; expectedSize: number }>, MAX_ARCHIVE_BYTES)
    .pipeTo(await handle.createWritable());
}
