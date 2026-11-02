import { createPublicStorageClient } from "@/lib/supabase/client";
import { createStreamingZip } from "@/lib/zip-stream";

const MIB = 1024 * 1024;
const MAX_FILES = 50;
const MAX_ARCHIVE_BYTES = 100 * MIB;
const FALLBACK_MAX_BYTES = 50 * MIB;
const IOS_FALLBACK_MAX_BYTES = 25 * MIB;
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

export type ZipDownloadProgress = {
  bytesWritten: number;
  expectedBytes: number;
  method: "stream" | "blob";
};

const clean = (value: string) => value.normalize("NFKD").replace(/[^\w .()-]/g, "_").replace(/[. ]+$/g, "").trim().slice(0, 120) || "Resource";

function getSavePicker() {
  return (window as SavePickerWindow).showSaveFilePicker;
}

function isIOSBrowser() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function fallbackLimit() {
  return isIOSBrowser() ? IOS_FALLBACK_MAX_BYTES : FALLBACK_MAX_BYTES;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
  } finally {
    link?.remove();
    // Safari can defer reading the object URL until its download UI opens.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export async function downloadLibraryZip(
  resources: LibraryDownloadResource[],
  suggestedName: string,
  onProgress?: (progress: ZipDownloadProgress) => void,
) {
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

  const picker = getSavePicker();
  const isStreamingSave = typeof picker === "function";
  const maxBlobBytes = fallbackLimit();
  if (!isStreamingSave && archiveBytes > maxBlobBytes) {
    throw new Error(`This browser's memory-safe ZIP limit is ${isIOSBrowser() ? "25 MiB" : "50 MiB"}. Use a desktop browser that supports streaming file saves, or download individual course collections or files.`);
  }

  // Open the picker synchronously from the click before signing URLs; browsers
  // can expire the user gesture during network work.
  let writable: WritableStream<Uint8Array> | undefined;
  if (picker) {
    try {
      const handle = await picker.call(window, { suggestedName });
      writable = await handle.createWritable();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new Error("The save dialog could not be opened. Check your browser download permissions and try again.");
    }
  }

  // Anonymous signing preserves public Storage RLS; only approved paths receive URLs.
  let signingResult;
  try {
    const supabase = createPublicStorageClient();
    signingResult = await supabase.storage
      .from("academic-resources")
      .createSignedUrls(files.map((file) => file.storagePath), 300, { download: true });
  } catch {
    await writable?.abort(new Error("Signed URL request failed")).catch(() => undefined);
    throw new Error("Could not authorize the approved files. Please try again.");
  }
  const { data: signed, error } = signingResult;
  if (error || !signed || signed.length !== files.length) {
    await writable?.abort(error ?? new Error("Signed URL response was incomplete")).catch(() => undefined);
    throw new Error("Could not authorize the approved files. Please try again.");
  }
  const zipFiles = files.map((file, index) => {
    const item = signed[index];
    return item?.signedUrl && !item.error
      ? { name: file.name, url: item.signedUrl, expectedSize: file.expectedSize }
      : null;
  });
  const failedIndex = zipFiles.findIndex((file) => file === null);
  if (failedIndex >= 0) {
    await writable?.abort(new Error("A resource URL could not be signed")).catch(() => undefined);
    throw new Error(`Could not authorize “${resources[failedIndex].file_name}” for download.`);
  }

  const stream = createStreamingZip(zipFiles as Array<{ name: string; url: string; expectedSize: number }>, MAX_ARCHIVE_BYTES);
  const reader = stream.getReader();
  let bytesWritten = 0;
  const chunks: Uint8Array[] = [];
  const writer = writable?.getWriter();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesWritten += value.byteLength;
      if (bytesWritten > MAX_ARCHIVE_BYTES) throw new Error("The downloaded collection exceeded the 100 MiB ZIP limit.");
      if (writer) await writer.write(value);
      else {
        if (bytesWritten > maxBlobBytes) {
          throw new Error(`This browser's memory-safe ZIP limit is ${isIOSBrowser() ? "25 MiB" : "50 MiB"}. Download individual course collections or files instead.`);
        }
        chunks.push(value);
      }
      onProgress?.({ bytesWritten, expectedBytes: archiveBytes, method: writer ? "stream" : "blob" });
    }
    if (writer) await writer.close();
    else {
      const blob = new Blob(chunks as unknown as BlobPart[], { type: "application/zip" });
      try {
        saveBlob(blob, suggestedName);
      } catch {
        throw new Error("Your browser blocked the ZIP download. Allow downloads for this site and try again. In Safari, the ZIP may open in a new tab; use Share, then Save to Files.");
      }
    }
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    await writer?.abort(error).catch(() => undefined);
    if (error instanceof Error && /storage|stored file|collection exceeded|memory-safe/i.test(error.message)) throw error;
    throw error;
  } finally {
    reader.releaseLock();
    writer?.releaseLock();
  }
}
