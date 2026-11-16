import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Dev-only: runs the SAME Express app that Vercel serves from /api, inside the Vite dev
 * server. `npm run dev` is all you need — no second process, no ECONNREFUSED proxy errors.
 */
function localApi(): Plugin {
  return {
    name: "joetube-local-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        if (!url.startsWith("/api") && !url.startsWith("/ping")) return next();
        try {
          const mod: any = await server.ssrLoadModule("/backend/src/server/app.ts");
          const app = mod.default || mod.app;
          app(req, res, next);
        } catch (err: any) {
          server.config.logger.error(`[api] ${err?.stack || err}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
          }
          res.end(JSON.stringify({ success: false, error: "تعذّر تشغيل الـ API المحلي: " + (err?.message || "") }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  server: {
    port: 3000,
    strictPort: true,
    host: "0.0.0.0"
  },
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
