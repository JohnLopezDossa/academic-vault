type ZipFile = { name: string; url: string; expectedSize: number };
type DirectoryEntry = { name: Uint8Array; crc: number; size: number; offset: number };

const crcTable = new Uint32Array(256);
for (let n = 0; n < crcTable.length; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  crcTable[n] = value >>> 0;
}

const u16 = (value: number) => Uint8Array.of(value & 255, (value >>> 8) & 255);
const u32 = (value: number) => Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);
function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function crcUpdate(crc: number, bytes: Uint8Array) {
  let value = crc;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  return value >>> 0;
}

async function* zipChunks(files: ZipFile[], maxBytes: number, signal: AbortSignal) {
  const encoder = new TextEncoder();
  const directory: DirectoryEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const localOffset = offset;
    const header = concat([
      u32(0x04034b50), u16(20), u16(0x0808), u16(0), u16(0), u16(0),
      u32(0), u32(0), u32(0), u16(name.length), u16(0), name,
    ]);
    yield header;
    offset += header.length;

    let response: Response;
    try { response = await fetch(file.url, { cache: "no-store", signal }); }
    catch { throw new Error(`Could not retrieve “${file.name.split("/").at(-1)}” from storage.`); }
    if (!response.ok || !response.body) throw new Error(`Storage could not provide “${file.name.split("/").at(-1)}” (HTTP ${response.status}).`);

    const reader = response.body.getReader();
    let crc = 0xffffffff;
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (offset + value.byteLength > maxBytes) throw new Error("The downloaded collection exceeded its ZIP size limit.");
        if (size > file.expectedSize) throw new Error(`Stored file “${file.name.split("/").at(-1)}” is larger than its recorded size.`);
        crc = crcUpdate(crc, value);
        offset += value.byteLength;
        yield value;
      }
    } catch (error) {
      await reader.cancel(error).catch(() => undefined);
      throw error;
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    if (size !== file.expectedSize) throw new Error(`Stored file “${file.name.split("/").at(-1)}” did not match its recorded size.`);

    crc = (crc ^ 0xffffffff) >>> 0;
    const descriptor = concat([u32(0x08074b50), u32(crc), u32(size), u32(size)]);
    yield descriptor;
    offset += descriptor.length;
    directory.push({ name, crc, size, offset: localOffset });
  }

  const directoryStart = offset;
  for (const entry of directory) {
    const header = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0808), u16(0), u16(0), u16(0),
      u32(entry.crc), u32(entry.size), u32(entry.size), u16(entry.name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(entry.offset), entry.name,
    ]);
    yield header;
    offset += header.length;
  }
  const directorySize = offset - directoryStart;
  yield concat([
    u32(0x06054b50), u16(0), u16(0), u16(directory.length), u16(directory.length),
    u32(directorySize), u32(directoryStart), u16(0),
  ]);
}

/**
 * Produces a ZIP32 archive with store-only entries. File bytes flow directly
 * from Storage to the destination; only one source chunk and the small central
 * directory (at most 50 records) are retained at a time.
 */
export function createStreamingZip(files: ZipFile[], maxBytes: number) {
  const abortController = new AbortController();
  const iterator = zipChunks(files, maxBytes, abortController.signal);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel(reason) {
      abortController.abort(reason);
      await iterator.return?.(reason);
    },
  });
}
