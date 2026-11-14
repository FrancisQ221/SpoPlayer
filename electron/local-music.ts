import fs from "node:fs";
import path from "node:path";

export interface LocalTrackInfo {
  id: string;
  filePath: string;
  title: string;
  artists: string;
  album: string;
  year?: string;
  durationMs: number;
  coverUrl: string;
  fileSizeBytes: number;
  dateModified: number;
}

const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".flac",
  ".wav",
  ".m4a",
  ".ogg",
  ".aac",
  ".opus",
  ".wma",
]);

/**
 * Strips common download tags and clutter from song/artist titles
 */
function cleanSongName(raw: string): string {
  return raw
    .replace(/\s*[\(\[](?:SPOTISAVER|Official\s*Audio|Official\s*Video|Lyric\s*Video|Lyrics|Remastered|HD|HQ|1080p|720p|320kbps)[\)\]]/gi, "")
    .replace(/^[\d\s.\-_]+/, "") // strip leading track numbers like "01. " or "01 - "
    .trim();
}

/**
 * Parses ID3v2 tags from an audio file buffer (supports ID3v2.2, 2.3, 2.4)
 */
function parseId3Tags(filePath: string): {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  durationMs?: number;
  coverUrl?: string;
} | null {
  try {
    const fd = fs.openSync(filePath, "r");
    const header = Buffer.alloc(10);
    fs.readSync(fd, header, 0, 10, 0);

    if (header.toString("ascii", 0, 3) !== "ID3") {
      fs.closeSync(fd);
      return null;
    }

    const version = header[3]; // 2, 3, or 4
    const tagSize =
      ((header[6] & 0x7f) << 21) |
      ((header[7] & 0x7f) << 14) |
      ((header[8] & 0x7f) << 7) |
      (header[9] & 0x7f);

    // Read at most 2MB of tags to avoid excessive memory on giant embedded art
    const readLen = Math.min(tagSize, 2 * 1024 * 1024);
    const tagBuf = Buffer.alloc(readLen);
    fs.readSync(fd, tagBuf, 0, readLen, 10);
    fs.closeSync(fd);

    let title = "";
    let artist = "";
    let album = "";
    let year = "";
    let durationMs: number | undefined;
    let coverUrl = "";

    let pos = 0;
    while (pos + 10 < readLen) {
      const id = tagBuf.toString("ascii", pos, pos + 4);
      if (!id || id.charCodeAt(0) === 0) break;

      let size = 0;
      if (version === 4) {
        // ID3v2.4 synchsafe
        size =
          ((tagBuf[pos + 4] & 0x7f) << 21) |
          ((tagBuf[pos + 5] & 0x7f) << 14) |
          ((tagBuf[pos + 6] & 0x7f) << 7) |
          (tagBuf[pos + 7] & 0x7f);
      } else {
        // ID3v2.3 standard uint32
        size = tagBuf.readUInt32BE(pos + 4);
      }

      if (size <= 0 || pos + 10 + size > readLen) break;
      const data = tagBuf.subarray(pos + 10, pos + 10 + size);

      const decodeText = (d: Buffer): string => {
        if (!d || d.length <= 1) return "";
        const enc = d[0];
        let text = "";
        if (enc === 0) text = d.toString("latin1", 1);
        else if (enc === 1) text = d.toString("utf16le", 3);
        else if (enc === 2) {
          const swapped = Buffer.from(d.subarray(3));
          swapped.swap16();
          text = swapped.toString("utf16le");
        } else if (enc === 3) text = d.toString("utf8", 1);
        return text.replace(/\0+$/, "").trim();
      };

      if (id === "TIT2") {
        title = decodeText(data);
      } else if (id === "TPE1") {
        artist = decodeText(data);
      } else if (id === "TALB") {
        album = decodeText(data);
      } else if (id === "TYER" || id === "TDRC") {
        year = decodeText(data).slice(0, 4);
      } else if (id === "TLEN") {
        const parsed = parseInt(decodeText(data), 10);
        if (!isNaN(parsed) && parsed > 0) durationMs = parsed;
      } else if (id === "APIC" && !coverUrl) {
        // Find image start magic
        for (let i = 0; i < Math.min(128, data.length - 4); i++) {
          if (data[i] === 0xff && data[i + 1] === 0xd8) {
            const imgBuf = data.subarray(i);
            coverUrl = `data:image/jpeg;base64,${imgBuf.toString("base64")}`;
            break;
          }
          if (
            data[i] === 0x89 &&
            data[i + 1] === 0x50 &&
            data[i + 2] === 0x4e &&
            data[i + 3] === 0x47
          ) {
            const imgBuf = data.subarray(i);
            coverUrl = `data:image/png;base64,${imgBuf.toString("base64")}`;
            break;
          }
        }
      }

      pos += 10 + size;
    }

    return { title, artist, album, year, durationMs, coverUrl };
  } catch {
    return null;
  }
}

/**
 * Parses metadata for a single local audio file
 */
export async function parseLocalAudioFile(filePath: string): Promise<LocalTrackInfo | null> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_AUDIO_EXTENSIONS.has(ext)) return null;

    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) return null;

    const fileName = path.basename(filePath, ext);
    let title = "";
    let artists = "";
    let album = "";
    let year: string | undefined;
    let durationMs = 0;
    let coverUrl = "";

    // 1. Try ID3 parser
    const id3 = parseId3Tags(filePath);
    if (id3) {
      if (id3.title) title = cleanSongName(id3.title);
      if (id3.artist) artists = cleanSongName(id3.artist);
      if (id3.album) album = cleanSongName(id3.album);
      if (id3.year) year = id3.year;
      if (id3.durationMs) durationMs = id3.durationMs;
      if (id3.coverUrl) coverUrl = id3.coverUrl;
    }

    // 2. Fallback to filename parsing
    if (!title || !artists) {
      const parts = fileName.split(/\s+-\s+/);
      if (parts.length >= 2) {
        if (!artists) artists = cleanSongName(parts[0]);
        if (!title) title = cleanSongName(parts.slice(1).join(" - "));
      } else {
        if (!title) title = cleanSongName(fileName);
        if (!artists) artists = "Artista local";
      }
    }

    if (!album) {
      // Use parent folder name as album if reasonable
      const parentDir = path.basename(path.dirname(filePath));
      album = parentDir && parentDir !== "Music" && parentDir !== "Música" ? parentDir : "Álbum local";
    }

    // Rough duration estimation if tag didn't contain TLEN (average 256kbps = 32KB/s)
    if (!durationMs || durationMs <= 0) {
      durationMs = Math.round((stats.size / (32 * 1024)) * 1000);
      if (durationMs <= 0 || durationMs > 3 * 3600 * 1000) {
        durationMs = 180000; // 3 min fallback
      }
    }

    const id = `local:${encodeURIComponent(filePath)}`;

    return {
      id,
      filePath,
      title: title || "Pista local",
      artists: artists || "Artista local",
      album: album || "Álbum local",
      year,
      durationMs,
      coverUrl,
      fileSizeBytes: stats.size,
      dateModified: stats.mtimeMs,
    };
  } catch (err) {
    console.warn(`[LocalMusic] Failed to parse file ${filePath}:`, err);
    return null;
  }
}

/**
 * Scans directories recursively (up to maxDepth) and parses all audio files found
 */
export async function scanDirectories(
  directories: string[],
  maxDepth = 4,
): Promise<LocalTrackInfo[]> {
  const seenPaths = new Set<string>();
  const tracks: LocalTrackInfo[] = [];

  async function walk(dirPath: string, currentDepth: number) {
    if (currentDepth > maxDepth) return;
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue; // skip hidden folders
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and system folders
          if (
            entry.name === "node_modules" ||
            entry.name === "$RECYCLE.BIN" ||
            entry.name === "System Volume Information"
          ) {
            continue;
          }
          await walk(fullPath, currentDepth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (SUPPORTED_AUDIO_EXTENSIONS.has(ext)) {
            if (!seenPaths.has(fullPath)) {
              seenPaths.add(fullPath);
              const track = await parseLocalAudioFile(fullPath);
              if (track) tracks.push(track);
            }
          }
        }
      }
    } catch {
      // Skip folders without permission
    }
  }

  for (const dir of directories) {
    if (dir && fs.existsSync(dir)) {
      await walk(dir, 0);
    }
  }

  // Sort by Artist, then Title
  return tracks.sort((a, b) =>
    a.artists.localeCompare(b.artists) || a.title.localeCompare(b.title),
  );
}
