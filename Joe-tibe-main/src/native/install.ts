// عند التشغيل داخل تطبيق Android: نعترض طلبات /api/* ونخدمها محليًا بدل إرسالها لأي خادم.
import { Capacitor } from "@capacitor/core";
import { handleApi } from "./api";

export function installNativeApi(): void {
  if (!Capacitor.isNativePlatform()) return;

  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let u: URL;
    try { u = new URL(raw, window.location.href); } catch { return original(input, init); }

    const isLocalApi = u.origin === window.location.origin && (u.pathname.startsWith("/api/") || u.pathname === "/ping");
    if (!isLocalApi) return original(input, init);

    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const method = (init?.method || (typeof input === "object" && "method" in input ? (input as Request).method : "GET")).toUpperCase();
    const result = await handleApi(u.pathname, u.searchParams, method);

    const headers = new Headers({ "Cache-Control": "no-store", ...(result.headers || {}) });
    if (result.body !== undefined && typeof result.body !== "string") headers.set("Content-Type", "application/json; charset=utf-8");
    const body = method === "HEAD" || result.body === undefined ? null : typeof result.body === "string" ? result.body : JSON.stringify(result.body);
    return new Response(body, { status: result.status, headers });
  };
}
