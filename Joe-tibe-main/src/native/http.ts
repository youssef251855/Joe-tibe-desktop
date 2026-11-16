// HTTP على مستوى النظام (Android) عبر CapacitorHttp: بلا قيود CORS، والطلب يخرج من إنترنت المستخدم نفسه.
import { CapacitorHttp } from "@capacitor/core";

export interface NInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string | URLSearchParams;
  signal?: AbortSignal;
  redirect?: "follow" | "manual";
  timeoutMs?: number;
}

export interface NResponse {
  ok: boolean;
  status: number;
  url: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  json(): Promise<any>;
}

function headerGetter(raw: Record<string, string> | undefined) {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(raw || {})) map.set(k.toLowerCase(), String(v));
  return { get: (name: string) => map.get(name.toLowerCase()) ?? null };
}

export async function nfetch(url: string, init: NInit = {}): Promise<NResponse> {
  const headers: Record<string, string> = { ...(init.headers || {}) };
  const ctKey = Object.keys(headers).find((k) => k.toLowerCase() === "content-type");
  let data: any = undefined;

  if (init.body instanceof URLSearchParams) {
    if (!ctKey) headers["Content-Type"] = "application/x-www-form-urlencoded";
    data = Object.fromEntries(init.body.entries());
  } else if (typeof init.body === "string") {
    const ct = (ctKey ? headers[ctKey] : "").toLowerCase();
    if (ct.includes("json")) {
      try { data = JSON.parse(init.body); } catch { data = init.body; }
    } else {
      data = init.body;
    }
  }

  if (init.signal?.aborted) throw new Error("aborted");

  const req = CapacitorHttp.request({
    url,
    method: (init.method || "GET").toUpperCase(),
    headers,
    data,
    responseType: "text",
    connectTimeout: init.timeoutMs ?? 15000,
    readTimeout: init.timeoutMs ?? 20000,
    disableRedirects: init.redirect === "manual",
    shouldEncodeUrlParams: false
  });

  const abort = new Promise<never>((_, rej) => {
    init.signal?.addEventListener("abort", () => rej(new Error("timeout/abort")), { once: true });
  });

  const r: any = await Promise.race([req, abort]);
  const text = typeof r.data === "string" ? r.data : r.data == null ? "" : JSON.stringify(r.data);
  return {
    ok: r.status >= 200 && r.status < 300,
    status: r.status,
    url: r.url || url,
    headers: headerGetter(r.headers),
    text: async () => text,
    json: async () => JSON.parse(text)
  };
}
