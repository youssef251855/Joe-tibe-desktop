// JoeTube extraction worker — a tiny standalone HTTP service that runs yt-dlp
// (with the bgutil PO-token provider) on a server whose traffic is not blocked by
// YouTube's datacenter bot-check. Deploy this image to a 24/7 host (Koyeb/fly/Render).
//
// It exposes exactly what the Vercel backend's delegation expects:
//   GET  /api/stream?id=&format=&title=   -> resolves with yt-dlp and streams the media bytes
//                                            (CORS + Range supported so the browser downloads directly)
// It also keeps:
//   GET  /ping                            -> health
//   POST /resolve {id,format}             -> returns the resolved URL as JSON (used by older callers)
//
// Env:
//   PORT        listen port (host injects this; defaults to 8080)
//   WORKER_KEY  optional shared secret; when set, /api/stream and /resolve require it

const http = require("http");
const { spawn } = require("child_process");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8080);
const KEY = process.env.WORKER_KEY || "";
const BIN = process.env.YT_DLP_BIN || "yt-dlp";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

function ytFormat(format) {
  const f = (format || "").toLowerCase();
  const isAudio = f === "mp3" || f === "aac" || f === "opus" || /^\d+$/.test(f) || f.includes("audio");
  const m = f.match(/(\d+)p/);
  const h = m ? parseInt(m[1], 10) : null;
  if (isAudio) return { sel: "bestaudio[ext=m4a]/bestaudio/best", isAudio: true };
  if (h) return { sel: `b[height<=${h}][ext=mp4]/b[height<=${h}]/b/bv*[height<=${h}]`, isAudio: false };
  return { sel: "b[ext=mp4]/b/bv*", isAudio: false };
}

function getStreamUrl(id, format) {
  return new Promise((resolve, reject) => {
    const { sel } = ytFormat(format);
    const args = [
      "--no-warnings", "--no-check-certificates", "--ignore-errors", "--no-playlist",
      "--extractor-args", "youtube:player_client=default,android,ios,tv,web_embedded",
      "-f", sel, "--get-url", "--force-ipv4",
      `https://www.youtube.com/watch?v=${id}`,
    ];
    let p;
    try { p = spawn(BIN, args); } catch (e) { return reject(e); }
    let out = "", err = "";
    const to = setTimeout(() => { try { p.kill("SIGKILL"); } catch {} reject(new Error("yt-dlp timeout")); }, 120000);
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", (e) => { clearTimeout(to); reject(e); });
    p.on("close", (code) => {
      clearTimeout(to);
      const url = out.trim().split(/\r?\n/).filter(Boolean).pop();
      if (code === 0 && /^https?:\/\//.test(url || "")) return resolve(url);
      const bs = /bot|sign in|cookies|age/i.test(err);
      reject(new Error(bs ? "PO_TOKEN_REQUIRED: yt-dlp hit bot-check; add bgutil provider" : (err || "yt-dlp failed").slice(0, 300)));
    });
  });
}

function sanitize(t) { return (t || "").replace(/[\\/:*?"<>|]/g, "").trim() || "video"; }

function authorized(u) {
  if (!KEY) return true;
  const bearer = u.headers.authorization || "";
  return bearer === `Bearer ${KEY}` || (u.query && u.query.key === KEY);
}

function send(res, code, obj) {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

async function handleStream(req, res, q) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  if (KEY && req.headers.authorization !== `Bearer ${KEY}` && q.get("key") !== KEY) {
    return send(res, 401, { error: "unauthorized" });
  }
  const id = (q.get("id") || "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return send(res, 400, { error: "bad id" });
  const format = q.get("format") || "best";
  try {
    const resolved = await getStreamUrl(id, format);
    const upstream = await fetch(resolved, {
      headers: { "user-agent": UA, ...(q.get("range") ? { range: q.get("range") } : {}) },
      redirect: "follow",
    });
    if (!upstream.ok && upstream.status !== 206) return send(res, 502, { error: "upstream " + upstream.status });
    const len = upstream.headers.get("content-length");
    const cr = upstream.headers.get("content-range");
    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    const safe = sanitize(q.get("title"));
    const status = upstream.status === 206 ? 206 : 200;
    const headers = {
      "content-type": ct,
      "accept-ranges": "bytes",
      "content-disposition": `attachment; filename="${safe}.mp4"`,
      "cache-control": "no-store",
    };
    if (len) headers["content-length"] = len;
    if (cr) headers["content-range"] = cr;
    res.writeHead(status, headers);
    const body = upstream.body;
    if (!body) return res.end();
    const reader = body.getReader();
    (async function pump() {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) {
          await new Promise((r) => res.once("drain", r));
        }
      }
      res.end();
    })().catch(() => { try { res.end(); } catch {} });
  } catch (e) {
    send(res, 500, { error: String((e && e.message) || e).slice(0, 300) });
  }
}

async function handleResolve(req, res) {
  if (KEY && req.headers.authorization !== `Bearer ${KEY}`) return send(res, 401, { error: "unauthorized" });
  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
  req.on("end", async () => {
    let body;
    try { body = JSON.parse(raw || "{}"); } catch { return send(res, 400, { error: "bad json" }); }
    const id = String(body.id || "").trim();
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return send(res, 400, { error: "bad id" });
    try {
      const url = await getStreamUrl(id, body.format);
      send(res, 200, { url });
    } catch (e) {
      send(res, 500, { error: String((e && e.message) || e).slice(0, 300) });
    }
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  if (u.pathname === "/ping") return send(res, 200, { ok: true });
  if (u.pathname === "/api/stream") return handleStream(req, res, u.searchParams);
  if (u.pathname === "/resolve" && req.method === "POST") return handleResolve(req, res);
  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`[worker] listening on ${PORT} (auth: ${KEY ? "on" : "open"}, bin: ${BIN})`));
