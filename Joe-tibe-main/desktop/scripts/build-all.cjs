// Builds the web app + API from the project root and stages them inside desktop/app.
// Works on Windows/macOS/Linux with plain Node (no shell tricks).
const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");

const desktop = path.resolve(__dirname, "..");
const root = path.resolve(desktop, "..");
const appDir = path.join(desktop, "app");

function run(label, script, args, extraEnv = {}) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: "inherit", env: { ...process.env, ...extraEnv } });
  if (r.status !== 0) { console.error(`✖ فشل: ${label}`); process.exit(r.status || 1); }
}

const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
if (!fs.existsSync(tsc) || !fs.existsSync(vite)) {
  console.error("✖ لم أجد node_modules في مجلد المشروع الرئيسي. شغّل `npm install` هناك أولًا.");
  process.exit(1);
}

// 1) compile the Express API (backend/src/server -> api/_server)
run("تجميع الـ API", tsc, ["-p", "backend/tsconfig.api.json"]);
// 2) build the frontend with an EMPTY API base: the desktop app talks to its own local server
run("بناء الواجهة", vite, ["build"], { VITE_API_BASE: "" });

// 3) stage files
fs.rmSync(path.join(appDir, "dist"), { recursive: true, force: true });
fs.rmSync(path.join(appDir, "server"), { recursive: true, force: true });
fs.mkdirSync(appDir, { recursive: true });
fs.cpSync(path.join(root, "dist"), path.join(appDir, "dist"), { recursive: true });
fs.cpSync(path.join(root, "api", "_server"), path.join(appDir, "server"), { recursive: true });
console.log("\n✔ تم تجهيز desktop/app (dist + server)");

// 4) yt-dlp.exe (optional but recommended: much more reliable from a home IP)
function download(url, dest, redirects = 6) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "joetube-build" } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(download(new URL(res.headers.location, url).toString(), dest, redirects - 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error("HTTP " + res.statusCode)); }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on("finish", () => out.close(resolve));
      out.on("error", reject);
    }).on("error", reject);
  });
}

(async () => {
  const binDir = path.join(appDir, "bin");
  const exe = path.join(binDir, "yt-dlp.exe");
  if (process.env.SKIP_YTDLP === "1" || fs.existsSync(exe)) return;
  try {
    fs.mkdirSync(binDir, { recursive: true });
    console.log("▶ تنزيل yt-dlp.exe ...");
    await download("https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe", exe);
    console.log("✔ yt-dlp.exe جاهز");
  } catch (e) {
    try { fs.rmSync(exe, { force: true }); } catch {}
    console.warn("⚠ تعذر تنزيل yt-dlp.exe (" + e.message + "). البرنامج سيعمل بدونه لكن بقدرة أقل مع بعض الفيديوهات.");
  }
})();
