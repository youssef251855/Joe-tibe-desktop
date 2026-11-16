const { app, BrowserWindow, Menu, Notification, session, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { startServer } = require("./server.cjs");

const PORT = 47821; // fixed so the site's localStorage (download history) survives restarts
const APP_DIR = path.join(__dirname, "app");
const ICON = path.join(__dirname, "build", "icon.png");

let win = null;
let server = null;
let downloads = null;
let origin = "";

// ---- settings (cookies for Instagram stories / private posts) ----
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
const cookiesFile = () => path.join(app.getPath("userData"), "cookies.txt");
function readSettings() { try { return JSON.parse(fs.readFileSync(settingsFile(), "utf8")); } catch { return {}; } }
function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  try { fs.mkdirSync(app.getPath("userData"), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2)); } catch {}
  return next;
}
function getCookieArgs() {
  if (fs.existsSync(cookiesFile())) return ["--cookies", cookiesFile()];
  const b = readSettings().cookiesBrowser;
  return b ? ["--cookies-from-browser", b] : [];
}

function uniquePath(dir, name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let p = path.join(dir, name);
  for (let i = 1; fs.existsSync(p); i++) p = path.join(dir, `${base} (${i})${ext}`);
  return p;
}

function setupDownloads() {
  session.defaultSession.on("will-download", (_event, item) => {
    const dir = path.join(app.getPath("downloads"), "JoeTube");
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const raw = item.getFilename() || "JoeTube_Media";
    const name = raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 150) || "JoeTube_Media";
    const target = uniquePath(dir, name);
    item.setSavePath(target);
    item.once("done", (_e, state) => {
      if (!Notification.isSupported() || state === "cancelled") return;
      const n = new Notification({
        title: state === "completed" ? "اكتمل التحميل ✅" : "فشل التحميل",
        body: state === "completed" ? path.basename(target) : "تعذر إكمال الملف، حاول مرة أخرى."
      });
      if (state === "completed") n.on("click", () => shell.showItemInFolder(target));
      n.show();
    });
  });
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "تحرير", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    { label: "عرض", submenu: [{ role: "reload" }, { role: "forceReload" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }, { role: "toggleDevTools" }] },
    {
      label: "التنزيلات",
      submenu: [
        {
          label: "فتح مجلد التنزيلات",
          click: () => { const d = path.join(app.getPath("downloads"), "JoeTube"); fs.mkdirSync(d, { recursive: true }); shell.openPath(d); }
        },
        {
          label: "تحديث محرك التحميل (yt-dlp)",
          click: async () => {
            if (!downloads) return;
            const out = await downloads.update();
            dialog.showMessageBox({ type: "info", title: "JoeTube", message: "تحديث yt-dlp", detail: out.slice(0, 800) });
          }
        },
        { type: "separator" },
        {
          label: "الستوريهات وتسجيل الدخول",
          submenu: [
            {
              label: "اختيار ملف cookies.txt…",
              click: async () => {
                const r = await dialog.showOpenDialog(win, { title: "اختر ملف cookies.txt", properties: ["openFile"], filters: [{ name: "cookies", extensions: ["txt"] }] });
                if (r.canceled || !r.filePaths[0]) return;
                try {
                  fs.mkdirSync(app.getPath("userData"), { recursive: true });
                  fs.copyFileSync(r.filePaths[0], cookiesFile());
                  dialog.showMessageBox({ type: "info", title: "JoeTube", message: "تم حفظ ملف الكوكيز", detail: "سيُستخدم تلقائيًا للستوريهات والمحتوى الذي يتطلب تسجيل دخول." });
                } catch (e) { dialog.showErrorBox("JoeTube", "تعذر نسخ الملف: " + e.message); }
                buildMenu();
              }
            },
            {
              label: "حذف ملف الكوكيز",
              enabled: fs.existsSync(cookiesFile()),
              click: () => { try { fs.rmSync(cookiesFile(), { force: true }); } catch {} buildMenu(); }
            },
            { type: "separator" },
            { label: "أو استخدم كوكيز متصفح مسجَّل الدخول فيه:", enabled: false },
            ...[["", "بدون"], ["firefox", "Firefox (الأنسب)"], ["chrome", "Chrome"], ["edge", "Edge"], ["brave", "Brave"]].map(([val, label]) => ({
              label, type: "radio", checked: (readSettings().cookiesBrowser || "") === val,
              click: () => { writeSettings({ cookiesBrowser: val }); buildMenu(); }
            })),
            { type: "separator" },
            {
              label: "كيف أحصل على cookies.txt؟",
              click: () => dialog.showMessageBox({
                type: "info", title: "JoeTube", message: "الستوريهات تتطلب تسجيل دخول",
                detail:
                  "1) سجّل الدخول إلى instagram.com في متصفحك.\n" +
                  "2) ثبّت إضافة «Get cookies.txt LOCALLY» (أو مشابهة).\n" +
                  "3) افتح instagram.com وصدّر الكوكيز بصيغة Netscape.\n" +
                  "4) اختر الملف من هذه القائمة.\n\n" +
                  "تنبيهات: الملف يعادل تسجيل دخولك، فلا تشاركه. وإنستغرام قد يقيّد الحساب المستخدم، فيفضّل حسابًا ثانويًا. " +
                  "كوكيز Chrome وEdge على ويندوز غالبًا لا تُقرأ تلقائيًا (تشفير جديد)، لذلك Firefox أو ملف cookies.txt أضمن."
              })
            }
          ]
        }
      ]
    }
  ]));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 420,
    minHeight: 600,
    title: "JoeTube",
    icon: ICON,
    backgroundColor: "#050506",
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.once("ready-to-show", () => win.show());

  // Links to our own server (e.g. the download link) -> real download; everything else -> default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin)) win.webContents.downloadURL(url);
    else if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(origin)) {
      e.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  win.on("closed", () => { win = null; });
  win.loadURL(origin);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.setAppUserModelId("com.joetube.desktop");

  app.whenReady().then(async () => {
    try {
      const outDir = path.join(app.getPath("downloads"), "JoeTube");
      const started = await startServer(APP_DIR, PORT, {
        outDir,
        hooks: {
          onDone: (job) => {
            if (!Notification.isSupported()) return;
            const n = new Notification({ title: "اكتمل التحميل ✅", body: job.fileName || "JoeTube" });
            n.on("click", () => job.file && shell.showItemInFolder(job.file));
            n.show();
          },
          reveal: (file) => shell.showItemInFolder(file),
          getCookieArgs
        }
      });
      server = started.server;
      downloads = started.downloads;
      origin = `http://127.0.0.1:${started.port}`;
    } catch (e) {
      dialog.showErrorBox("JoeTube", "تعذر تشغيل الخادم المحلي:\n" + (e && e.message ? e.message : e));
      app.quit();
      return;
    }
    setupDownloads();
    buildMenu();
    createWindow();
  });

  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => { try { server && server.close(); } catch {} });
}
