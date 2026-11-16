// Builds a single self-contained CommonJS bundle for the Vercel serverless function.
// Why: @vercel/node transpiles api/*.ts and other dirs as SEPARATE files, which breaks
// cross-directory imports (ERR_MODULE_NOT_FOUND: '/var/task/src/server/app'). Bundling
// everything except node_modules into ONE api/index.js removes that entire class of crash.
//   entry: backend/src/server/app.ts  (single source of truth, shared with Render)
//   out:   api/index.js               (default-exported Express app = Vercel handler)
const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["backend/src/server/app.ts"],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: "api/index.js",
    // Keep npm packages in node_modules (installed by Vercel from root package.json);
    // only our own source gets inlined into the single bundle.
    packages: "external",
    sourcemap: false,
    logLevel: "info",
    // Vercel expects module.exports to be the request handler (the Express app itself).
    footer: { js: "module.exports = (module.exports.default || module.exports);" }
  })
  .catch(() => process.exit(1));
