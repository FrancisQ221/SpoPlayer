import https from "node:https";
import http from "node:http";

/**
 * Pure TypeScript ID3v2.3 Tag Builder & Embedder
 *
 * Encodes ID3v2.3 tags with UTF-16LE text and APIC HD cover art.
 * Universally recognized by Windows Explorer, Groove, VLC, iTunes, Android, and car stereos.
 */

function encodeSynchsafeInt(val: number): Buffer {
  const b = Buffer.alloc(4);
  b[0] = (val >> 21) & 0x7f;
  b[1] = (val >> 14) & 0x7f;
  b[2] = (val >> 7) & 0x7f;
  b[3] = val & 0x7f;
  return b;
}

function createTextFrame(frameId: string, text: string): Buffer {
  // ID3v2.3 text frame with UTF-16LE and BOM (0xFF, 0xFE)
  // Encoding byte: 0x01 = Unicode with BOM
  const textBuf = Buffer.from(text, "utf16le");
  const content = Buffer.concat([Buffer.from([0x01, 0xff, 0xfe]), textBuf]);

  const header = Buffer.alloc(10);
  header.write(frameId, 0, 4, "ascii");
  header.writeUInt32BE(content.length, 4);
  header.writeUInt16BE(0, 8); // flags

  return Buffer.concat([header, content]);
}

function createApicFrame(imageBuffer: Buffer, mimeType: string = "image/jpeg"): Buffer {
  // APIC frame structure:
  // [Header 10 bytes]
  // [Encoding 1 byte: 0x00 (ISO-8859-1 for mime/desc)]
  // [MIME type string + 0x00]
  // [Picture type: 0x03 (Cover Front)]
  // [Description string + 0x00]
  // [Binary image data]
  const mimeBuf = Buffer.from(mimeType + "\0", "latin1");
  const prefix = Buffer.from([0x00]);
  const picType = Buffer.from([0x03]); // Cover (front)
  const desc = Buffer.from([0x00]); // empty description

  const content = Buffer.concat([prefix, mimeBuf, picType, desc, imageBuffer]);

  const header = Buffer.alloc(10);
  header.write("APIC", 0, 4, "ascii");
  header.writeUInt32BE(content.length, 4);
  header.writeUInt16BE(0, 8);

  return Buffer.concat([header, content]);
}

export interface ExportTrackMetadata {
  title: string;
  artist: string;
  album?: string;
  year?: string;
  coverImage?: Buffer | null;
  coverMimeType?: string;
}

export function buildId3Tag(meta: ExportTrackMetadata): Buffer {
  const frames: Buffer[] = [];
  if (meta.title) frames.push(createTextFrame("TIT2", meta.title));
  if (meta.artist) frames.push(createTextFrame("TPE1", meta.artist));
  if (meta.album) frames.push(createTextFrame("TALB", meta.album));
  if (meta.year) frames.push(createTextFrame("TYER", meta.year));
  if (meta.coverImage && meta.coverImage.length > 0) {
    frames.push(createApicFrame(meta.coverImage, meta.coverMimeType || "image/jpeg"));
  }

  const framesBuffer = Buffer.concat(frames);

  // 10-byte ID3v2 header
  const header = Buffer.alloc(10);
  header.write("ID3", 0, 3, "ascii");
  header[3] = 0x03; // version 2.3.0
  header[4] = 0x00;
  header[5] = 0x00; // flags
  const synchsafe = encodeSynchsafeInt(framesBuffer.length);
  synchsafe.copy(header, 6);

  return Buffer.concat([header, framesBuffer]);
}

export function attachId3ToAudio(audioBuffer: Buffer, meta: ExportTrackMetadata): Buffer {
  let offset = 0;
  // If the source audio already has an old/incomplete ID3 tag at the beginning, strip it
  if (
    audioBuffer.length >= 10 &&
    audioBuffer[0] === 0x49 && // 'I'
    audioBuffer[1] === 0x44 && // 'D'
    audioBuffer[2] === 0x33    // '3'
  ) {
    const existingTagSize =
      ((audioBuffer[6] & 0x7f) << 21) |
      ((audioBuffer[7] & 0x7f) << 14) |
      ((audioBuffer[8] & 0x7f) << 7) |
      (audioBuffer[9] & 0x7f);
    offset = 10 + existingTagSize;
    if (offset > audioBuffer.length) {
      offset = 0;
    }
  }

  const tagBuffer = buildId3Tag(meta);
  const audioBody = offset > 0 ? audioBuffer.subarray(offset) : audioBuffer;
  return Buffer.concat([tagBuffer, audioBody]);
}

export async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!url || !url.startsWith("http")) return null;
  return new Promise((resolve) => {
    try {
      const client = url.startsWith("https") ? https : http;
      client.get(url, { timeout: 8000 }, (res) => {
        if ((res.statusCode ?? 0) >= 400) {
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const mimeType = res.headers["content-type"] || "image/jpeg";
          resolve({ buffer, mimeType: mimeType.split(";")[0] });
        });
      }).on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });
}
