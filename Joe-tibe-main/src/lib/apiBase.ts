// Configurable API base so the frontend can be hosted separately (e.g. Vercel) while the
// backend runs elsewhere (e.g. Render). Set VITE_API_BASE=https://<render-url> at build time.
// When empty (default), requests stay same-origin — identical to the previous behaviour.
const RAW_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || "";

export const API_BASE = RAW_BASE.replace(/\/+$/, "");

// Prefix a server path (/api/...) with the configured backend origin.
// - No-op when API_BASE is empty (single-origin deploy).
// - Leaves already-absolute URLs (https://…) untouched (e.g. googlevideo CDN links).
export function apiUrl(path: string): string {
  if (!API_BASE) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
}
