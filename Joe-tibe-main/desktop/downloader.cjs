"use strict";
// Desktop download engine: runs yt-dlp (+ ffmpeg) locally so we get REAL quality choices
// (video+audio merged), REAL MP3 conversion, and progress. Pure Node (no Electron APIs).
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function resolveBinaries(appDir) {
  const exeName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  const local = path.join(appDir, "bin", exeName);
  const ytdlp = fs.existsSync(local) ? local : exeName; // falls back to PATH
  let ffmpeg = null;
  try {
    const p = require("ffmpeg-static");
    if (p && fs.existsSync(p)) ffmpeg = p;
  } catch { /* optional */ }
  if (!ffmpeg) {
    const localFfmpeg = path.join(appDir, "bin", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
    if (fs.existsSync(localFfmpeg)) ffmpeg = localFfmpeg;
  }
  return { ytdlp, ffmpeg, prefix: [] };
}

function assertSafeUrl(raw) {
  let u;
  try { u = new URL(String(raw || "")); } catch { throw new Error("رابط غير صالح."); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("يُسمح فقط بروابط HTTP/HTTPS.");
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":")) {
    throw new Error("هذا العنوان غير مسموح به.");
  }
  if (String(raw).length > 2048) throw new Error("الرابط طويل جدًا.");
  return u.toString();
}

/** Build yt-dlp arguments. kind: "video" | "audio". */
const isStoryUrl = (u) => /instagram\.com\/stories\//i.test(u);

function buildArgs(opts, bins, outDir, cookieArgs = []) {
  const url = assertSafeUrl(opts.url);
  const kind = opts.kind === "audio" ? "audio" : "video";
  const multi = isStoryUrl(url) && !/instagram\.com\/stories\/[^/]+\/\d+/i.test(url); // a user's whole story tray
  const a = [
    ...(multi ? [] : ["--no-playlist"]), "--no-colors", "--newline", "--no-mtime", "--windows-filenames",
    "--retries", "5", "--fragment-retries", "5", "--concurrent-fragments", "4",
    "--progress",
    "--progress-template", "download:JTP|%(progress.status)s|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s",
    "--progress-template", "postprocess:JTM|%(progress.postprocessor)s|%(progress.status)s",
    "--print", "after_move:JTF|%(filepath)s"
  ];
  if (bins.ffmpeg) a.push("--ffmpeg-location", bins.ffmpeg);
  a.push(...cookieArgs);
  const stem = isStoryUrl(url) ? "%(uploader|story)s - %(title).60B [%(id)s]" : null;

  if (kind === "audio") {
    const fmt = opts.audioFormat === "m4a" ? "m4a" : "mp3";
    if (fmt === "mp3") {
      if (!bins.ffmpeg) throw new Error("ffmpeg غير موجود، لا يمكن التحويل إلى MP3. اختر M4A أو أعد بناء البرنامج.");
      a.push("-f", "bestaudio[ext=m4a]/bestaudio/best", "-x", "--audio-format", "mp3", "--audio-quality", "0");
    } else if (bins.ffmpeg) {
      a.push("-f", "bestaudio[ext=m4a]/bestaudio/best", "-x", "--audio-format", "m4a");
    } else {
      a.push("-f", "bestaudio[ext=m4a]/bestaudio");
    }
    a.push("-o", path.join(outDir, (stem || "%(title).100B") + ".%(ext)s"));
  } else {
    const h = Math.max(144, Math.min(4320, parseInt(opts.height, 10) || 1080));
    if (bins.ffmpeg) {
      a.push("-f", `bv*[height<=${h}][ext=mp4]+ba[ext=m4a]/bv*[height<=${h}]+ba/b[height<=${h}]/b`, "--merge-output-format", "mp4/mkv");
    } else {
      a.push("-f", `b[height<=${h}][ext=mp4]/b[height<=${h}]/b`); // no ffmpeg: single-file formats only
    }
    a.push("-o", path.join(outDir, stem ? stem + ".%(ext)s" : "%(title).100B [%(height)sp].%(ext)s"));
  }
  a.push("--", url);
  return a;
}

const cookieArgsOf = (hooks) => { try { return (hooks && hooks.getCookieArgs && hooks.getCookieArgs()) || []; } catch { return []; } };

const num = (s) => { const n = parseFloat(String(s).replace(/[^\d.]/g, "")); return Number.isFinite(n) ? n : null; };

function friendlyError(text) {
  const t = text || "";
  if (/not a bot|sign in to confirm|confirm you.re not/i.test(t))
    return "يوتيوب طلب تأكيد أنك لست روبوت. جرّب لاحقًا، أو عيّن متغير البيئة JOETUBE_COOKIES_BROWSER=chrome (أو edge) ليستخدم كوكيز متصفحك.";
  if (/instagram/i.test(t) && /login|log in|cookies|rate-limit|restricted|empty media response|not available/i.test(t))
    return "إنستغرام يطلب تسجيل الدخول (الستوريهات والحسابات الخاصة). من القائمة: التنزيلات ← الستوريهات وتسجيل الدخول، اختر ملف cookies.txt أو كوكيز متصفح مسجَّل الدخول فيه.";
  if (/decrypt|dpapi|cookie.*(database|locked|copy)/i.test(t))
    return "تعذر قراءة كوكيز المتصفح (متصفحات Chromium الحديثة تشفّرها). استخدم Firefox، أو صدّر ملف cookies.txt واخترته من القائمة.";
  if (/ffmpeg/i.test(t) && /not found|not installed|ffprobe/i.test(t)) return "ffmpeg غير موجود أو معطوب.";
  if (/private video|members-only|requires payment|age/i.test(t)) return "هذا الفيديو خاص أو مقيّد بالعمر/الاشتراك.";
  if (/unavailable|removed|not available/i.test(t)) return "الفيديو غير متاح.";
  return t.replace(/^ERROR:\s*/i, "").slice(0, 300) || "فشل التحميل.";
}

class Downloads {
  constructor({ appDir, outDir, bins, hooks }) {
    this.bins = bins || resolveBinaries(appDir);
    this.outDir = outDir;
    this.hooks = hooks || {};
    this.jobs = new Map();
    this.probeCache = new Map();
  }

  _spawn(args) {
    return spawn(this.bins.ytdlp, [...(this.bins.prefix || []), ...args], { windowsHide: true });
  }

  snapshot(j) {
    return { id: j.id, status: j.status, percent: j.percent, speed: j.speed, eta: j.eta, stage: j.stage, file: j.file, fileName: j.file ? path.basename(j.file) : null, count: j.files.length, error: j.error };
  }

  get(id) { const j = this.jobs.get(id); return j ? this.snapshot(j) : null; }

  start(opts) {
    fs.mkdirSync(this.outDir, { recursive: true });
    const args = buildArgs(opts, this.bins, this.outDir, cookieArgsOf(this.hooks)); // throws on invalid input
    const multi = !args.includes("--no-playlist");
    const id = crypto.randomBytes(6).toString("hex");
    const expectedParts = opts.kind === "audio" || !this.bins.ffmpeg ? 1 : 2;
    const j = { id, multi, files: [], status: "running", percent: 0, speed: "", eta: "", stage: "download", file: null, error: null, partsDone: 0, expectedParts, stderr: "", proc: null, startedAt: Date.now() };
    this.jobs.set(id, j);

    const proc = this._spawn(args);
    j.proc = proc;
    let buf = "";
    const onLine = (line) => {
      if (line.startsWith("JTP|")) {
        const [, status, pct, speed, eta] = line.split("|");
        const p = status === "finished" ? 100 : num(pct);
        if (p !== null && j.multi) {
          j.percent = Math.min(99, p); // whole tray: per-file percentage
          if (status === "finished") j.partsDone++;
        } else if (p !== null) {
          j.percent = Math.max(j.percent, Math.min(99, Math.round(((j.partsDone * 100 + p) / j.expectedParts) * 10) / 10));
          if (status === "finished") j.partsDone = Math.min(j.partsDone + 1, j.expectedParts);
        }
        j.speed = (speed || "").trim(); j.eta = (eta || "").trim(); j.stage = "download";
      } else if (line.startsWith("JTM|")) {
        const [, pp, status] = line.split("|");
        if (status === "started" || status === "processing") j.stage = /merg/i.test(pp) ? "merge" : /audio|convert/i.test(pp) ? "convert" : "process";
      } else if (line.startsWith("JTF|")) {
        j.file = line.slice(4).trim();
        j.files.push(j.file);
      }
    };
    proc.stdout.on("data", (d) => {
      buf += d.toString("utf8");
      let i;
      while ((i = buf.search(/\r?\n/)) >= 0) { onLine(buf.slice(0, i)); buf = buf.slice(i + (buf[i] === "\r" ? 2 : 1)); }
    });
    proc.stderr.on("data", (d) => { j.stderr = (j.stderr + d.toString("utf8")).slice(-4000); });
    proc.on("error", (e) => {
      j.status = "error";
      j.error = e.code === "ENOENT" ? "لم أجد yt-dlp. أعد بناء البرنامج أو ضع yt-dlp.exe داخل app\\bin." : e.message;
    });
    proc.on("close", (code) => {
      if (buf.trim()) onLine(buf.trim());
      if (j.status === "cancelled" || j.status === "error") return;
      if (code === 0 && j.file) {
        j.status = "done"; j.percent = 100; j.stage = "done";
        try { this.hooks.onDone && this.hooks.onDone(this.snapshot(j)); } catch {}
      } else {
        j.status = "error";
        const errLine = (j.stderr.split(/\r?\n/).reverse().find((l) => /ERROR/i.test(l)) || j.stderr.trim());
        j.error = friendlyError(errLine);
      }
      setTimeout(() => this.jobs.delete(id), 30 * 60 * 1000).unref();
    });
    return id;
  }

  cancel(id) {
    const j = this.jobs.get(id);
    if (!j || j.status !== "running") return false;
    j.status = "cancelled"; j.error = "تم الإلغاء";
    try { j.proc.kill(); } catch {}
    return true;
  }

  /** Real list of available resolutions (+ rough size) using `yt-dlp -J`. */
  probe(rawUrl) {
    const url = assertSafeUrl(rawUrl);
    const hit = this.probeCache.get(url);
    if (hit && Date.now() - hit.t < 10 * 60 * 1000) return Promise.resolve(hit.v);
    return new Promise((resolve, reject) => {
      const args = ["-J", ...(isStoryUrl(url) && !/instagram\.com\/stories\/[^/]+\/\d+/i.test(url) ? [] : ["--no-playlist"]), "--no-warnings", "--no-colors", ...cookieArgsOf(this.hooks), "--", url];
      const p = this._spawn(args);
      let out = "", err = "";
      const timer = setTimeout(() => { try { p.kill(); } catch {} reject(new Error("انتهت مهلة جلب الجودات.")); }, 60000);
      p.stdout.on("data", (d) => { out += d.toString("utf8"); });
      p.stderr.on("data", (d) => { err = (err + d.toString("utf8")).slice(-2000); });
      p.on("error", (e) => { clearTimeout(timer); reject(new Error(e.code === "ENOENT" ? "لم أجد yt-dlp." : e.message)); });
      p.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) return reject(new Error(friendlyError(err.split(/\r?\n/).reverse().find((l) => /ERROR/i.test(l)) || err)));
        try {
          let info = JSON.parse(out);
          const count = info._type === "playlist" && Array.isArray(info.entries) ? info.entries.filter(Boolean).length : 1;
          if (info._type === "playlist" && Array.isArray(info.entries)) info = { ...(info.entries.find(Boolean) || {}), title: info.title || (info.entries[0] && info.entries[0].title) };
          const fm = Array.isArray(info.formats) ? info.formats : [];
          const sz = (f) => Number(f.filesize || f.filesize_approx || 0);
          const bestAudio = fm.filter((f) => f.vcodec === "none" && f.acodec && f.acodec !== "none").reduce((m, f) => Math.max(m, sz(f)), 0);
          const byHeight = new Map();
          for (const f of fm) {
            if (!f.height || !f.vcodec || f.vcodec === "none") continue;
            byHeight.set(f.height, Math.max(byHeight.get(f.height) || 0, sz(f)));
          }
          const heights = [...byHeight.keys()].sort((x, y) => y - x);
          const sizes = {};
          for (const h of heights) { const v = byHeight.get(h); if (v) sizes[h] = v + bestAudio; }
          const isImage = !fm.length && /\.(jpe?g|png|webp)(\?|$)/i.test(String(info.url || ""));
          const v = {
            title: info.title || info.fulltitle || "", duration: info.duration || 0, heights, sizes, audioSize: bestAudio,
            id: String(info.id || ""), thumbnail: info.thumbnail || "", uploader: info.uploader || info.channel || "",
            uploaderUrl: info.uploader_url || info.channel_url || "", views: Number(info.view_count || 0),
            extractor: String(info.extractor_key || info.extractor || "").toLowerCase(), count, isImage
          };
          this.probeCache.set(url, { t: Date.now(), v });
          resolve(v);
        } catch (e) { reject(new Error("تعذر قراءة قائمة الجودات.")); }
      });
    });
  }

  /** `yt-dlp -U` : YouTube changes often, so the engine must be updatable. */
  update() {
    return new Promise((resolve) => {
      let out = "";
      const p = this._spawn(["-U"]);
      p.stdout.on("data", (d) => { out += d.toString("utf8"); });
      p.stderr.on("data", (d) => { out += d.toString("utf8"); });
      p.on("error", (e) => resolve(e.message));
      p.on("close", () => resolve(out.trim() || "تم."));
    });
  }
}

module.exports = { Downloads, buildArgs, resolveBinaries, assertSafeUrl, friendlyError };
