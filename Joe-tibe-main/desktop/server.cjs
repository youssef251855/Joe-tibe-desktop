// Local HTTP server used by the desktop app: serves the built frontend (dist), the SAME
// Express API that runs on Vercel, and the local download engine (/api/dl/*), bound to
// 127.0.0.1 only. Pure Node (no Electron APIs) so it can be tested with plain `node`.
const path = require("path");
const http = require("http");
const { Downloads } = require("./downloader.cjs");

async function startServer(appDir, preferredPort = 47821, options = {}) {
  process.env.CORS_ORIGIN = `http://127.0.0.1:${preferredPort}`; // must be set BEFORE loading the API
  // The API looks for ./bin/yt-dlp(.exe) relative to the working directory.
  try { process.chdir(appDir); } catch {}

  const express = require("express");
  const mod = require(path.join(appDir, "server", "app.js"));
  const api = mod.default || mod.app;

  const downloads = new Downloads({
    appDir,
    outDir: options.outDir || path.join(appDir, "downloads"),
    bins: options.bins,
    hooks: options.hooks
  });

  let actualPort = preferredPort;
  const web = express();
  web.disable("x-powered-by");

  // ---- local download engine ----
  const dl = express.Router();
  // Only our own page may talk to it (blocks other websites / DNS-rebinding).
  dl.use((req, res, next) => {
    const host = String(req.headers.host || "");
    const origin = req.headers.origin;
    const okHost = host === `127.0.0.1:${actualPort}` || host === `localhost:${actualPort}`;
    const okOrigin = !origin || origin === `http://127.0.0.1:${actualPort}` || origin === `http://localhost:${actualPort}`;
    if (!okHost || !okOrigin) return res.status(403).json({ success: false, error: "غير مسموح." });
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  dl.use(express.json({ limit: "20kb" }));

  const fail = (res, e, code = 400) => res.status(code).json({ success: false, error: (e && e.message) || "خطأ" });

  dl.get(["/formats", "/info"], async (req, res) => {
    try { res.json({ success: true, data: await downloads.probe(String(req.query.url || "")) }); }
    catch (e) { fail(res, e, 422); }
  });
  dl.post("/start", (req, res) => {
    if (!/^application\/json/i.test(String(req.headers["content-type"] || ""))) return fail(res, new Error("Content-Type غير صحيح."), 415);
    try {
      const b = req.body || {};
      const id = downloads.start({ url: b.url, kind: b.kind, height: b.height, audioFormat: b.audioFormat });
      res.json({ success: true, id });
    } catch (e) { fail(res, e); }
  });
  dl.get("/status", (req, res) => {
    const s = downloads.get(String(req.query.id || ""));
    if (!s) return res.status(404).json({ success: false, error: "مهمة غير موجودة." });
    res.json({ success: true, data: s });
  });
  dl.post("/cancel", (req, res) => {
    res.json({ success: downloads.cancel(String((req.body && req.body.id) || req.query.id || "")) });
  });
  dl.post("/reveal", (req, res) => {
    const s = downloads.get(String((req.body && req.body.id) || ""));
    if (s && s.file && options.hooks && options.hooks.reveal) options.hooks.reveal(s.file);
    res.json({ success: !!(s && s.file) });
  });
  web.use("/api/dl", dl);

  // ---- the shared Express API (same code as Vercel) ----
  web.use((req, res, next) => {
    const u = req.url || "";
    if (u.startsWith("/api") || u === "/ping" || u.startsWith("/ping?")) return api(req, res, next);
    next();
  });
  const dist = path.join(appDir, "dist");
  web.use(express.static(dist, { index: "index.html" }));
  web.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

  return new Promise((resolve, reject) => {
    const listen = (port) => {
      const server = http.createServer(web);
      server.once("error", (e) => {
        if (e.code === "EADDRINUSE" && port !== 0) return listen(0); // port taken -> any free port
        reject(e);
      });
      server.listen(port, "127.0.0.1", () => {
        actualPort = server.address().port;
        resolve({ server, port: actualPort, downloads });
      });
    };
    listen(preferredPort);
  });
}

module.exports = { startServer };
