// base url of the share-link redirector (if hosted, e.g. https://link.spoplayer.app)
export const SHARE_BASE_URL = (import.meta.env.VITE_SHARE_BASE_URL as string | undefined) || "";

export type ShareEntityType = "artist" | "album" | "playlist" | "track";

// builds a public share link, falling back to music.youtube.com so recipients can open it anywhere
export function buildShareUrl(type: ShareEntityType, id: string): string {
  if (SHARE_BASE_URL) {
    return `${SHARE_BASE_URL}/${type}?id=${encodeURIComponent(id)}`;
  }
  if (type === "track") {
    return `https://music.youtube.com/watch?v=${encodeURIComponent(id)}`;
  }
  if (type === "playlist") {
    return `https://music.youtube.com/playlist?list=${encodeURIComponent(id)}`;
  }
  if (type === "artist") {
    return `https://music.youtube.com/channel/${encodeURIComponent(id)}`;
  }
  return `spoplayer://${type}?id=${encodeURIComponent(id)}`;
}
